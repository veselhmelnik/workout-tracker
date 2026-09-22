import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'

type AsyncState<T> = {
  data: T | null
  isLoading: boolean
  error: Error | null
}

/**
 * Loads data from the repository layer and reloads it whenever the screen
 * regains focus, so edits made on a pushed screen show up on the way back.
 */
export function useAsyncData<T>(
  loader: () => Promise<T>,
  deps: readonly unknown[] = [],
) {
  const loaderRef = useRef(loader)
  loaderRef.current = loader

  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true

    return () => {
      isMounted.current = false
    }
  }, [])

  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    isLoading: true,
    error: null,
  })

  const reload = useCallback(async () => {
    setState((previous) => ({ ...previous, isLoading: true, error: null }))

    try {
      const data = await loaderRef.current()

      if (isMounted.current) {
        setState({ data, isLoading: false, error: null })
      }
    } catch (error) {
      if (isMounted.current) {
        // Keep the last good data so a failed refresh does not blank a
        // screen that was already showing valid content.
        setState((previous) => ({
          data: previous.data,
          isLoading: false,
          error: error instanceof Error ? error : new Error(String(error)),
        }))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useFocusEffect(
    useCallback(() => {
      reload()
    }, [reload]),
  )

  return { ...state, reload }
}
