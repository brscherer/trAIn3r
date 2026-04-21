import { PlaceholderCard, ScreenShell } from '@/src/components/screen-shell';

export function DashboardScreen() {
  return (
    <ScreenShell
      eyebrow="Natural Strength Tracker"
      title="Train fast. Review clearly."
      description="Milestone 1 sets up the app shell for local-first workout tracking. The dashboard is ready to receive workout summaries, fatigue signals, and weight trends in later milestones.">
      <PlaceholderCard
        title="Next up"
        body="Recent workout summaries will appear here once workout logging and the SQLite layer are in place."
      />
      <PlaceholderCard
        title="Progression"
        body="Weight increase suggestions will be wired in after the progression engine is implemented."
      />
      <PlaceholderCard
        title="Readiness"
        body="Fatigue warnings and body-weight trend cards are reserved for the metrics milestones."
      />
    </ScreenShell>
  );
}
