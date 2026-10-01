import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(),
  tmdbApiKey: text('tmdb_api_key').notNull().default(''),
  watchRegion: text('watch_region').notNull().default('US'),
})

export const people = sqliteTable('people', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const entries = sqliteTable('entries', {
  id: text('id').primaryKey(),
  wheelId: text('wheel_id').notNull(),
  personId: text('person_id').notNull(),
  tmdbId: integer('tmdb_id').notNull(),
  title: text('title').notNull(),
  posterPath: text('poster_path'),
  certification: text('certification'),
  watchProviders: text('watch_providers'),
  addedAt: integer('added_at').notNull(),
})

export const history = sqliteTable('history', {
  id: text('id').primaryKey(),
  tmdbId: integer('tmdb_id').notNull(),
  title: text('title').notNull(),
  posterPath: text('poster_path'),
  certification: text('certification'),
  personId: text('person_id').notNull(),
  wheelId: text('wheel_id').notNull(),
  pickedAt: integer('picked_at').notNull(),
  wonAt: integer('won_at'),
})
