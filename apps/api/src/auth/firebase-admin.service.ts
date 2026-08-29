import { Injectable, Logger } from '@nestjs/common';

type Decoded = { uid: string; email?: string };

@Injectable()
export class FirebaseAdminService {
  private readonly logger = new Logger(FirebaseAdminService.name);
  private app: import('firebase-admin').app.App | null = null;

  hasCredentials(): boolean {
    const hasExplicit = !!(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
    const hasAdc = !!(process.env.GOOGLE_CLOUD_PROJECT || process.env.K_SERVICE);
    return hasExplicit || hasAdc;
  }

  private async getAuth() {
    if (!this.hasCredentials()) {
      throw new Error('Firebase Admin credentials not configured');
    }
    if (!this.app) {
      const admin = await import('firebase-admin');
      if (admin.apps.length) {
        this.app = admin.app();
      } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        this.app = admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          }),
        });
      } else {
        this.app = admin.initializeApp({
          credential: admin.credential.applicationDefault(),
        });
      }
    }
    const admin = await import('firebase-admin');
    return admin.auth(this.app!);
  }

  async verifyIdToken(idToken: string): Promise<Decoded> {
    const auth = await this.getAuth();
    const decoded = await auth.verifyIdToken(idToken);
    return { uid: decoded.uid, email: decoded.email };
  }

  async createSessionCookie(idToken: string, expiresInMs: number): Promise<string> {
    const auth = await this.getAuth();
    return auth.createSessionCookie(idToken, { expiresIn: expiresInMs });
  }

  async verifySessionCookie(sessionCookie: string): Promise<Decoded> {
    const auth = await this.getAuth();
    const decoded = await auth.verifySessionCookie(sessionCookie, true);
    return { uid: decoded.uid, email: decoded.email };
  }

  async sendPasswordReset(_email: string, _appUrl: string): Promise<void> {
    this.logger.log('password reset requested (provider hook)');
  }

  async sendMagicLink(_email: string, _appUrl: string): Promise<void> {
    this.logger.log('magic link requested (provider hook)');
  }
}
