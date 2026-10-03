import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { createHash, randomBytes } from 'node:crypto'
import { PrismaService } from '../prisma/prisma.service'
import { GoogleVerifier } from './google.verifier'

export type SessionResponse = {
  user: { id: string; email: string; displayName: string | null }
  accessToken: string
  refreshToken: string
}

/**
 * Token lifetimes. Short access tokens limit the damage of a leaked one;
 * long refresh tokens keep users signed in without re-prompting. Both are
 * configurable rather than literal at the call site.
 */
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60 // 15 minutes
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60 // 30 days

/**
 * Refresh tokens are opaque random strings, not JWTs: they are looked up in
 * the database anyway, so there is nothing to gain from making them
 * self-describing, and an opaque token cannot leak claims.
 */
const REFRESH_TOKEN_BYTES = 48

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly google: GoogleVerifier,
  ) {}

  /**
   * Exchanges a Google ID token for a Setline session.
   *
   * Everything about the user comes from the *verified* token: the client
   * supplies no user id and no email of its own, so a caller cannot claim to
   * be someone else by sending different fields alongside the token.
   */
  async signInWithGoogle(idToken: string): Promise<SessionResponse> {
    const claims = await this.google.verify(idToken)

    // Upsert on the Google subject, so a returning user resolves to the same
    // Setline account even if their email has since changed.
    const user = await this.prisma.user.upsert({
      where: { googleSubject: claims.subject },
      create: {
        googleSubject: claims.subject,
        email: claims.email,
        displayName: claims.displayName ?? null,
      },
      update: {
        email: claims.email,
        displayName: claims.displayName ?? null,
      },
    })

    return this.issueSession(user.id, user.email, user.displayName)
  }

  /**
   * Rotating refresh.
   *
   * The presented token is revoked as part of issuing its replacement, so a
   * refresh token is single-use. A token presented twice is rejected the
   * second time, which both limits replay and makes theft visible.
   */
  async refresh(refreshToken: string): Promise<SessionResponse> {
    const session = await this.prisma.authSession.findUnique({
      where: { refreshTokenHash: hashToken(refreshToken) },
      include: { user: true },
    })

    // Unknown, already rotated, explicitly revoked, or past its expiry — all
    // indistinguishable to the caller on purpose.
    if (
      !session ||
      session.revokedAt !== null ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException('Invalid refresh token')
    }

    await this.prisma.authSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    })

    return this.issueSession(
      session.user.id,
      session.user.email,
      session.user.displayName,
    )
  }

  /**
   * Revokes the presented session. Idempotent and deliberately quiet: an
   * already-invalid token still reports success, because the caller's goal —
   * that this token no longer works — is satisfied either way, and reporting
   * otherwise would turn logout into a token oracle.
   */
  async logout(refreshToken: string): Promise<{ revoked: boolean }> {
    const result = await this.prisma.authSession.updateMany({
      where: { refreshTokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    })

    return { revoked: result.count > 0 }
  }

  private async issueSession(
    userId: string,
    email: string,
    displayName: string | null,
  ): Promise<SessionResponse> {
    const refreshToken = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url')

    await this.prisma.authSession.create({
      data: {
        userId,
        // Only the hash is persisted.
        refreshTokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
      },
    })

    const accessToken = await this.jwt.signAsync(
      { sub: userId },
      {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      },
    )

    return {
      // Sanitized: the Google subject is never returned to the client.
      user: { id: userId, email, displayName },
      accessToken,
      refreshToken,
    }
  }
}

/**
 * SHA-256 is right here where a password hash would not be: the input is 48
 * bytes of cryptographic randomness, so it cannot be brute-forced or guessed
 * from a rainbow table, and lookups must stay fast.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
