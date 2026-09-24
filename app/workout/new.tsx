import {
  WorkoutEditor,
  type WorkoutDraft,
} from '@/components/workout/WorkoutEditor'
import { createWorkout } from '@/repositories/workoutRepository'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert } from 'react-native'

const EMPTY_DRAFT: WorkoutDraft = { name: '', exercises: [] }

export default function NewWorkoutScreen() {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async (draft: WorkoutDraft): Promise<boolean> => {
    setIsSaving(true)

    try {
      await createWorkout({
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

      return true
    } catch (error) {
      // The editor keeps the draft and stays dirty.
      Alert.alert(
        'Could not save workout',
        error instanceof Error ? error.message : String(error),
      )

      return false
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <WorkoutEditor
      initialDraft={EMPTY_DRAFT}
      isSaving={isSaving}
      mode="create"
      onSave={handleSave}
      title="New Workout"
    />
  )
}
