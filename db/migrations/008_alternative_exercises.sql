CREATE TABLE IF NOT EXISTS workout_exercise_alternatives (
    id TEXT PRIMARY KEY NOT NULL,
    workout_exercise_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    UNIQUE (workout_exercise_id, exercise_id),
    UNIQUE (workout_exercise_id, position),
    FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercises (id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises (id)
);

ALTER TABLE session_exercises
ADD COLUMN planned_exercise_id TEXT;

UPDATE session_exercises
SET
    planned_exercise_id = exercise_id
WHERE
    planned_exercise_id IS NULL;
