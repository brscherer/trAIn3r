import type { WorkoutWithDetails } from '@/src/database/repositories/workouts';

const DEFAULT_INCREASE_KG = 2.5;
const DEFAULT_MAX_REP_RANGE = 12;

type ProgressionAction = 'increase' | 'maintain';

export type ProgressionSuggestion = {
  action: ProgressionAction;
  exerciseName: string;
  reason: string;
  maxRange: number;
  referenceDate: string;
  referenceReps: number;
  referenceWeight: number;
  suggestedWeight: number;
};

export function getProgressionSuggestion(input: {
  exerciseName: string;
  workouts: WorkoutWithDetails[];
  maxRange?: number;
  increaseByKg?: number;
}) {
  const normalizedExerciseName = normalizeExerciseName(input.exerciseName);

  if (!normalizedExerciseName) {
    return null;
  }

  const maxRange = input.maxRange ?? DEFAULT_MAX_REP_RANGE;
  const increaseByKg = input.increaseByKg ?? DEFAULT_INCREASE_KG;

  if (!Number.isFinite(maxRange) || maxRange <= 0) {
    return null;
  }

  const match = findLatestMatchingExercise(input.workouts, normalizedExerciseName);

  if (!match) {
    return null;
  }

  const referenceSet = findReferenceSet(match.exercise.sets);

  if (!referenceSet) {
    return null;
  }

  const shouldIncrease = referenceSet.reps >= maxRange;
  const suggestedWeight = shouldIncrease
    ? roundWeight(referenceSet.weight + increaseByKg)
    : roundWeight(referenceSet.weight);

  return {
    action: shouldIncrease ? 'increase' : 'maintain',
    exerciseName: match.exercise.name,
    reason: shouldIncrease
      ? `Last reference set reached ${referenceSet.reps} reps, which meets the ${maxRange}-rep cap.`
      : `Last reference set reached ${referenceSet.reps} reps, which is below the ${maxRange}-rep cap.`,
    maxRange,
    referenceDate: match.workout.date,
    referenceReps: referenceSet.reps,
    referenceWeight: referenceSet.weight,
    suggestedWeight,
  } satisfies ProgressionSuggestion;
}

function findLatestMatchingExercise(workouts: WorkoutWithDetails[], normalizedExerciseName: string) {
  for (const workout of workouts) {
    const exercise = workout.exercises.find(
      (candidate) => normalizeExerciseName(candidate.name) === normalizedExerciseName
    );

    if (exercise) {
      return { workout, exercise };
    }
  }

  return null;
}

function findReferenceSet(sets: { id: number; reps: number; weight: number; rir: number }[]) {
  if (sets.length === 0) {
    return null;
  }

  return [...sets].sort((left, right) => {
    if (right.weight !== left.weight) {
      return right.weight - left.weight;
    }

    if (right.reps !== left.reps) {
      return right.reps - left.reps;
    }

    return right.id - left.id;
  })[0];
}

function normalizeExerciseName(value: string) {
  return value.trim().toLowerCase();
}

function roundWeight(value: number) {
  return Math.round(value * 100) / 100;
}
