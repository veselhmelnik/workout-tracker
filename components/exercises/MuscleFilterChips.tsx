import { colors, gutter } from '@/constants/theme'
import type { Muscle, MuscleKey } from '@/types/entities'
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native'

type MuscleFilterChipsProps = {
  muscles: Muscle[]
  selected: MuscleKey | null
  onSelect: (muscle: MuscleKey | null) => void
}

/**
 * One horizontally scrolling row of exact muscles. The selected chip inverts
 * to off-white rather than taking a colour, so amber stays reserved.
 */
export function MuscleFilterChips({
  muscles,
  selected,
  onSelect,
}: MuscleFilterChipsProps) {
  return (
    <ScrollView
      contentContainerStyle={styles.row}
      horizontal
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
    >
      <FilterChip
        isSelected={selected === null}
        label="All"
        onPress={() => onSelect(null)}
      />

      {muscles.map((muscle) => {
        const isSelected = muscle.key === selected

        return (
          <FilterChip
            isSelected={isSelected}
            key={muscle.key}
            label={muscle.name}
            // Tapping the active chip clears it, matching its × affordance.
            onPress={() => onSelect(isSelected ? null : muscle.key)}
            showClear={isSelected}
          />
        )
      })}
    </ScrollView>
  )
}

type FilterChipProps = {
  label: string
  isSelected: boolean
  showClear?: boolean
  onPress: () => void
}

function FilterChip({
  label,
  isSelected,
  showClear = false,
  onPress,
}: FilterChipProps) {
  return (
    <Pressable
      accessibilityHint={showClear ? 'Clears the muscle filter' : undefined}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      hitSlop={{ top: 6, bottom: 6 }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        isSelected && styles.chipSelected,
        showClear && styles.chipWithClear,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.label, isSelected && styles.labelSelected]}>
        {label}
      </Text>

      {showClear ? <Text style={styles.clear}>×</Text> : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    gap: 6,
    paddingHorizontal: gutter,
  },

  chip: {
    alignItems: 'center',
    backgroundColor: colors.elevated,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    height: 32,
    paddingHorizontal: 13,
  },

  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  chipWithClear: {
    paddingRight: 10,
  },

  label: {
    color: colors.textSecondary,
    fontSize: 12.5,
  },

  labelSelected: {
    color: colors.onPrimary,
    fontWeight: '600',
  },

  clear: {
    color: colors.onPrimary,
    fontSize: 14,
    opacity: 0.55,
  },

  pressed: {
    opacity: 0.7,
  },
})
