import { ExerciseForm } from '@/components/exercise/ExerciseForm'
import { createExerciseRepository } from '@/repositories/exerciseRepository'
import {
  EMPTY_EXERCISE_FORM,
  toSaveExerciseInput,
  type ExerciseFormValues,
} from '@/utils/exerciseForm'
import { returnToMyExercises } from '@/utils/exerciseNavigation'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useRef, useState } from 'react'
import { Alert } from 'react-native'

export default function NewExerciseScreen() {
  const router = useRouter()
  // "Create it" from a no-results search passes the query as the name.
  const { name } = useLocalSearchParams<{ name?: string }>()

  const [isSaving, setIsSaving] = useState(false)
  const isSavingRef = useRef(false)

  const handleSave = async (values: ExerciseFormValues) => {
    if (isSavingRef.current) {
      return
    }

    isSavingRef.current = true
    setIsSaving(true)

    try {
      await createExerciseRepository(toSaveExerciseInput(values))

      returnToMyExercises(router)
    } catch (error) {
      // The form keeps its values; nothing navigates away.
      Alert.alert(
        'Could not save exercise',
        error instanceof Error ? error.message : String(error),
      )
    } finally {
      isSavingRef.current = false
      setIsSaving(false)
    }
  }

  return (
    <ExerciseForm
      initialValues={{ ...EMPTY_EXERCISE_FORM, name: name?.trim() ?? '' }}
      isSaving={isSaving}
      mode="create"
      onSave={handleSave}
    />
  )
}
