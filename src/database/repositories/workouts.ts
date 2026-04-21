import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  ExerciseLogRow,
  NewExerciseLog,
  NewSetLog,
  NewWorkout,
  SetLogRow,
  WorkoutRow,
} from '@/src/database/types';

export type WorkoutSetInput = Omit<NewSetLog, 'exerciseLogId'>;

export type WorkoutExerciseInput = {
  name: string;
  sets: WorkoutSetInput[];
};

export type WorkoutWithDetailsInput = NewWorkout & {
  exercises: WorkoutExerciseInput[];
};

export type ExerciseLogWithSets = ExerciseLogRow & {
  sets: SetLogRow[];
};

export type WorkoutWithDetails = WorkoutRow & {
  exercises: ExerciseLogWithSets[];
};

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

export async function saveWorkoutWithDetails(db: SQLiteDatabase, input: WorkoutWithDetailsInput) {
  let workoutId = 0;

  await db.withExclusiveTransactionAsync(async (txn) => {
    workoutId = await createWorkout(txn, {
      date: input.date,
      type: input.type,
    });

    for (const exercise of input.exercises) {
      const exerciseLogId = await createExerciseLog(txn, {
        workoutId,
        name: exercise.name,
      });

      for (const set of exercise.sets) {
        await createSetLog(txn, {
          exerciseLogId,
          reps: set.reps,
          weight: set.weight,
          rir: set.rir,
        });
      }
    }
  });

  return workoutId;
}

export async function listWorkoutsWithDetails(db: SQLiteDatabase) {
  const workouts = await listWorkouts(db);

  return Promise.all(
    workouts.map(async (workout): Promise<WorkoutWithDetails> => {
      const exercises = await listExerciseLogsForWorkout(db, workout.id);

      const exercisesWithSets = await Promise.all(
        exercises.map(async (exercise): Promise<ExerciseLogWithSets> => ({
          ...exercise,
          sets: await listSetLogsForExercise(db, exercise.id),
        }))
      );

      return {
        ...workout,
        exercises: exercisesWithSets,
      };
    })
  );
}
