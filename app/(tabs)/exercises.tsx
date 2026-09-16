import { Button } from '@/components/ui/Button'
import { SectionLabel, TextField } from '@/components/ui/Fields'
import { ListRow } from '@/components/ui/ListRow'
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/StateViews'
import { colors, fontSize, gutter, spacing } from '@/constants/theme'
import { useAsyncData } from '@/hooks/useAsyncData'
import { getExercises } from '@/repositories/exerciseRepository'
import { filterExercises, groupByTargetMuscle } from '@/utils/exerciseGroups'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function ExercisesScreen() {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const { data, isLoading, error, reload } = useAsyncData(getExercises)

  const groups = useMemo(
    () => groupByTargetMuscle(filterExercises(data ?? [], search)),
    [data, search],
  )

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Exercises</Text>

        <TextField
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          onChangeText={setSearch}
          placeholder="Search exercises"
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
                  : 'No exercises yet. Add one to get started.'
              }
            />
          ) : null}

          {groups.map((group) => (
            <View key={group.targetMuscle} style={styles.group}>
              <SectionLabel>{group.targetMuscle}</SectionLabel>

              {group.exercises.map((exercise) => (
                <ListRow
                  key={exercise.id}
                  meta={exercise.type === 'WEIGHTED' ? 'Weighted' : 'Bodyweight'}
                  onPress={() => router.push(`/exercise/${exercise.id}`)}
                  title={exercise.name}
                />
              ))}
            </View>
          ))}

          <View style={styles.addButton}>
            <Button
              label="+ Add Exercise"
              onPress={() => router.push('/exercise/new')}
              variant="secondary"
            />
          </View>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },

  header: {
    paddingBottom: spacing.xs,
    paddingHorizontal: gutter,
    paddingTop: spacing.md,
  },

  screenTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.screenTitle,
    fontWeight: '700',
    letterSpacing: -0.56,
    marginBottom: spacing.lg,
  },

  content: {
    paddingBottom: spacing.xxl,
    paddingHorizontal: gutter,
  },

  group: {
    marginTop: spacing.sm,
  },

  addButton: {
    marginTop: spacing.xxl,
  },
})
