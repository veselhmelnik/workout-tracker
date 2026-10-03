import type { ConfigContext, ExpoConfig } from 'expo/config'

/**
 * App identity per build variant, so Setline and Setline Dev install as two
 * separate Android apps.
 *
 * `config` arrives already populated from app.json, which stays the single
 * source of truth for everything else — plugins, icons, splash, slug, EAS
 * project id. Only the three identity fields are overridden here, so no
 * existing configuration can be dropped by this file.
 *
 * APP_VARIANT is deliberately its own setting. It is not derived from
 * __DEV__ (which distinguishes a dev bundle from a release bundle, not one
 * app from another) and not from EXPO_PUBLIC_REVENUECAT_MODE (which chooses a
 * billing backend). A preview build, for example, is a release bundle with the
 * development identity and the Test Store — three independent axes.
 */
type AppVariant = 'development' | 'production'

/**
 * Anything other than the exact string "development" resolves to production.
 * That way a missing or misspelled value yields the stable identity rather
 * than silently handing the real app's package to a test build.
 */
function resolveVariant(): AppVariant {
  return process.env.APP_VARIANT === 'development'
    ? 'development'
    : 'production'
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const variant = resolveVariant()
  const isDevelopment = variant === 'development'

  return {
    ...config,

    // Required by the ExpoConfig type; both come from app.json.
    name: isDevelopment ? 'Setline Dev' : config.name ?? 'Setline',
    slug: config.slug ?? 'setline',

    // A distinct scheme per variant. With both apps installed, two apps
    // claiming `setline://` would make deep links — and the dev client's own
    // reopen link — ambiguous, so the development app gets its own.
    scheme: isDevelopment ? 'setline-dev' : config.scheme,

    android: {
      ...config.android,

      // The production package is fixed and must never move: it is the
      // identity of the installed app and of the Play listing.
      package: isDevelopment
        ? 'com.hmelnik.workouttracker.dev'
        : 'com.hmelnik.workouttracker',
    },
  }
}
