import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { colors, fonts, radius, spacing } from '@/constants/theme'
import type { MuscleKey } from '@/types/entities'
import {
  MAX_SECONDARY_MUSCLES,
  MUSCLE_SELECTOR_GROUPS,
  getMuscleSelectorLabel,
} from '@/utils/exerciseForm'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'

type MuscleSelectorSheetProps = {
  visible: boolean
  mode: 'primary' | 'secondary'
  primaryMuscle: MuscleKey | null
  secondaryMuscles: MuscleKey[]
  onSelect: (key: MuscleKey) => void
  onClose: () => void
  /** Transient confirmation, e.g. "Triceps moved to Primary". */
  toast: string | null
}

type RowState = {
  isSelected: boolean
  isDisabled: boolean
  /** Small trailing note: which role the muscle already holds. */
  note: string | null
}

export function MuscleSelectorSheet({
  visible,
  mode,
  primaryMuscle,
  secondaryMuscles,
  onSelect,
  onClose,
  toast,
}: MuscleSelectorSheetProps) {
  const { height } = useWindowDimensions()
  const isFull = secondaryMuscles.length >= MAX_SECONDARY_MUSCLES

  const rowState = (key: MuscleKey): RowState => {
    const isPrimary = key === primaryMuscle
    const isSecondary = secondaryMuscles.includes(key)

    if (mode === 'primary') {
      return {
        isSelected: isPrimary,
        isDisabled: false,
        note: isSecondary ? 'secondary' : null,
      }
    }

    return {
      isSelected: isSecondary,
      // The primary can never also be secondary, and a fourth is refused.
      isDisabled: isPrimary || (!isSecondary && isFull),
      note: isPrimary ? 'primary' : null,
    }
  }

  return (
    <BottomSheet onClose={onClose} visible={visible}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>
            {mode === 'primary' ? 'Primary muscle' : 'Secondary muscles'}
          </Text>
          <Text style={styles.subtitle}>
            {mode === 'primary'
              ? 'Choose one'
              : `Optional · up to ${MAX_SECONDARY_MUSCLES}`}
          </Text>
        </View>

        {mode === 'secondary' ? (
          <Text style={styles.counter}>
            {secondaryMuscles.length} / {MAX_SECONDARY_MUSCLES}
          </Text>
        ) : null}

        <Pressable
          accessibilityLabel="Close"
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
        >
          <Text style={styles.closeLabel}>×</Text>
        </Pressable>
      </View>

      <ScrollView style={{ maxHeight: height * 0.55 }}>
        {MUSCLE_SELECTOR_GROUPS.map((group) => (
          <View key={group.group}>
            <Text style={styles.groupLabel}>{group.label.toUpperCase()}</Text>

            {group.muscles.map((muscle) => {
              const state = rowState(muscle.key)

              return (
                <Pressable
                  accessibilityRole={mode === 'primary' ? 'radio' : 'checkbox'}
                  accessibilityState={{
                    checked: state.isSelected,
                    disabled: state.isDisabled,
                  }}
                  disabled={state.isDisabled}
                  key={muscle.key}
                  onPress={() => onSelect(muscle.key)}
                  style={({ pressed }) => [
                    styles.row,
                    pressed && styles.rowPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.rowLabel,
                      state.isSelected && styles.rowLabelSelected,
                      state.isDisabled && styles.rowLabelDisabled,
                    ]}
                  >
                    {getMuscleSelectorLabel(muscle)}
                  </Text>

                  {state.note ? (
                    <Text style={styles.rowNote}>{state.note}</Text>
                  ) : null}

                  {state.isSelected ? (
                    <Text style={styles.check}>✓</Text>
                  ) : null}
                </Pressable>
              )
            })}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        {toast ? (
          <View accessibilityLiveRegion="polite" style={styles.toast}>
            <Text style={styles.toastLabel}>{toast}</Text>
          </View>
        ) : null}

        <Button label="Done" onPress={onClose} />
      </View>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingBottom: spacing.md,
  },

  headerText: {
    flex: 1,
    gap: 2,
  },

  title: {
    color: colors.textPrimary,
    fontSize: 16.5,
    fontWeight: '600',
  },

  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
  },

  counter: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 11.5,
  },

  close: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    marginRight: -10,
    width: 44,
  },

  closeLabel: {
    color: colors.textSecondary,
    fontSize: 22,
  },

  groupLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    paddingBottom: 4,
    paddingTop: 15,
  },

  row: {
    alignItems: 'center',
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 48,
  },

  rowPressed: {
    backgroundColor: colors.elevated,
  },

  rowLabel: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 15.5,
  },

  rowLabelSelected: {
    fontWeight: '600',
  },

  rowLabelDisabled: {
    color: colors.disabledText,
  },

  rowNote: {
    color: colors.textMuted,
    fontSize: 11,
  },

  check: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },

  footer: {
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    gap: 10,
    marginTop: spacing.xs,
    paddingTop: 14,
  },

  toast: {
    backgroundColor: colors.raised,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },

  toastLabel: {
    color: colors.textPrimary,
    fontSize: 13.5,
    fontWeight: '500',
  },

  pressed: {
    opacity: 0.6,
  },
})
