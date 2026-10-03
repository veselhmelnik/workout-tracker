/**
 * Boot-time configuration check. Secrets are supplied through the process
 * environment and never committed; see .env.example for the variable names.
 */
const REQUIRED = [
  'DATABASE_URL',
  /** Signs access tokens. A long random string, rotated out of band. */
  'JWT_SECRET',
  /** Comma-separated OAuth client ids accepted as the token audience. */
  'GOOGLE_CLIENT_IDS',
] as const

export function validateEnvironment(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const missing = REQUIRED.filter((key) => {
    const value = config[key]

    return typeof value !== 'string' || value.trim() === ''
  })

  if (missing.length > 0) {
    // Names only — never values.
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    )
  }

  return config
}
