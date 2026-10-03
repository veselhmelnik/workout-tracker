import { UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { AuthService, hashToken } from '../src/auth/auth.service'
import { GoogleVerifier } from '../src/auth/google.verifier'
import { PrismaService } from '../src/prisma/prisma.service'

/**
 * The Google boundary is stubbed throughout: the suite must never depend on a
 * live Google request, and the rejection paths cannot be exercised otherwise.
 *
 * Prisma is replaced with an in-memory double, so the tests assert the
 * service's own rules — upsert on subject, rotation, revocation — without a
 * database.
 */
type UserRow = {
  id: string
  googleSubject: string
  email: string
  displayName: string | null
}

type SessionRow = {
  id: string
  userId: string
  refreshTokenHash: string
  expiresAt: Date
  revokedAt: Date | null
  user: UserRow
}

function createPrismaDouble() {
  const users: UserRow[] = []
  const sessions: SessionRow[] = []
  let sequence = 0

  return {
    users,
    sessions,

    user: {
      upsert: jest.fn(
        async ({ where, create, update }: any): Promise<UserRow> => {
          const existing = users.find(
            (row) => row.googleSubject === where.googleSubject,
          )

          if (existing) {
            existing.email = update.email
            existing.displayName = update.displayName

            return existing
          }

          const created: UserRow = {
            id: `user-${++sequence}`,
            googleSubject: create.googleSubject,
            email: create.email,
            displayName: create.displayName,
          }

          users.push(created)

          return created
        },
      ),
    },

    authSession: {
      create: jest.fn(async ({ data }: any): Promise<SessionRow> => {
        const user = users.find((row) => row.id === data.userId)!

        const created: SessionRow = {
          id: `session-${++sequence}`,
          userId: data.userId,
          refreshTokenHash: data.refreshTokenHash,
          expiresAt: data.expiresAt,
          revokedAt: null,
          user,
        }

        sessions.push(created)

        return created
      }),

      findUnique: jest.fn(async ({ where }: any) => {
        return (
          sessions.find(
            (row) => row.refreshTokenHash === where.refreshTokenHash,
          ) ?? null
        )
      }),

      update: jest.fn(async ({ where, data }: any) => {
        const row = sessions.find((entry) => entry.id === where.id)!

        Object.assign(row, data)

        return row
      }),

      updateMany: jest.fn(async ({ where, data }: any) => {
        const matched = sessions.filter(
          (row) =>
            row.refreshTokenHash === where.refreshTokenHash &&
            row.revokedAt === null,
        )

        for (const row of matched) {
          Object.assign(row, data)
        }

        return { count: matched.length }
      }),
    },
  }
}

const CLAIMS = {
  subject: 'google-sub-1',
  email: 'lifter@example.com',
  displayName: 'Lifter',
}

function createService(verify: GoogleVerifier['verify']) {
  const prisma = createPrismaDouble()

  const config = {
    getOrThrow: (key: string) =>
      key === 'JWT_SECRET' ? 'test-secret' : 'client-id',
  } as unknown as ConfigService

  const service = new AuthService(
    prisma as unknown as PrismaService,
    new JwtService({}),
    config,
    { verify } as unknown as GoogleVerifier,
  )

  return { service, prisma }
}

describe('AuthService', () => {
  it('creates a user on first Google sign-in', async () => {
    const { service, prisma } = createService(async () => CLAIMS)

    const session = await service.signInWithGoogle('valid-token')

    expect(prisma.users).toHaveLength(1)
    expect(session.user.email).toBe(CLAIMS.email)
    expect(session.accessToken).toBeTruthy()
    expect(session.refreshToken).toBeTruthy()
    // The Google subject must never be exposed to the client.
    expect(JSON.stringify(session.user)).not.toContain(CLAIMS.subject)
  })

  it('resolves the same user on repeat sign-in, even if the email changed', async () => {
    // Same Google subject, different email on the second call: identity is
    // the subject, so this must stay one account rather than becoming two.
    let claims = CLAIMS

    const { service, prisma } = createService(async () => claims)

    const first = await service.signInWithGoogle('valid-token')

    claims = { ...CLAIMS, email: 'renamed@example.com' }

    const second = await service.signInWithGoogle('valid-token')

    expect(prisma.users).toHaveLength(1)
    expect(second.user.id).toBe(first.user.id)
    // The stored email follows the provider.
    expect(second.user.email).toBe('renamed@example.com')
  })

  it('rejects an invalid Google token', async () => {
    const { service, prisma } = createService(async () => {
      throw new UnauthorizedException('Invalid Google token')
    })

    await expect(service.signInWithGoogle('bad-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    )

    expect(prisma.users).toHaveLength(0)
  })

  it('rejects a token issued for another audience', async () => {
    // The verifier is what enforces the audience; a wrong `aud` surfaces here
    // as a rejection, and no user may be created as a side effect.
    const { service, prisma } = createService(async () => {
      throw new UnauthorizedException('Invalid Google token')
    })

    await expect(
      service.signInWithGoogle('token-for-another-app'),
    ).rejects.toBeInstanceOf(UnauthorizedException)

    expect(prisma.users).toHaveLength(0)
  })

  it('stores only a hash of the refresh token', async () => {
    const { service, prisma } = createService(async () => CLAIMS)

    const session = await service.signInWithGoogle('valid-token')

    expect(prisma.sessions[0].refreshTokenHash).toBe(
      hashToken(session.refreshToken),
    )
    expect(prisma.sessions[0].refreshTokenHash).not.toBe(session.refreshToken)
  })

  it('refreshes and rotates, invalidating the presented token', async () => {
    const { service } = createService(async () => CLAIMS)

    const first = await service.signInWithGoogle('valid-token')
    const second = await service.refresh(first.refreshToken)

    expect(second.refreshToken).not.toBe(first.refreshToken)
    expect(second.user.id).toBe(first.user.id)

    // Single use: replaying the old token must fail.
    await expect(service.refresh(first.refreshToken)).rejects.toBeInstanceOf(
      UnauthorizedException,
    )

    // The new one still works.
    await expect(service.refresh(second.refreshToken)).resolves.toBeDefined()
  })

  it('rejects an expired refresh token', async () => {
    const { service, prisma } = createService(async () => CLAIMS)

    const session = await service.signInWithGoogle('valid-token')

    prisma.sessions[0].expiresAt = new Date(Date.now() - 1000)

    await expect(service.refresh(session.refreshToken)).rejects.toBeInstanceOf(
      UnauthorizedException,
    )
  })

  it('rejects an unknown refresh token', async () => {
    const { service } = createService(async () => CLAIMS)

    await expect(service.refresh('never-issued')).rejects.toBeInstanceOf(
      UnauthorizedException,
    )
  })

  it('revokes the session on logout and rejects it afterwards', async () => {
    const { service } = createService(async () => CLAIMS)

    const session = await service.signInWithGoogle('valid-token')

    await expect(service.logout(session.refreshToken)).resolves.toEqual({
      revoked: true,
    })

    await expect(service.refresh(session.refreshToken)).rejects.toBeInstanceOf(
      UnauthorizedException,
    )
  })

  it('treats logout of an unknown token as a no-op rather than an error', async () => {
    const { service } = createService(async () => CLAIMS)

    await expect(service.logout('never-issued')).resolves.toEqual({
      revoked: false,
    })
  })
})
