import {
  ExerciseForm,
  type ExerciseFormValues,
} from '@/components/exercise/ExerciseForm'
import { ErrorView, LoadingView } from '@/components/ui/StateViews'
import { colors } from '@/constants/theme'
import { useAsyncData } from '@/hooks/useAsyncData'
import {
  archiveExercise,
  getExerciseById,
  updateExercise,
} from '@/repositories/exerciseRepository'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { Alert, StyleSheet, View } from 'react-native'

export default function EditExerciseScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [isSaving, setIsSaving] = useState(false)

  const load = useCallback(async () => {
    const exercise = await getExerciseById(id)

    if (!exercise) {
      throw new Error('This exercise no longer exists.')
    }

    return exercise
  }, [id])

  const { data, isLoading, error, reload } = useAsyncData(load, [id])

  const handleSave = async (values: ExerciseFormValues) => {
    setIsSaving(true)

    try {
      await updateExercise(id, values)

      router.back()
    } catch (saveError) {
      Alert.alert(
        'Could not save exercise',
        saveError instanceof Error ? saveError.message : String(saveError),
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleArchive = async () => {
    try {
      await archiveExercise(id)

      router.back()
    } catch (archiveError) {
      Alert.alert(
        'Could not archive exercise',
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
          error={error ?? new Error('This exercise no longer exists.')}
          onRetry={reload}
        />
      </View>
    )
  }

  return (
    <ExerciseForm
      initialValues={{
        name: data.name,
        targetMuscle: data.targetMuscle,
        type: data.type,
      }}
      isSaving={isSaving}
      onArchive={handleArchive}
      onSave={handleSave}
      title="Edit Exercise"
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
