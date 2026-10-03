import { ExerciseIllustration } from '@/components/exercise/ExerciseIllustration'
import { Button } from '@/components/ui/Button'
import { SectionLabel, Segmented, TextField } from '@/components/ui/Fields'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import {
  EmptyView,
  ErrorView,
  LoadingView,
} from '@/components/ui/StateViews'
import { colors, fontSize, gutter, spacing } from '@/constants/theme'
import { useAsyncData } from '@/hooks/useAsyncData'
import { getExercises } from '@/repositories/exerciseRepository'
import type { Exercise } from '@/types/entities'
import {
  filterExercises,
  groupByPrimaryMuscleLabel,
} from '@/utils/exerciseGroups'
import { useRouter } from 'expo-router'
import { memo, useCallback, useMemo, useState } from 'react'
import {
  Modal,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type ExercisePickerModalProps = {
  visible: boolean
  /** Exercises already in the workout — shown, but not selectable again. */
  usedExerciseIds: string[]
  /** Exercises hidden entirely, e.g. ineligible as an alternative. */
  excludedExerciseIds?: string[]
  title?: string
  onSelect: (exercise: Exercise) => void
  onClose: () => void
}

/** Same split, labels and values as the Exercises tab. */
type Source = 'LIBRARY' | 'CUSTOM'

type PickerSection = {
  muscleLabel: string
  data: Exercise[]
}

/**
 * Memoized so scrolling only renders rows entering the window, rather than
 * every mounted row whenever the modal's search or segment state changes.
 */
const PickerRow = memo(function PickerRow({
  exercise,
  isUsed,
  onSelect,
}: {
  exercise: Exercise
  isUsed: boolean
  onSelect: (exercise: Exercise) => void
}) {
  return (
    <Pressable
      accessibilityHint={isUsed ? 'Already in this workout' : undefined}
      accessibilityRole="button"
      accessibilityState={{ disabled: isUsed }}
      disabled={isUsed}
      onPress={() => onSelect(exercise)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <ExerciseIllustration sourceKey={exercise.sourceKey} />

      <Text
        numberOfLines={2}
        style={[styles.rowLabel, isUsed && styles.rowLabelUsed]}
      >
        {exercise.name}
      </Text>

      <Text style={styles.rowTrailing}>{isUsed ? 'Added' : '›'}</Text>
    </Pressable>
  )
})

export function ExercisePickerModal({
  visible,
  usedExerciseIds,
  excludedExerciseIds,
  title = 'Add Exercise',
  onSelect,
  onClose,
}: ExercisePickerModalProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [source, setSource] = useState<Source>('LIBRARY')

  const { data, isLoading, error, reload } = useAsyncData(getExercises)

  /**
   * Order matters. The caller's exclusions are business rules — a replacement
   * cannot reuse an exercise already performed in the session, an alternative
   * cannot be the slot's own exercise — so they are applied first and the
   * Library/My Exercises split only partitions what is already eligible.
   * Switching segment can therefore never surface an ineligible exercise.
   */
  const selectable = useMemo(() => {
    // getExercises already omits archived ones, so those can never be newly
    // selected either.
    const excluded = new Set(excludedExerciseIds ?? [])

    return (data ?? []).filter(
      (details) => !excluded.has(details.exercise.id),
    )
  }, [data, excludedExerciseIds])

  const sourceExercises = useMemo(
    () =>
      selectable.filter((details) =>
        source === 'LIBRARY'
          ? details.exercise.isBuiltIn
          : !details.exercise.isBuiltIn,
      ),
    [selectable, source],
  )

  // Search runs inside the selected segment only, matching the Exercises tab.
  const sections = useMemo<PickerSection[]>(
    () =>
      groupByPrimaryMuscleLabel(
        filterExercises(sourceExercises, search),
      ).map((group) => ({
        muscleLabel: group.muscleLabel,
        data: group.exercises,
      })),
    [search, sourceExercises],
  )

  const usedIds = useMemo(
    () => new Set(usedExerciseIds),
    [usedExerciseIds],
  )

  const renderItem = useCallback(
    ({ item }: { item: Exercise }) => (
      <PickerRow
        exercise={item}
        isUsed={usedIds.has(item.id)}
        onSelect={onSelect}
      />
    ),
    [onSelect, usedIds],
  )

  const renderSectionHeader = useCallback(
    ({ section }: { section: PickerSection }) => (
      <SectionLabel>{section.muscleLabel}</SectionLabel>
    ),
    [],
  )

  const keyExtractor = useCallback((exercise: Exercise) => exercise.id, [])

  // Tells "this segment is empty" apart from "nothing matches the search".
  const isSourceEmpty = data !== null && sourceExercises.length === 0

  const emptyMessage = isSourceEmpty
    ? source === 'CUSTOM'
      ? 'No custom exercises yet. Create one with + New Exercise.'
      : 'No exercises found.'
    : 'No exercises found.'

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
        <ScreenHeader onBack={onClose} title={title} />

        {/* Same control, labels and values as the Exercises tab, so the two
            places never diverge. Search text is kept across a switch, as it
            is there. */}
        <View style={styles.sourceTabs}>
          <Segmented
            onChange={setSource}
            options={[
              { value: 'LIBRARY', label: 'Library' },
              { value: 'CUSTOM', label: 'My Exercises' },
            ]}
            value={source}
          />
        </View>

        <View style={styles.searchRow}>
          <TextField
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            onChangeText={setSearch}
            placeholder="Search exercises..."
            returnKeyType="search"
            value={search}
          />
        </View>

        {isLoading && !data ? <LoadingView /> : null}

        {error ? <ErrorView error={error} onRetry={reload} /> : null}

        {data && !error ? (
          // Virtualized: a ScrollView here mounted all 87 built-in rows and
          // their artwork at once every time the picker opened.
          <SectionList
            contentContainerStyle={styles.content}
            initialNumToRender={8}
            keyExtractor={keyExtractor}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<EmptyView message={emptyMessage} />}
            ListFooterComponent={
              <View style={styles.footer}>
                <Button
                  label="+ New Exercise"
                  onPress={() => {
                    onClose()
                    router.push('/exercise/new')
                  }}
                  variant="secondary"
                />
              </View>
            }
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            sections={sections}
            stickySectionHeadersEnabled={false}
            style={styles.list}
          />
        ) : null}
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },

  sourceTabs: {
    paddingHorizontal: gutter,
    paddingTop: spacing.md,
  },

  searchRow: {
    paddingBottom: spacing.xs,
    paddingHorizontal: gutter,
    paddingTop: spacing.md,
  },

  list: {
    flex: 1,
  },

  content: {
    paddingBottom: spacing.xxl,
    paddingHorizontal: gutter,
  },

  row: {
    alignItems: 'center',
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    // The whole row stays one press target; the thumbnail is inside it and
    // takes no hit area of its own.
    gap: 10,
    justifyContent: 'space-between',
    minHeight: 52,
    paddingVertical: spacing.sm,
  },

  rowPressed: {
    opacity: 0.6,
  },

  rowLabel: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 15.5,
    fontWeight: '500',
  },

  rowLabelUsed: {
    color: colors.textMuted,
  },

  rowTrailing: {
    color: colors.textMuted,
    fontSize: fontSize.meta,
  },

  footer: {
    marginTop: spacing.xxl,
  },
})
