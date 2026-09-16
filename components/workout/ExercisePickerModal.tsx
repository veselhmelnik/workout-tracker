import { Button } from '@/components/ui/Button'
import { SectionLabel, TextField } from '@/components/ui/Fields'
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
  groupByTargetMuscle,
} from '@/utils/exerciseGroups'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type ExercisePickerModalProps = {
  visible: boolean
  /** Exercises already in the workout — shown, but not selectable again. */
  usedExerciseIds: string[]
  onSelect: (exercise: Exercise) => void
  onClose: () => void
}

export function ExercisePickerModal({
  visible,
  usedExerciseIds,
  onSelect,
  onClose,
}: ExercisePickerModalProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const { data, isLoading, error, reload } = useAsyncData(getExercises)

  const groups = useMemo(
    () => groupByTargetMuscle(filterExercises(data ?? [], search)),
    [data, search],
  )

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
        <ScreenHeader onBack={onClose} title="Add Exercise" />

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
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {groups.length === 0 ? (
              <EmptyView
                message={
                  search
                    ? 'No exercises match that search.'
                    : 'No exercises yet. Create one from the Exercises tab.'
                }
              />
            ) : null}

            {groups.map((group) => (
              <View key={group.targetMuscle}>
                <SectionLabel>{group.targetMuscle}</SectionLabel>

                {group.exercises.map((exercise) => {
                  const isUsed = usedExerciseIds.includes(exercise.id)

                  return (
                    <Pressable
                      accessibilityHint={
                        isUsed ? 'Already in this workout' : undefined
                      }
                      accessibilityRole="button"
                      accessibilityState={{ disabled: isUsed }}
                      disabled={isUsed}
                      key={exercise.id}
                      onPress={() => onSelect(exercise)}
                      style={({ pressed }) => [
                        styles.row,
                        pressed && styles.rowPressed,
                      ]}
                    >
                      <Text
                        style={[styles.rowLabel, isUsed && styles.rowLabelUsed]}
                      >
                        {exercise.name}
                      </Text>

                      <Text style={styles.rowTrailing}>
                        {isUsed ? 'Added' : '›'}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            ))}

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
          </ScrollView>
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

  searchRow: {
    paddingBottom: spacing.xs,
    paddingHorizontal: gutter,
    paddingTop: spacing.md,
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
    justifyContent: 'space-between',
    minHeight: 52,
    paddingVertical: spacing.md,
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
