var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/app.ts
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { eq, and, isNull } from "drizzle-orm";

// shared/calendar.ts
function wheelIdForDate(date = /* @__PURE__ */ new Date()) {
  const month = date.getMonth() + 1;
  if (month === 10) return "halloween";
  if (month === 12) return "christmas";
  return "regular";
}

// shared/ratings.ts
var ALLOWED = /* @__PURE__ */ new Set([
  "G",
  "PG",
  "PG-13",
  "TV-Y",
  "TV-Y7",
  "TV-G",
  "TV-PG",
  "TV-14",
  "PASSED",
  "APPROVED"
]);
var BLOCKED = /* @__PURE__ */ new Set(["R", "NC-17", "TV-MA", "X", "NC17", "18", "R18+", "R18"]);
var MISSING = /* @__PURE__ */ new Set(["", "NR", "UR", "UNRATED", "NOT RATED", "NOT-RATED", "N/A"]);
function normalizeCertification(value) {
  return (value ?? "").trim().toUpperCase().replace(/\s+/g, " ");
}
function isBlockedRating(value) {
  const cert = normalizeCertification(value);
  if (BLOCKED.has(cert)) return true;
  if (cert.startsWith("R ") || cert === "R") return true;
  if (cert.includes("NC-17") || cert.includes("TV-MA")) return true;
  return false;
}
function isAllowedRating(value) {
  const cert = normalizeCertification(value);
  if (!cert) return false;
  return ALLOWED.has(cert);
}
function isMissingRating(value) {
  const cert = normalizeCertification(value);
  return MISSING.has(cert) || cert.length === 0;
}

// shared/theme.ts
var HALLOWEEN_TITLE = /\b(halloween|hocus pocus|halloweentown|trick['’]? ?r['’]? ?treat|samhain|nightmare before christmas|goosebumps|hotel transylvania|monster house|\bcasper\b|beetlejuice|addams family|paranorman|corpse bride|coraline|the witches|ernest scared|twitches|scary stories to tell|hubie halloween|the halloween tree|coco'?s? halloween|over the garden wall)\b/i;
var CHRISTMAS_TITLE = /\b(christmas|x-?mas|krampus|nutcracker|\bnoel\b|nativity|nightmare before christmas|\belf\b|polar express|home alone|yuletide|\bscrooge\b|the grinch|\bklaus\b|jingle bell|white christmas|holiday inn|miracle on \d+|it's a wonderful life)\b/i;
var HALLOWEEN_KEYWORDS = [
  "halloween",
  "halloween party",
  "halloween costume",
  "trick or treat",
  "trick-or-treat",
  "trick-or-treating",
  "samhain",
  "jack-o'-lantern",
  "jack o lantern",
  "all hallows' eve",
  "all hallows eve",
  "halloweentown",
  "hocus pocus"
];
var CHRISTMAS_KEYWORDS = [
  "christmas",
  "christmas eve",
  "christmas party",
  "christmas tree",
  "christmastime",
  "santa claus",
  "santa",
  "secret santa",
  "xmas",
  "nativity",
  "krampus",
  "nutcracker",
  "north pole",
  "scrooge",
  "st. nicholas",
  "saint nicholas",
  "silent night",
  "white christmas",
  "yuletide",
  "father christmas"
];
function haystack(title, originalTitle, keywords) {
  return [title, originalTitle ?? "", ...keywords].join(" \n ").toLowerCase();
}
function isHalloweenMovie(title, originalTitle, keywords) {
  if (HALLOWEEN_TITLE.test(title) || originalTitle && HALLOWEEN_TITLE.test(originalTitle)) {
    return true;
  }
  const text2 = haystack(title, originalTitle, keywords);
  return HALLOWEEN_KEYWORDS.some((word) => text2.includes(word));
}
function isChristmasMovie(title, originalTitle, keywords) {
  if (CHRISTMAS_TITLE.test(title) || originalTitle && CHRISTMAS_TITLE.test(originalTitle)) {
    return true;
  }
  const text2 = haystack(title, originalTitle, keywords);
  return CHRISTMAS_KEYWORDS.some((word) => text2.includes(word));
}

// server/db.ts
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { config } from "dotenv";

// server/schema.ts
var schema_exports = {};
__export(schema_exports, {
  entries: () => entries,
  history: () => history,
  people: () => people,
  settings: () => settings
});
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
var settings = sqliteTable("settings", {
  id: text("id").primaryKey(),
  tmdbApiKey: text("tmdb_api_key").notNull().default(""),
  watchRegion: text("watch_region").notNull().default("US")
});
var people = sqliteTable("people", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  sortOrder: integer("sort_order").notNull().default(0)
});
var entries = sqliteTable("entries", {
  id: text("id").primaryKey(),
  wheelId: text("wheel_id").notNull(),
  personId: text("person_id").notNull(),
  tmdbId: integer("tmdb_id").notNull(),
  title: text("title").notNull(),
  posterPath: text("poster_path"),
  certification: text("certification"),
  watchProviders: text("watch_providers"),
  addedAt: integer("added_at").notNull()
});
var history = sqliteTable("history", {
  id: text("id").primaryKey(),
  tmdbId: integer("tmdb_id").notNull(),
  title: text("title").notNull(),
  posterPath: text("poster_path"),
  certification: text("certification"),
  personId: text("person_id").notNull(),
  wheelId: text("wheel_id").notNull(),
  pickedAt: integer("picked_at").notNull(),
  wonAt: integer("won_at")
});

// server/db.ts
config({ path: resolve(process.cwd(), ".env") });
var client;
var db;
function databaseUrl() {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  if (process.env.VERCEL && (!url || url.startsWith("file:"))) {
    throw new Error("Set TURSO_DATABASE_URL to a hosted Turso database before using this app on Vercel.");
  }
  if (url) return url;
  const filePath = resolve(process.cwd(), "data/wheel.db");
  mkdirSync(dirname(filePath), { recursive: true });
  return `file:${filePath}`;
}
async function connect(url) {
  if (url.startsWith("file:")) {
    const { createClient: createClient2 } = await import("@libsql/client");
    const { drizzle: drizzle2 } = await import("drizzle-orm/libsql");
    client = createClient2({ url, authToken: process.env.TURSO_AUTH_TOKEN });
    return drizzle2(client, { schema: schema_exports });
  }
  const { createClient } = await import("@libsql/client/http");
  const { drizzle } = await import("drizzle-orm/libsql/http");
  client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  return drizzle(client, { schema: schema_exports });
}
async function getDb() {
  if (db) return db;
  const url = databaseUrl();
  if (url.startsWith("file:")) {
    mkdirSync(dirname(url.slice("file:".length)), { recursive: true });
  }
  db = await connect(url);
  return db;
}
function getClient() {
  if (!client) throw new Error("Database client is not ready.");
  return client;
}
async function ensureSchema() {
  await getDb();
  const sqlClient = getClient();
  await sqlClient.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      tmdb_api_key TEXT NOT NULL DEFAULT '',
      watch_region TEXT NOT NULL DEFAULT 'US'
    )
  `);
  await sqlClient.execute(`
    CREATE TABLE IF NOT EXISTS people (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `);
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
  `);
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
  `);
  await sqlClient.execute(`
    INSERT OR IGNORE INTO settings (id, tmdb_api_key, watch_region)
    VALUES ('default', '', 'US')
  `);
}

// server/app.ts
var YEAR_MS = 365 * 24 * 60 * 60 * 1e3;
var WHEELS = /* @__PURE__ */ new Set(["regular", "halloween", "christmas"]);
function newId() {
  return crypto.randomUUID();
}
function normalizeTitle(title) {
  return title.trim().toLowerCase().replace(/^the\s+/, "").replace(/\s+/g, " ");
}
function parseWheelId(value) {
  if (typeof value === "string" && WHEELS.has(value)) {
    return value;
  }
  return wheelIdForDate();
}
function parseProviders(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function toPerson(row) {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    sortOrder: row.sortOrder
  };
}
function toEntry(row) {
  return {
    id: row.id,
    wheelId: row.wheelId,
    personId: row.personId,
    tmdbId: row.tmdbId,
    title: row.title,
    posterPath: row.posterPath,
    certification: row.certification,
    watchProviders: parseProviders(row.watchProviders),
    addedAt: row.addedAt
  };
}
function toHistory(row) {
  return {
    id: row.id,
    tmdbId: row.tmdbId,
    title: row.title,
    posterPath: row.posterPath,
    certification: row.certification,
    personId: row.personId,
    wheelId: row.wheelId,
    pickedAt: row.pickedAt,
    wonAt: row.wonAt
  };
}
function fail(status, body) {
  throw new HTTPException(status, { message: JSON.stringify(body) });
}
var app = new Hono();
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    try {
      const body = JSON.parse(err.message);
      return c.json(body, err.status);
    } catch {
      return c.json({ error: err.message }, err.status);
    }
  }
  console.error(err);
  if (err instanceof Error && err.message.includes("TURSO_DATABASE_URL")) {
    return c.json({ error: err.message, code: "DB" }, 503);
  }
  return c.json(
    { error: "Something went wrong talking to the database.", code: "DB" },
    503
  );
});
app.get("/api/health", async (c) => {
  await ensureSchema();
  await (await getDb()).select().from(settings).limit(1);
  return c.json({ ok: true });
});
app.get("/api/state", async (c) => {
  await ensureSchema();
  const db2 = await getDb();
  const [settingRows, peopleRows, entryRows, historyRows] = await Promise.all([
    db2.select().from(settings).where(eq(settings.id, "default")),
    db2.select().from(people),
    db2.select().from(entries),
    db2.select().from(history)
  ]);
  const setting = settingRows[0];
  const state = {
    settings: {
      tmdbApiKey: setting?.tmdbApiKey ?? "",
      watchRegion: setting?.watchRegion ?? "US"
    },
    people: peopleRows.map(toPerson).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    entries: entryRows.map(toEntry),
    history: historyRows.map(toHistory).sort((a, b) => b.pickedAt - a.pickedAt),
    calendarWheel: wheelIdForDate()
  };
  return c.json(state);
});
app.put("/api/settings", async (c) => {
  await ensureSchema();
  const body = await c.req.json();
  const db2 = await getDb();
  await db2.update(settings).set({
    tmdbApiKey: body.tmdbApiKey ?? "",
    watchRegion: (body.watchRegion ?? "US").toUpperCase()
  }).where(eq(settings.id, "default"));
  return c.json({ ok: true });
});
app.post("/api/people", async (c) => {
  await ensureSchema();
  const body = await c.req.json();
  const name = body.name?.trim();
  if (!name) fail(400, { error: "Name is required." });
  const color = body.color?.trim() || "#e74c3c";
  const db2 = await getDb();
  const existing = await db2.select().from(people);
  const person = {
    id: newId(),
    name,
    color,
    sortOrder: existing.length
  };
  await db2.insert(people).values(person);
  return c.json(person);
});
app.patch("/api/people/:id", async (c) => {
  await ensureSchema();
  const id = c.req.param("id");
  const body = await c.req.json();
  const db2 = await getDb();
  const patch = {};
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if (typeof body.color === "string" && body.color.trim()) patch.color = body.color.trim();
  await db2.update(people).set(patch).where(eq(people.id, id));
  const rows = await db2.select().from(people).where(eq(people.id, id));
  if (!rows[0]) fail(404, { error: "Person not found.", code: "NOT_FOUND" });
  return c.json(toPerson(rows[0]));
});
app.delete("/api/people/:id", async (c) => {
  await ensureSchema();
  const id = c.req.param("id");
  const db2 = await getDb();
  await db2.delete(entries).where(eq(entries.personId, id));
  await db2.delete(people).where(eq(people.id, id));
  return c.json({ ok: true });
});
app.post("/api/entries", async (c) => {
  await ensureSchema();
  const body = await c.req.json();
  const personId = body.personId;
  const tmdbId = body.tmdbId;
  const title = body.title?.trim();
  if (!personId || !tmdbId || !title) {
    fail(400, { error: "Person, movie, and title are required." });
  }
  const wheelId = parseWheelId(body.wheelId);
  const db2 = await getDb();
  const personRows = await db2.select().from(people).where(eq(people.id, personId));
  const person = personRows[0];
  if (!person) fail(404, { error: "Person not found.", code: "NOT_FOUND" });
  if (isBlockedRating(body.certification ?? null)) {
    fail(400, {
      error: `${title} is rated ${body.certification}, which is above PG-13.`,
      code: "RATING_BLOCKED",
      certification: body.certification ?? null
    });
  }
  if (isMissingRating(body.certification ?? null) && !body.confirmUnrated) {
    fail(400, {
      error: `${title} has no US rating on file. Confirm if you still want to add it.`,
      code: "RATING_MISSING",
      certification: body.certification ?? null
    });
  }
  if (body.certification && !isMissingRating(body.certification) && !isAllowedRating(body.certification)) {
    fail(400, {
      error: `${title} is rated ${body.certification}, which is above PG-13.`,
      code: "RATING_BLOCKED",
      certification: body.certification
    });
  }
  const keywords = body.keywords ?? [];
  if (wheelId === "halloween" && !isHalloweenMovie(title, body.originalTitle, keywords) && !body.confirmTheme) {
    fail(400, {
      error: `${title} does not look like a Halloween movie.`,
      code: "THEME",
      theme: "halloween"
    });
  }
  if (wheelId === "christmas" && !isChristmasMovie(title, body.originalTitle, keywords) && !body.confirmTheme) {
    fail(400, {
      error: `${title} does not look like a Christmas movie.`,
      code: "THEME",
      theme: "christmas"
    });
  }
  const since = Date.now() - YEAR_MS;
  const historyRows = await db2.select().from(history);
  const cooldown = historyRows.find((row) => {
    if (row.pickedAt < since) return false;
    if (row.tmdbId === tmdbId) return true;
    return normalizeTitle(row.title) === normalizeTitle(title);
  });
  if (cooldown) {
    const picker = (await db2.select().from(people).where(eq(people.id, cooldown.personId)))[0];
    fail(400, {
      error: `${title} was already picked in the last year.`,
      code: "COOLDOWN",
      personName: picker?.name ?? "someone",
      pickedAt: cooldown.pickedAt
    });
  }
  const now = Date.now();
  const existing = await db2.select().from(entries).where(and(eq(entries.wheelId, wheelId), eq(entries.personId, personId)));
  const watchJson = body.watchProviders ? JSON.stringify(body.watchProviders) : null;
  if (existing[0]) {
    await db2.update(entries).set({
      tmdbId,
      title,
      posterPath: body.posterPath ?? null,
      certification: body.certification ?? null,
      watchProviders: watchJson,
      addedAt: now
    }).where(eq(entries.id, existing[0].id));
  } else {
    await db2.insert(entries).values({
      id: newId(),
      wheelId,
      personId,
      tmdbId,
      title,
      posterPath: body.posterPath ?? null,
      certification: body.certification ?? null,
      watchProviders: watchJson,
      addedAt: now
    });
  }
  await db2.insert(history).values({
    id: newId(),
    tmdbId,
    title,
    posterPath: body.posterPath ?? null,
    certification: body.certification ?? null,
    personId,
    wheelId,
    pickedAt: now,
    wonAt: null
  });
  return c.json({ ok: true });
});
app.post("/api/spin", async (c) => {
  await ensureSchema();
  const body = await c.req.json().catch(() => ({}));
  const wheelId = parseWheelId(body.wheelId);
  const db2 = await getDb();
  const [peopleRows, entryRows] = await Promise.all([
    db2.select().from(people),
    db2.select().from(entries).where(eq(entries.wheelId, wheelId))
  ]);
  if (peopleRows.length === 0) {
    fail(400, { error: "Add at least one person before spinning.", code: "INCOMPLETE" });
  }
  const missing = peopleRows.filter((person2) => !entryRows.some((entry) => entry.personId === person2.id));
  if (missing.length > 0) {
    fail(400, {
      error: `Everyone needs a movie first. Still waiting on ${missing.map((p) => p.name).join(", ")}.`,
      code: "INCOMPLETE"
    });
  }
  const winnerRow = entryRows[Math.floor(Math.random() * entryRows.length)];
  if (!winnerRow) {
    fail(400, { error: "The wheel is empty.", code: "INCOMPLETE" });
  }
  const person = peopleRows.find((p) => p.id === winnerRow.personId);
  if (!person) fail(404, { error: "Person not found.", code: "NOT_FOUND" });
  const nomination = (await db2.select().from(history).where(
    and(
      eq(history.tmdbId, winnerRow.tmdbId),
      eq(history.personId, winnerRow.personId),
      eq(history.wheelId, wheelId),
      isNull(history.wonAt)
    )
  )).sort((a, b) => b.pickedAt - a.pickedAt)[0];
  const now = Date.now();
  if (nomination) {
    await db2.update(history).set({ wonAt: now }).where(eq(history.id, nomination.id));
  } else {
    await db2.insert(history).values({
      id: newId(),
      tmdbId: winnerRow.tmdbId,
      title: winnerRow.title,
      posterPath: winnerRow.posterPath,
      certification: winnerRow.certification,
      personId: winnerRow.personId,
      wheelId,
      pickedAt: winnerRow.addedAt,
      wonAt: now
    });
  }
  await db2.delete(entries).where(eq(entries.id, winnerRow.id));
  const result = {
    entry: toEntry(winnerRow),
    person: toPerson(person)
  };
  return c.json(result);
});
var app_default = app;

// server/vercel.ts
var vercel_default = {
  fetch(request) {
    return app_default.fetch(request);
  }
};
export {
  vercel_default as default
};
