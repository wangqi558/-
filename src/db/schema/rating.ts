import { pgTable, uuid, varchar, integer, text, timestamp, decimal, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const ratings = pgTable('ratings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id'), // References users table when available
  ipHash: varchar('ip_hash', { length: 64 }).notNull(),
  targetId: varchar('target_id', { length: 255 }).notNull(),
  targetType: varchar('target_type', { length: 100 }).notNull(),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  // Composite index for duplicate checking
  uniqueUserTarget: uniqueIndex('unique_user_target').on(table.userId, table.targetId, table.targetType),
  // Performance indexes
  targetIdx: index('idx_ratings_target').on(table.targetId, table.targetType),
  userIdx: index('idx_ratings_user').on(table.userId),
  ipHashIdx: index('idx_ratings_ip_hash').on(table.ipHash),
  createdAtIdx: index('idx_ratings_created_at').on(table.createdAt),
  // Composite index for common queries
  compositeIdx: index('idx_ratings_composite').on(table.targetId, table.targetType, table.createdAt),
  // Partial index for anonymous ratings
  anonymousIdx: index('idx_ratings_anonymous').on(table.ipHash, table.targetId, table.targetType),
}));

export const ratingStatistics = pgTable('rating_statistics', {
  id: uuid('id').primaryKey().defaultRandom(),
  targetId: varchar('target_id', { length: 255 }).notNull(),
  targetType: varchar('target_type', { length: 100 }).notNull(),
  averageRating: decimal('average_rating', { precision: 3, scale: 2 }).notNull().default('0'),
  totalRatings: integer('total_ratings').notNull().default(0),
  ratingDistribution: jsonb('rating_distribution').notNull().default('{}'),
  lastCalculated: timestamp('last_calculated', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  // Ensure one stats record per target
  uniqueTargetStats: uniqueIndex('unique_target_stats').on(table.targetId, table.targetType),
  // Performance indexes
  statsTargetIdx: index('idx_stats_target').on(table.targetId, table.targetType),
  averageRatingIdx: index('idx_stats_average_rating').on(table.averageRating),
  totalRatingsIdx: index('idx_stats_total_ratings').on(table.totalRatings),
}));

// Types inferred from schema
export type Rating = typeof ratings.$inferSelect;
export type NewRating = typeof ratings.$inferInsert;
export type RatingStatistic = typeof ratingStatistics.$inferSelect;
export type NewRatingStatistic = typeof ratingStatistics.$inferInsert;
