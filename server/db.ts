import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createClient, type Client } from '@libsql/client'
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql'
import { config } from 'dotenv'
import * as schema from './schema.ts'

config({ path: resolve(process.cwd(), '.env') })

let client: Client | undefined
let db: LibSQLDatabase<typeof schema> | undefined

function databaseUrl(): string {
  const url = process.env.TURSO_DATABASE_URL?.trim()
  if (url) return url
  const filePath = resolve(process.cwd(), 'data/wheel.db')
  mkdirSync(dirname(filePath), { recursive: true })
  return `file:${filePath}`
}

export function getDb(): LibSQLDatabase<typeof schema> {
  if (db) return db
  const url = databaseUrl()
  if (url.startsWith('file:')) {
    mkdirSync(dirname(url.slice('file:'.length)), { recursive: true })
  }
  client = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })
  db = drizzle(client, { schema })
  return db
}

export function getClient(): Client {
  getDb()
  if (!client) throw new Error('Database client is not ready.')
  return client
}

export async function ensureSchema(): Promise<void> {
  getDb()
  const sqlClient = getClient()
  await sqlClient.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      tmdb_api_key TEXT NOT NULL DEFAULT '',
      watch_region TEXT NOT NULL DEFAULT 'US'
    )
  `)
  await sqlClient.execute(`
    CREATE TABLE IF NOT EXISTS people (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `)
  await sqlClient.execute(`
    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      wheel_id TEXT NOT NULL,
      person_id TEXT NOT NULL,
      tmdb_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      poster_path TEXT,
      certification TEXT,
      watch_providers TEXT,
      added_at INTEGER NOT NULL
    )
  `)
  await sqlClient.execute(`
    CREATE TABLE IF NOT EXISTS history (
      id TEXT PRIMARY KEY,
      tmdb_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      poster_path TEXT,
      certification TEXT,
      person_id TEXT NOT NULL,
      wheel_id TEXT NOT NULL,
      picked_at INTEGER NOT NULL,
      won_at INTEGER
    )
  `)
  await sqlClient.execute(`
    INSERT OR IGNORE INTO settings (id, tmdb_api_key, watch_region)
    VALUES ('default', '', 'US')
  `)
}
