import { MUSCLES } from '@/data/muscles'
import type {
  Exercise,
  ExerciseDetails,
  Muscle,
  MuscleKey,
} from '@/types/entities'

/** Label for exercises whose primary muscle has not been set (legacy data). */
export const UNSET_MUSCLE_LABEL = 'Muscle not set'

/** Canonical muscle order; exact muscles only, never broad groups. */
const MUSCLE_ORDER = new Map<MuscleKey, number>(
  MUSCLES.map((muscle, index) => [muscle.key, index]),
)

function muscleRank(muscle: Muscle | null): number {
  return muscle ? (MUSCLE_ORDER.get(muscle.key) ?? MUSCLES.length) : Infinity
}

export function filterExercises(
  exercises: ExerciseDetails[],
  search: string,
): ExerciseDetails[] {
  const query = search.trim().toLowerCase()

  if (!query) {
    return exercises
  }

  return exercises.filter((details) =>
    details.exercise.name.toLowerCase().includes(query),
  )
}

/** "Chest · Triceps · Front Delts" — primary first, then secondaries. */
export function formatExerciseMuscles(details: ExerciseDetails): string {
  const muscles = [details.primaryMuscle, ...details.secondaryMuscles]
    .filter((muscle): muscle is Muscle => muscle !== null)
    .map((muscle) => muscle.name)

  return muscles.length > 0 ? muscles.join(' · ') : UNSET_MUSCLE_LABEL
}

export type PrimaryMuscleGroup = {
  key: string
  label: string
  exercises: ExerciseDetails[]
}

/**
 * Groups by primary muscle only, in canonical muscle order. Exercises with no
 * primary muscle collect in a trailing "Muscle not set" group.
 */
export function groupByPrimaryMuscle(
  exercises: ExerciseDetails[],
): PrimaryMuscleGroup[] {
  const groups = new Map<string, PrimaryMuscleGroup & { rank: number }>()

  for (const details of exercises) {
    const muscle = details.primaryMuscle
    const key = muscle?.key ?? 'UNSET'

    let group = groups.get(key)

    if (!group) {
      group = {
        key,
        label: muscle?.name ?? UNSET_MUSCLE_LABEL,
        exercises: [],
        rank: muscleRank(muscle),
      }

      groups.set(key, group)
    }

    group.exercises.push(details)
  }

  return [...groups.values()]
    .sort((a, b) => a.rank - b.rank)
    .map(({ key, label, exercises: grouped }) => ({
      key,
      label,
      exercises: grouped,
    }))
}

/**
 * Splits exercises that train a muscle into those where it is the primary
 * muscle and those where it is only secondary, so weak matches never mix in.
 */
export function splitByMuscleRole(
  exercises: ExerciseDetails[],
  muscleKey: MuscleKey,
): { primary: ExerciseDetails[]; secondary: ExerciseDetails[] } {
  const primary: ExerciseDetails[] = []
  const secondary: ExerciseDetails[] = []

  for (const details of exercises) {
    if (details.primaryMuscle?.key === muscleKey) {
      primary.push(details)
    } else if (
      details.secondaryMuscles.some((muscle) => muscle.key === muscleKey)
    ) {
      secondary.push(details)
    }
  }

  return { primary, secondary }
}

// The Add Exercise picker in the workout editor still consumes this shape.
export type ExerciseGroup = {
  targetMuscle: string
  exercises: Exercise[]
}

export function groupByTargetMuscle(
  exercises: ExerciseDetails[],
): ExerciseGroup[] {
  return groupByPrimaryMuscle(exercises).map((group) => ({
    targetMuscle: group.label,
    exercises: group.exercises.map((details) => details.exercise),
  }))
}
