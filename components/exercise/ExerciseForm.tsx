import { Button } from '@/components/ui/Button'
import { Segmented, TextField } from '@/components/ui/Fields'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { colors, fonts, gutter, radius, spacing } from '@/constants/theme'
import type { ExerciseType, MuscleKey } from '@/types/entities'
import {
  MAX_SECONDARY_MUSCLES,
  buildTechniqueQuery,
  buildTechniqueSearchUrl,
  getMuscleName,
  setPrimaryMuscle,
  toggleSecondaryMuscle,
  validateExerciseForm,
  type ExerciseFormValues,
} from '@/utils/exerciseForm'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MuscleSelectorSheet } from './MuscleSelectorSheet'

const TOAST_DURATION_MS = 2500

type ExerciseFormProps = {
  mode: 'create' | 'edit'
  initialValues: ExerciseFormValues
  isSaving: boolean
  onSave: (values: ExerciseFormValues) => void
  onArchive?: () => void
}

/**
 * Create / Edit Custom Exercise. Holds the draft locally; initial values are
 * read once, so a background reload never overwrites what the user typed.
 */
export function ExerciseForm({
  mode,
  initialValues,
  isSaving,
  onSave,
  onArchive,
}: ExerciseFormProps) {
  const [values, setValues] = useState(initialValues)
  const [sheet, setSheet] = useState<'primary' | 'secondary' | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current)
      }
    },
    [],
  )

  const validation = validateExerciseForm(values)
  const canSave = validation.isValid && !isSaving

  const showToast = (message: string) => {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current)
    }

    setToast(message)
    toastTimer.current = setTimeout(() => setToast(null), TOAST_DURATION_MS)
  }

  const closeSheet = () => {
    setSheet(null)
    setToast(null)
  }

  const handleSelectMuscle = (key: MuscleKey) => {
    if (sheet === 'primary') {
      const result = setPrimaryMuscle(values, key)
      setValues(result.values)

      if (result.promotedFromSecondary) {
        showToast(`${getMuscleName(key)} moved to Primary`)
      }
    } else {
      setValues(toggleSecondaryMuscle(values, key))
    }
  }

  const handleSave = () => {
    if (canSave) {
      onSave(values)
    }
  }

  const techniqueQuery = buildTechniqueQuery(values.name)

  const openTechniqueSearch = async () => {
    if (!techniqueQuery) {
      return
    }

    try {
      await Linking.openURL(buildTechniqueSearchUrl(techniqueQuery))
    } catch {
      Alert.alert('Could not open YouTube', 'Check that a browser is available.')
    }
  }

  const secondaryCount = values.secondaryMuscles.length

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <ScreenHeader
        actionDisabled={!canSave}
        actionLabel="Save"
        onAction={handleSave}
        title={mode === 'create' ? 'New Exercise' : 'Edit Exercise'}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Field label="EXERCISE NAME">
            <TextField
              autoCapitalize="sentences"
              onChangeText={(name) => setValues((current) => ({ ...current, name }))}
              placeholder="e.g. Hip Thrust"
              returnKeyType="done"
              style={styles.nameInput}
              value={values.name}
            />
          </Field>

          <Field label="TYPE">
            <Segmented
              onChange={(type: ExerciseType) =>
                setValues((current) => ({ ...current, type }))
              }
              options={[
                { value: 'WEIGHTED', label: 'Weighted' },
                { value: 'BODYWEIGHT', label: 'Bodyweight' },
              ]}
              value={values.type}
            />
            <Text style={styles.helper}>
              Decides whether the weight column appears during a session.
            </Text>
          </Field>

          <Field
            label="PRIMARY MUSCLE"
            trailing={
              validation.isPrimaryMissing ? (
                <Text style={styles.required}>REQUIRED</Text>
              ) : null
            }
          >
            <Pressable
              accessibilityHint="Opens the muscle list"
              accessibilityRole="button"
              onPress={() => setSheet('primary')}
              style={({ pressed }) => [
                styles.selectField,
                validation.isPrimaryMissing && styles.selectFieldMissing,
                pressed && styles.pressed,
              ]}
            >
              {values.primaryMuscle ? (
                <Text style={styles.selectValue}>
                  {getMuscleName(values.primaryMuscle)}
                </Text>
              ) : (
                <Text style={styles.selectPlaceholder}>Select a muscle</Text>
              )}
              <Text style={styles.selectChevron}>›</Text>
            </Pressable>
          </Field>

          <Field
            label={
              secondaryCount === 0
                ? 'SECONDARY MUSCLES · OPTIONAL'
                : 'SECONDARY MUSCLES'
            }
            trailing={
              secondaryCount > 0 ? (
                <Text style={styles.counter}>
                  {secondaryCount} / {MAX_SECONDARY_MUSCLES}
                </Text>
              ) : null
            }
          >
            <View style={styles.tags}>
              {values.secondaryMuscles.map((key) => (
                <Pressable
                  accessibilityHint="Removes this secondary muscle"
                  accessibilityLabel={`${getMuscleName(key)}, remove`}
                  accessibilityRole="button"
                  key={key}
                  onPress={() =>
                    setValues((current) => toggleSecondaryMuscle(current, key))
                  }
                  style={({ pressed }) => [styles.tag, pressed && styles.pressed]}
                >
                  <Text style={styles.tagLabel}>{getMuscleName(key)}</Text>
                  <Text style={styles.tagRemove}>×</Text>
                </Pressable>
              ))}

              {secondaryCount < MAX_SECONDARY_MUSCLES ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setSheet('secondary')}
                  style={({ pressed }) => [styles.addTag, pressed && styles.pressed]}
                >
                  <Text style={styles.addTagLabel}>
                    {secondaryCount === 0 ? '+ Add muscle' : '+ Add'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </Field>

          {mode === 'create' ? (
            <Text style={styles.helper}>
              A YouTube technique search is generated from the exercise name.
            </Text>
          ) : (
            <Field label="TECHNIQUE">
              <Pressable
                accessibilityHint="Opens a YouTube search in the browser"
                accessibilityRole="link"
                disabled={!techniqueQuery}
                onPress={openTechniqueSearch}
                style={({ pressed }) => [
                  styles.techniqueRow,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.techniqueText}>
                  <Text style={styles.techniqueTitle}>Search on YouTube</Text>
                  <Text numberOfLines={1} style={styles.techniqueQuery}>
                    {techniqueQuery ? `“${techniqueQuery}”` : 'Enter a name first'}
                  </Text>
                </View>
                <Text style={styles.techniqueArrow}>↗</Text>
              </Pressable>
              <Text style={styles.helper}>
                Generated from the name. Not an editable field.
              </Text>
            </Field>
          )}

          <View style={styles.bottom}>
            {mode === 'create' ? (
              <>
                <Button
                  busy={isSaving}
                  disabled={!validation.isValid}
                  label="Save Exercise"
                  onPress={handleSave}
                />
                {validation.blockingMessage ? (
                  <Text style={styles.blocking}>{validation.blockingMessage}</Text>
                ) : null}
              </>
            ) : (
              <>
                {validation.blockingMessage ? (
                  <Text style={styles.blocking}>{validation.blockingMessage}</Text>
                ) : null}
                {onArchive ? (
                  <Button
                    disabled={isSaving}
                    label="Archive Exercise"
                    onPress={onArchive}
                    variant="destructive"
                  />
                ) : null}
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <MuscleSelectorSheet
        mode={sheet ?? 'primary'}
        onClose={closeSheet}
        onSelect={handleSelectMuscle}
        primaryMuscle={values.primaryMuscle}
        secondaryMuscles={values.secondaryMuscles}
        toast={toast}
        visible={sheet !== null}
      />
    </SafeAreaView>
  )
}

function Field({
  label,
  trailing,
  children,
}: {
  label: string
  trailing?: ReactNode
  children: ReactNode
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldHeader}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {trailing}
      </View>
      {children}
    </View>
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

  // flexGrow lets the bottom actions sit at the foot of the screen when the
  // form is short, and scroll normally when the keyboard is up.
  content: {
    flexGrow: 1,
    gap: 20,
    paddingBottom: spacing.lg,
    paddingHorizontal: gutter,
    paddingTop: 18,
  },

  field: {
    gap: 7,
  },

  fieldHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  fieldLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
  },

  required: {
    color: colors.destructive,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },

  counter: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 11,
  },

  nameInput: {
    minHeight: 50,
  },

  helper: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },

  selectField: {
    alignItems: 'center',
    backgroundColor: colors.elevated,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    height: 52,
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },

  // Red-tinted border marks the required field while it is empty.
  selectFieldMissing: {
    borderColor: colors.destructiveBorder,
  },

  selectValue: {
    color: colors.textPrimary,
    fontSize: 15.5,
    fontWeight: '500',
  },

  selectPlaceholder: {
    color: colors.textMuted,
    fontSize: 15.5,
  },

  selectChevron: {
    color: colors.textSecondary,
    fontSize: 17,
  },

  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },

  tag: {
    alignItems: 'center',
    backgroundColor: colors.raised,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    height: 38,
    paddingLeft: 14,
    paddingRight: 10,
  },

  tagLabel: {
    color: colors.textPrimary,
    fontSize: 13.5,
    fontWeight: '500',
  },

  tagRemove: {
    color: colors.textSecondary,
    fontSize: 16,
  },

  addTag: {
    alignItems: 'center',
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    borderStyle: 'dashed',
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },

  addTagLabel: {
    color: colors.textSecondary,
    fontSize: 13.5,
    fontWeight: '500',
  },

  techniqueRow: {
    alignItems: 'center',
    backgroundColor: colors.elevated,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: spacing.sm,
  },

  techniqueText: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },

  techniqueTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },

  techniqueQuery: {
    color: colors.textMuted,
    fontSize: 11.5,
  },

  techniqueArrow: {
    color: colors.textPrimary,
    fontSize: 13,
  },

  bottom: {
    gap: 9,
    marginTop: 'auto',
  },

  blocking: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },

  pressed: {
    opacity: 0.7,
  },
})
