import { Button } from '@/components/ui/Button'
import { ProBadge } from '@/components/ui/ProBadge'
import {
  colors,
  fontSize,
  fonts,
  gutter,
  radius,
  spacing,
} from '@/constants/theme'
import type { ExerciseHistoryItem } from '@/repositories/historyRepository'
import type { WorkoutSessionDetails } from '@/repositories/workoutSessionRepository'
import { formatDayMonth, formatSetTarget } from '@/utils/format'
import { formatHistorySets } from '@/utils/sessionFormat'
import { useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

type SessionExercise = WorkoutSessionDetails['exercises'][number]

export type SetDraft = {
  weight: string
  reps: string
}

type ExercisePageProps = {
  width: number
  exercise: SessionExercise
  previous: ExerciseHistoryItem | null
  drafts: Record<string, SetDraft>
  onChangeDraft: (setId: string, field: keyof SetDraft, value: string) => void
  onCommitDraft: (setId: string) => void
  onAddSet: () => void
  onRemoveSet: (setId: string) => void
  onSkip: () => void
  onRestore: () => void
  onShowRecent: () => void
  onChangeExercise: () => void
  onRestorePlanned: () => void
  /** Pro gate state; marks the action rather than hiding the capability. */
  isChangeExerciseLocked: boolean
  isBusy: boolean
}

type FocusedField = { setId: string; field: keyof SetDraft } | null

export function ExercisePage({
  width,
  exercise,
  previous,
  drafts,
  onChangeDraft,
  onCommitDraft,
  onAddSet,
  onRemoveSet,
  onSkip,
  onRestore,
  onShowRecent,
  onChangeExercise,
  onRestorePlanned,
  isChangeExerciseLocked,
  isBusy,
}: ExercisePageProps) {
  const isWeighted = exercise.type === 'WEIGHTED'
  const canRemoveSet = exercise.sets.length > 1

  // Derived, never stored: the slot is performing something other than what
  // the workout planned for it.
  const isReplacement =
    exercise.plannedExerciseId !== null &&
    exercise.plannedExerciseId !== exercise.exerciseId

  const [focused, setFocused] = useState<FocusedField>(null)

  // Weights the user has typed on this page. Combined with recorded reps this
  // separates a weight confirmed today from one carried over by prefill; the
  // data layer stores no such flag, so this is the closest safe signal.
  const [editedWeightIds, setEditedWeightIds] = useState<Set<string>>(
    () => new Set(),
  )

  const isFocused = (setId: string, field: keyof SetDraft) =>
    focused?.setId === setId && focused.field === field

  return (
    <View style={[styles.page, { width }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, exercise.isSkipped && styles.titleSkipped]}
          >
            {exercise.name}
          </Text>

          {exercise.isSkipped ? (
            <Text style={styles.skippedBadge}>SKIPPED</Text>
          ) : null}
        </View>

        {isReplacement && exercise.plannedName ? (
          <Text style={styles.replacementContext}>
            Alternative for {exercise.plannedName}
          </Text>
        ) : null}

        <Text style={styles.target}>
          {formatSetTarget(
            exercise.sets.length,
            exercise.repMin,
            exercise.repMax,
            exercise.type,
          )}
        </Text>

        <Pressable
          accessibilityHint="Shows the last three recorded results"
          accessibilityRole="button"
          onPress={onShowRecent}
          style={({ pressed }) => [styles.previous, pressed && styles.pressed]}
        >
          <View style={styles.previousBody}>
            <Text style={styles.previousLabel}>PREVIOUS</Text>

            {previous ? (
              <View style={styles.previousLine}>
                <Text style={styles.previousDate}>
                  {formatDayMonth(previous.performedAt)}
                </Text>
                <Text numberOfLines={1} style={styles.previousValue}>
                  {formatHistorySets(previous, exercise.type)}
                </Text>
              </View>
            ) : (
              <Text style={styles.previousEmpty}>No previous result</Text>
            )}
          </View>

          <Text style={styles.previousAction}>Last 3 ›</Text>
        </Pressable>

        <View style={styles.setHead}>
          <View style={styles.setNumberColumn} />

          {isWeighted ? (
            <Text style={[styles.headLabel, styles.inputColumn]}>WEIGHT</Text>
          ) : null}

          <Text style={[styles.headLabel, styles.inputColumn]}>REPS</Text>

          <View style={styles.removeColumn} />
        </View>

        {exercise.sets.map((set) => {
          const draft = drafts[set.id] ?? { weight: '', reps: '' }

          const isRowFocused = focused?.setId === set.id
          const isWeightCarriedOver =
            draft.weight !== '' &&
            draft.reps === '' &&
            !editedWeightIds.has(set.id)

          return (
            <View
              key={set.id}
              style={[styles.setRow, exercise.isSkipped && styles.rowSkipped]}
            >
              <Text
                style={[
                  styles.setNumber,
                  styles.setNumberColumn,
                  isRowFocused && styles.setNumberFocused,
                ]}
              >
                {set.setNumber}
              </Text>

              {isWeighted ? (
                <TextInput
                  accessibilityLabel={`Weight for set ${set.setNumber}`}
                  editable={!exercise.isSkipped}
                  inputMode="decimal"
                  keyboardAppearance="dark"
                  keyboardType="decimal-pad"
                  maxLength={6}
                  onBlur={() => {
                    setFocused(null)
                    onCommitDraft(set.id)
                  }}
                  onChangeText={(value) => {
                    setEditedWeightIds((current) =>
                      current.has(set.id)
                        ? current
                        : new Set(current).add(set.id),
                    )
                    onChangeDraft(set.id, 'weight', value)
                  }}
                  onFocus={() => setFocused({ setId: set.id, field: 'weight' })}
                  placeholder="–"
                  placeholderTextColor={colors.textEmpty}
                  selectTextOnFocus
                  selectionColor={colors.active}
                  style={[
                    styles.input,
                    styles.inputColumn,
                    isWeightCarriedOver && styles.inputCarriedOver,
                    isFocused(set.id, 'weight') && styles.inputFocused,
                  ]}
                  value={draft.weight}
                />
              ) : null}

              <TextInput
                accessibilityLabel={`Reps for set ${set.setNumber}`}
                editable={!exercise.isSkipped}
                inputMode="numeric"
                keyboardAppearance="dark"
                keyboardType="number-pad"
                maxLength={3}
                onBlur={() => {
                  setFocused(null)
                  onCommitDraft(set.id)
                }}
                onChangeText={(value) => onChangeDraft(set.id, 'reps', value)}
                onFocus={() => setFocused({ setId: set.id, field: 'reps' })}
                placeholder="–"
                placeholderTextColor={colors.textEmpty}
                selectTextOnFocus
                selectionColor={colors.active}
                style={[
                  styles.input,
                  styles.inputColumn,
                  isFocused(set.id, 'reps') && styles.inputFocused,
                ]}
                value={draft.reps}
              />

              <View style={styles.removeColumn}>
                {canRemoveSet && !exercise.isSkipped ? (
                  <Pressable
                    accessibilityLabel={`Remove set ${set.setNumber}`}
                    accessibilityRole="button"
                    disabled={isBusy}
                    onPress={() => onRemoveSet(set.id)}
                    style={({ pressed }) => [
                      styles.removeButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.removeLabel}>×</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          )
        })}

        {exercise.isSkipped ? (
          <View style={styles.footer}>
            <Button
              disabled={isBusy}
              label="Restore Exercise"
              onPress={onRestore}
            />
          </View>
        ) : (
          <View style={[styles.footer, styles.footerRow]}>
            <View style={styles.footerButton}>
              <Button
                disabled={isBusy}
                label="+ Set"
                onPress={onAddSet}
                variant="secondary"
              />
            </View>

            <View style={styles.footerButton}>
              <Button
                disabled={isBusy}
                label="Skip"
                onPress={onSkip}
                variant="outline"
              />
            </View>
          </View>
        )}

        {/* Secondary to the set inputs, + Set and Skip above it, but visible
            rather than buried in an overflow menu. */}
        <View style={styles.exerciseActions}>
          <Pressable
            accessibilityHint={
              isChangeExerciseLocked
                ? 'Explains what Setline Pro adds'
                : 'Performs a different exercise in this slot for this workout only'
            }
            accessibilityLabel={
              isChangeExerciseLocked
                ? 'Change exercise, Setline Pro feature'
                : 'Change exercise'
            }
            accessibilityRole="button"
            disabled={isBusy}
            onPress={onChangeExercise}
            style={({ pressed }) => [
              styles.exerciseAction,
              styles.exerciseActionRow,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.exerciseActionLabel}>Change exercise</Text>

            {/* Kept visible when locked: the capability stays discoverable
                instead of silently vanishing for free users. */}
            {isChangeExerciseLocked ? <ProBadge /> : null}
          </Pressable>

          {/* Never gated. A replacement started under Pro must always be
              reversible, so entitlement can never trap a user in one. */}
          {isReplacement && exercise.plannedName ? (
            <Pressable
              accessibilityRole="button"
              disabled={isBusy}
              onPress={onRestorePlanned}
              style={({ pressed }) => [
                styles.exerciseAction,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.exerciseActionLabel}>
                Restore {exercise.plannedName}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },

  content: {
    paddingBottom: spacing.xxl,
    paddingHorizontal: gutter,
    paddingTop: 18,
  },

  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  title: {
    color: colors.textPrimary,
    fontSize: fontSize.exerciseTitle,
    fontWeight: '700',
    letterSpacing: -0.36,
  },

  titleSkipped: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },

  skippedBadge: {
    backgroundColor: colors.raised,
    borderRadius: radius.sm,
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },

  replacementContext: {
    color: colors.textSecondary,
    fontSize: fontSize.meta,
    marginTop: 4,
  },

  target: {
    color: colors.textMuted,
    fontSize: fontSize.meta,
    marginTop: 3,
  },

  previous: {
    alignItems: 'center',
    backgroundColor: colors.strip,
    borderColor: colors.divider,
    borderLeftColor: colors.referenceRule,
    borderLeftWidth: 3,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.lg,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },

  previousBody: {
    flex: 1,
    gap: 3,
  },

  previousLabel: {
    color: colors.textMuted,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1.3,
  },

  previousLine: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: spacing.sm,
  },

  previousDate: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 12,
  },

  previousValue: {
    color: colors.textPrimary,
    flexShrink: 1,
    fontFamily: fonts.mono,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },

  previousEmpty: {
    color: colors.textSecondary,
    fontSize: 14,
  },

  previousAction: {
    color: colors.textSecondary,
    fontSize: 12.5,
    fontWeight: '600',
  },

  setHead: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 22,
    paddingBottom: spacing.sm,
  },

  headLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    textAlign: 'center',
  },

  setRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },

  rowSkipped: {
    opacity: 0.45,
  },

  setNumberColumn: {
    textAlign: 'center',
    width: 28,
  },

  inputColumn: {
    flex: 1,
  },

  // 44px keeps the remove control at native tap size although the glyph is small.
  removeColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
  },

  setNumber: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 14,
    fontWeight: '600',
  },

  setNumberFocused: {
    color: colors.textPrimary,
  },

  input: {
    backgroundColor: colors.elevated,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.textPrimary,
    fontFamily: fonts.mono,
    fontSize: fontSize.dataInput,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
    height: 48,
    paddingHorizontal: spacing.xs,
    paddingVertical: 0,
    textAlign: 'center',
  },

  inputCarriedOver: {
    color: colors.textSecondary,
  },

  // Border width stays at 1 so focusing a field never shifts the row layout.
  inputFocused: {
    backgroundColor: colors.activeFocusFill,
    borderColor: colors.active,
    color: colors.textPrimary,
  },

  removeButton: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    width: 44,
  },

  removeLabel: {
    color: colors.textMuted,
    fontSize: 20,
  },

  footer: {
    marginTop: spacing.lg,
  },

  footerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  footerButton: {
    flex: 1,
  },

  exerciseActions: {
    alignItems: 'flex-start',
    marginTop: spacing.md,
  },

  exerciseAction: {
    justifyContent: 'center',
    minHeight: 40,
  },

  exerciseActionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },

  exerciseActionLabel: {
    color: colors.textSecondary,
    fontSize: 13.5,
    fontWeight: '600',
  },

  pressed: {
    opacity: 0.6,
  },
})
