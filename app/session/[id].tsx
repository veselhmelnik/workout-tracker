import {
  ExercisePage,
  type SetDraft,
} from '@/components/session/ExercisePage'
import {
  FinishSheet,
  type FinishSummary,
} from '@/components/session/FinishSheet'
import { ChangeExerciseSheet } from '@/components/session/ChangeExerciseSheet'
import { RecentResultsSheet } from '@/components/session/RecentResultsSheet'
import { SessionHeader } from '@/components/session/SessionHeader'
import { ExercisePickerModal } from '@/components/workout/ExercisePickerModal'
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/StateViews'
import { Button } from '@/components/ui/Button'
import { colors, gutter, spacing } from '@/constants/theme'
import { useSessionTimer } from '@/hooks/useSessionTimer'
import {
  getLatestResultsForExercises,
  getRecentExerciseHistory,
  type ExerciseHistoryItem,
  type LatestExerciseResult,
} from '@/repositories/historyRepository'
import {
  getSessionExerciseAlternatives,
  replaceActiveSessionExercise,
  restorePlannedSessionExercise,
} from '@/repositories/sessionExerciseReplacementRepository'
import {
  addSet,
  cancelWorkoutSession,
  finishWorkout,
  getWorkoutSessionDetails,
  pauseWorkout,
  removeSet,
  restoreExercise,
  resumeWorkout,
  skipExercise,
  updateSetRecord,
  type WorkoutSessionDetails,
} from '@/repositories/workoutSessionRepository'
import {
  parseRepsInput,
  parseWeightInput,
  repsToInput,
  weightToInput,
} from '@/utils/sessionFormat'
import type { Exercise } from '@/types/entities'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert,
  AppState,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context'

type SessionExercise = WorkoutSessionDetails['exercises'][number]

type PreviousResults = Record<string, ExerciseHistoryItem | null>

/** A set write that failed and has already been reported to the user. */
class SetSaveError extends Error {}

function reportUnlessSetSaveError(title: string, error: unknown) {
  if (error instanceof SetSaveError) {
    return
  }

  Alert.alert(title, error instanceof Error ? error.message : String(error))
}

/** For fire-and-forget flushes: the failure is already alerted and retried later. */
function ignoreReportedFailure() {}

export default function ActiveSessionScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()

  const listRef = useRef<FlatList<SessionExercise>>(null)

  const [details, setDetails] = useState<WorkoutSessionDetails | null>(null)
  const [previous, setPrevious] = useState<PreviousResults>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const [index, setIndex] = useState(0)
  const [isBusy, setIsBusy] = useState(false)

  const [drafts, setDrafts] = useState<Record<string, SetDraft>>({})
  const draftsRef = useRef<Record<string, SetDraft>>({})
  const dirtyRef = useRef<Set<string>>(new Set())

  const [recentExercise, setRecentExercise] = useState<SessionExercise | null>(
    null,
  )
  const [recentItems, setRecentItems] = useState<ExerciseHistoryItem[] | null>(
    null,
  )
  const [isRecentLoading, setIsRecentLoading] = useState(false)

  // The slot whose Change Exercise flow is open, with its configured
  // alternatives and their last results.
  const [changeTarget, setChangeTarget] = useState<SessionExercise | null>(null)
  const [alternatives, setAlternatives] = useState<Exercise[] | null>(null)
  const [alternativePreviews, setAlternativePreviews] = useState<
    Map<string, LatestExerciseResult>
  >(() => new Map())
  const [isBrowseOpen, setIsBrowseOpen] = useState(false)
  const isChangingExerciseRef = useRef(false)

  const [isFinishSheetOpen, setIsFinishSheetOpen] = useState(false)
  const [isFinishing, setIsFinishing] = useState(false)
  const isCancellingRef = useRef(false)

  const elapsedMs = useSessionTimer(details)
  const isPaused = Boolean(details?.pausedAt)

  const syncDrafts = useCallback((session: WorkoutSessionDetails) => {
    setDrafts((current) => {
      const next: Record<string, SetDraft> = {}

      for (const exercise of session.exercises) {
        for (const set of exercise.sets) {
          // Keep values the user is still editing; take everything else
          // from the session snapshot.
          next[set.id] =
            dirtyRef.current.has(set.id) && current[set.id]
              ? current[set.id]
              : {
                  weight: weightToInput(set.weight),
                  reps: repsToInput(set.reps),
                }
        }
      }

      draftsRef.current = next

      return next
    })
  }, [])

  const load = useCallback(async () => {
    setError(null)

    try {
      const session = await getWorkoutSessionDetails(id)

      if (!session) {
        throw new Error('This workout session no longer exists.')
      }

      const previousEntries = await Promise.all(
        session.exercises.map(
          async (exercise) =>
            [
              exercise.exerciseId,
              (await getRecentExerciseHistory(exercise.exerciseId, 1))[0] ??
                null,
            ] as const,
        ),
      )

      setDetails(session)
      setPrevious(Object.fromEntries(previousEntries))
      syncDrafts(session)
      setIndex((current) =>
        Math.min(current, Math.max(0, session.exercises.length - 1)),
      )
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError : new Error(String(loadError)),
      )
    } finally {
      setIsLoading(false)
    }
  }, [id, syncDrafts])

  useEffect(() => {
    load()
  }, [load])

  const commitDraft = useCallback(async (setId: string) => {
    if (!dirtyRef.current.has(setId)) {
      return
    }

    const draft = draftsRef.current[setId]

    if (!draft) {
      return
    }

    dirtyRef.current.delete(setId)

    try {
      await updateSetRecord(setId, {
        weight: parseWeightInput(draft.weight),
        reps: parseRepsInput(draft.reps),
      })
    } catch (saveError) {
      dirtyRef.current.add(setId)

      const message =
        saveError instanceof Error ? saveError.message : String(saveError)

      Alert.alert('Could not save set', message)

      // Rethrow so callers awaiting a flush stop instead of finishing,
      // skipping or navigating with an unsaved set.
      throw new SetSaveError(message)
    }
  }, [])

  const flushDrafts = useCallback(async () => {
    for (const setId of [...dirtyRef.current]) {
      await commitDraft(setId)
    }
  }, [commitDraft])

  // A blur is not guaranteed when swiping pages or leaving the app, so also
  // write pending edits back on page change, on backgrounding and on unmount.
  useEffect(() => {
    flushDrafts().catch(ignoreReportedFailure)
  }, [index, flushDrafts])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        flushDrafts().catch(ignoreReportedFailure)
      }
    })

    return () => {
      subscription.remove()
      flushDrafts().catch(ignoreReportedFailure)
    }
  }, [flushDrafts])

  const handleChangeDraft = useCallback(
    (setId: string, field: keyof SetDraft, value: string) => {
      dirtyRef.current.add(setId)

      setDrafts((current) => {
        const next = {
          ...current,
          [setId]: { ...(current[setId] ?? { weight: '', reps: '' }), [field]: value },
        }

        draftsRef.current = next

        return next
      })
    },
    [],
  )

  /** Runs a repository mutation with pending edits flushed first. */
  const runMutation = useCallback(
    async (
      action: () => Promise<void>,
      errorTitle: string,
      afterReload?: () => void,
    ) => {
      if (isBusy) {
        return
      }

      setIsBusy(true)

      try {
        await flushDrafts()
        await action()
        await load()
        afterReload?.()
      } catch (mutationError) {
        reportUnlessSetSaveError(errorTitle, mutationError)
      } finally {
        setIsBusy(false)
      }
    },
    [flushDrafts, isBusy, load],
  )

  const goToIndex = useCallback(
    (nextIndex: number) => {
      const total = details?.exercises.length ?? 0

      if (nextIndex < 0 || nextIndex >= total) {
        return
      }

      setIndex(nextIndex)
      listRef.current?.scrollToIndex({ index: nextIndex, animated: true })
    },
    [details],
  )

  const handleShowRecent = useCallback(async (exercise: SessionExercise) => {
    setRecentExercise(exercise)
    setRecentItems(null)
    setIsRecentLoading(true)

    try {
      setRecentItems(await getRecentExerciseHistory(exercise.exerciseId, 3))
    } catch (recentError) {
      setRecentItems([])

      Alert.alert(
        'Could not load recent results',
        recentError instanceof Error
          ? recentError.message
          : String(recentError),
      )
    } finally {
      setIsRecentLoading(false)
    }
  }, [])

  /**
   * Exercises this slot may not switch to: whatever any slot of this session
   * is already performing — one exercise belongs to one slot — plus the
   * planned exercise, which has its own Restore action.
   */
  const buildUnavailableIds = useCallback(
    (exercise: SessionExercise) => {
      const ids = new Set<string>()

      for (const other of details?.exercises ?? []) {
        ids.add(other.exerciseId)
      }

      if (exercise.plannedExerciseId) {
        ids.add(exercise.plannedExerciseId)
      }

      return ids
    },
    [details],
  )

  const handleOpenChangeExercise = useCallback(
    async (exercise: SessionExercise) => {
      setChangeTarget(exercise)
      setAlternatives(null)
      setAlternativePreviews(new Map())

      try {
        const configured = await getSessionExerciseAlternatives(exercise.id)
        const unavailable = buildUnavailableIds(exercise)

        const selectable = configured.filter(
          (alternative) => !unavailable.has(alternative.id),
        )

        setAlternatives(selectable)

        // One batched call for every alternative, never one per row.
        setAlternativePreviews(
          await getLatestResultsForExercises(
            selectable.map((alternative) => alternative.id),
          ),
        )
      } catch (alternativesError) {
        // Browse still works, so the sheet stays open with an empty list.
        setAlternatives([])

        Alert.alert(
          'Could not load alternatives',
          alternativesError instanceof Error
            ? alternativesError.message
            : String(alternativesError),
        )
      }
    },
    [buildUnavailableIds],
  )

  /** Counts reps the user has typed but not yet written back, too. */
  const hasRecordedReps = useCallback((exercise: SessionExercise) => {
    return exercise.sets.some((set) => {
      const draft = draftsRef.current[set.id]

      return draft ? parseRepsInput(draft.reps) !== null : set.reps !== null
    })
  }, [])

  const runExerciseChange = useCallback(
    (
      exercise: SessionExercise,
      action: () => Promise<void>,
      errorTitle: string,
    ) => {
      // A second tap arriving before isBusy has re-rendered must not start a
      // second replacement of the same slot.
      if (isChangingExerciseRef.current) {
        return
      }

      isChangingExerciseRef.current = true

      const replacedSetIds = exercise.sets.map((set) => set.id)

      // The flag clears on every path, including a refused mutation and a
      // failed draft flush, so the action never locks itself out.
      void runMutation(async () => {
        await action()

        // Those set rows no longer exist; drop pending edits so a later
        // flush cannot try to write them back.
        for (const setId of replacedSetIds) {
          dirtyRef.current.delete(setId)
        }
      }, errorTitle).finally(() => {
        isChangingExerciseRef.current = false
      })
    },
    [runMutation],
  )

  const handleSelectReplacement = useCallback(
    (exercise: SessionExercise, replacement: Exercise) => {
      setChangeTarget(null)
      setIsBrowseOpen(false)

      const run = (discardRecordedSets: boolean) =>
        runExerciseChange(
          exercise,
          () =>
            replaceActiveSessionExercise(exercise.id, replacement.id, {
              discardRecordedSets,
            }),
          'Could not change exercise',
        )

      if (!hasRecordedReps(exercise)) {
        run(false)

        return
      }

      Alert.alert(
        'Change exercise?',
        `You already recorded sets for ${exercise.name}. Changing the exercise will discard those sets.`,
        [
          { text: 'Keep Exercise', style: 'cancel' },
          {
            text: 'Change Exercise',
            style: 'destructive',
            // Only an explicit confirmation authorizes the discard; the
            // repository refuses without it.
            onPress: () => run(true),
          },
        ],
      )
    },
    [hasRecordedReps, runExerciseChange],
  )

  const handleRestorePlanned = useCallback(
    (exercise: SessionExercise) => {
      const run = (discardRecordedSets: boolean) =>
        runExerciseChange(
          exercise,
          () =>
            restorePlannedSessionExercise(exercise.id, {
              discardRecordedSets,
            }),
          'Could not restore exercise',
        )

      if (!hasRecordedReps(exercise)) {
        run(false)

        return
      }

      Alert.alert(
        'Restore original exercise?',
        `You already recorded sets for ${exercise.name}. Restoring ${exercise.plannedName} will discard those sets.`,
        [
          { text: 'Keep Exercise', style: 'cancel' },
          {
            text: 'Restore Exercise',
            style: 'destructive',
            onPress: () => run(true),
          },
        ],
      )
    },
    [hasRecordedReps, runExerciseChange],
  )

  const handleTogglePause = () => {
    if (!details) {
      return
    }

    runMutation(
      async () => {
        if (details.pausedAt) {
          await resumeWorkout(details.id)
        } else {
          await pauseWorkout(details.id)
        }
      },
      details.pausedAt ? 'Could not resume workout' : 'Could not pause workout',
    )
  }

  const handleFinish = async () => {
    setIsFinishing(true)

    try {
      await flushDrafts()
      await finishWorkout(id)

      setIsFinishSheetOpen(false)

      // Return to the Workout tab explicitly so it refetches the active
      // session and drops the IN PROGRESS card.
      if (router.canDismiss()) {
        router.dismissTo('/')
      } else {
        router.replace('/')
      }
    } catch (finishError) {
      reportUnlessSetSaveError('Could not finish workout', finishError)
    } finally {
      setIsFinishing(false)
    }
  }

  const handleCancel = () => {
    Alert.alert(
      'Cancel workout?',
      "This workout and all recorded sets from this session will be discarded. This can't be undone.",
      [
        { text: 'Keep Workout', style: 'cancel' },
        {
          text: 'Cancel Workout',
          style: 'destructive',
          onPress: async () => {
            if (isCancellingRef.current) {
              return
            }

            isCancellingRef.current = true

            try {
              await cancelWorkoutSession(id)

              // Pending edits belong to rows that no longer exist; drop them
              // so the unmount flush cannot write them back.
              dirtyRef.current.clear()

              if (router.canDismiss()) {
                router.dismissTo('/')
              } else {
                router.replace('/')
              }
            } catch (cancelError) {
              // Stay on the session; its data is untouched and still usable.
              Alert.alert(
                'Could not cancel workout',
                cancelError instanceof Error
                  ? cancelError.message
                  : String(cancelError),
              )
            } finally {
              isCancellingRef.current = false
            }
          },
        },
      ],
    )
  }

  const summary = buildSummary(details, drafts, elapsedMs)

  if (isLoading && !details) {
    return (
      <View style={styles.gate}>
        <LoadingView />
      </View>
    )
  }

  if (error || !details) {
    return (
      <View style={styles.gate}>
        <ErrorView
          error={error ?? new Error('This workout session no longer exists.')}
          onRetry={load}
        />
      </View>
    )
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <SessionHeader
        elapsedMs={elapsedMs}
        index={index}
        isPaused={isPaused}
        onBack={() => {
          if (router.canGoBack()) {
            router.back()
          }
        }}
        onNext={() => goToIndex(index + 1)}
        onPrevious={() => goToIndex(index - 1)}
        onTogglePause={handleTogglePause}
        total={details.exercises.length}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        {details.exercises.length === 0 ? (
          <View style={styles.flex}>
            <EmptyView message="This session has no exercises." />
          </View>
        ) : (
          <FlatList
            data={details.exercises}
            getItemLayout={(_, itemIndex) => ({
              length: width,
              offset: width * itemIndex,
              index: itemIndex,
            })}
            horizontal
            keyExtractor={(exercise) => exercise.id}
            keyboardShouldPersistTaps="handled"
            onMomentumScrollEnd={(event) =>
              setIndex(
                Math.round(event.nativeEvent.contentOffset.x / width),
              )
            }
            pagingEnabled
            ref={listRef}
            renderItem={({ item, index: itemIndex }) => (
              <ExercisePage
                drafts={drafts}
                exercise={item}
                isBusy={isBusy}
                onAddSet={() =>
                  runMutation(
                    () => addSet(item.id),
                    'Could not add set',
                  )
                }
                onChangeDraft={handleChangeDraft}
                onChangeExercise={() => handleOpenChangeExercise(item)}
                onCommitDraft={(setId) =>
                  commitDraft(setId).catch(ignoreReportedFailure)
                }
                onRemoveSet={(setId) => {
                  dirtyRef.current.delete(setId)

                  runMutation(
                    () => removeSet(setId),
                    'Could not remove set',
                  )
                }}
                onRestore={() =>
                  runMutation(
                    () => restoreExercise(item.id),
                    'Could not restore exercise',
                  )
                }
                onRestorePlanned={() => handleRestorePlanned(item)}
                onShowRecent={() => handleShowRecent(item)}
                onSkip={() =>
                  runMutation(
                    () => skipExercise(item.id),
                    'Could not skip exercise',
                    () => goToIndex(itemIndex + 1),
                  )
                }
                previous={previous[item.exerciseId] ?? null}
                width={width}
              />
            )}
            showsHorizontalScrollIndicator={false}
          />
        )}

        {/* Session lifecycle actions, separated from the navigation header.
            Sits outside the paging list, so exercise content keeps its own
            scroll area and the footer never covers set inputs, + Set or Skip.
            Inside the keyboard-avoiding area so it rides above the keyboard
            instead of hiding behind it. */}
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, spacing.md) },
          ]}
        >
          <Button
            busy={isFinishing}
            label="Finish Workout"
            onPress={() => setIsFinishSheetOpen(true)}
          />

          <Pressable
            accessibilityHint="Discards this workout without saving it"
            accessibilityRole="button"
            disabled={isFinishing}
            onPress={handleCancel}
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && styles.cancelPressed,
            ]}
          >
            <Text style={styles.cancelLabel}>Cancel Workout</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {changeTarget ? (
        <ChangeExerciseSheet
          alternatives={alternatives}
          currentExerciseName={changeTarget.name}
          isBusy={isBusy}
          onBrowse={() => setIsBrowseOpen(true)}
          onClose={() => setChangeTarget(null)}
          onSelect={(exercise) =>
            handleSelectReplacement(changeTarget, exercise)
          }
          previews={alternativePreviews}
          visible={!isBrowseOpen}
        />
      ) : null}

      {/* The one exercise library, reused rather than rebuilt for this flow. */}
      {changeTarget ? (
        <ExercisePickerModal
          excludedExerciseIds={[...buildUnavailableIds(changeTarget)]}
          onClose={() => setIsBrowseOpen(false)}
          onSelect={(exercise) =>
            handleSelectReplacement(changeTarget, exercise)
          }
          title="Change Exercise"
          usedExerciseIds={[]}
          visible={isBrowseOpen}
        />
      ) : null}

      <RecentResultsSheet
        exerciseName={recentExercise?.name ?? ''}
        exerciseType={recentExercise?.type ?? 'WEIGHTED'}
        isLoading={isRecentLoading}
        items={recentItems}
        onClose={() => setRecentExercise(null)}
        visible={recentExercise !== null}
      />

      <FinishSheet
        isFinishing={isFinishing}
        onClose={() => setIsFinishSheetOpen(false)}
        onConfirm={handleFinish}
        summary={summary}
        visible={isFinishSheetOpen}
      />
    </SafeAreaView>
  )
}

/** Counts live edits, not just what has been written back yet. */
function buildSummary(
  details: WorkoutSessionDetails | null,
  drafts: Record<string, SetDraft>,
  elapsedMs: number,
): FinishSummary {
  const exercises = details?.exercises ?? []

  let workedExercises = 0
  let recordedSets = 0
  let emptyExercises = 0

  for (const exercise of exercises) {
    const exerciseSets = exercise.sets.filter((set) => {
      const draft = drafts[set.id]

      return draft
        ? parseRepsInput(draft.reps) !== null
        : set.reps !== null
    }).length

    recordedSets += exerciseSets

    if (exerciseSets > 0) {
      workedExercises += 1
    } else if (!exercise.isSkipped) {
      emptyExercises += 1
    }
  }

  return {
    elapsedMs,
    totalExercises: exercises.length,
    workedExercises,
    recordedSets,
    emptyExercises,
  }
}

const styles = StyleSheet.create({
  // The status-bar inset takes the session bar colour so the bar reads as one
  // block; the exercise pages sit on the normal background below it.
  container: {
    backgroundColor: colors.sessionBar,
    flex: 1,
  },

  flex: {
    backgroundColor: colors.background,
    flex: 1,
  },

  footer: {
    backgroundColor: colors.background,
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    gap: spacing.xs,
    paddingHorizontal: gutter,
    paddingTop: spacing.md,
  },

  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },

  cancelPressed: {
    opacity: 0.6,
  },

  cancelLabel: {
    color: colors.destructive,
    fontSize: 14.5,
    fontWeight: '600',
  },

  gate: {
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
  },
})
