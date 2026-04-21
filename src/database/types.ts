export type WorkoutRow = {
  id: number;
  date: string;
  type: string;
};

export type NewWorkout = Omit<WorkoutRow, 'id'>;

export type ExerciseLogRow = {
  id: number;
  workoutId: number;
  name: string;
};

export type NewExerciseLog = Omit<ExerciseLogRow, 'id'>;

export type SetLogRow = {
  id: number;
  exerciseLogId: number;
  reps: number;
  weight: number;
  rir: number;
};

export type NewSetLog = Omit<SetLogRow, 'id'>;

export type UserMetricsRow = {
  id: number;
  date: string;
  weight: number | null;
  energy: number | null;
  soreness: number | null;
  performance: number | null;
};

export type UpsertUserMetrics = Omit<UserMetricsRow, 'id'>;

