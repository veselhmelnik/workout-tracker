import {
  MonthHeading,
  SessionRow,
  SessionRowSkeleton,
} from '@/components/history/SessionRow'
import { WorkoutFilterSheet } from '@/components/history/WorkoutFilterSheet'
import { Button } from '@/components/ui/Button'
import { colors, fontSize, gutter, radius, spacing } from '@/constants/theme'
import { useAsyncData } from '@/hooks/useAsyncData'
import {
  getWorkoutSessions,
  getWorkoutsWithSessions,
  type WorkoutSessionHistoryItem,
} from '@/repositories/workoutSessionHistoryRepository'
import { formatMonthHeading, getMonthKey } from '@/utils/sessionHistoryFormat'
import { useRouter } from 'expo-router'
import { useCallback, useMemo, useState } from 'react'
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type MonthSection = {
  key: string
  title: string
  data: WorkoutSessionHistoryItem[]
}

const SKELETON_ROWS = Array.from({ length: 8 }, (_, index) => index)

export default function HistoryScreen() {
  const router = useRouter()
  const [workoutId, setWorkoutId] = useState<string | null>(null)
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const load = useCallback(async () => {
    const [sessions, workouts] = await Promise.all([
      getWorkoutSessions(workoutId ?? undefined),
      getWorkoutsWithSessions(),
    ])

    // Tag the result with its filter so a slow or failed reload for a new
    // filter never shows the previous filter's sessions as if they matched.
    return { workoutId, sessions, workouts }
  }, [workoutId])

  const { data, error, reload } = useAsyncData(load, [workoutId])

  const isCurrent = data !== null && data.workoutId === workoutId
  const sessions = isCurrent ? data.sessions : null
  const workouts = data?.workouts ?? []
  const selectedWorkout = workouts.find((workout) => workout.id === workoutId)

  // Sessions arrive newest first; grouping preserves that order.
  const sections = useMemo<MonthSection[]>(() => {
    const result: MonthSection[] = []

    for (const session of sessions ?? []) {
      const key = getMonthKey(session.finishedAt)
      const last = result[result.length - 1]

      if (last?.key === key) {
        last.data.push(session)
      } else {
        result.push({
          key,
          title: formatMonthHeading(session.finishedAt),
          data: [session],
        })
      }
    }

    return result
  }, [sessions])

  const latestSessionId = sessions?.[0]?.id

  const openSession = useCallback(
    (sessionId: string) =>
      router.push({ pathname: '/history/[id]', params: { id: sessionId } }),
    [router],
  )

  const renderBody = () => {
    if (!sessions) {
      return error ? (
        <InlineMessage
          action={{ label: 'Retry', onPress: reload }}
          body="Your data is stored on this device and is safe."
          isError
          title="Could not load history"
        />
      ) : (
        <View style={styles.list}>
          {SKELETON_ROWS.map((index) => (
            <SessionRowSkeleton index={index} key={index} />
          ))}
        </View>
      )
    }

    if (sessions.length === 0) {
      return workoutId ? (
        <InlineMessage
          action={{ label: 'Show all workouts', onPress: () => setWorkoutId(null) }}
          body={`No finished sessions for ${selectedWorkout?.name ?? 'this workout'} yet.`}
          title="No sessions"
        />
      ) : (
        <InlineMessage
          body="Finish a workout and it will appear here."
          title="No sessions yet"
        />
      )
    }

    return (
      <SectionList
        ListHeaderComponent={
          // A refresh failed but earlier results are still valid.
          error ? (
            <Pressable
              accessibilityRole="button"
              onPress={reload}
              style={styles.staleNotice}
            >
              <Text style={styles.staleText}>
                Could not refresh. Showing saved results. Tap to retry.
              </Text>
            </Pressable>
          ) : null
        }
        contentContainerStyle={styles.listContent}
        initialNumToRender={14}
        keyExtractor={(session) => session.id}
        renderItem={({ item }) => (
          <SessionRow
            isLatest={item.id === latestSessionId}
            onPress={openSession}
            session={item}
          />
        )}
        renderSectionHeader={({ section }) => (
          <MonthHeading label={section.title} />
        )}
        sections={sections}
        stickySectionHeadersEnabled={false}
        style={styles.list}
      />
    )
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <Text style={styles.screenTitle}>History</Text>

      <Pressable
        accessibilityHint="Choose which workout's sessions to show"
        accessibilityRole="button"
        onPress={() => setIsFilterOpen(true)}
        style={({ pressed }) => [styles.filter, pressed && styles.pressed]}
      >
        <Text numberOfLines={1} style={styles.filterLabel}>
          {selectedWorkout?.name ?? 'All Workouts'}
        </Text>
        <Text style={styles.filterCaret}>▾</Text>
      </Pressable>

      {renderBody()}

      <WorkoutFilterSheet
        onClose={() => setIsFilterOpen(false)}
        onSelect={(nextWorkoutId) => {
          setIsFilterOpen(false)
          setWorkoutId(nextWorkoutId)
        }}
        selectedWorkoutId={workoutId}
        visible={isFilterOpen}
        workouts={workouts}
      />
    </SafeAreaView>
  )
}

type InlineMessageProps = {
  title: string
  body: string
  isError?: boolean
  action?: { label: string; onPress: () => void }
}

/** One line of cause, one of consequence; left-aligned like the design. */
function InlineMessage({ title, body, isError = false, action }: InlineMessageProps) {
  return (
    <View style={styles.message}>
      <Text style={[styles.messageTitle, isError && styles.messageTitleError]}>
        {title}
      </Text>
      <Text style={styles.messageBody}>{body}</Text>

      {action ? (
        <View style={styles.messageAction}>
          <Button
            label={action.label}
            onPress={action.onPress}
            size="compact"
            variant="secondary"
          />
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },

  screenTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.screenTitle,
    fontWeight: '700',
    letterSpacing: -0.56,
    paddingHorizontal: gutter,
    paddingTop: spacing.sm,
  },

  filter: {
    alignItems: 'center',
    backgroundColor: colors.elevated,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    height: 44,
    justifyContent: 'space-between',
    marginHorizontal: gutter,
    marginTop: 14,
    paddingHorizontal: 14,
  },

  filterLabel: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 14.5,
    fontWeight: '500',
  },

  filterCaret: {
    color: colors.textSecondary,
    fontSize: 13,
  },

  list: {
    flex: 1,
    paddingHorizontal: gutter,
  },

  listContent: {
    paddingBottom: spacing.xxl,
  },

  staleNotice: {
    backgroundColor: colors.strip,
    borderColor: colors.divider,
    borderLeftColor: colors.referenceRule,
    borderLeftWidth: 3,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },

  staleText: {
    color: colors.textSecondary,
    fontSize: 12.5,
  },

  message: {
    gap: 6,
    paddingHorizontal: gutter,
    paddingTop: spacing.xl,
  },

  messageTitle: {
    color: colors.textPrimary,
    fontSize: 14.5,
    fontWeight: '600',
  },

  messageTitleError: {
    color: colors.destructive,
  },

  messageBody: {
    color: colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 19,
  },

  messageAction: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    minWidth: 96,
  },

  pressed: {
    opacity: 0.7,
  },
})
