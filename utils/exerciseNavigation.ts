import type { useRouter } from 'expo-router'

type Router = ReturnType<typeof useRouter>

/**
 * Pops back to the Exercises tab with My Exercises selected. The tab
 * refetches on focus, so a created or archived exercise shows immediately.
 */
export function returnToMyExercises(router: Router) {
  const href = {
    pathname: '/exercises',
    params: { source: 'custom' },
  } as const

  if (router.canDismiss()) {
    router.dismissTo(href)
  } else {
    router.replace(href)
  }
}
