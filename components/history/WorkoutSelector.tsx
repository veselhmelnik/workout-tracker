import { BottomSheet } from '@/components/ui/BottomSheet'
import { colors, fontSize, radius, spacing } from '@/constants/theme'
import type { WorkoutListItem } from '@/repositories/workoutRepository'
import { useState } from 'react'
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'

type WorkoutSelectorProps = {
  workouts: WorkoutListItem[]
  activeId: string | null
  onSelect: (workoutId: string) => void
}

export function WorkoutSelector({
  workouts,
  activeId,
  onSelect,
}: WorkoutSelectorProps) {
  const { height } = useWindowDimensions()
  const [isOpen, setIsOpen] = useState(false)

  const active = workouts.find((workout) => workout.id === activeId) ?? null

  return (
    <>
      <Pressable
        accessibilityHint="Choose which workout's history to show"
        accessibilityRole="button"
        onPress={() => setIsOpen(true)}
        style={({ pressed }) => [styles.field, pressed && styles.pressed]}
      >
        <View style={styles.fieldBody}>
          <Text style={styles.fieldCaption}>WORKOUT</Text>
          <Text numberOfLines={1} style={styles.fieldLabel}>
            {active?.name ?? 'Select a workout'}
          </Text>
        </View>

        <Text style={styles.caret}>▾</Text>
      </Pressable>

      <BottomSheet onClose={() => setIsOpen(false)} visible={isOpen}>
        <Text style={styles.sheetTitle}>Workout</Text>

        {/* The list is scrollable and height-capped, so the sheet stays
            usable with a long workout library and leaves room to add a
            search field above it later. */}
        <FlatList
          data={workouts}
          keyExtractor={(workout) => workout.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const isSelected = item.id === activeId

            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                onPress={() => {
                  onSelect(item.id)
                  setIsOpen(false)
                }}
                style={({ pressed }) => [
                  styles.option,
                  pressed && styles.optionPressed,
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.optionLabel,
                    isSelected && styles.optionLabelSelected,
                  ]}
                >
                  {item.name}
                </Text>

                {isSelected ? <Text style={styles.check}>✓</Text> : null}
              </Pressable>
            )
          }}
          style={{ maxHeight: height * 0.5 }}
        />
      </BottomSheet>
    </>
  )
}

const styles = StyleSheet.create({
  field: {
    alignItems: 'center',
    backgroundColor: colors.elevated,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: 14,
  },

  fieldBody: {
    flex: 1,
    gap: 2,
  },

  fieldCaption: {
    color: colors.textMuted,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1.3,
  },

  fieldLabel: {
    color: colors.textPrimary,
    fontSize: fontSize.input,
    fontWeight: '600',
  },

  caret: {
    color: colors.textSecondary,
    fontSize: fontSize.body,
  },

  sheetTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.headerTitle,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },

  option: {
    alignItems: 'center',
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    minHeight: 52,
    paddingVertical: spacing.md,
  },

  optionPressed: {
    backgroundColor: colors.elevated,
  },

  optionLabel: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: fontSize.body,
  },

  optionLabelSelected: {
    color: colors.textPrimary,
    fontWeight: '600',
  },

  check: {
    color: colors.textPrimary,
    fontSize: fontSize.body,
    fontWeight: '700',
  },

  pressed: {
    opacity: 0.6,
  },
})
