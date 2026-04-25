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
  getUserMetricsByDate,
  listUserMetrics,
  upsertUserMetrics,
} from '@/src/database/repositories/metrics';
import type { UserMetricsRow } from '@/src/database/types';

type MetricsDraft = {
  date: string;
  weight: string;
  energy: number | null;
  soreness: number | null;
  performance: number | null;
};

const FATIGUE_WARNING_THRESHOLD = 10;
const RECOVERY_OPTIONS = [1, 2, 3, 4, 5] as const;

function createEmptyMetricsDraft(date = getTodayDate()): MetricsDraft {
  return {
    date,
    weight: '',
    energy: null,
    soreness: null,
    performance: null,
  };
}

export function MetricsScreen() {
  const db = useAppDatabase();
  const [draft, setDraft] = useState<MetricsDraft>(() => createEmptyMetricsDraft());
  const [recentMetrics, setRecentMetrics] = useState<UserMetricsRow[]>([]);
  const [isLoadingEntry, setIsLoadingEntry] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadRecentMetrics = useCallback(async () => {
    setIsLoadingHistory(true);

    try {
      const metrics = await listUserMetrics(db, 21);
      setRecentMetrics(metrics);
    } catch {
      setErrorMessage('Unable to load recent metrics from the local database.');
    } finally {
      setIsLoadingHistory(false);
    }
  }, [db]);

  const loadMetricsForDate = useCallback(
    async (date: string) => {
      if (!isIsoDate(date)) {
        setIsLoadingEntry(false);
        return;
      }

      setIsLoadingEntry(true);
      setErrorMessage(null);

      try {
        const metrics = await getUserMetricsByDate(db, date);

        setDraft((current) => ({
          ...current,
          date,
          weight: metrics?.weight != null ? formatWeightInput(metrics.weight) : '',
          energy: metrics?.energy ?? null,
          soreness: metrics?.soreness ?? null,
          performance: metrics?.performance ?? null,
        }));
      } catch {
        setErrorMessage('Unable to load the selected day from the local database.');
      } finally {
        setIsLoadingEntry(false);
      }
    },
    [db]
  );

  useEffect(() => {
    void loadRecentMetrics();
  }, [loadRecentMetrics]);

  useEffect(() => {
    void loadMetricsForDate(draft.date);
  }, [draft.date, loadMetricsForDate]);

  function updateDate(value: string) {
    setDraft((current) => ({
      ...current,
      date: value,
    }));
  }

  function updateWeight(value: string) {
    setDraft((current) => ({
      ...current,
      weight: value,
    }));
  }

  function updateRecoveryField(field: 'energy' | 'soreness' | 'performance', value: number) {
    setDraft((current) => ({
      ...current,
      [field]: current[field] === value ? null : value,
    }));
  }

  async function handleSave() {
    const normalizedDate = draft.date.trim();
    const normalizedWeight = draft.weight.trim();
    const parsedWeight = normalizedWeight.length > 0 ? Number(normalizedWeight) : null;

    if (!normalizedDate) {
      setErrorMessage('Date is required.');
      return;
    }

    if (normalizedWeight.length > 0 && (!Number.isFinite(parsedWeight) || parsedWeight == null || parsedWeight <= 0)) {
      setErrorMessage('Weight must be a positive number when provided.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await upsertUserMetrics(db, {
        date: normalizedDate,
        weight: parsedWeight,
        energy: draft.energy,
        soreness: draft.soreness,
        performance: draft.performance,
      });

      await Promise.all([loadMetricsForDate(normalizedDate), loadRecentMetrics()]);
      Alert.alert('Metrics saved', 'Your daily metrics have been stored on this device.');
    } catch {
      setErrorMessage('Unable to save metrics. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  const fatigueScore = getFatigueScore(draft);
  const weeklyAverage = getWeeklyAverageForDate(recentMetrics, draft.date);
  const recentWeightEntries = recentMetrics.filter((entry) => entry.weight != null).slice(0, 7);

  return (
    <ScreenShell
      eyebrow="Milestone 5"
      title="Track recovery"
      description="Log body weight and daily recovery signals, then review the local fatigue score and the last week of metric history.">
      <ThemedView style={styles.card}>
        <View style={styles.sectionHeader}>
          <ThemedText type="subtitle">Daily metrics</ThemedText>
          {isLoadingEntry ? <ActivityIndicator size="small" /> : null}
        </View>

        <Field label="Date">
          <MetricsInput
            value={draft.date}
            onChangeText={updateDate}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
          />
        </Field>

        <Field label="Body weight (kg)">
          <MetricsInput
            value={draft.weight}
            onChangeText={updateWeight}
            placeholder="82.4"
            keyboardType="decimal-pad"
          />
        </Field>

        <RecoveryField
          label="Energy"
          value={draft.energy}
          helpText="Higher is better."
          onSelect={(value) => updateRecoveryField('energy', value)}
        />

        <RecoveryField
          label="Soreness"
          value={draft.soreness}
          helpText="Higher means more soreness."
          onSelect={(value) => updateRecoveryField('soreness', value)}
        />

        <RecoveryField
          label="Performance"
          value={draft.performance}
          helpText="Higher means training felt stronger."
          onSelect={(value) => updateRecoveryField('performance', value)}
        />

        <ActionButton
          label={isSaving ? 'Saving...' : 'Save metrics'}
          onPress={handleSave}
          disabled={isSaving}
        />

        {errorMessage ? <ThemedText style={styles.errorText}>{errorMessage}</ThemedText> : null}
      </ThemedView>

      <ThemedView
        style={[
          styles.card,
          fatigueScore != null && fatigueScore > FATIGUE_WARNING_THRESHOLD
            ? styles.warningCard
            : styles.neutralCard,
        ]}>
        <ThemedText type="subtitle">Fatigue score</ThemedText>
        <ThemedText style={styles.scoreValue}>
          {fatigueScore != null ? fatigueScore : 'Incomplete'}
        </ThemedText>
        <ThemedText style={styles.supportingText}>
          Formula: (6 - energy) + soreness + (6 - performance)
        </ThemedText>
        <ThemedText style={styles.supportingText}>
          {fatigueScore == null
            ? 'Select energy, soreness, and performance to calculate the daily fatigue score.'
            : fatigueScore > FATIGUE_WARNING_THRESHOLD
              ? `Fatigue is above the warning threshold of ${FATIGUE_WARNING_THRESHOLD}. Consider dialing back intensity.`
              : `Fatigue is at or below the warning threshold of ${FATIGUE_WARNING_THRESHOLD}.`}
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Weight trend</ThemedText>
        <ThemedText style={styles.supportingText}>
          7-day average for {draft.date}: {weeklyAverage != null ? `${weeklyAverage.toFixed(1)} kg` : 'Not enough entries'}
        </ThemedText>

        <View style={styles.sectionHeader}>
          <ThemedText type="defaultSemiBold">Recent entries</ThemedText>
          {isLoadingHistory ? <ActivityIndicator size="small" /> : null}
        </View>

        {!isLoadingHistory && recentWeightEntries.length === 0 ? (
          <ThemedText style={styles.supportingText}>
            No body-weight entries saved yet. Your recent check-ins will appear here.
          </ThemedText>
        ) : null}

        {recentWeightEntries.map((entry) => (
          <ThemedView key={entry.id} style={styles.historyRow}>
            <ThemedText type="defaultSemiBold">{entry.date}</ThemedText>
            <ThemedText>{entry.weight?.toFixed(1)} kg</ThemedText>
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

function MetricsInput({
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

function RecoveryField({
  label,
  value,
  helpText,
  onSelect,
}: {
  label: string;
  value: number | null;
  helpText: string;
  onSelect: (value: number) => void;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.recoveryHeader}>
        <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
        <ThemedText style={styles.helpText}>{helpText}</ThemedText>
      </View>
      <View style={styles.optionRow}>
        {RECOVERY_OPTIONS.map((option) => {
          const isSelected = value === option;

          return (
            <Pressable
              key={`${label}-${option}`}
              onPress={() => onSelect(option)}
              style={({ pressed }) => [
                styles.optionButton,
                isSelected ? styles.optionButtonSelected : undefined,
                pressed ? styles.buttonPressed : undefined,
              ]}>
              <ThemedText
                style={isSelected ? styles.optionButtonTextSelected : styles.optionButtonText}>
                {option}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        styles.primaryButton,
        pressed ? styles.buttonPressed : undefined,
        disabled ? styles.buttonDisabled : undefined,
      ]}>
      <ThemedText style={styles.primaryButtonText}>{label}</ThemedText>
    </Pressable>
  );
}

function getFatigueScore(draft: MetricsDraft) {
  if (draft.energy == null || draft.soreness == null || draft.performance == null) {
    return null;
  }

  return (6 - draft.energy) + draft.soreness + (6 - draft.performance);
}

function getWeeklyAverageForDate(metrics: UserMetricsRow[], date: string) {
  const targetDay = toEpochDay(date);

  if (targetDay == null) {
    return null;
  }

  const weights = metrics
    .filter((entry) => entry.weight != null)
    .filter((entry) => {
      const entryDay = toEpochDay(entry.date);

      if (entryDay == null) {
        return false;
      }

      const difference = targetDay - entryDay;
      return difference >= 0 && difference < 7;
    })
    .map((entry) => entry.weight as number);

  if (weights.length === 0) {
    return null;
  }

  return weights.reduce((sum, weight) => sum + weight, 0) / weights.length;
}

function toEpochDay(value: string) {
  const [year, month, day] = value.split('-').map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatWeightInput(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#D7E1D8',
  },
  neutralCard: {
    backgroundColor: '#F7FAF6',
  },
  warningCard: {
    backgroundColor: '#FFF1EC',
    borderColor: '#E5B9A8',
  },
  field: {
    gap: 8,
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
  recoveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  helpText: {
    fontSize: 13,
    opacity: 0.65,
    flex: 1,
    textAlign: 'right',
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C8D9CD',
    backgroundColor: '#F3F7F4',
  },
  optionButtonSelected: {
    backgroundColor: '#2D6A4F',
    borderColor: '#2D6A4F',
  },
  optionButtonText: {
    fontWeight: '700',
    color: '#1E4D37',
  },
  optionButtonTextSelected: {
    fontWeight: '700',
    color: '#F4F7F3',
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
  primaryButtonText: {
    color: '#F4F7F3',
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
  scoreValue: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '700',
    color: '#1E4D37',
  },
  supportingText: {
    opacity: 0.8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D7E1D8',
    backgroundColor: '#F7FAF6',
  },
});
