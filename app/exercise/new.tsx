import {
  ExerciseForm,
  type ExerciseFormValues,
} from '@/components/exercise/ExerciseForm'
import { createExercise } from '@/repositories/exerciseRepository'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert } from 'react-native'

export default function NewExerciseScreen() {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async (values: ExerciseFormValues) => {
    setIsSaving(true)

    try {
      await createExercise(values)

      router.back()
    } catch (error) {
      Alert.alert(
        'Could not save exercise',
        error instanceof Error ? error.message : String(error),
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <ExerciseForm
      initialValues={{ name: '', targetMuscle: '', type: 'WEIGHTED' }}
      isSaving={isSaving}
      onSave={handleSave}
      title="New Exercise"
    />
  )
}
