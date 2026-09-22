import { ExerciseSearch } from '@/components/exercises/ExerciseSearch'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { colors, fonts, spacing } from '@/constants/theme'
import type { WorkoutWithSessions } from '@/repositories/workoutSessionHistoryRepository'
import { useMemo, useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'

type WorkoutFilterSheetProps = {
  visible: boolean
  workouts: WorkoutWithSessions[]
  selectedWorkoutId: string | null
  onSelect: (workoutId: string | null) => void
  onClose: () => void
}

/**
 * Scrollable, searchable list of workouts that have sessions. Archived
 * workouts stay listed because their sessions still exist.
 */
export function WorkoutFilterSheet({
  visible,
  workouts,
  selectedWorkoutId,
  onSelect,
  onClose,
}: WorkoutFilterSheetProps) {
  const { height } = useWindowDimensions()
  const [search, setSearch] = useState('')

  const matches = useMemo(() => {
    const query = search.trim().toLowerCase()

    return query
      ? workouts.filter((workout) => workout.name.toLowerCase().includes(query))
      : workouts
  }, [search, workouts])

  const choose = (workoutId: string | null) => {
    setSearch('')
    onSelect(workoutId)
  }

  return (
    <BottomSheet onClose={onClose} visible={visible}>
      <View style={styles.header}>
        <Text style={styles.title}>Filter by workout</Text>

        <Pressable
          accessibilityLabel="Close"
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
        >
          <Text style={styles.closeLabel}>×</Text>
        </Pressable>
      </View>

      <View style={styles.search}>
        <ExerciseSearch
          onChangeText={setSearch}
          placeholder="Search workouts"
          value={search}
        />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={{ maxHeight: height * 0.5 }}
      >
        {!search.trim() ? (
          <Option
            isSelected={selectedWorkoutId === null}
            label="All Workouts"
            onPress={() => choose(null)}
          />
        ) : null}

        {matches.map((workout) => (
          <Option
            count={workout.sessionCount}
            isArchived={workout.isArchived}
            isSelected={workout.id === selectedWorkoutId}
            key={workout.id}
            label={workout.name}
            onPress={() => choose(workout.id)}
          />
        ))}

        {matches.length === 0 ? (
          <Text style={styles.empty}>No workouts match that search.</Text>
        ) : null}
      </ScrollView>
    </BottomSheet>
  )
}

type OptionProps = {
  label: string
  count?: number
  isArchived?: boolean
  isSelected: boolean
  onPress: () => void
}

function Option({ label, count, isArchived = false, isSelected, onPress }: OptionProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.optionLabel,
          isArchived && styles.optionLabelArchived,
          isSelected && styles.optionLabelSelected,
        ]}
      >
        {label}
        {isArchived ? <Text style={styles.archived}> · archived</Text> : null}
      </Text>

      {count !== undefined ? <Text style={styles.count}>{count}</Text> : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },

  title: {
    color: colors.textPrimary,
    fontSize: 16.5,
    fontWeight: '600',
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

  search: {
    paddingBottom: spacing.xs,
    paddingTop: spacing.md,
  },

  option: {
    alignItems: 'center',
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 50,
  },

  optionPressed: {
    backgroundColor: colors.elevated,
  },

  optionLabel: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 15.5,
  },

  optionLabelArchived: {
    color: colors.textSecondary,
  },

  optionLabelSelected: {
    fontWeight: '600',
  },

  archived: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '400',
  },

  count: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 12,
  },

  empty: {
    color: colors.textMuted,
    fontSize: 13,
    paddingVertical: spacing.lg,
  },

  pressed: {
    opacity: 0.6,
  },
})
