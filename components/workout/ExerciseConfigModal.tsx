import { Button } from '@/components/ui/Button'
import { Note, SectionLabel, Stepper, TextField } from '@/components/ui/Fields'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { colors, fontSize, gutter, spacing } from '@/constants/theme'
import { useEffect, useState } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export type ExerciseConfig = {
  sets: number
  repMin: number | null
  repMax: number | null
}

type ExerciseConfigModalProps = {
  visible: boolean
  exerciseName: string
  mode: 'add' | 'edit'
  initialConfig: ExerciseConfig
  onSubmit: (config: ExerciseConfig) => void
  onRemove?: () => void
  onClose: () => void
}

function toRepValue(value: number | null): string {
  return value === null ? '' : String(value)
}

function parseRepValue(value: string): number | null {
  const digits = value.replace(/[^0-9]/g, '')

  if (!digits) {
    return null
  }

  return Number(digits)
}

export function ExerciseConfigModal({
  visible,
  exerciseName,
  mode,
  initialConfig,
  onSubmit,
  onRemove,
  onClose,
}: ExerciseConfigModalProps) {
  const [sets, setSets] = useState(initialConfig.sets)
  const [repMin, setRepMin] = useState(toRepValue(initialConfig.repMin))
  const [repMax, setRepMax] = useState(toRepValue(initialConfig.repMax))

  useEffect(() => {
    if (visible) {
      setSets(initialConfig.sets)
      setRepMin(toRepValue(initialConfig.repMin))
      setRepMax(toRepValue(initialConfig.repMax))
    }
  }, [visible, initialConfig])

  const parsedMin = parseRepValue(repMin)
  const parsedMax = parseRepValue(repMax)

  const rangeError =
    parsedMin !== null && parsedMax !== null && parsedMin > parsedMax
      ? 'The lowest rep count must not be greater than the highest.'
      : null

  const handleSubmit = () => {
    if (rangeError) {
      return
    }

    onSubmit({ sets, repMin: parsedMin, repMax: parsedMax })
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
        <ScreenHeader
          actionDisabled={rangeError !== null}
          actionLabel="Save"
          onAction={handleSubmit}
          onBack={onClose}
          title={exerciseName}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <SectionLabel>Sets</SectionLabel>
            <Stepper label="sets" onChange={setSets} value={sets} />

            <SectionLabel>Rep range (optional)</SectionLabel>
            <View style={styles.repRow}>
              <TextField
                inputMode="numeric"
                keyboardType="number-pad"
                maxLength={3}
                onChangeText={setRepMin}
                placeholder="min"
                style={styles.repInput}
                value={repMin}
              />

              <Text style={styles.repSeparator}>to</Text>

              <TextField
                inputMode="numeric"
                keyboardType="number-pad"
                maxLength={3}
                onChangeText={setRepMax}
                placeholder="max"
                style={styles.repInput}
                value={repMax}
              />
            </View>

            {rangeError ? (
              <Text style={styles.error}>{rangeError}</Text>
            ) : null}

            <View style={styles.submit}>
              <Button
                disabled={rangeError !== null}
                label={mode === 'add' ? 'Add to Workout' : 'Save Changes'}
                onPress={handleSubmit}
              />
            </View>

            {onRemove ? (
              <Button
                label="Remove from Workout"
                onPress={onRemove}
                variant="destructive"
              />
            ) : null}

            <Note>Rep range is a target only.</Note>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
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

  repRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },

  repInput: {
    flex: 1,
    textAlign: 'center',
  },

  repSeparator: {
    color: colors.textMuted,
    fontSize: fontSize.meta,
  },

  error: {
    color: colors.destructive,
    fontSize: fontSize.meta,
    marginTop: spacing.sm,
  },

  submit: {
    marginBottom: spacing.md,
    marginTop: spacing.xxl,
  },
})
