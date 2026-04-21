import type { SQLiteDatabase } from 'expo-sqlite';

import type { UpsertUserMetrics, UserMetricsRow } from '@/src/database/types';

export async function upsertUserMetrics(db: SQLiteDatabase, input: UpsertUserMetrics) {
  await db.runAsync(
    `INSERT INTO user_metrics (date, weight, energy, soreness, performance)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       weight = excluded.weight,
       energy = excluded.energy,
       soreness = excluded.soreness,
       performance = excluded.performance`,
    input.date,
    input.weight,
    input.energy,
    input.soreness,
    input.performance
  );
}

export async function getUserMetricsByDate(db: SQLiteDatabase, date: string) {
  return db.getFirstAsync<UserMetricsRow>(
    'SELECT id, date, weight, energy, soreness, performance FROM user_metrics WHERE date = ?',
    date
  );
}

export async function listUserMetrics(db: SQLiteDatabase, limit = 30) {
  return db.getAllAsync<UserMetricsRow>(
    'SELECT id, date, weight, energy, soreness, performance FROM user_metrics ORDER BY date DESC, id DESC LIMIT ?',
    limit
  );
}

