import { ExerciseForm } from '@/components/exercise/ExerciseForm'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { EmptyView, ErrorView, LoadingView } from '@/components/ui/StateViews'
import { colors } from '@/constants/theme'
import { useAsyncData } from '@/hooks/useAsyncData'
import {
  archiveExerciseRepository,
  getExerciseDetailsById,
  updateExerciseRepository,
} from '@/repositories/exerciseRepository'
import {
  formValuesFromDetails,
  toSaveExerciseInput,
  type ExerciseFormValues,
} from '@/utils/exerciseForm'
import { returnToMyExercises } from '@/utils/exerciseNavigation'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useRef, useState, type ReactNode } from 'react'
import { Alert, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function EditExerciseScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()

  const [isSaving, setIsSaving] = useState(false)
  const isSavingRef = useRef(false)

  const load = useCallback(async () => {
    const details = await getExerciseDetailsById(id)

    if (!details) {
      throw new Error('This exercise no longer exists.')
    }

    return details
  }, [id])

  const { data, isLoading, error, reload } = useAsyncData(load, [id])

  /** Runs one mutation at a time; failures keep the form and stay here. */
  const runMutation = async (
    action: () => Promise<void>,
    errorTitle: string,
    onSuccess: () => void,
  ) => {
    if (isSavingRef.current) {
      return
    }

    isSavingRef.current = true
    setIsSaving(true)

    try {
      await action()
      onSuccess()
    } catch (mutationError) {
      Alert.alert(
        errorTitle,
        mutationError instanceof Error
          ? mutationError.message
          : String(mutationError),
      )
    } finally {
      isSavingRef.current = false
      setIsSaving(false)
    }
  }

  const handleSave = (values: ExerciseFormValues) =>
    runMutation(
      () => updateExerciseRepository({ id, ...toSaveExerciseInput(values) }),
      'Could not save exercise',
      () => router.back(),
    )

  const confirmArchive = () => {
    Alert.alert(
      'Archive exercise?',
      'It will disappear from My Exercises. Workouts and sessions that already recorded it keep their history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: () =>
            runMutation(
              () => archiveExerciseRepository(id),
              'Could not archive exercise',
              () => returnToMyExercises(router),
            ),
        },
      ],
    )
  }

  // Only complete data reaches the form, so it is initialised exactly once.
  if (isLoading && !data) {
    return (
      <Fallback>
        <LoadingView />
      </Fallback>
    )
  }

  // Only an initial load failure shows the error state. Once the form holds
  // data, a failed focus refresh keeps the stale values and unsaved input.
  if (!data) {
    return (
      <Fallback>
        <ErrorView
          error={error ?? new Error('This exercise no longer exists.')}
          onRetry={reload}
        />
      </Fallback>
    )
  }

  // Library exercises are read-only; the route is never offered for them,
  // but a direct link must not expose an editable form either.
  if (data.exercise.isBuiltIn || data.exercise.isArchived) {
    return (
      <Fallback>
        <EmptyView
          message={
            data.exercise.isBuiltIn
              ? 'Library exercises cannot be edited.'
              : 'This exercise is archived and cannot be edited.'
          }
        />
      </Fallback>
    )
  }

  return (
    <ExerciseForm
      initialValues={formValuesFromDetails(data)}
      isSaving={isSaving}
      key={data.exercise.id}
      mode="edit"
      onArchive={confirmArchive}
      onSave={handleSave}
    />
  )
}

function Fallback({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <ScreenHeader title="Edit Exercise" />
      <View style={styles.gate}>{children}</View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },

  gate: {
    flex: 1,
    justifyContent: 'center',
  },
})
