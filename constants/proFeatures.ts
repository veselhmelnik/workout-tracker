/**
 * Which capabilities belong to Setline Pro, and what each one is called.
 *
 * This is the single place the free/Pro split is decided. Screens ask
 * `useProFeature('...')` rather than testing `isPro`, so moving a feature
 * between tiers is one edit here instead of a sweep through the UI.
 */
export type ProFeature =
  | 'alternative_exercises'
  | 'advanced_progress'
  | 'export'
  | 'backup_sync'

/**
 * True when the feature requires Pro. Everything in the free core — workouts,
 * exercises, sessions, history, personal records, the Exercise Details
 * progress chart, history correction and deletion — is absent from this map
 * entirely and is never gated.
 */
const PRO_GATED: Record<ProFeature, boolean> = {
  alternative_exercises: true,
  // Future analytics beyond the existing Exercise Details chart, which stays free.
  advanced_progress: true,
  export: true,
  backup_sync: true,
}

/**
 * Whether the feature is actually built. Deliberately separate from
 * entitlement: holding Pro does not conjure an implementation, so a Pro user
 * still sees "Coming soon" for export rather than a screen that does nothing.
 */
const IMPLEMENTED: Record<ProFeature, boolean> = {
  alternative_exercises: true,
  advanced_progress: false,
  export: false,
  backup_sync: false,
}

/** Copy for the upsell surface and for Settings rows. */
export const PRO_FEATURE_COPY: Record<
  ProFeature,
  { title: string; description: string }
> = {
  alternative_exercises: {
    title: 'Alternative exercises',
    description:
      'Switch an exercise for the current workout when equipment is busy, while keeping your original workout plan intact.',
  },

  advanced_progress: {
    title: 'Advanced progress',
    description:
      'Deeper trends across your training. The exercise progress chart stays free.',
  },

  export: {
    title: 'Export Data',
    description: 'Take your training history out of the app as a file.',
  },

  backup_sync: {
    title: 'Backup & Sync',
    description: 'Keep your workout data backed up across devices.',
  },
}

export function isProGatedFeature(feature: ProFeature): boolean {
  return PRO_GATED[feature]
}

export function isFeatureImplemented(feature: ProFeature): boolean {
  return IMPLEMENTED[feature]
}
