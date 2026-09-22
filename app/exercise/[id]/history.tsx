import { ExerciseResultRow } from '@/components/exercise/ExerciseResultRow'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/StateViews'
import { colors, fonts, gutter, spacing } from '@/constants/theme'
import { useAsyncData } from '@/hooks/useAsyncData'
import { getExerciseDetailsById } from '@/repositories/exerciseRepository'
import {
  getExerciseHistory,
  getExerciseHistorySummary,
  type ExerciseHistorySummary,
} from '@/repositories/historyRepository'
import { formatHistorySets, formatWeight } from '@/utils/sessionFormat'
import { useLocalSearchParams } from 'expo-router'
import { useCallback } from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function ExerciseHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()

  const load = useCallback(async () => {
    const [details, history, summary] = await Promise.all([
      getExerciseDetailsById(id),
      getExerciseHistory(id),
      getExerciseHistorySummary(id),
    ])

    if (!details) {
      throw new Error('This exercise no longer exists.')
    }

    return { exercise: details.exercise, history, summary }
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

      {data && !error ? (
        data.history.length === 0 ? (
          <View style={styles.gate}>
            <EmptyView message="No recorded sets yet. Results appear here after the first finished session." />
          </View>
        ) : (
          <>
            <SummaryBar summary={data.summary} />

            {/* Newest first, as returned; long histories stay virtualised. */}
            <FlatList
              contentContainerStyle={styles.list}
              data={data.history}
              initialNumToRender={15}
              keyExtractor={(item) => item.sessionExerciseId}
              renderItem={({ item, index }) => (
                <ExerciseResultRow
                  context={item.workoutName}
                  isLast={index === data.history.length - 1}
                  isLatest={index === 0}
                  performedAt={item.performedAt}
                  value={formatHistorySets(item, data.exercise.type)}
                />
              )}
            />
          </>
        )
      ) : null}
    </SafeAreaView>
  )
}

/**
 * Session count and best single set. For weighted work "best set volume" is
 * weight × reps of one set (55×5 = 275 kg beats 60×3 = 180 kg); it is not the
 * heaviest weight, an estimated 1RM, or session volume.
 */
function SummaryBar({ summary }: { summary: ExerciseHistorySummary | null }) {
  const sessionCount = summary?.sessionCount ?? 0
  const bestSet = summary?.bestSet ?? null

  return (
    <View style={styles.summary}>
      <Text style={styles.summaryText}>
        {sessionCount} {sessionCount === 1 ? 'session' : 'sessions'}
      </Text>

      {bestSet?.type === 'WEIGHTED' ? (
        <Text style={styles.summaryText}>
          Best set volume{' '}
          <Text style={styles.summaryValue}>
            {formatWeight(bestSet.volume)} kg
          </Text>{' '}
          · {formatWeight(bestSet.weight)}×{bestSet.reps}
        </Text>
      ) : null}

      {bestSet?.type === 'BODYWEIGHT' ? (
        <Text style={styles.summaryText}>
          Best set{' '}
          <Text style={styles.summaryValue}>
            {bestSet.reps} {bestSet.reps === 1 ? 'rep' : 'reps'}
          </Text>
        </Text>
      ) : null}
    </View>
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

  summary: {
    alignItems: 'baseline',
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
    paddingHorizontal: gutter,
    paddingVertical: spacing.md,
  },

  summaryText: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 12.5,
  },

  summaryValue: {
    color: colors.textPrimary,
  },

  list: {
    paddingBottom: spacing.xxl,
    paddingHorizontal: gutter,
  },
})
