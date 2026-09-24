import { AddToWorkoutSheet } from '@/components/exercise/AddToWorkoutSheet'
import { ExerciseResultRow } from '@/components/exercise/ExerciseResultRow'
import { ProgressPreviewCard } from '@/components/exercise/ProgressPreviewCard'
import { Button } from '@/components/ui/Button'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { ErrorView, LoadingView } from '@/components/ui/StateViews'
import { colors, gutter, labelText, radius, spacing } from '@/constants/theme'
import { useAsyncData } from '@/hooks/useAsyncData'
import { getExerciseDetailsById } from '@/repositories/exerciseRepository'
import {
  getExerciseHistorySummary,
  getRecentExerciseHistory,
} from '@/repositories/historyRepository'
import type { ExerciseDetails } from '@/types/entities'
import {
  buildTechniqueQuery,
  buildTechniqueSearchUrl,
} from '@/utils/exerciseForm'
import { UNSET_MUSCLE_LABEL } from '@/utils/exerciseGroups'
import { formatHistorySets } from '@/utils/sessionFormat'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useState, type ReactNode } from 'react'
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const RECENT_LIMIT = 3

export default function ExerciseDetailsScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false)

  const load = useCallback(async () => {
    const [details, recent, summary] = await Promise.all([
      getExerciseDetailsById(id),
      getRecentExerciseHistory(id, RECENT_LIMIT),
      getExerciseHistorySummary(id),
    ])

    if (!details) {
      throw new Error('This exercise no longer exists.')
    }

    return { details, recent, sessionCount: summary?.sessionCount ?? 0 }
  }, [id])

  const { data, isLoading, error, reload } = useAsyncData(load, [id])

  const exercise = data?.details.exercise
  // Library exercises are read-only; archived ones are no longer editable.
  const canEdit = exercise !== undefined && !exercise.isBuiltIn && !exercise.isArchived

  const openTechniqueSearch = async (query: string) => {
    try {
      await Linking.openURL(buildTechniqueSearchUrl(query))
    } catch {
      Alert.alert('Could not open YouTube', 'Check that a browser is available.')
    }
  }

  const header = (
    <ScreenHeader
      actionLabel={canEdit ? 'Edit' : undefined}
      onAction={() => router.push(`/exercise/${id}/edit`)}
      title="Exercise"
    />
  )

  if (isLoading && !data) {
    return (
      <Screen header={header}>
        <View style={styles.gate}>
          <LoadingView />
        </View>
      </Screen>
    )
  }

  // A failed refresh keeps the last good details and reports inline below.
  if (!data || !exercise) {
    return (
      <Screen header={header}>
        <View style={styles.gate}>
          <ErrorView
            error={error ?? new Error('This exercise no longer exists.')}
            onRetry={reload}
          />
        </View>
      </Screen>
    )
  }

  const techniqueQuery = buildTechniqueQuery(exercise.name)
  const hasHistory = data.recent.length > 0

  return (
    <Screen header={header}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.name}>{exercise.name}</Text>
        <ExerciseMetaLine details={data.details} />

        {error ? (
          <Text style={styles.staleNotice}>
            Could not refresh. Showing saved results.
          </Text>
        ) : null}

        <SectionHeading>Recent performance</SectionHeading>

        {hasHistory ? (
          <>
            {data.recent.map((item, index) => (
              <ExerciseResultRow
                isLatest={index === 0}
                isPr={item.isPr}
                key={item.sessionExerciseId}
                performedAt={item.performedAt}
                value={formatHistorySets(item, exercise.type)}
              />
            ))}

            <View style={styles.viewAll}>
              <Button
                label="View full history"
                onPress={() => router.push(`/exercise/${id}/history`)}
                variant="secondary"
              />
            </View>
          </>
        ) : (
          <View style={styles.noHistory}>
            <Text style={styles.noHistoryTitle}>No recorded sets yet</Text>
            <Text style={styles.noHistoryBody}>
              Add this exercise to a workout. Your results will appear here
              after the first session.
            </Text>
          </View>
        )}

        <SectionHeading>Progress</SectionHeading>
        <ProgressPreviewCard sessionCount={data.sessionCount} />

        <SectionHeading>Technique</SectionHeading>
        <Pressable
          accessibilityHint="Opens a YouTube search in the browser"
          accessibilityRole="link"
          disabled={!techniqueQuery}
          onPress={() => openTechniqueSearch(techniqueQuery)}
          style={({ pressed }) => [styles.technique, pressed && styles.pressed]}
        >
          <View style={styles.techniqueText}>
            <Text style={styles.techniqueTitle}>YouTube</Text>
            <Text numberOfLines={1} style={styles.techniqueQuery}>
              Search “{techniqueQuery}”
            </Text>
          </View>
          <Text style={styles.techniqueArrow}>↗</Text>
        </Pressable>

        {/* Same understated row whether or not the exercise has history. */}
        <Pressable
          accessibilityRole="button"
          onPress={() => setIsAddSheetOpen(true)}
          style={({ pressed }) => [styles.addRow, pressed && styles.pressed]}
        >
          <View style={styles.addText}>
            <Text style={styles.addTitle}>Add to a workout</Text>
            <Text style={styles.addSubtitle}>Choose which workout</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </ScrollView>

      <AddToWorkoutSheet
        onChoose={(workoutId) => {
          setIsAddSheetOpen(false)
          router.push({
            pathname: '/workout/[id]',
            params: { id: workoutId, addExerciseId: exercise.id },
          })
        }}
        onClose={() => setIsAddSheetOpen(false)}
        visible={isAddSheetOpen}
      />
    </Screen>
  )
}

function Screen({ header, children }: { header: ReactNode; children: ReactNode }) {
  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {header}
      {children}
    </SafeAreaView>
  )
}

function SectionHeading({ children }: { children: string }) {
  return <Text style={styles.sectionHeading}>{children}</Text>
}

/** Type pill, then the primary muscle, then secondaries at lower weight. */
function ExerciseMetaLine({ details }: { details: ExerciseDetails }) {
  const secondaries = details.secondaryMuscles.map((muscle) => muscle.name)

  return (
    <View style={styles.meta}>
      <Text style={styles.typePill}>
        {details.exercise.type === 'WEIGHTED' ? 'Weighted' : 'Bodyweight'}
      </Text>

      <Text style={styles.muscles}>
        <Text
          style={details.primaryMuscle ? styles.primaryMuscle : styles.unsetMuscle}
        >
          {details.primaryMuscle?.name ?? UNSET_MUSCLE_LABEL}
        </Text>
        {secondaries.length > 0 ? ` · ${secondaries.join(' · ')}` : ''}
      </Text>
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

  content: {
    paddingBottom: spacing.xxl,
    paddingHorizontal: gutter,
    paddingTop: 18,
  },

  name: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },

  meta: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginTop: 7,
  },

  typePill: {
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  muscles: {
    color: colors.textMuted,
    flexShrink: 1,
    fontSize: 13,
  },

  primaryMuscle: {
    color: colors.textSecondary,
  },

  unsetMuscle: {
    color: colors.textMuted,
    fontStyle: 'italic',
  },

  staleNotice: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.sm,
  },

  sectionHeading: {
    ...labelText,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: 26,
  },

  viewAll: {
    marginTop: 14,
  },

  noHistory: {
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    gap: 5,
    paddingVertical: spacing.xl,
  },

  noHistoryTitle: {
    color: colors.textPrimary,
    fontSize: 14.5,
    fontWeight: '600',
  },

  noHistoryBody: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 21,
  },

  technique: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: spacing.sm,
  },

  techniqueText: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },

  techniqueTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },

  techniqueQuery: {
    color: colors.textMuted,
    fontSize: 11.5,
  },

  techniqueArrow: {
    color: colors.textPrimary,
    fontSize: 14,
  },

  addRow: {
    alignItems: 'center',
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: 22,
    minHeight: 56,
    paddingTop: 14,
  },

  addText: {
    flex: 1,
    gap: 2,
  },

  addTitle: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },

  addSubtitle: {
    color: colors.textMuted,
    fontSize: 11.5,
  },

  chevron: {
    color: colors.textMuted,
    fontSize: 17,
  },

  pressed: {
    opacity: 0.6,
  },
})
