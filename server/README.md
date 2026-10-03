# Setline API

Identity only. No backup, restore, sync or object storage — those are later
features and nothing here anticipates their schema.

The mobile SQLite database is unrelated to this one. It stays at **migration
8** and gains no `user_id` columns: local training data belongs to the device,
and account identity exists for cloud services that do not exist yet.

## Endpoints

| Endpoint | Body | Purpose |
|---|---|---|
| `POST /auth/google` | `{ idToken }` | Verify a Google ID token, create or resolve the user, issue a session |
| `POST /auth/refresh` | `{ refreshToken }` | Rotate: revoke the presented token, issue a new pair |
| `POST /auth/logout` | `{ refreshToken }` | Revoke the session |

Each returns `{ user: { id, email, displayName }, accessToken, refreshToken }`.
The Google subject is never returned.

Only the credential is accepted on each endpoint. A client cannot supply a
user id or an email: identity comes from the verified token, or from the
session the refresh token resolves to.

## Tokens

- **Access**: JWT, 15 minutes, `sub` = Setline user UUID. Sent as
  `Authorization: Bearer <accessToken>`.
- **Refresh**: 48 random bytes, base64url, 30 days, **single use**.

Both lifetimes are constants in `src/auth/auth.service.ts`.

Refresh tokens are stored only as a SHA-256 hash, so a database leak yields no
usable credentials. SHA-256 rather than a password hash is correct here: the
input is cryptographic randomness, so it cannot be guessed or brute-forced,
and lookups must stay fast.

Rotation revokes the presented token as part of issuing its replacement, so a
replayed refresh token is rejected the second time.

## Setup

```bash
npm install
cp .env.example .env     # fill in; .env is gitignored
npx prisma migrate deploy
npm run start:dev
```

Requires PostgreSQL. Variables are listed in `.env.example` — names only, no
values are committed. Nothing logs identity tokens, access tokens or refresh
tokens.

## Google Cloud Console setup (manual)

**None of this can be done from code.** Setline ships two Android packages, and
a single Android OAuth client does **not** cover both — an Android client is
bound to one package name plus one SHA-1 fingerprint.

In **APIs & Services → Credentials**, create:

1. **Web application client** — one, shared.
   Its client id is the ID token *audience*, because Android issues the token
   for the web client, not the Android one. Put it in:
   - the app's `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
   - the server's `GOOGLE_CLIENT_IDS`

   These two must match or every sign-in is rejected.

2. **Android client — development**
   - Package name: `com.hmelnik.workouttracker.dev`
   - SHA-1: the **EAS development/preview signing** fingerprint

3. **Android client — production**
   - Package name: `com.hmelnik.workouttracker`
   - SHA-1: the **EAS production signing** fingerprint

4. **Android client — Play App Signing**, once the app is on Play.
   Google re-signs uploads, so the fingerprint users actually run differs from
   your upload key. Take the SHA-1 from Play Console → Setup → App signing and
   add it as a further Android client for `com.hmelnik.workouttracker`.
   Sign-in works in internal testing and then fails in production without it.

Read the EAS fingerprints with:

```bash
eas credentials -p android
```

Also configure the **OAuth consent screen** (app name, support email, scopes
`email` and `profile` only) and add test users while it is unverified.

Android clients need no secret. The web client's secret is **not** used by
Setline: the server verifies ID tokens against Google's public keys and never
performs a code exchange, so the secret should not be put in any `.env` here.
