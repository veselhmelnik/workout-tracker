export type ExerciseType = 'WEIGHTED' | 'BODYWEIGHT'

export interface Exercise {
  id: string
  name: string
  targetMuscle: string
  type: 'WEIGHTED' | 'BODYWEIGHT'
  createdAt: string
  isArchived: boolean
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
}

export interface SetRecord {
  id: string
  sessionExerciseId: string

  setNumber: number
  weight: number | null
  reps: number | null
}