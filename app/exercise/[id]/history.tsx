import { HistoryRow } from '@/components/history/HistoryRow'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/StateViews'
import { colors, gutter, spacing } from '@/constants/theme'
import { useAsyncData } from '@/hooks/useAsyncData'
import { getExerciseById } from '@/repositories/exerciseRepository'
import { getExerciseHistory } from '@/repositories/historyRepository'
import { formatDayMonth } from '@/utils/format'
import { formatHistorySets } from '@/utils/sessionFormat'
import { useLocalSearchParams } from 'expo-router'
import { useCallback } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function ExerciseHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()

  const load = useCallback(async () => {
    const exercise = await getExerciseById(id)

    if (!exercise) {
      throw new Error('This exercise no longer exists.')
    }

    return { exercise, history: await getExerciseHistory(id) }
  }, [id])

  const { data, isLoading, error, reload } = useAsyncData(load, [id])

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <ScreenHeader title={data?.exercise.name ?? 'History'} />

      {isLoading && !data ? (
        <View style={styles.gate}>
          <LoadingView />
        </View>
      ) : null}

      {error ? (
        <View style={styles.gate}>
          <ErrorView error={error} onRetry={reload} />
        </View>
      ) : null}

      {data ? (
        <ScrollView contentContainerStyle={styles.content}>
          {data.history.length === 0 ? (
            <EmptyView message="No history yet for this exercise." />
          ) : null}

          {data.history.map((item) => (
            <HistoryRow
              date={formatDayMonth(item.performedAt)}
              key={item.sessionExerciseId}
              meta={item.workoutName}
              value={formatHistorySets(item, data.exercise.type)}
            />
          ))}
        </ScrollView>
      ) : null}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },

  gate: {
    flex: 1,
    justifyContent: 'center',
  },

  content: {
    paddingBottom: spacing.xxl,
    paddingHorizontal: gutter,
    paddingTop: spacing.xs,
  },
})
