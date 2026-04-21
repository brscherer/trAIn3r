import { PlaceholderCard, ScreenShell } from '@/src/components/screen-shell';

export function WorkoutsScreen() {
  return (
    <ScreenShell
      eyebrow="Milestone 1"
      title="Workout flow scaffold"
      description="This screen is reserved for the fast workout logging flow: create a workout, add exercises, and record sets with reps, weight, and RIR.">
      <PlaceholderCard
        title="Planned flow"
        body="Start workout, choose workout type, add exercises, then capture sets with minimal taps."
      />
      <PlaceholderCard
        title="Data shape"
        body="Workout, exercise log, and set log records will be connected here after the database milestone lands."
      />
    </ScreenShell>
  );
}
