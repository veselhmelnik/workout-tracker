import { Button } from '@/components/ui/Button'
import {
  Chip,
  Note,
  SectionLabel,
  Segmented,
  TextField,
} from '@/components/ui/Fields'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { TARGET_MUSCLES, isTargetMuscle } from '@/constants/targetMuscles'
import { colors, gutter, spacing } from '@/constants/theme'
import type { ExerciseType } from '@/types/entities'
import { useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export type ExerciseFormValues = {
  name: string
  targetMuscle: string
  type: ExerciseType
}

type ExerciseFormProps = {
  title: string
  initialValues: ExerciseFormValues
  isSaving: boolean
  onSave: (values: ExerciseFormValues) => void
  onArchive?: () => void
}

export function ExerciseForm({
  title,
  initialValues,
  isSaving,
  onSave,
  onArchive,
}: ExerciseFormProps) {
  const [name, setName] = useState(initialValues.name)
  const [targetMuscle, setTargetMuscle] = useState(initialValues.targetMuscle)
  const [type, setType] = useState<ExerciseType>(initialValues.type)

  const trimmedName = name.trim()
  const trimmedTargetMuscle = targetMuscle.trim()

  // An exercise saved before this list existed keeps its own value as an
  // extra option, so editing it does not silently reassign the muscle.
  const options =
    trimmedTargetMuscle && !isTargetMuscle(trimmedTargetMuscle)
      ? [...TARGET_MUSCLES, trimmedTargetMuscle]
      : [...TARGET_MUSCLES]

  const canSave =
    trimmedName.length > 0 && trimmedTargetMuscle.length > 0 && !isSaving

  const handleSave = () => {
    if (!canSave) {
      return
    }

    onSave({
      name: trimmedName,
      targetMuscle: trimmedTargetMuscle,
      type,
    })
  }

  const confirmArchive = () => {
    if (!onArchive) {
      return
    }

    Alert.alert(
      'Archive exercise?',
      'It will be hidden from the library. Past sessions are kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Archive', style: 'destructive', onPress: onArchive },
      ],
    )
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <ScreenHeader
        actionDisabled={!canSave}
        actionLabel="Save"
        onAction={handleSave}
        title={title}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <SectionLabel>Exercise name</SectionLabel>
          <TextField
            onChangeText={setName}
            placeholder="e.g. Bench Press"
            returnKeyType="done"
            value={name}
          />

          <SectionLabel>Target muscle</SectionLabel>
          <View style={styles.chips}>
            {options.map((muscle) => (
              <Chip
                isSelected={muscle === trimmedTargetMuscle}
                key={muscle}
                label={muscle}
                onPress={() => setTargetMuscle(muscle)}
              />
            ))}
          </View>

          <SectionLabel>Type</SectionLabel>
          <Segmented
            onChange={setType}
            options={[
              { value: 'WEIGHTED', label: 'Weighted' },
              { value: 'BODYWEIGHT', label: 'Bodyweight' },
            ]}
            value={type}
          />

          <Note>
            Type decides whether the weight column appears during a session.
          </Note>

          <View style={styles.save}>
            <Button
              busy={isSaving}
              disabled={!canSave}
              label="Save"
              onPress={handleSave}
            />
          </View>

          {onArchive ? (
            <View style={styles.archive}>
              <Button
                label="Archive Exercise"
                onPress={confirmArchive}
                variant="destructive"
              />
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },

  flex: {
    flex: 1,
  },

  content: {
    paddingBottom: spacing.xxl,
    paddingHorizontal: gutter,
    paddingTop: spacing.xs,
  },

  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  save: {
    marginTop: spacing.xxl,
  },

  archive: {
    marginTop: spacing.md,
  },
})
