import type { WorkoutWithDetailsInput } from '@/src/database/repositories/workouts';

const REQUIRED_HEADERS = ['day', 'type', 'exercise', 'week', 'sets', 'reps', 'weight', 'rir'] as const;

type RequiredHeader = (typeof REQUIRED_HEADERS)[number];

type NumericRange = {
  min: number;
  max: number;
  label: string;
};

type ParsedCsvRow = {
  day: string;
  type: string;
  exercise: string;
  week: number;
  sets: number;
  reps: NumericRange;
  weight: number | null;
  weightLabel: string;
  rir: NumericRange;
};

export type ImportedExercisePreview = {
  name: string;
  setCount: number;
  repsLabel: string;
  weightLabel: string;
  rirLabel: string;
};

export type ImportedWorkoutPreview = {
  key: string;
  week: number;
  day: string;
  dateLabel: string;
  type: string;
  exercises: ImportedExercisePreview[];
};

export type ParsedImportPlan = {
  workouts: ImportedWorkoutPreview[];
  workoutsToSave: WorkoutWithDetailsInput[];
  totalRows: number;
  totalWorkouts: number;
  totalSets: number;
};

export function parseTrainingPlanCsv(input: string): ParsedImportPlan {
  const normalizedInput = input.trim();

  if (!normalizedInput) {
    throw new Error('Paste a CSV before previewing the import.');
  }

  const lines = normalizedInput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    throw new Error('The CSV must include a header row and at least one data row.');
  }

  const header = splitCsvLine(lines[0]).map((cell) => normalizeHeader(cell));

  if (header.length !== REQUIRED_HEADERS.length) {
    throw new Error(`Expected ${REQUIRED_HEADERS.length} CSV columns.`);
  }

  REQUIRED_HEADERS.forEach((expectedHeader, index) => {
    if (header[index] !== expectedHeader) {
      throw new Error(`Invalid header at column ${index + 1}. Expected "${expectedHeader}".`);
    }
  });

  const rows = lines
    .slice(1)
    .map((line, index) => parseCsvRow(line, index + 2))
    .filter((row): row is ParsedCsvRow => row != null);

  if (rows.length === 0) {
    throw new Error('The CSV does not contain any importable exercise rows.');
  }

  return groupRowsIntoPlan(rows);
}

function parseCsvRow(line: string, lineNumber: number) {
  const cells = splitCsvLine(line);

  if (cells.length !== REQUIRED_HEADERS.length) {
    throw new Error(`Line ${lineNumber} has ${cells.length} columns. Expected ${REQUIRED_HEADERS.length}.`);
  }

  const record = Object.fromEntries(
    REQUIRED_HEADERS.map((header, index) => [header, cells[index]?.trim() ?? ''])
  ) as Record<RequiredHeader, string>;

  if (Object.values(record).every((value) => value.length === 0)) {
    return null;
  }

  const day = record.day.trim();
  const type = record.type.trim();
  const exercise = record.exercise.trim();
  const week = parsePositiveInteger(record.week, lineNumber, 'week');
  const sets = parsePositiveInteger(record.sets, lineNumber, 'sets');
  const reps = parseRangeValue(record.reps, lineNumber, 'reps');
  const weight = parseOptionalWeight(record.weight, lineNumber);
  const rir = parseRangeValue(record.rir, lineNumber, 'rir');

  if (!day || !type || !exercise) {
    throw new Error(`Line ${lineNumber} is missing day, type, or exercise.`);
  }

  return {
    day,
    type,
    exercise,
    week,
    sets,
    reps,
    weight,
    weightLabel: weight == null ? 'Auto / unset' : formatNumber(weight),
    rir,
  };
}

function groupRowsIntoPlan(rows: ParsedCsvRow[]): ParsedImportPlan {
  const workoutMap = new Map<string, ImportedWorkoutPreview>();
  const workoutsToSaveMap = new Map<string, WorkoutWithDetailsInput>();
  let totalSets = 0;

  for (const row of rows) {
    const workoutKey = buildWorkoutKey(row);
    const exerciseKey = normalizeName(row.exercise);
    const dateLabel = `Week ${row.week} • ${row.day}`;

    const workoutPreview = workoutMap.get(workoutKey) ?? {
      key: workoutKey,
      week: row.week,
      day: row.day,
      dateLabel,
      type: row.type,
      exercises: [],
    };

    let previewExercise = workoutPreview.exercises.find(
      (exercise) => normalizeName(exercise.name) === exerciseKey
    );

    if (!previewExercise) {
      previewExercise = {
        name: row.exercise,
        setCount: 0,
        repsLabel: row.reps.label,
        weightLabel: row.weightLabel,
        rirLabel: row.rir.label,
      };
      workoutPreview.exercises.push(previewExercise);
    }

    previewExercise.setCount += row.sets;
    workoutMap.set(workoutKey, workoutPreview);

    const workoutToSave = workoutsToSaveMap.get(workoutKey) ?? {
      date: dateLabel,
      type: row.type,
      exercises: [],
    };

    let workoutExercise = workoutToSave.exercises.find(
      (exercise) => normalizeName(exercise.name) === exerciseKey
    );

    if (!workoutExercise) {
      workoutExercise = {
        name: row.exercise,
        sets: [],
      };
      workoutToSave.exercises.push(workoutExercise);
    }

    for (let index = 0; index < row.sets; index += 1) {
      workoutExercise.sets.push({
        reps: row.reps.min,
        weight: row.weight ?? 0,
        rir: row.rir.min,
      });
    }

    workoutsToSaveMap.set(workoutKey, workoutToSave);
    totalSets += row.sets;
  }

  const workouts = Array.from(workoutMap.values()).sort(compareWorkouts);
  const workoutsToSave = workouts
    .map((workout) => workoutsToSaveMap.get(workout.key))
    .filter((workout): workout is WorkoutWithDetailsInput => workout != null);

  return {
    workouts,
    workoutsToSave,
    totalRows: rows.length,
    totalWorkouts: workouts.length,
    totalSets,
  };
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (character === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }

    current += character;
  }

  if (inQuotes) {
    throw new Error('The CSV contains an unmatched quote.');
  }

  cells.push(current);
  return cells;
}

function parsePositiveInteger(value: string, lineNumber: number, field: string) {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`Line ${lineNumber} has an invalid ${field} value.`);
  }

  return parsedValue;
}

function parseRangeValue(value: string, lineNumber: number, field: string): NumericRange {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`Line ${lineNumber} is missing ${field}.`);
  }

  const parts = normalizedValue.split('-').map((part) => part.trim());

  if (parts.length > 2 || parts.some((part) => part.length === 0)) {
    throw new Error(`Line ${lineNumber} has an invalid ${field} value.`);
  }

  const numbers = parts.map((part) => Number(part));

  if (numbers.some((part) => !Number.isFinite(part) || part < 0)) {
    throw new Error(`Line ${lineNumber} has an invalid ${field} value.`);
  }

  if (numbers.length === 2 && numbers[0] > numbers[1]) {
    throw new Error(`Line ${lineNumber} has an invalid ${field} range.`);
  }

  return {
    min: numbers[0],
    max: numbers[numbers.length - 1],
    label: normalizedValue,
  };
}

function parseOptionalWeight(value: string, lineNumber: number) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  const parsedValue = Number(normalizedValue);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    throw new Error(`Line ${lineNumber} has an invalid weight value.`);
  }

  return parsedValue;
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase();
}

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

function buildWorkoutKey(row: ParsedCsvRow) {
  return `${row.week}::${normalizeName(row.day)}::${normalizeName(row.type)}`;
}

function compareWorkouts(left: ImportedWorkoutPreview, right: ImportedWorkoutPreview) {
  if (left.week !== right.week) {
    return left.week - right.week;
  }

  return left.day.localeCompare(right.day);
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
