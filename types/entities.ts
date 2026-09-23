export type ExerciseType = 'WEIGHTED' | 'BODYWEIGHT'

export type ExerciseMuscleRoleType = 'PRIMARY' | 'SECONDARY'

export type MuscleKey =
  | 'CHEST'
  | 'FRONT_DELTS'
  | 'SIDE_DELTS'
  | 'REAR_DELTS'
  | 'LATS'
  | 'TRAPS'
  | 'LOWER_BACK'
  | 'BICEPS'
  | 'TRICEPS'
  | 'FOREARMS'
  | 'QUADS'
  | 'ADDUCTORS'
  | 'HAMSTRINGS'
  | 'GLUTES'
  | 'CALVES'
  | 'CORE'

export type MuscleGroup =
  | 'CHEST'
  | 'SHOULDERS'
  | 'BACK'
  | 'ARMS'
  | 'LEGS'
  | 'CORE'

export type Exercise = {
  id: string
  name: string
  type: ExerciseType

  isBuiltIn: boolean
  isArchived: boolean

  sourceKey: string | null

  createdAt: string
  updatedAt: string
}

export type ExerciseDetails = {
  exercise: Exercise
  primaryMuscle: Muscle | null
  secondaryMuscles: Muscle[]
}

export type SaveExerciseInput = {
  name: string
  type: ExerciseType
  primaryMuscle: MuscleKey
  secondaryMuscles: MuscleKey[]
}

export type UpdateExerciseInput = SaveExerciseInput & {
  id: string
}

export type Muscle = {
  id: string
  key: MuscleKey
  name: string
  group: MuscleGroup
}

export type ExerciseMuscle = {
  exerciseId: string
  muscleId: string
  role: ExerciseMuscleRoleType
}

export type BuiltInExerciseDefinition = {
  sourceKey: string
  name: string
  type: ExerciseType
  primaryMuscle: MuscleKey
  secondaryMuscles: MuscleKey[]
}

export interface Workout {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  isArchived: boolean
}

export interface WorkoutExercise {
  id: string
  workoutId: string
  exerciseId: string
  sets: number
  repMin: number | null
  repMax: number | null
  position: number
}

export interface WorkoutSession {
  id: string
  workoutId: string
  startedAt: string
  finishedAt: string | null
  pausedAt: string | null
  totalPausedDuration: number
}

export interface SessionExercise {
  id: string
  workoutSessionId: string
  exerciseId: string
  position: number
  isSkipped: boolean
  plannedSets: number | null
  repMin: number | null
  repMax: number | null
}

export interface SetRecord {
  id: string
  sessionExerciseId: string
  setNumber: number
  weight: number | null
  reps: number | null
}