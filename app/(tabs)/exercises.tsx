import {
  ExerciseRow,
  ExerciseRowSkeleton,
  ExerciseSectionHeader,
} from '@/components/exercises/ExerciseRow'
import {
  Emphasis,
  ExercisesEmptyState,
  ExercisesErrorState,
  ExercisesNoResultsState,
} from '@/components/exercises/ExerciseListStates'
import { ExerciseSearch } from '@/components/exercises/ExerciseSearch'
import { MuscleFilterChips } from '@/components/exercises/MuscleFilterChips'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Fields'
import { EmptyView } from '@/components/ui/StateViews'
import { colors, fontSize, gutter, spacing } from '@/constants/theme'
import { MUSCLES } from '@/data/muscles'
import { useAsyncData } from '@/hooks/useAsyncData'
import { getExercises } from '@/repositories/exerciseRepository'
import type { ExerciseDetails, MuscleKey } from '@/types/entities'
import {
  filterExercises,
  groupByPrimaryMuscle,
  splitByMuscleRole,
} from '@/utils/exerciseGroups'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { SectionList, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type Source = 'LIBRARY' | 'CUSTOM'

type ExerciseSection = {
  key: string
  title: string
  count?: number
  data: ExerciseDetails[]
}

const SKELETON_ROWS = Array.from({ length: 9 }, (_, index) => index)

export default function ExercisesScreen() {
  const router = useRouter()

  const [source, setSource] = useState<Source>('LIBRARY')
  const [search, setSearch] = useState('')
  const [muscleKey, setMuscleKey] = useState<MuscleKey | null>(null)

  const { data, isLoading, error, reload } = useAsyncData(getExercises)

  // Create and Archive return here with source=custom so the user lands on
  // My Exercises. Consume the param so the next return can set it again.
  const { source: requestedSource } = useLocalSearchParams<{ source?: string }>()

  useEffect(() => {
    if (requestedSource === 'custom') {
      setSource('CUSTOM')
      router.setParams({ source: undefined })
    }
  }, [requestedSource, router])

  const selectedMuscle = MUSCLES.find((muscle) => muscle.key === muscleKey)
  const query = search.trim()

  const sourceExercises = useMemo(
    () =>
      (data ?? []).filter((details) =>
        source === 'LIBRARY'
          ? details.exercise.isBuiltIn
          : !details.exercise.isBuiltIn,
      ),
    [data, source],
  )

  const searchMatches = useMemo(
    () => filterExercises(sourceExercises, search),
    [sourceExercises, search],
  )

  const sections = useMemo<ExerciseSection[]>(() => {
    if (!muscleKey || !selectedMuscle) {
      return groupByPrimaryMuscle(searchMatches).map((group) => ({
        key: group.key,
        title: group.label,
        data: group.exercises,
      }))
    }

    const { primary, secondary } = splitByMuscleRole(searchMatches, muscleKey)
    const result: ExerciseSection[] = []

    if (primary.length > 0) {
      result.push({
        key: 'PRIMARY',
        title: `${selectedMuscle.name} · Primary`,
        count: primary.length,
        data: primary,
      })
    }

    if (secondary.length > 0) {
      result.push({
        key: 'SECONDARY',
        title: `Also trains ${selectedMuscle.name}`,
        data: secondary,
      })
    }

    return result
  }, [muscleKey, searchMatches, selectedMuscle])

  const openExercise = useCallback(
    (exerciseId: string) => router.push(`/exercise/${exerciseId}`),
    [router],
  )

  // Single entry point to Create; "Create it" prefills the search text.
  const openCreateExercise = (name?: string) =>
    router.push({ pathname: '/exercise/new', params: name ? { name } : {} })

  const hasNoCustomExercises =
    source === 'CUSTOM' && data !== null && sourceExercises.length === 0

  const sourceName = source === 'LIBRARY' ? 'the library' : 'My Exercises'

  const renderNoResults = () => {
    if (!query && !selectedMuscle) {
      return <EmptyView message="The exercise library is empty." />
    }

    if (query && selectedMuscle) {
      // Only point elsewhere when the loaded data actually has such a match.
      const filedElsewhere = searchMatches.find(
        (details) => details.primaryMuscle !== null,
      )

      return (
        <ExercisesNoResultsState
          message={
            <>
              Nothing named <Emphasis>{query}</Emphasis> has{' '}
              {selectedMuscle.name} as a muscle.
              {filedElsewhere?.primaryMuscle
                ? ` ${filedElsewhere.exercise.name} is filed under ${filedElsewhere.primaryMuscle.name}.`
                : ''}
            </>
          }
          primaryAction={{
            label: 'Clear filter',
            onPress: () => setMuscleKey(null),
          }}
          secondaryAction={{
            label: 'Create it',
            onPress: () => openCreateExercise(query),
          }}
        />
      )
    }

    if (query) {
      return (
        <ExercisesNoResultsState
          message={
            <>
              Nothing in {sourceName} is named <Emphasis>{query}</Emphasis>.
            </>
          }
          primaryAction={{ label: 'Clear search', onPress: () => setSearch('') }}
          secondaryAction={{
            label: 'Create it',
            onPress: () => openCreateExercise(query),
          }}
        />
      )
    }

    return (
      <ExercisesNoResultsState
        message={`No ${source === 'LIBRARY' ? 'library' : 'custom'} exercises train ${selectedMuscle?.name}.`}
        primaryAction={{
          label: 'Clear filter',
          onPress: () => setMuscleKey(null),
        }}
      />
    )
  }

  const renderList = () => {
    if (error && !data) {
      return <ExercisesErrorState onRetry={reload} />
    }

    if (!data) {
      return (
        <View style={styles.list}>
          {SKELETON_ROWS.map((index) => (
            <ExerciseRowSkeleton index={index} key={index} />
          ))}
        </View>
      )
    }

    if (sections.length === 0) {
      return renderNoResults()
    }

    return (
      <SectionList
        contentContainerStyle={styles.listContent}
        initialNumToRender={14}
        // Remount per source so switching tabs starts at the top.
        key={source}
        keyExtractor={(details) => details.exercise.id}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <ExerciseRow details={item} onPress={openExercise} />
        )}
        renderSectionHeader={({ section }) => (
          <ExerciseSectionHeader count={section.count} label={section.title} />
        )}
        sections={sections}
        stickySectionHeadersEnabled={false}
        style={styles.list}
      />
    )
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <Text style={styles.screenTitle}>Exercises</Text>

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

      {hasNoCustomExercises ? (
        <ExercisesEmptyState
          onAddCustom={() => openCreateExercise()}
          onBrowseLibrary={() => setSource('LIBRARY')}
        />
      ) : (
        <>
          {source === 'CUSTOM' ? (
            <View style={styles.control}>
              <Button
                label="+ Add Custom Exercise"
                onPress={() => openCreateExercise()}
                variant="secondary"
              />
            </View>
          ) : null}

          <View style={styles.control}>
            <ExerciseSearch onChangeText={setSearch} value={search} />
          </View>

          <View style={styles.chips}>
            <MuscleFilterChips
              muscles={MUSCLES}
              onSelect={setMuscleKey}
              selected={muscleKey}
            />
          </View>

          {renderList()}
        </>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },

  screenTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.screenTitle,
    fontWeight: '700',
    letterSpacing: -0.56,
    paddingHorizontal: gutter,
    paddingTop: spacing.sm,
  },

  sourceTabs: {
    marginTop: 14,
    paddingHorizontal: gutter,
  },

  control: {
    marginTop: spacing.md,
    paddingHorizontal: gutter,
  },

  chips: {
    marginTop: 11,
  },

  list: {
    flex: 1,
    paddingHorizontal: gutter,
  },

  listContent: {
    paddingBottom: spacing.xxl,
  },
})
