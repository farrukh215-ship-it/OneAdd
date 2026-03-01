import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

let adminMessaging: {
  send: (message: Record<string, unknown>) => Promise<string>;
} | null = null;

function ensureFcmInitialized(configService: ConfigService) {
  if (adminMessaging) {
    return adminMessaging;
  }

  const provider = configService.get<string>("PUSH_PROVIDER", "noop");
  if (provider !== "fcm") {
    return null;
  }

  const projectId = configService.get<string>("FCM_PROJECT_ID");
  const clientEmail = configService.get<string>("FCM_CLIENT_EMAIL");
  const privateKey = configService
    .get<string>("FCM_PRIVATE_KEY", "")
    .replace(/\\n/g, "\n");
  const serviceAccountPath = configService.get<string>("FIREBASE_SERVICE_ACCOUNT_PATH", "");

  let cert = null;
  if (serviceAccountPath) {
    const resolvedPath = join(process.cwd(), serviceAccountPath);
    if (existsSync(resolvedPath)) {
      const parsed = JSON.parse(readFileSync(resolvedPath, "utf-8")) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };
      if (parsed.project_id && parsed.client_email && parsed.private_key) {
        cert = {
          projectId: parsed.project_id,
          clientEmail: parsed.client_email,
          privateKey: parsed.private_key
        };
      }
    }
  }

  if (!cert && (!projectId || !clientEmail || !privateKey)) {
    return null;
  }
  if (!cert) {
    cert = {
      projectId,
      clientEmail,
      privateKey
    };
  }

  const firebaseAdmin = require("firebase-admin");

  if (firebaseAdmin.apps.length === 0) {
    firebaseAdmin.initializeApp({
      credential: firebaseAdmin.credential.cert(cert)
    });
  }

  adminMessaging = firebaseAdmin.messaging();
  return adminMessaging;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly messaging: { send: (message: Record<string, unknown>) => Promise<string> } | null;

  constructor(private readonly configService: ConfigService) {
    this.messaging = ensureFcmInitialized(this.configService);
    if (this.configService.get<string>("PUSH_PROVIDER", "noop") === "fcm" && !this.messaging) {
      this.logger.warn("PUSH_PROVIDER=fcm but FCM credentials are missing.");
    }
  }

  async send(token: string, title: string, body: string, data?: Record<string, unknown>) {
    if (this.messaging) {
      try {
        await this.messaging.send({
          token,
          notification: { title, body },
          data: stringifyData(data)
        });
        return;
      } catch (error) {
        this.logger.warn(`FCM send failed for token=${token}. Falling back to log.`);
      }
    }

    this.logger.log(
      `Push -> token=${token}, title="${title}", body="${body}", data=${JSON.stringify(
        data ?? {}
      )}`
    );
  }
}

function stringifyData(data?: Record<string, unknown>) {
  if (!data) {
    return undefined;
  }

  return Object.entries(data).reduce<Record<string, string>>((acc, [key, value]) => {
    acc[key] = typeof value === "string" ? value : JSON.stringify(value);
    return acc;
  }, {});
}
