import { useEffect, useState } from 'react'
import { AppState } from 'react-native'

type TimerSource = {
  startedAt: string
  pausedAt: string | null
  totalPausedDuration: number
}

/**
 * Elapsed workout time derived from the session timestamps on every tick, so
 * it stays correct across backgrounding, and while paused it simply stops
 * moving because `pausedAt` fixes the end of the interval.
 */
export function useSessionTimer(session: TimerSource | null): number {
  const [elapsedMs, setElapsedMs] = useState(() => computeElapsed(session))

  useEffect(() => {
    setElapsedMs(computeElapsed(session))

    // While paused the value is fixed, so there is nothing to tick.
    if (!session || session.pausedAt) {
      return
    }

    const tick = () => setElapsedMs(computeElapsed(session))

    const interval = setInterval(tick, 1000)

    // Timers are throttled in the background; resync as soon as we return.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        tick()
      }
    })

    return () => {
      clearInterval(interval)
      subscription.remove()
    }
  }, [session])

  return elapsedMs
}

function computeElapsed(session: TimerSource | null): number {
  if (!session) {
    return 0
  }

  const startedAt = new Date(session.startedAt).getTime()

  const endedAt = session.pausedAt
    ? new Date(session.pausedAt).getTime()
    : Date.now()

  return Math.max(0, endedAt - startedAt - session.totalPausedDuration)
}
