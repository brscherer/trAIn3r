import { PlaceholderCard, ScreenShell } from '@/src/components/screen-shell';

export function ImportScreen() {
  return (
    <ScreenShell
      eyebrow="Milestone 1"
      title="CSV import scaffold"
      description="This base screen is reserved for importing training plans from CSV with validation and preview before insertion.">
      <PlaceholderCard
        title="Expected format"
        body="day, type, exercise, week, sets, reps, weight, rir"
      />
      <PlaceholderCard
        title="Import behavior"
        body="The importer will validate structure first, reject invalid files, then group workouts by day and week."
      />
    </ScreenShell>
  );
}
