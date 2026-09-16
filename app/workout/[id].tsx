import { ErrorView, LoadingView } from '@/components/ui/StateViews'
import {
  WorkoutEditor,
  type WorkoutDraft,
} from '@/components/workout/WorkoutEditor'
import { colors } from '@/constants/theme'
import { useAsyncData } from '@/hooks/useAsyncData'
import {
  archiveWorkout,
  getWorkoutById,
  updateWorkout,
} from '@/repositories/workoutRepository'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { Alert, StyleSheet, View } from 'react-native'

export default function EditWorkoutScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [isSaving, setIsSaving] = useState(false)

  const loadWorkout = useCallback(async () => {
    const workout = await getWorkoutById(id)

    if (!workout) {
      throw new Error('This workout no longer exists.')
    }

    return workout
  }, [id])

  const { data, isLoading, error, reload } = useAsyncData(loadWorkout, [id])

  const handleSave = async (draft: WorkoutDraft) => {
    setIsSaving(true)

    try {
      await updateWorkout(id, {
        name: draft.name,
        exercises: draft.exercises.map((exercise, index) => ({
          exerciseId: exercise.exerciseId,
          sets: exercise.sets,
          repMin: exercise.repMin,
          repMax: exercise.repMax,
          position: index,
        })),
      })

      router.back()
    } catch (saveError) {
      Alert.alert(
        'Could not save workout',
        saveError instanceof Error ? saveError.message : String(saveError),
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleArchive = async () => {
    try {
      await archiveWorkout(id)

      router.back()
    } catch (archiveError) {
      Alert.alert(
        'Could not archive workout',
        archiveError instanceof Error
          ? archiveError.message
          : String(archiveError),
      )
    }
  }

  if (isLoading && !data) {
    return (
      <View style={styles.gate}>
        <LoadingView />
      </View>
    )
  }

  if (error || !data) {
    return (
      <View style={styles.gate}>
        <ErrorView
          error={error ?? new Error('This workout no longer exists.')}
          onRetry={reload}
        />
      </View>
    )
  }

  return (
    <WorkoutEditor
      initialDraft={{
        name: data.name,
        exercises: data.exercises.map((exercise) => ({
          exerciseId: exercise.exerciseId,
          name: exercise.name,
          type: exercise.type,
          sets: exercise.sets,
          repMin: exercise.repMin,
          repMax: exercise.repMax,
        })),
      }}
      isSaving={isSaving}
      onArchive={handleArchive}
      onSave={handleSave}
      title="Edit Workout"
    />
  )
}

const styles = StyleSheet.create({
  gate: {
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
  },
})
