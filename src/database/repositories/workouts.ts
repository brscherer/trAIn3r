import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  ExerciseLogRow,
  NewExerciseLog,
  NewSetLog,
  NewWorkout,
  SetLogRow,
  WorkoutRow,
} from '@/src/database/types';

export async function createWorkout(db: SQLiteDatabase, input: NewWorkout) {
  const result = await db.runAsync(
    'INSERT INTO workouts (date, type) VALUES (?, ?)',
    input.date,
    input.type
  );

  return result.lastInsertRowId;
}

export async function listWorkouts(db: SQLiteDatabase) {
  return db.getAllAsync<WorkoutRow>('SELECT id, date, type FROM workouts ORDER BY date DESC, id DESC');
}

export async function getWorkoutById(db: SQLiteDatabase, id: number) {
  return db.getFirstAsync<WorkoutRow>('SELECT id, date, type FROM workouts WHERE id = ?', id);
}

export async function deleteWorkout(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM workouts WHERE id = ?', id);
}

export async function createExerciseLog(db: SQLiteDatabase, input: NewExerciseLog) {
  const result = await db.runAsync(
    'INSERT INTO exercise_logs (workoutId, name) VALUES (?, ?)',
    input.workoutId,
    input.name
  );

  return result.lastInsertRowId;
}

export async function listExerciseLogsForWorkout(db: SQLiteDatabase, workoutId: number) {
  return db.getAllAsync<ExerciseLogRow>(
    'SELECT id, workoutId, name FROM exercise_logs WHERE workoutId = ? ORDER BY id ASC',
    workoutId
  );
}

export async function createSetLog(db: SQLiteDatabase, input: NewSetLog) {
  const result = await db.runAsync(
    'INSERT INTO set_logs (exerciseLogId, reps, weight, rir) VALUES (?, ?, ?, ?)',
    input.exerciseLogId,
    input.reps,
    input.weight,
    input.rir
  );

  return result.lastInsertRowId;
}

export async function listSetLogsForExercise(db: SQLiteDatabase, exerciseLogId: number) {
  return db.getAllAsync<SetLogRow>(
    'SELECT id, exerciseLogId, reps, weight, rir FROM set_logs WHERE exerciseLogId = ? ORDER BY id ASC',
    exerciseLogId
  );
}

