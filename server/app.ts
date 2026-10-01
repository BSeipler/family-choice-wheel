import { Hono, type Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { eq, and, isNull } from 'drizzle-orm'
import { wheelIdForDate } from '../shared/calendar.ts'
import { isAllowedRating, isBlockedRating, isMissingRating } from '../shared/ratings.ts'
import { isChristmasMovie, isHalloweenMovie } from '../shared/theme.ts'
import type {
  ApiErrorBody,
  AppState,
  HistoryRow,
  Person,
  SpinResult,
  WatchProviders,
  WheelEntry,
  WheelId,
} from '../shared/types.ts'
import { clearSession, passwordMatches, readSession, writeSession } from './auth.ts'
import { ensureSchema, getDb } from './db.ts'
import { entries, history, people, settings } from './schema.ts'

const YEAR_MS = 365 * 24 * 60 * 60 * 1000

const WHEELS = new Set<WheelId>(['regular', 'halloween', 'christmas'])

function newId(): string {
  return crypto.randomUUID()
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/^the\s+/, '').replace(/\s+/g, ' ')
}

function parseWheelId(value: unknown): WheelId {
  if (typeof value === 'string' && WHEELS.has(value as WheelId)) {
    return value as WheelId
  }
  return wheelIdForDate()
}

function parseProviders(raw: string | null): WatchProviders | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as WatchProviders
  } catch {
    return null
  }
}

function toPerson(row: typeof people.$inferSelect): Person {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    sortOrder: row.sortOrder,
  }
}

function toEntry(row: typeof entries.$inferSelect): WheelEntry {
  return {
    id: row.id,
    wheelId: row.wheelId as WheelId,
    personId: row.personId,
    tmdbId: row.tmdbId,
    title: row.title,
    posterPath: row.posterPath,
    certification: row.certification,
    watchProviders: parseProviders(row.watchProviders),
    addedAt: row.addedAt,
  }
}

function toHistory(row: typeof history.$inferSelect): HistoryRow {
  return {
    id: row.id,
    tmdbId: row.tmdbId,
    title: row.title,
    posterPath: row.posterPath,
    certification: row.certification,
    personId: row.personId,
    wheelId: row.wheelId as WheelId,
    pickedAt: row.pickedAt,
    wonAt: row.wonAt,
  }
}

function fail(status: 400 | 404 | 503, body: ApiErrorBody): never {
  throw new HTTPException(status, { message: JSON.stringify(body) })
}

const app = new Hono()

const OPEN_API = new Set(['/api/health', '/api/login', '/api/session', '/api/logout'])

app.use('/api/*', async (c, next) => {
  if (OPEN_API.has(c.req.path)) return next()
  if (!readSession(c)) {
    return c.json({ error: 'Enter the family password to continue.', code: 'UNAUTHORIZED' } satisfies ApiErrorBody, 401)
  }
  return next()
})

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    try {
      const body = JSON.parse(err.message) as ApiErrorBody
      return c.json(body, err.status)
    } catch {
      return c.json({ error: err.message } satisfies ApiErrorBody, err.status)
    }
  }
  console.error(err)
  if (err instanceof Error && err.message.includes('TURSO_DATABASE_URL')) {
    return c.json({ error: err.message, code: 'DB' } satisfies ApiErrorBody, 503)
  }
  return c.json(
    { error: 'Something went wrong talking to the database.', code: 'DB' } satisfies ApiErrorBody,
    503,
  )
})

// Vercel only routes this catch-all for a single /api/* segment, same as /api/people/:id.
app.post('/api/login', async (c) => {
  const body = await c.req.json<{ password?: string }>().catch(() => ({ password: '' }))
  if (!passwordMatches(typeof body.password === 'string' ? body.password : '')) {
    return c.json({ error: 'That password is not right.', code: 'UNAUTHORIZED' } satisfies ApiErrorBody, 401)
  }
  writeSession(c)
  return c.json({ ok: true })
})

app.get('/api/session', (c) => {
  return c.json({ ok: readSession(c) })
})

app.post('/api/logout', (c) => {
  clearSession(c)
  return c.json({ ok: true })
})

app.get('/api/health', async (c) => {
  await ensureSchema()
  await (await getDb()).select().from(settings).limit(1)
  return c.json({ ok: true })
})

app.get('/api/state', async (c) => {
  await ensureSchema()
  const db = await getDb()
  const [settingRows, peopleRows, entryRows, historyRows] = await Promise.all([
    db.select().from(settings).where(eq(settings.id, 'default')),
    db.select().from(people),
    db.select().from(entries),
    db.select().from(history),
  ])
  const setting = settingRows[0]
  const state: AppState = {
    settings: {
      tmdbApiKey: setting?.tmdbApiKey ?? '',
      watchRegion: setting?.watchRegion ?? 'US',
    },
    people: peopleRows.map(toPerson).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    entries: entryRows.map(toEntry),
    history: historyRows.map(toHistory).sort((a, b) => b.pickedAt - a.pickedAt),
    calendarWheel: wheelIdForDate(),
  }
  return c.json(state)
})

app.put('/api/settings', async (c) => {
  await ensureSchema()
  const body = await c.req.json<{ tmdbApiKey?: string; watchRegion?: string }>()
  const db = await getDb()
  await db
    .update(settings)
    .set({
      tmdbApiKey: body.tmdbApiKey ?? '',
      watchRegion: (body.watchRegion ?? 'US').toUpperCase(),
    })
    .where(eq(settings.id, 'default'))
  return c.json({ ok: true })
})

app.post('/api/people', async (c) => {
  await ensureSchema()
  const body = await c.req.json<{ name?: string; color?: string }>()
  const name = body.name?.trim()
  if (!name) fail(400, { error: 'Name is required.' })
  const color = body.color?.trim() || '#e74c3c'
  const db = await getDb()
  const existing = await db.select().from(people)
  const person: Person = {
    id: newId(),
    name,
    color,
    sortOrder: existing.length,
  }
  await db.insert(people).values(person)
  return c.json(person)
})

function personIdFrom(c: Context): string {
  return (c.req.param('id') || c.req.query('id') || '').trim()
}

async function updatePerson(c: Context) {
  await ensureSchema()
  const id = personIdFrom(c)
  if (!id) fail(400, { error: 'Person id is required.' })
  const body = await c.req.json<{ name?: string; color?: string }>()
  const db = await getDb()
  const patch: { name?: string; color?: string } = {}
  if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim()
  if (typeof body.color === 'string' && body.color.trim()) patch.color = body.color.trim()
  if (!patch.name && !patch.color) fail(400, { error: 'Nothing to update.' })
  await db.update(people).set(patch).where(eq(people.id, id))
  const rows = await db.select().from(people).where(eq(people.id, id))
  if (!rows[0]) fail(404, { error: 'Person not found.', code: 'NOT_FOUND' })
  return c.json(toPerson(rows[0]))
}

async function deletePerson(c: Context) {
  await ensureSchema()
  const id = personIdFrom(c)
  if (!id) fail(400, { error: 'Person id is required.' })
  const db = await getDb()
  const rows = await db.select().from(people).where(eq(people.id, id))
  if (!rows[0]) fail(404, { error: 'Person not found.', code: 'NOT_FOUND' })
  await db.delete(entries).where(eq(entries.personId, id))
  await db.delete(people).where(eq(people.id, id))
  return c.json({ ok: true })
}

// Vercel only routes this catch-all function for a single /api/* segment.
// /api/people/:id never reaches the app, so updates also accept ?id= on /api/people.
app.patch('/api/people', updatePerson)
app.patch('/api/people/:id', updatePerson)
app.delete('/api/people', deletePerson)
app.delete('/api/people/:id', deletePerson)

type AddEntryBody = {
  wheelId?: WheelId
  personId?: string
  tmdbId?: number
  title?: string
  originalTitle?: string | null
  posterPath?: string | null
  certification?: string | null
  keywords?: string[]
  watchProviders?: WatchProviders | null
  confirmUnrated?: boolean
  confirmTheme?: boolean
}

app.post('/api/entries', async (c) => {
  await ensureSchema()
  const body = await c.req.json<AddEntryBody>()
  const personId = body.personId
  const tmdbId = body.tmdbId
  const title = body.title?.trim()
  if (!personId || !tmdbId || !title) {
    fail(400, { error: 'Person, movie, and title are required.' })
  }

  const wheelId = parseWheelId(body.wheelId)
  const db = await getDb()
  const personRows = await db.select().from(people).where(eq(people.id, personId))
  const person = personRows[0]
  if (!person) fail(404, { error: 'Person not found.', code: 'NOT_FOUND' })

  if (isBlockedRating(body.certification ?? null)) {
    fail(400, {
      error: `${title} is rated ${body.certification}, which is above PG-13.`,
      code: 'RATING_BLOCKED',
      certification: body.certification ?? null,
    })
  }

  if (isMissingRating(body.certification ?? null) && !body.confirmUnrated) {
    fail(400, {
      error: `${title} has no US rating on file. Confirm if you still want to add it.`,
      code: 'RATING_MISSING',
      certification: body.certification ?? null,
    })
  }

  if (body.certification && !isMissingRating(body.certification) && !isAllowedRating(body.certification)) {
    fail(400, {
      error: `${title} is rated ${body.certification}, which is above PG-13.`,
      code: 'RATING_BLOCKED',
      certification: body.certification,
    })
  }

  const keywords = body.keywords ?? []
  if (wheelId === 'halloween' && !isHalloweenMovie(title, body.originalTitle, keywords) && !body.confirmTheme) {
    fail(400, {
      error: `${title} does not look like a Halloween movie.`,
      code: 'THEME',
      theme: 'halloween',
    })
  }
  if (wheelId === 'christmas' && !isChristmasMovie(title, body.originalTitle, keywords) && !body.confirmTheme) {
    fail(400, {
      error: `${title} does not look like a Christmas movie.`,
      code: 'THEME',
      theme: 'christmas',
    })
  }

  const since = Date.now() - YEAR_MS
  const historyRows = await db.select().from(history)
  const cooldown = historyRows.find((row) => {
    if (row.pickedAt < since) return false
    if (row.tmdbId === tmdbId) return true
    return normalizeTitle(row.title) === normalizeTitle(title)
  })
  if (cooldown) {
    const picker = (await db.select().from(people).where(eq(people.id, cooldown.personId)))[0]
    fail(400, {
      error: `${title} was already picked in the last year.`,
      code: 'COOLDOWN',
      personName: picker?.name ?? 'someone',
      pickedAt: cooldown.pickedAt,
    })
  }

  const now = Date.now()
  const existing = await db
    .select()
    .from(entries)
    .where(and(eq(entries.wheelId, wheelId), eq(entries.personId, personId)))

  const watchJson = body.watchProviders ? JSON.stringify(body.watchProviders) : null

  if (existing[0]) {
    await db
      .update(entries)
      .set({
        tmdbId,
        title,
        posterPath: body.posterPath ?? null,
        certification: body.certification ?? null,
        watchProviders: watchJson,
        addedAt: now,
      })
      .where(eq(entries.id, existing[0].id))
  } else {
    await db.insert(entries).values({
      id: newId(),
      wheelId,
      personId,
      tmdbId,
      title,
      posterPath: body.posterPath ?? null,
      certification: body.certification ?? null,
      watchProviders: watchJson,
      addedAt: now,
    })
  }

  await db.insert(history).values({
    id: newId(),
    tmdbId,
    title,
    posterPath: body.posterPath ?? null,
    certification: body.certification ?? null,
    personId,
    wheelId,
    pickedAt: now,
    wonAt: null,
  })

  return c.json({ ok: true })
})

app.post('/api/spin', async (c) => {
  await ensureSchema()
  const body = (await c.req.json().catch(() => ({}))) as { wheelId?: WheelId }
  const wheelId = parseWheelId(body.wheelId)
  const db = await getDb()
  const [peopleRows, entryRows] = await Promise.all([
    db.select().from(people),
    db.select().from(entries).where(eq(entries.wheelId, wheelId)),
  ])

  if (peopleRows.length === 0) {
    fail(400, { error: 'Add at least one person before spinning.', code: 'INCOMPLETE' })
  }

  const missing = peopleRows.filter((person) => !entryRows.some((entry) => entry.personId === person.id))
  if (missing.length > 0) {
    fail(400, {
      error: `Everyone needs a movie first. Still waiting on ${missing.map((p) => p.name).join(', ')}.`,
      code: 'INCOMPLETE',
    })
  }

  const winnerRow = entryRows[Math.floor(Math.random() * entryRows.length)]
  if (!winnerRow) {
    fail(400, { error: 'The wheel is empty.', code: 'INCOMPLETE' })
  }

  const person = peopleRows.find((p) => p.id === winnerRow.personId)
  if (!person) fail(404, { error: 'Person not found.', code: 'NOT_FOUND' })

  const nomination = (
    await db
      .select()
      .from(history)
      .where(
        and(
          eq(history.tmdbId, winnerRow.tmdbId),
          eq(history.personId, winnerRow.personId),
          eq(history.wheelId, wheelId),
          isNull(history.wonAt),
        ),
      )
  ).sort((a, b) => b.pickedAt - a.pickedAt)[0]

  const now = Date.now()
  if (nomination) {
    await db.update(history).set({ wonAt: now }).where(eq(history.id, nomination.id))
  } else {
    await db.insert(history).values({
      id: newId(),
      tmdbId: winnerRow.tmdbId,
      title: winnerRow.title,
      posterPath: winnerRow.posterPath,
      certification: winnerRow.certification,
      personId: winnerRow.personId,
      wheelId,
      pickedAt: winnerRow.addedAt,
      wonAt: now,
    })
  }

  await db.delete(entries).where(eq(entries.id, winnerRow.id))

  const result: SpinResult = {
    entry: toEntry(winnerRow),
    person: toPerson(person),
  }
  return c.json(result)
})

export default app
