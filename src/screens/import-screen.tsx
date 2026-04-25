import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ScreenShell } from '@/src/components/screen-shell';
import { useAppDatabase } from '@/src/database/provider';
import { saveWorkoutsWithDetails } from '@/src/database/repositories/workouts';
import {
  parseTrainingPlanCsv,
  type ParsedImportPlan,
} from '@/src/features/csv-import/parser';

const CSV_TEMPLATE = `day,type,exercise,week,sets,reps,weight,rir
Day 1,Upper,Bench Press,1,3,8,80,2
Day 1,Upper,Chest Supported Row,1,3,10-12,,2-3
,,,,,,,
Day 2,Lower,Back Squat,1,4,6,120,1-2`;

export function ImportScreen() {
  const db = useAppDatabase();
  const [csvInput, setCsvInput] = useState(CSV_TEMPLATE);
  const [preview, setPreview] = useState<ParsedImportPlan | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const previewSummary = useMemo(() => {
    if (!preview) {
      return null;
    }

    return `${preview.totalRows} rows • ${preview.totalWorkouts} workouts • ${preview.totalSets} sets`;
  }, [preview]);

  function handlePreview() {
    try {
      const parsedPreview = parseTrainingPlanCsv(csvInput);
      setPreview(parsedPreview);
      setErrorMessage(null);
    } catch (error) {
      setPreview(null);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to parse the CSV.');
    }
  }

  async function handleImport() {
    if (!preview) {
      setErrorMessage('Preview the CSV before importing it.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await saveWorkoutsWithDetails(db, preview.workoutsToSave);
      Alert.alert('Import complete', `Saved ${preview.totalWorkouts} workouts to local storage.`);
      setPreview(null);
      setCsvInput('');
    } catch {
      setErrorMessage('Unable to import the training plan. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScreenShell
      eyebrow="Milestone 6"
      title="Import training plan"
      description="Paste a CSV training plan, validate the required structure, preview grouped workouts by week and day, then save the imported sessions locally.">
      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">CSV source</ThemedText>
        <ThemedText style={styles.supportingText}>
          Required header: `day,type,exercise,week,sets,reps,weight,rir`
        </ThemedText>
        <TextInput
          multiline
          value={csvInput}
          onChangeText={setCsvInput}
          autoCapitalize="none"
          placeholder={CSV_TEMPLATE}
          placeholderTextColor="#7A857D"
          style={styles.textArea}
          textAlignVertical="top"
        />

        <View style={styles.buttonRow}>
          <ActionButton label="Preview import" onPress={handlePreview} variant="secondary" />
          <ActionButton
            label={isSaving ? 'Importing...' : 'Import plan'}
            onPress={handleImport}
            disabled={isSaving || preview == null}
          />
        </View>

        {errorMessage ? <ThemedText style={styles.errorText}>{errorMessage}</ThemedText> : null}
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Import behavior</ThemedText>
        <ThemedText style={styles.supportingText}>
          Rows are grouped into workouts by `week`, `day`, and `type`. The imported workout date
          label is stored as `Week N • Day X` in the current local workout table.
        </ThemedText>
        <ThemedText style={styles.supportingText}>
          Blank separator rows are ignored. Rep and RIR ranges are preserved in preview and
          normalized to their lower bound when imported into the numeric workout schema. Blank
          weights import as `0`.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <View style={styles.previewHeader}>
          <ThemedText type="subtitle">Preview</ThemedText>
          {previewSummary ? <ThemedText style={styles.previewSummary}>{previewSummary}</ThemedText> : null}
        </View>

        {!preview ? (
          <ThemedText style={styles.supportingText}>
            Validate the CSV to preview the grouped workouts before importing.
          </ThemedText>
        ) : null}

        {preview?.workouts.map((workout) => (
          <ThemedView key={workout.key} style={styles.previewCard}>
            <ThemedText type="defaultSemiBold">
              Week {workout.week} • {workout.day}
            </ThemedText>
            <ThemedText style={styles.previewMeta}>{workout.type}</ThemedText>
            {workout.exercises.map((exercise) => (
              <View key={`${workout.key}-${exercise.name}`} style={styles.exerciseRow}>
                <ThemedText style={styles.exerciseName}>{exercise.name}</ThemedText>
                <ThemedText style={styles.exerciseMeta}>
                  {formatExerciseMeta(exercise)}
                </ThemedText>
              </View>
            ))}
          </ThemedView>
        ))}
      </ThemedView>
    </ScreenShell>
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

function formatExerciseMeta(exercise: ParsedImportPlan['workouts'][number]['exercises'][number]) {
  const weightLabel =
    exercise.weightLabel === 'Auto / unset' ? exercise.weightLabel : `${exercise.weightLabel} kg`;

  return `${exercise.setCount} sets • ${exercise.repsLabel} reps • ${weightLabel} • RIR ${exercise.rirLabel}`;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#D7E1D8',
  },
  supportingText: {
    opacity: 0.82,
  },
  textArea: {
    minHeight: 220,
    borderWidth: 1,
    borderColor: '#C9D6CC',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 22,
    color: '#18231D',
    backgroundColor: '#FBFCFA',
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
  errorText: {
    color: '#A33C2C',
  },
  previewHeader: {
    gap: 4,
  },
  previewSummary: {
    opacity: 0.72,
  },
  previewCard: {
    gap: 10,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D7E1D8',
    backgroundColor: '#F7FAF6',
  },
  previewMeta: {
    opacity: 0.72,
  },
  exerciseRow: {
    gap: 2,
  },
  exerciseName: {
    fontWeight: '700',
  },
  exerciseMeta: {
    opacity: 0.76,
  },
});
