import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService {
  private readonly app: admin.app.App | null;

  constructor() {
    const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (!encoded) {
      this.app = null;
      return;
    }

    const serviceAccount = JSON.parse(
      Buffer.from(encoded, 'base64').toString(),
    ) as admin.ServiceAccount;

    this.app =
      admin.apps[0] ??
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
  }

  verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    if (!this.app) {
      throw new InternalServerErrorException('Firebase not configured');
    }
    return this.app.auth().verifyIdToken(idToken);
  }
}
