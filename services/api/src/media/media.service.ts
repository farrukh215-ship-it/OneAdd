import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, timingSafeEqual } from "crypto";
import { FileValidationService } from "./file-validation.service";

@Injectable()
export class MediaService {
  constructor(
    private readonly configService: ConfigService,
    private readonly fileValidationService: FileValidationService
  ) {}

  signUploadUrl(payload: {
    path: string;
    mediaType: "IMAGE" | "VIDEO";
    mimeType: string;
    sizeBytes: number;
    durationSec?: number;
  }) {
    this.fileValidationService.validate(payload);

    const expiresIn = this.configService.get<number>(
      "MEDIA_SIGNING_EXPIRES_SECONDS",
      600
    );
    const expires = Math.floor(Date.now() / 1000) + expiresIn;
    const signature = this.sign(payload.path, expires);
    const baseUrl = this.configService.get<string>(
      "MEDIA_PUBLIC_BASE_URL",
      "https://cdn.example.com"
    );

    return {
      uploadUrl: `${baseUrl}/${payload.path}?expires=${expires}&signature=${signature}`,
      expires
    };
  }

  verifySignedUrl(payload: { path: string; expires: number; signature: string }) {
    if (payload.expires < Math.floor(Date.now() / 1000)) {
      return { valid: false, reason: "expired" as const };
    }

    const expected = this.sign(payload.path, payload.expires);
    const expectedBuffer = Buffer.from(expected, "hex");
    const receivedBuffer = Buffer.from(payload.signature, "hex");

    if (expectedBuffer.length !== receivedBuffer.length) {
      return { valid: false, reason: "invalid_signature" as const };
    }

    const valid = timingSafeEqual(expectedBuffer, receivedBuffer);
    return { valid, reason: valid ? null : ("invalid_signature" as const) };
  }

  private sign(path: string, expires: number) {
    const secret = this.configService.getOrThrow<string>("MEDIA_SIGNING_SECRET");
    return createHmac("sha256", secret).update(`${path}:${expires}`).digest("hex");
  }
}
