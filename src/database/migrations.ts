import type { SQLiteDatabase } from 'expo-sqlite';

import { DATABASE_VERSION } from '@/src/database/constants';

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = result?.user_version ?? 0;

  if (currentVersion >= DATABASE_VERSION) {
    return;
  }

  await db.withExclusiveTransactionAsync(async (txn) => {
    if (currentVersion === 0) {
      await txn.execAsync(`
        CREATE TABLE IF NOT EXISTS workouts (
          id INTEGER PRIMARY KEY NOT NULL,
          date TEXT NOT NULL,
          type TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS exercise_logs (
          id INTEGER PRIMARY KEY NOT NULL,
          workoutId INTEGER NOT NULL,
          name TEXT NOT NULL,
          FOREIGN KEY (workoutId) REFERENCES workouts(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS set_logs (
          id INTEGER PRIMARY KEY NOT NULL,
          exerciseLogId INTEGER NOT NULL,
          reps INTEGER NOT NULL,
          weight REAL NOT NULL,
          rir INTEGER NOT NULL,
          FOREIGN KEY (exerciseLogId) REFERENCES exercise_logs(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS user_metrics (
          id INTEGER PRIMARY KEY NOT NULL,
          date TEXT NOT NULL UNIQUE,
          weight REAL,
          energy INTEGER CHECK (energy IS NULL OR energy BETWEEN 1 AND 5),
          soreness INTEGER CHECK (soreness IS NULL OR soreness BETWEEN 1 AND 5),
          performance INTEGER CHECK (performance IS NULL OR performance BETWEEN 1 AND 5)
        );

        CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date);
        CREATE INDEX IF NOT EXISTS idx_exercise_logs_workoutId ON exercise_logs(workoutId);
        CREATE INDEX IF NOT EXISTS idx_set_logs_exerciseLogId ON set_logs(exerciseLogId);
        CREATE INDEX IF NOT EXISTS idx_user_metrics_date ON user_metrics(date);

        PRAGMA user_version = 1;
      `);
    }
  });
}

