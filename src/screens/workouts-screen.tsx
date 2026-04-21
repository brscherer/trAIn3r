import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ScreenShell } from '@/src/components/screen-shell';
import { useAppDatabase } from '@/src/database/provider';
import {
  listWorkoutsWithDetails,
  saveWorkoutWithDetails,
  type WorkoutWithDetails,
  type WorkoutWithDetailsInput,
} from '@/src/database/repositories/workouts';
import type { SQLiteDatabase } from 'expo-sqlite';

type SetDraft = {
  reps: string;
  weight: string;
  rir: string;
};

type ExerciseDraft = {
  name: string;
  sets: SetDraft[];
};

type WorkoutDraft = {
  date: string;
  type: string;
  exercises: ExerciseDraft[];
};

const EMPTY_SET: SetDraft = {
  reps: '8',
  weight: '0',
  rir: '2',
};

function createEmptyDraft(): WorkoutDraft {
  return {
    date: new Date().toISOString().slice(0, 10),
    type: '',
    exercises: [
      {
        name: '',
        sets: [{ ...EMPTY_SET }],
      },
    ],
  };
}

export function WorkoutsScreen() {
  const db = useAppDatabase();
  const [draft, setDraft] = useState<WorkoutDraft>(() => createEmptyDraft());
  const [savedWorkouts, setSavedWorkouts] = useState<WorkoutWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadWorkouts = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const workouts = await fetchSavedWorkouts(db);
      setSavedWorkouts(workouts);
    } catch {
      setErrorMessage('Unable to load workouts from the local database.');
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useEffect(() => {
    void loadWorkouts();
  }, [loadWorkouts]);

  function updateDraftField(field: 'date' | 'type', value: string) {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateExerciseName(exerciseIndex: number, value: string) {
    setDraft((current) => ({
      ...current,
      exercises: current.exercises.map((exercise, index) =>
        index === exerciseIndex ? { ...exercise, name: value } : exercise
      ),
    }));
  }

  function updateSetField(
    exerciseIndex: number,
    setIndex: number,
    field: keyof SetDraft,
    value: string
  ) {
    setDraft((current) => ({
      ...current,
      exercises: current.exercises.map((exercise, currentExerciseIndex) => {
        if (currentExerciseIndex !== exerciseIndex) {
          return exercise;
        }

        return {
          ...exercise,
          sets: exercise.sets.map((set, currentSetIndex) =>
            currentSetIndex === setIndex ? { ...set, [field]: value } : set
          ),
        };
      }),
    }));
  }

  function addExercise() {
    setDraft((current) => ({
      ...current,
      exercises: [
        ...current.exercises,
        {
          name: '',
          sets: [{ ...EMPTY_SET }],
        },
      ],
    }));
  }

  function addSet(exerciseIndex: number) {
    setDraft((current) => ({
      ...current,
      exercises: current.exercises.map((exercise, index) =>
        index === exerciseIndex
          ? {
              ...exercise,
              sets: [...exercise.sets, { ...EMPTY_SET }],
            }
          : exercise
      ),
    }));
  }

  function removeExercise(exerciseIndex: number) {
    setDraft((current) => {
      if (current.exercises.length === 1) {
        return current;
      }

      return {
        ...current,
        exercises: current.exercises.filter((_, index) => index !== exerciseIndex),
      };
    });
  }

  function removeSet(exerciseIndex: number, setIndex: number) {
    setDraft((current) => ({
      ...current,
      exercises: current.exercises.map((exercise, index) => {
        if (index !== exerciseIndex || exercise.sets.length === 1) {
          return exercise;
        }

        return {
          ...exercise,
          sets: exercise.sets.filter((_, currentSetIndex) => currentSetIndex !== setIndex),
        };
      }),
    }));
  }

  function buildPayload(): WorkoutWithDetailsInput | null {
    if (!draft.type.trim()) {
      setErrorMessage('Workout type is required.');
      return null;
    }

    if (!draft.date.trim()) {
      setErrorMessage('Workout date is required.');
      return null;
    }

    const exercises = draft.exercises
      .map((exercise) => ({
        name: exercise.name.trim(),
        sets: exercise.sets
          .map((set) => ({
            reps: Number(set.reps),
            weight: Number(set.weight),
            rir: Number(set.rir),
          }))
          .filter((set) => Number.isFinite(set.reps) && Number.isFinite(set.weight) && Number.isFinite(set.rir)),
      }))
      .filter((exercise) => exercise.name.length > 0 && exercise.sets.length > 0);

    if (exercises.length === 0) {
      setErrorMessage('Add at least one exercise with one valid set.');
      return null;
    }

    const hasInvalidSet = exercises.some((exercise) =>
      exercise.sets.some((set) => set.reps <= 0 || set.weight < 0 || set.rir < 0)
    );

    if (hasInvalidSet) {
      setErrorMessage('Sets must use positive reps and non-negative weight and RIR values.');
      return null;
    }

    return {
      date: draft.date.trim(),
      type: draft.type.trim(),
      exercises,
    };
  }

  async function handleSaveWorkout() {
    const payload = buildPayload();

    if (!payload) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await saveWorkoutWithDetails(db, payload);
      setDraft(createEmptyDraft());
      await loadWorkouts();
      Alert.alert('Workout saved', 'Your workout has been stored on this device.');
    } catch {
      setErrorMessage('Unable to save workout. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScreenShell
      eyebrow="Milestone 3"
      title="Log a workout"
      description="Create a workout, add exercises, record sets, and save everything locally with minimal ceremony.">
      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">New workout</ThemedText>
        <Field label="Date">
          <WorkoutInput
            value={draft.date}
            onChangeText={(value) => updateDraftField('date', value)}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
          />
        </Field>
        <Field label="Workout type">
          <WorkoutInput
            value={draft.type}
            onChangeText={(value) => updateDraftField('type', value)}
            placeholder="Upper, Lower, Push, Pull..."
          />
        </Field>

        {draft.exercises.map((exercise, exerciseIndex) => (
          <ThemedView key={`exercise-${exerciseIndex}`} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <ThemedText type="subtitle">Exercise {exerciseIndex + 1}</ThemedText>
              <Pressable
                disabled={draft.exercises.length === 1}
                onPress={() => removeExercise(exerciseIndex)}>
                <ThemedText
                  style={[
                    styles.linkText,
                    draft.exercises.length === 1 ? styles.disabledText : undefined,
                  ]}>
                  Remove
                </ThemedText>
              </Pressable>
            </View>
            <WorkoutInput
              value={exercise.name}
              onChangeText={(value) => updateExerciseName(exerciseIndex, value)}
              placeholder="Exercise name"
            />

            {exercise.sets.map((set, setIndex) => (
              <ThemedView key={`set-${exerciseIndex}-${setIndex}`} style={styles.setCard}>
                <View style={styles.setHeader}>
                  <ThemedText type="defaultSemiBold">Set {setIndex + 1}</ThemedText>
                  <Pressable
                    disabled={exercise.sets.length === 1}
                    onPress={() => removeSet(exerciseIndex, setIndex)}>
                    <ThemedText
                      style={[
                        styles.linkText,
                        exercise.sets.length === 1 ? styles.disabledText : undefined,
                      ]}>
                      Remove
                    </ThemedText>
                  </Pressable>
                </View>
                <View style={styles.setRow}>
                  <View style={styles.setField}>
                    <Field label="Reps">
                      <WorkoutInput
                        value={set.reps}
                        onChangeText={(value) =>
                          updateSetField(exerciseIndex, setIndex, 'reps', value)
                        }
                        keyboardType="number-pad"
                      />
                    </Field>
                  </View>
                  <View style={styles.setField}>
                    <Field label="Weight">
                      <WorkoutInput
                        value={set.weight}
                        onChangeText={(value) =>
                          updateSetField(exerciseIndex, setIndex, 'weight', value)
                        }
                        keyboardType="decimal-pad"
                      />
                    </Field>
                  </View>
                  <View style={styles.setField}>
                    <Field label="RIR">
                      <WorkoutInput
                        value={set.rir}
                        onChangeText={(value) =>
                          updateSetField(exerciseIndex, setIndex, 'rir', value)
                        }
                        keyboardType="number-pad"
                      />
                    </Field>
                  </View>
                </View>
              </ThemedView>
            ))}

            <ActionButton label="Add set" onPress={() => addSet(exerciseIndex)} variant="secondary" />
          </ThemedView>
        ))}

        <View style={styles.buttonRow}>
          <ActionButton label="Add exercise" onPress={addExercise} variant="secondary" />
          <ActionButton
            label={isSaving ? 'Saving...' : 'Save workout'}
            onPress={handleSaveWorkout}
            disabled={isSaving}
          />
        </View>

        {errorMessage ? <ThemedText style={styles.errorText}>{errorMessage}</ThemedText> : null}
      </ThemedView>

      <ThemedView style={styles.card}>
        <View style={styles.savedHeader}>
          <ThemedText type="subtitle">Saved workouts</ThemedText>
          {isLoading ? <ActivityIndicator size="small" /> : null}
        </View>

        {!isLoading && savedWorkouts.length === 0 ? (
          <ThemedText style={styles.emptyText}>
            No workouts saved yet. Your first saved session will appear here.
          </ThemedText>
        ) : null}

        {savedWorkouts.map((workout) => (
          <ThemedView key={workout.id} style={styles.savedWorkoutCard}>
            <ThemedText type="defaultSemiBold">
              {workout.type} • {workout.date}
            </ThemedText>
            {workout.exercises.map((exercise) => (
              <View key={exercise.id} style={styles.savedExercise}>
                <ThemedText style={styles.savedExerciseName}>{exercise.name}</ThemedText>
                {exercise.sets.map((set) => (
                  <ThemedText key={set.id} style={styles.savedSet}>
                    {set.reps} reps • {set.weight} kg • RIR {set.rir}
                  </ThemedText>
                ))}
              </View>
            ))}
          </ThemedView>
        ))}
      </ThemedView>
    </ScreenShell>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      {children}
    </View>
  );
}

async function fetchSavedWorkouts(db: SQLiteDatabase) {
  return listWorkoutsWithDetails(db);
}

function WorkoutInput({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      placeholderTextColor="#7A857D"
      style={styles.input}
    />
  );
}

function ActionButton({
  label,
  onPress,
  disabled,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' ? styles.secondaryButton : styles.primaryButton,
        pressed ? styles.buttonPressed : undefined,
        disabled ? styles.buttonDisabled : undefined,
      ]}>
      <ThemedText style={variant === 'secondary' ? styles.secondaryButtonText : styles.primaryButtonText}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#D7E1D8',
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    opacity: 0.72,
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#C9D6CC',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: '#18231D',
    backgroundColor: '#FBFCFA',
  },
  exerciseCard: {
    gap: 12,
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#F7FAF6',
    borderWidth: 1,
    borderColor: '#D7E1D8',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  setCard: {
    gap: 10,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D7E1D8',
  },
  setHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  setRow: {
    flexDirection: 'row',
    gap: 10,
  },
  setField: {
    flex: 1,
  },
  buttonRow: {
    gap: 10,
  },
  button: {
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryButton: {
    backgroundColor: '#2D6A4F',
  },
  secondaryButton: {
    backgroundColor: '#E7F1EA',
    borderWidth: 1,
    borderColor: '#C8D9CD',
  },
  primaryButtonText: {
    color: '#F4F7F3',
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: '#1E4D37',
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  linkText: {
    color: '#2D6A4F',
    fontWeight: '700',
  },
  disabledText: {
    opacity: 0.4,
  },
  errorText: {
    color: '#A33C2C',
  },
  savedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyText: {
    opacity: 0.72,
  },
  savedWorkoutCard: {
    gap: 10,
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#F7FAF6',
    borderWidth: 1,
    borderColor: '#D7E1D8',
  },
  savedExercise: {
    gap: 4,
  },
  savedExerciseName: {
    fontWeight: '700',
  },
  savedSet: {
    opacity: 0.78,
  },
});
