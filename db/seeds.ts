import { BUILT_IN_EXERCISES } from '@/data/builtInExercises'
import { MUSCLES } from '@/data/muscles'
import { dbPromise } from './database'

export async function seedMuscles() {
  const db = await dbPromise

  await db.withTransactionAsync(async () => {
    for (const muscle of MUSCLES) {
      await db.runAsync(
        `
          INSERT INTO muscles (
            id,
            muscle_key,
            name,
            group_key
          )
          VALUES (?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            muscle_key = excluded.muscle_key,
            name = excluded.name,
            group_key = excluded.group_key;
        `,
        muscle.id,
        muscle.key,
        muscle.name,
        muscle.group,
      )
    }
  })
}

export async function seedBuiltInExercises() {
  const db = await dbPromise

  await db.withTransactionAsync(async () => {
    for (const definition of BUILT_IN_EXERCISES) {
      const now = new Date().toISOString()

      const existing = await db.getFirstAsync<{ id: string }>(
        `
          SELECT id
          FROM exercises
          WHERE source_key = ?;
        `,
        definition.sourceKey,
      )

      let exerciseId: string

      if (existing) {
        exerciseId = existing.id

        await db.runAsync(
          `
            UPDATE exercises
            SET
              name = ?,
              type = ?,
              is_built_in = 1,
              updated_at = ?
            WHERE id = ?;
          `,
          definition.name,
          definition.type,
          now,
          exerciseId,
        )
      } else {
        exerciseId = `builtin:${definition.sourceKey}`

        await db.runAsync(
          `
            INSERT INTO exercises (
              id,
              name,
              target_muscle,
              type,
              created_at,
              is_archived,
              is_built_in,
              source_key,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, 0, 1, ?, ?);
          `,
          exerciseId,
          definition.name,
          definition.primaryMuscle,
          definition.type,
          now,
          definition.sourceKey,
          now,
        )
      }

      await db.runAsync(
        `
          DELETE FROM exercise_muscles
          WHERE exercise_id = ?;
        `,
        exerciseId,
      )

      await db.runAsync(
        `
          INSERT INTO exercise_muscles (
            exercise_id,
            muscle_id,
            role
          )
          VALUES (?, ?, 'PRIMARY');
        `,
        exerciseId,
        definition.primaryMuscle,
      )

      for (const muscleId of definition.secondaryMuscles) {
        await db.runAsync(
          `
            INSERT INTO exercise_muscles (
              exercise_id,
              muscle_id,
              role
            )
            VALUES (?, ?, 'SECONDARY');
          `,
          exerciseId,
          muscleId,
        )
      }
    }
  })
}