import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

type ScreenShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export function ScreenShell({ eyebrow, title, description, children }: ScreenShellProps) {
  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.scroll}>
      <ThemedView style={styles.hero}>
        <ThemedText style={styles.eyebrow}>{eyebrow}</ThemedText>
        <ThemedText type="title" style={styles.title}>
          {title}
        </ThemedText>
        <ThemedText style={styles.description}>{description}</ThemedText>
      </ThemedView>
      <View style={styles.section}>{children}</View>
    </ScrollView>
  );
}

type PlaceholderCardProps = {
  title: string;
  body: string;
};

export function PlaceholderCard({ title, body }: PlaceholderCardProps) {
  return (
    <ThemedView style={styles.card}>
      <ThemedText type="subtitle" style={styles.cardTitle}>
        {title}
      </ThemedText>
      <ThemedText style={styles.cardBody}>{body}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  hero: {
    borderRadius: 24,
    padding: 20,
    gap: 10,
    backgroundColor: '#132A1B',
  },
  eyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#A8D5BA',
  },
  title: {
    color: '#F5F7F5',
    lineHeight: 38,
  },
  description: {
    color: '#D8E4DB',
  },
  section: {
    gap: 12,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#D7E1D8',
  },
  cardTitle: {
    fontSize: 18,
  },
  cardBody: {
    opacity: 0.82,
  },
});
