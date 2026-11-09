import { OAuth2Client } from 'google-auth-library';

export interface VerifiedGoogleIdentity {
  subject: string;
  email: string;
}

export interface GoogleIdentityVerifier {
  verify(idToken: string): Promise<VerifiedGoogleIdentity | null>;
}

export class GoogleLoginNotConfiguredError extends Error {
  constructor() {
    super('Google login is not configured');
    this.name = 'GoogleLoginNotConfiguredError';
  }
}

/** Verifies the credential with Google's rotating keys and the Casa Ecos audience. */
export class GoogleIdentityTokenVerifier implements GoogleIdentityVerifier {
  private readonly client = new OAuth2Client();

  constructor(private readonly clientId: string | undefined) {}

  async verify(idToken: string): Promise<VerifiedGoogleIdentity | null> {
    if (!this.clientId) throw new GoogleLoginNotConfiguredError();

    try {
      const ticket = await this.client.verifyIdToken({ idToken, audience: this.clientId });
      const payload = ticket.getPayload();

      if (!payload?.sub || !payload.email || payload.email_verified !== true) return null;

      return { subject: payload.sub, email: payload.email };
    } catch {
      return null;
    }
  }
}
