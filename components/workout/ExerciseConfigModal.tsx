import { Button } from '@/components/ui/Button'
import { Note, SectionLabel, Stepper, TextField } from '@/components/ui/Fields'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { colors, fontSize, gutter, radius, spacing } from '@/constants/theme'
import type { Exercise } from '@/types/entities'
import { MAX_ALTERNATIVES } from '@/repositories/workoutExerciseAlternativesRepository'
import { useEffect, useState } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ExercisePickerModal } from './ExercisePickerModal'

export type ExerciseConfig = {
  sets: number
  repMin: number | null
  repMax: number | null
  /** Slot alternatives, in configured order. */
  alternatives: Exercise[]
}

type ExerciseConfigModalProps = {
  visible: boolean
  exerciseName: string
  mode: 'add' | 'edit'
  initialConfig: ExerciseConfig
  /** Exercises this slot may not offer: itself and the workout's other slots. */
  unavailableExerciseIds: string[]
  onSubmit: (config: ExerciseConfig) => void
  onRemove?: () => void
  onClose: () => void
}

function toRepValue(value: number | null): string {
  return value === null ? '' : String(value)
}

function parseRepValue(value: string): number | null {
  const digits = value.replace(/[^0-9]/g, '')

  if (!digits) {
    return null
  }

  return Number(digits)
}

export function ExerciseConfigModal({
  visible,
  exerciseName,
  mode,
  initialConfig,
  unavailableExerciseIds,
  onSubmit,
  onRemove,
  onClose,
}: ExerciseConfigModalProps) {
  const [sets, setSets] = useState(initialConfig.sets)
  const [repMin, setRepMin] = useState(toRepValue(initialConfig.repMin))
  const [repMax, setRepMax] = useState(toRepValue(initialConfig.repMax))
  const [alternatives, setAlternatives] = useState(initialConfig.alternatives)
  const [isPickerOpen, setIsPickerOpen] = useState(false)

  useEffect(() => {
    if (visible) {
      setSets(initialConfig.sets)
      setRepMin(toRepValue(initialConfig.repMin))
      setRepMax(toRepValue(initialConfig.repMax))
      setAlternatives(initialConfig.alternatives)
    }
  }, [visible, initialConfig])

  const parsedMin = parseRepValue(repMin)
  const parsedMax = parseRepValue(repMax)

  const rangeError =
    parsedMin !== null && parsedMax !== null && parsedMin > parsedMax
      ? 'The lowest rep count must not be greater than the highest.'
      : null

  const handleSubmit = () => {
    if (rangeError) {
      return
    }

    onSubmit({ sets, repMin: parsedMin, repMax: parsedMax, alternatives })
  }

  const canAddAlternative = alternatives.length < MAX_ALTERNATIVES

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
        <ScreenHeader
          actionDisabled={rangeError !== null}
          actionLabel="Save"
          onAction={handleSubmit}
          onBack={onClose}
          title={exerciseName}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <SectionLabel>Sets</SectionLabel>
            <Stepper label="sets" onChange={setSets} value={sets} />

            <SectionLabel>Rep range (optional)</SectionLabel>
            <View style={styles.repRow}>
              <TextField
                inputMode="numeric"
                keyboardType="number-pad"
                maxLength={3}
                onChangeText={setRepMin}
                placeholder="min"
                style={styles.repInput}
                value={repMin}
              />

              <Text style={styles.repSeparator}>to</Text>

              <TextField
                inputMode="numeric"
                keyboardType="number-pad"
                maxLength={3}
                onChangeText={setRepMax}
                placeholder="max"
                style={styles.repInput}
                value={repMax}
              />
            </View>

            {rangeError ? (
              <Text style={styles.error}>{rangeError}</Text>
            ) : null}

            {/* Secondary configuration: swaps available for this slot when
                the planned equipment is busy. */}
            <SectionLabel>Alternative exercises</SectionLabel>

            {alternatives.map((alternative) => (
              <View key={alternative.id} style={styles.alternativeRow}>
                <Text numberOfLines={1} style={styles.alternativeName}>
                  {alternative.name}
                  {alternative.isArchived ? (
                    <Text style={styles.archivedTag}> · archived</Text>
                  ) : null}
                </Text>

                <Pressable
                  accessibilityLabel={`Remove ${alternative.name}`}
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() =>
                    setAlternatives((current) =>
                      current.filter((entry) => entry.id !== alternative.id),
                    )
                  }
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  <Text style={styles.removeLabel}>Remove</Text>
                </Pressable>
              </View>
            ))}

            {canAddAlternative ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setIsPickerOpen(true)}
                style={({ pressed }) => [
                  styles.addAlternative,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.addAlternativeLabel}>+ Add alternative</Text>
              </Pressable>
            ) : (
              <Text style={styles.alternativeHelper}>
                Up to {MAX_ALTERNATIVES} alternatives. Remove one to swap it.
              </Text>
            )}

            <View style={styles.submit}>
              <Button
                disabled={rangeError !== null}
                label={mode === 'add' ? 'Add to Workout' : 'Save Changes'}
                onPress={handleSubmit}
              />
            </View>

            {onRemove ? (
              <Button
                label="Remove from Workout"
                onPress={onRemove}
                variant="destructive"
              />
            ) : null}

            <Note>Rep range is a target only.</Note>
          </ScrollView>
        </KeyboardAvoidingView>

        <ExercisePickerModal
          // Its own slot, the workout's other slots and what is already
          // configured here are all off limits.
          excludedExerciseIds={[
            ...unavailableExerciseIds,
            ...alternatives.map((alternative) => alternative.id),
          ]}
          onClose={() => setIsPickerOpen(false)}
          onSelect={(exercise) => {
            setIsPickerOpen(false)
            setAlternatives((current) =>
              current.length < MAX_ALTERNATIVES
                ? [...current, exercise]
                : current,
            )
          }}
          title="Add Alternative"
          usedExerciseIds={[]}
          visible={isPickerOpen}
        />
      </SafeAreaView>
    </Modal>
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

  repRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },

  repInput: {
    flex: 1,
    textAlign: 'center',
  },

  repSeparator: {
    color: colors.textMuted,
    fontSize: fontSize.meta,
  },

  error: {
    color: colors.destructive,
    fontSize: fontSize.meta,
    marginTop: spacing.sm,
  },

  submit: {
    marginBottom: spacing.md,
    marginTop: spacing.xxl,
  },

  alternativeRow: {
    alignItems: 'center',
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    minHeight: 48,
  },

  alternativeName: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 15,
  },

  archivedTag: {
    color: colors.textMuted,
    fontSize: 11.5,
  },

  removeLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },

  addAlternative: {
    alignItems: 'center',
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    borderStyle: 'dashed',
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: spacing.sm,
    minHeight: 44,
  },

  addAlternativeLabel: {
    color: colors.textSecondary,
    fontSize: 13.5,
    fontWeight: '500',
  },

  alternativeHelper: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.sm,
  },

  pressed: {
    opacity: 0.6,
  },
})
