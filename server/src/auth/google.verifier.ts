import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { OAuth2Client } from 'google-auth-library'

export type GoogleClaims = {
  /** The stable `sub` claim. The account identity, not the email. */
  subject: string
  email: string
  displayName: string | null
}

/**
 * The boundary where a Google ID token becomes trusted claims.
 *
 * Isolated behind an injectable so tests can substitute it: the suite must
 * never make live requests to Google, and testing rejection paths needs a
 * verifier that can be made to fail on demand.
 */
@Injectable()
export class GoogleVerifier {
  private readonly client = new OAuth2Client()

  constructor(private readonly config: ConfigService) {}

  async verify(idToken: string): Promise<GoogleClaims> {
    // Every audience Setline ships. Android issues the ID token with the WEB
    // client id as its audience, and each app variant may have its own
    // client, so the list is configured rather than assumed.
    const audiences = this.config
      .getOrThrow<string>('GOOGLE_CLIENT_IDS')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)

    let payload

    try {
      // verifyIdToken checks the signature against Google's published keys,
      // the expiry, and that `aud` is one of ours. Decoding without verifying
      // would let anyone mint claims.
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: audiences,
      })

      payload = ticket.getPayload()
    } catch {
      // Never log the token itself.
      throw new UnauthorizedException('Invalid Google token')
    }

    if (!payload) {
      throw new UnauthorizedException('Invalid Google token')
    }

    // verifyIdToken does not check the issuer, so it is checked here.
    if (
      payload.iss !== 'accounts.google.com' &&
      payload.iss !== 'https://accounts.google.com'
    ) {
      throw new UnauthorizedException('Invalid Google token')
    }

    if (!payload.sub) {
      throw new UnauthorizedException('Invalid Google token')
    }

    // An unverified email must not become an account identity, and Setline
    // has nothing to show without one.
    if (!payload.email || payload.email_verified !== true) {
      throw new UnauthorizedException('Google account has no verified email')
    }

    return {
      subject: payload.sub,
      email: payload.email,
      displayName: payload.name ?? null,
    }
  }
}
