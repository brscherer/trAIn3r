import { PlaceholderCard, ScreenShell } from '@/src/components/screen-shell';

export function MetricsScreen() {
  return (
    <ScreenShell
      eyebrow="Milestone 1"
      title="Metrics scaffold"
      description="This screen is prepared for daily body-weight tracking and the recovery inputs used to calculate fatigue.">
      <PlaceholderCard
        title="Fatigue inputs"
        body="Energy, soreness, and performance will be captured here and combined into the local fatigue score."
      />
      <PlaceholderCard
        title="Weight trend"
        body="Daily entries, weekly averages, and simple visual trends will be added once persistence is available."
      />
    </ScreenShell>
  );
}
