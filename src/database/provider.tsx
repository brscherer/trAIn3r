import { PropsWithChildren, Suspense } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';

import { DATABASE_NAME } from '@/src/database/constants';
import { migrateDbIfNeeded } from '@/src/database/migrations';

export function AppDatabaseProvider({ children }: PropsWithChildren) {
  return (
    <Suspense fallback={<DatabaseLoadingScreen />}>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded} useSuspense>
        {children}
      </SQLiteProvider>
    </Suspense>
  );
}

export function useAppDatabase() {
  return useSQLiteContext();
}

function DatabaseLoadingScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="small" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

