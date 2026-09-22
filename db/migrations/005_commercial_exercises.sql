ALTER TABLE exercises
ADD COLUMN is_built_in INTEGER NOT NULL DEFAULT 0;

ALTER TABLE exercises
ADD COLUMN source_key TEXT;

ALTER TABLE exercises
ADD COLUMN updated_at TEXT;

UPDATE exercises
SET
    updated_at = created_at
WHERE
    updated_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_exercises_source_key ON exercises (source_key)
WHERE
    source_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS muscles (
    id TEXT PRIMARY KEY NOT NULL,
    muscle_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    group_key TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exercise_muscles (
    exercise_id TEXT NOT NULL,
    muscle_id TEXT NOT NULL,
    role TEXT NOT NULL,
    PRIMARY KEY (exercise_id, muscle_id),
    FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE,
    FOREIGN KEY (muscle_id) REFERENCES muscles (id) ON DELETE CASCADE
);