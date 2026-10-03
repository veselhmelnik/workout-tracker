import { UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GoogleVerifier } from '../src/auth/google.verifier'

/**
 * Google's library is mocked, so the suite never makes a live request. What
 * is under test is Setline's own handling of the verification result: issuer,
 * verified email, and that a rejection from the library stays a rejection.
 *
 * Audience enforcement itself is Google's — the assertion here is that the
 * configured ids are the ones handed to it.
 */
const verifyIdToken = jest.fn()

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: (...args: unknown[]) => verifyIdToken(...args),
  })),
}))

function createVerifier(clientIds = 'web-client-id,other-client-id') {
  const config = {
    getOrThrow: () => clientIds,
  } as unknown as ConfigService

  return new GoogleVerifier(config)
}

function ticket(payload: Record<string, unknown> | undefined) {
  return { getPayload: () => payload }
}

const VALID = {
  iss: 'https://accounts.google.com',
  sub: 'google-sub-1',
  email: 'lifter@example.com',
  email_verified: true,
  name: 'Lifter',
}

describe('GoogleVerifier', () => {
  beforeEach(() => {
    verifyIdToken.mockReset()
  })

  it('returns claims for a valid token', async () => {
    verifyIdToken.mockResolvedValue(ticket(VALID))

    await expect(createVerifier().verify('token')).resolves.toEqual({
      subject: 'google-sub-1',
      email: 'lifter@example.com',
      displayName: 'Lifter',
    })
  })

  it('passes every configured client id as the accepted audience', async () => {
    verifyIdToken.mockResolvedValue(ticket(VALID))

    await createVerifier().verify('token')

    expect(verifyIdToken).toHaveBeenCalledWith({
      idToken: 'token',
      audience: ['web-client-id', 'other-client-id'],
    })
  })

  it('rejects when Google rejects the token', async () => {
    // Covers a bad signature, an expired token and a wrong audience: all of
    // them surface as a throw from verifyIdToken.
    verifyIdToken.mockRejectedValue(new Error('Wrong recipient'))

    await expect(createVerifier().verify('token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    )
  })

  it('rejects a token from an unexpected issuer', async () => {
    verifyIdToken.mockResolvedValue(
      ticket({ ...VALID, iss: 'https://evil.example.com' }),
    )

    await expect(createVerifier().verify('token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    )
  })

  it('rejects a token with an unverified email', async () => {
    verifyIdToken.mockResolvedValue(
      ticket({ ...VALID, email_verified: false }),
    )

    await expect(createVerifier().verify('token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    )
  })

  it('rejects an empty payload', async () => {
    verifyIdToken.mockResolvedValue(ticket(undefined))

    await expect(createVerifier().verify('token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    )
  })
})
