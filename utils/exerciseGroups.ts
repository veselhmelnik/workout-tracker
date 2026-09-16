import { TARGET_MUSCLES } from '@/constants/targetMuscles'
import type { Exercise } from '@/types/entities'

export type ExerciseGroup = {
  targetMuscle: string
  exercises: Exercise[]
}

export function filterExercises(
  exercises: Exercise[],
  search: string,
): Exercise[] {
  const query = search.trim().toLowerCase()

  if (!query) {
    return exercises
  }

  return exercises.filter((exercise) =>
    exercise.name.toLowerCase().includes(query),
  )
}

export function groupByTargetMuscle(exercises: Exercise[]): ExerciseGroup[] {
  const groups = new Map<string, Exercise[]>()

  for (const exercise of exercises) {
    const existing = groups.get(exercise.targetMuscle)

    if (existing) {
      existing.push(exercise)
    } else {
      groups.set(exercise.targetMuscle, [exercise])
    }
  }

  // Follow the fixed target-muscle order; anything else (older data) sorts
  // alphabetically after it.
  const rank = (targetMuscle: string) => {
    const index = (TARGET_MUSCLES as readonly string[]).indexOf(targetMuscle)

    return index === -1 ? TARGET_MUSCLES.length : index
  }

  return [...groups.entries()]
    .map(([targetMuscle, grouped]) => ({ targetMuscle, exercises: grouped }))
    .sort(
      (a, b) =>
        rank(a.targetMuscle) - rank(b.targetMuscle) ||
        a.targetMuscle.localeCompare(b.targetMuscle),
    )
}
