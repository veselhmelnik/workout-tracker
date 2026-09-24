import { Button } from '@/components/ui/Button'
import { Divider, SectionLabel, TextField } from '@/components/ui/Fields'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { colors, fontSize, gutter, radius, spacing } from '@/constants/theme'
import type { Exercise, ExerciseType } from '@/types/entities'
import { formatSetTarget } from '@/utils/format'
import { useNavigation } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context'
import {
  ExerciseConfigModal,
  type ExerciseConfig,
} from './ExerciseConfigModal'
import { ExercisePickerModal } from './ExercisePickerModal'

/** One exercise inside the workout template being edited. */
export type DraftExercise = {
  exerciseId: string
  name: string
  type: ExerciseType
  sets: number
  repMin: number | null
  repMax: number | null
  /** Configured slot alternatives, in order; persisted with the workout. */
  alternatives: Exercise[]
}

export type WorkoutDraft = {
  name: string
  exercises: DraftExercise[]
}

type EditorTarget =
  | { kind: 'new'; exercise: Exercise }
  | { kind: 'existing'; index: number }

type WorkoutEditorProps = {
  title: string
  mode: 'create' | 'edit'
  initialDraft: WorkoutDraft
  isSaving: boolean
  /** Resolves true once the workout is persisted; false leaves the form as is. */
  onSave: (draft: WorkoutDraft) => Promise<boolean>
  onArchive?: () => void
  /** Opens the exercise configuration straight away (Add to a workout). */
  initialAddExercise?: Exercise
}

const DEFAULT_SETS = 3

/** Everything persisted about a workout, for comparing against the baseline. */
function serializeDraft(draft: WorkoutDraft): string {
  return JSON.stringify({
    name: draft.name.trim(),
    exercises: draft.exercises.map((exercise) => [
      exercise.exerciseId,
      exercise.sets,
      exercise.repMin,
      exercise.repMax,
      // Adding, removing or reordering alternatives is a persisted change.
      exercise.alternatives.map((alternative) => alternative.id),
    ]),
  })
}

export function WorkoutEditor({
  title,
  mode,
  initialDraft,
  isSaving,
  onSave,
  onArchive,
  initialAddExercise,
}: WorkoutEditorProps) {
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()

  const [name, setName] = useState(initialDraft.name)
  const [exercises, setExercises] = useState(initialDraft.exercises)

  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [target, setTarget] = useState<EditorTarget | null>(() => {
    if (!initialAddExercise) {
      return null
    }

    // Already in this workout: edit its configuration rather than adding a
    // duplicate, which the workout cannot hold.
    const index = initialDraft.exercises.findIndex(
      (exercise) => exercise.exerciseId === initialAddExercise.id,
    )

    return index === -1
      ? { kind: 'new', exercise: initialAddExercise }
      : { kind: 'existing', index }
  })

  const trimmedName = name.trim()

  const baseline = useMemo(() => serializeDraft(initialDraft), [initialDraft])
  const draft: WorkoutDraft = { name: trimmedName, exercises }
  const isDirty = serializeDraft(draft) !== baseline

  // Creating needs a name; editing also needs something to save.
  const canSave =
    trimmedName.length > 0 && !isSaving && (mode === 'create' || isDirty)

  // Set before the parent navigates on success, so the guard below lets the
  // screen go without prompting.
  const isLeavingRef = useRef(false)

  const handleSave = async () => {
    if (!canSave) {
      return
    }

    isLeavingRef.current = true

    if (!(await onSave(draft))) {
      // Save failed: the form keeps its values and stays dirty.
      isLeavingRef.current = false
    }
  }

  // Covers the header back button, the Android hardware back button and the
  // back gesture, since all of them dispatch a navigation action.
  useEffect(() => {
    const subscription = navigation.addListener('beforeRemove', (event) => {
      if (!isDirty || isLeavingRef.current) {
        return
      }

      event.preventDefault()

      Alert.alert(
        'Discard changes?',
        'You have unsaved changes. If you leave now, they will be lost.',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard Changes',
            style: 'destructive',
            onPress: () => navigation.dispatch(event.data.action),
          },
        ],
      )
    })

    return subscription
  }, [isDirty, navigation])

  const move = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction

    if (nextIndex < 0 || nextIndex >= exercises.length) {
      return
    }

    setExercises((current) => {
      const next = [...current]
      const [moved] = next.splice(index, 1)
      next.splice(nextIndex, 0, moved)

      return next
    })
  }

  const handleConfigSubmit = (config: ExerciseConfig) => {
    if (!target) {
      return
    }

    if (target.kind === 'new') {
      setExercises((current) => [
        ...current,
        {
          exerciseId: target.exercise.id,
          name: target.exercise.name,
          type: target.exercise.type,
          ...config,
        },
      ])
    } else {
      setExercises((current) =>
        current.map((exercise, index) =>
          index === target.index ? { ...exercise, ...config } : exercise,
        ),
      )
    }

    setTarget(null)
  }

  const handleRemove = () => {
    if (target?.kind !== 'existing') {
      return
    }

    const { index } = target

    setExercises((current) =>
      current.filter((_, currentIndex) => currentIndex !== index),
    )

    setTarget(null)
  }

  const confirmArchive = () => {
    if (!onArchive) {
      return
    }

    Alert.alert(
      'Archive workout?',
      'It will be hidden from My Workouts. Past sessions are kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Archive', style: 'destructive', onPress: onArchive },
      ],
    )
  }

  const targetConfig: ExerciseConfig =
    target?.kind === 'existing'
      ? {
          sets: exercises[target.index].sets,
          repMin: exercises[target.index].repMin,
          repMax: exercises[target.index].repMax,
          alternatives: exercises[target.index].alternatives,
        }
      : { sets: DEFAULT_SETS, repMin: null, repMax: null, alternatives: [] }

  // A slot cannot offer itself, nor any exercise planned in another slot:
  // a replacement would otherwise record the same exercise twice in a session.
  const targetExerciseId =
    target?.kind === 'new'
      ? target.exercise.id
      : target?.kind === 'existing'
        ? exercises[target.index].exerciseId
        : null

  const unavailableExerciseIds = exercises
    .map((exercise) => exercise.exerciseId)
    .concat(targetExerciseId ? [targetExerciseId] : [])

  const targetName =
    target?.kind === 'new'
      ? target.exercise.name
      : target?.kind === 'existing'
        ? exercises[target.index].name
        : ''

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {/* Saving lives in the footer, so the header holds one clear action. */}
      <ScreenHeader title={title} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <SectionLabel>Workout name</SectionLabel>
          <TextField
            onChangeText={setName}
            placeholder="e.g. Upper A"
            returnKeyType="done"
            value={name}
          />

          <Divider />

          <SectionLabel>
            {exercises.length > 1
              ? 'Exercises — use ↑ ↓ to reorder'
              : 'Exercises'}
          </SectionLabel>

          {exercises.length === 0 ? (
            <Text style={styles.empty}>No exercises yet.</Text>
          ) : null}

          {exercises.map((exercise, index) => (
            <View key={exercise.exerciseId} style={styles.row}>
              <View style={styles.reorder}>
                <Pressable
                  accessibilityLabel={`Move ${exercise.name} up`}
                  accessibilityRole="button"
                  disabled={index === 0}
                  hitSlop={6}
                  onPress={() => move(index, -1)}
                  style={({ pressed }) => [
                    styles.reorderButton,
                    pressed && styles.pressed,
                    index === 0 && styles.inactive,
                  ]}
                >
                  <Text style={styles.reorderLabel}>↑</Text>
                </Pressable>

                <Pressable
                  accessibilityLabel={`Move ${exercise.name} down`}
                  accessibilityRole="button"
                  disabled={index === exercises.length - 1}
                  hitSlop={6}
                  onPress={() => move(index, 1)}
                  style={({ pressed }) => [
                    styles.reorderButton,
                    pressed && styles.pressed,
                    index === exercises.length - 1 && styles.inactive,
                  ]}
                >
                  <Text style={styles.reorderLabel}>↓</Text>
                </Pressable>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={() => setTarget({ kind: 'existing', index })}
                style={({ pressed }) => [
                  styles.rowMain,
                  pressed && styles.rowPressed,
                ]}
              >
                <View style={styles.flex}>
                  <Text style={styles.rowTitle}>{exercise.name}</Text>
                  <Text style={styles.rowMeta}>
                    {formatSetTarget(
                      exercise.sets,
                      exercise.repMin,
                      exercise.repMax,
                      exercise.type,
                    )}
                  </Text>
                </View>

                <Text style={styles.chevron}>›</Text>
              </Pressable>
            </View>
          ))}

          <View style={styles.addButton}>
            <Button
              label="+ Add Exercise"
              onPress={() => setIsPickerOpen(true)}
              variant="secondary"
            />
          </View>

          {onArchive ? (
            <View style={styles.archive}>
              <Button
                label="Archive Workout"
                onPress={confirmArchive}
                variant="destructive"
              />
            </View>
          ) : null}
        </ScrollView>

        {/* Footer sits inside the keyboard-avoiding area, so it rides above
            the keyboard and never covers the exercise rows being edited. */}
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, spacing.md) },
          ]}
        >
          <Button
            busy={isSaving}
            disabled={!canSave}
            label={mode === 'create' ? 'Create Workout' : 'Save Changes'}
            onPress={handleSave}
          />
        </View>
      </KeyboardAvoidingView>

      <ExercisePickerModal
        onClose={() => setIsPickerOpen(false)}
        onSelect={(exercise) => {
          setIsPickerOpen(false)
          setTarget({ kind: 'new', exercise })
        }}
        usedExerciseIds={exercises.map((exercise) => exercise.exerciseId)}
        visible={isPickerOpen}
      />

      <ExerciseConfigModal
        exerciseName={targetName}
        initialConfig={targetConfig}
        mode={target?.kind === 'new' ? 'add' : 'edit'}
        onClose={() => setTarget(null)}
        onRemove={target?.kind === 'existing' ? handleRemove : undefined}
        onSubmit={handleConfigSubmit}
        unavailableExerciseIds={unavailableExerciseIds}
        visible={target !== null}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },

  flex: {
    flex: 1,
  },

  content: {
    paddingBottom: spacing.xxl,
    paddingHorizontal: gutter,
    paddingTop: spacing.xs,
  },

  empty: {
    color: colors.textMuted,
    fontSize: fontSize.meta,
    paddingVertical: spacing.md,
  },

  row: {
    alignItems: 'center',
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },

  reorder: {
    gap: 4,
  },

  reorderButton: {
    alignItems: 'center',
    backgroundColor: colors.elevated,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    height: 26,
    justifyContent: 'center',
    width: 32,
  },

  reorderLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },

  rowMain: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 56,
  },

  rowPressed: {
    opacity: 0.6,
  },

  rowTitle: {
    color: colors.textPrimary,
    fontSize: 15.5,
    fontWeight: '500',
  },

  rowMeta: {
    color: colors.textMuted,
    fontSize: fontSize.meta,
    marginTop: 2,
  },

  chevron: {
    color: colors.textMuted,
    fontSize: 17,
  },

  addButton: {
    marginTop: spacing.lg,
  },

  archive: {
    marginTop: spacing.xxl,
  },

  footer: {
    backgroundColor: colors.background,
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    paddingHorizontal: gutter,
    paddingTop: spacing.md,
  },

  pressed: {
    opacity: 0.6,
  },

  inactive: {
    opacity: 0.3,
  },
})
