import { MUSCLES } from '@/data/muscles'
import type {
  ExerciseDetails,
  ExerciseType,
  Muscle,
  MuscleGroup,
  MuscleKey,
  SaveExerciseInput,
} from '@/types/entities'

export const MAX_SECONDARY_MUSCLES = 3

export type ExerciseFormValues = {
  name: string
  type: ExerciseType
  primaryMuscle: MuscleKey | null
  secondaryMuscles: MuscleKey[]
}

export const EMPTY_EXERCISE_FORM: ExerciseFormValues = {
  name: '',
  type: 'WEIGHTED',
  primaryMuscle: null,
  secondaryMuscles: [],
}

export function formValuesFromDetails(
  details: ExerciseDetails,
): ExerciseFormValues {
  return {
    name: details.exercise.name,
    type: details.exercise.type,
    primaryMuscle: details.primaryMuscle?.key ?? null,
    secondaryMuscles: details.secondaryMuscles.map((muscle) => muscle.key),
  }
}

// ---------------------------------------------------------------------------
// Muscle rules: one primary, 0–3 secondaries, never the same muscle in both.

/**
 * Sets the primary muscle. A muscle held as secondary moves to primary; the
 * previous primary is dropped, not re-added as a secondary.
 */
export function setPrimaryMuscle(
  values: ExerciseFormValues,
  key: MuscleKey,
): { values: ExerciseFormValues; promotedFromSecondary: boolean } {
  const promotedFromSecondary = values.secondaryMuscles.includes(key)

  return {
    values: {
      ...values,
      primaryMuscle: key,
      secondaryMuscles: values.secondaryMuscles.filter(
        (secondary) => secondary !== key,
      ),
    },
    promotedFromSecondary,
  }
}

/** Adds or removes a secondary; refuses the primary and a fourth muscle. */
export function toggleSecondaryMuscle(
  values: ExerciseFormValues,
  key: MuscleKey,
): ExerciseFormValues {
  if (values.secondaryMuscles.includes(key)) {
    return {
      ...values,
      secondaryMuscles: values.secondaryMuscles.filter(
        (secondary) => secondary !== key,
      ),
    }
  }

  if (!canAddSecondary(values, key)) {
    return values
  }

  return { ...values, secondaryMuscles: [...values.secondaryMuscles, key] }
}

export function canAddSecondary(
  values: ExerciseFormValues,
  key: MuscleKey,
): boolean {
  return (
    key !== values.primaryMuscle &&
    !values.secondaryMuscles.includes(key) &&
    values.secondaryMuscles.length < MAX_SECONDARY_MUSCLES
  )
}

// ---------------------------------------------------------------------------
// Validation

export type ExerciseFormValidation = {
  isValid: boolean
  /** One line explaining what blocks saving; null when valid. */
  blockingMessage: string | null
  isNameMissing: boolean
  isPrimaryMissing: boolean
}

export function validateExerciseForm(
  values: ExerciseFormValues,
): ExerciseFormValidation {
  const isNameMissing = values.name.trim().length === 0
  const isPrimaryMissing = values.primaryMuscle === null

  const secondaries = values.secondaryMuscles
  const hasSecondaryProblem =
    secondaries.length > MAX_SECONDARY_MUSCLES ||
    new Set(secondaries).size !== secondaries.length ||
    (values.primaryMuscle !== null &&
      secondaries.includes(values.primaryMuscle))

  let blockingMessage: string | null = null

  if (isNameMissing && isPrimaryMissing) {
    blockingMessage = 'Enter a name and choose a primary muscle to continue'
  } else if (isPrimaryMissing) {
    blockingMessage = 'Choose a primary muscle to continue'
  } else if (isNameMissing) {
    blockingMessage = 'Enter a name to continue'
  } else if (hasSecondaryProblem) {
    blockingMessage = `Choose up to ${MAX_SECONDARY_MUSCLES} different secondary muscles`
  }

  return {
    isValid: blockingMessage === null,
    blockingMessage,
    isNameMissing,
    isPrimaryMissing,
  }
}

/** Builds the repository input, re-checking the rules rather than trusting the UI. */
export function toSaveExerciseInput(
  values: ExerciseFormValues,
): SaveExerciseInput {
  const validation = validateExerciseForm(values)

  if (!validation.isValid || values.primaryMuscle === null) {
    throw new Error(validation.blockingMessage ?? 'The exercise is incomplete.')
  }

  return {
    name: values.name.trim(),
    type: values.type,
    primaryMuscle: values.primaryMuscle,
    secondaryMuscles: [...values.secondaryMuscles],
  }
}

// ---------------------------------------------------------------------------
// Presentation helpers

const GROUP_LABELS: Record<MuscleGroup, string> = {
  CHEST: 'Chest',
  SHOULDERS: 'Shoulders',
  BACK: 'Back',
  ARMS: 'Arms',
  LEGS: 'Legs',
  CORE: 'Core',
}

export type MuscleSelectorGroup = {
  group: MuscleGroup
  label: string
  muscles: Muscle[]
}

/** Canonical muscles under their group headings; groups are never selectable. */
export const MUSCLE_SELECTOR_GROUPS: MuscleSelectorGroup[] = (() => {
  const groups: MuscleSelectorGroup[] = []

  for (const muscle of MUSCLES) {
    let group = groups.find((entry) => entry.group === muscle.group)

    if (!group) {
      group = { group: muscle.group, label: GROUP_LABELS[muscle.group], muscles: [] }
      groups.push(group)
    }

    group.muscles.push(muscle)
  }

  return groups
})()

export function getMuscleName(key: MuscleKey): string {
  return MUSCLES.find((muscle) => muscle.key === key)?.name ?? key
}

/** Selector-only supporting wording; the stored key and display name stay. */
export function getMuscleSelectorLabel(muscle: Muscle): string {
  return muscle.key === 'ADDUCTORS' ? `${muscle.name} / Inner Thigh` : muscle.name
}

/** "machine press proper form" — from the name only, never the muscles. */
export function buildTechniqueQuery(name: string): string {
  const normalized = name.trim().replace(/\s+/g, ' ').toLowerCase()

  return normalized ? `${normalized} proper form` : ''
}

export function buildTechniqueSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
}
