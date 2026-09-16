export const TARGET_MUSCLES = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Legs',
  'Glutes',
  'Calves',
  'Core',
  'Other',
] as const

export type TargetMuscle = (typeof TARGET_MUSCLES)[number]

export function isTargetMuscle(value: string): value is TargetMuscle {
  return (TARGET_MUSCLES as readonly string[]).includes(value)
}
