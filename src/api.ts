import type { ApiErrorBody, AppState, Person, SpinResult, WheelId } from '../shared/types.ts'

async function parse<T>(res: Response): Promise<T> {
  const data: unknown = await res.json()
  if (!res.ok) {
    const body = data as ApiErrorBody
    const err = new Error(body.error || res.statusText) as Error & { body: ApiErrorBody }
    err.body = body
    throw err
  }
  return data as T
}

export function isApiError(err: unknown): err is Error & { body: ApiErrorBody } {
  return err instanceof Error && 'body' in err
}

export async function fetchSession(): Promise<boolean> {
  const res = await fetch('/api/auth/session')
  if (!res.ok) return false
  const data = (await res.json()) as { ok?: boolean }
  return Boolean(data.ok)
}

export async function login(password: string): Promise<void> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  await parse(res)
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' })
}

export async function fetchState(): Promise<AppState> {
  const res = await fetch('/api/state')
  return parse<AppState>(res)
}

export async function saveSettings(tmdbApiKey: string, watchRegion: string): Promise<void> {
  const res = await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tmdbApiKey, watchRegion }),
  })
  await parse(res)
}

export async function addPerson(name: string, color: string): Promise<Person> {
  const res = await fetch('/api/people', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, color }),
  })
  return parse<Person>(res)
}

function personUrl(id: string): string {
  return `/api/people?id=${encodeURIComponent(id)}`
}

export async function updatePerson(id: string, patch: { name?: string; color?: string }): Promise<Person> {
  const res = await fetch(personUrl(id), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  return parse<Person>(res)
}

export async function removePerson(id: string): Promise<void> {
  const res = await fetch(personUrl(id), { method: 'DELETE' })
  await parse(res)
}

export type AddPickInput = {
  wheelId: WheelId
  personId: string
  tmdbId: number
  title: string
  originalTitle?: string | null
  posterPath: string | null
  certification: string | null
  keywords: string[]
  watchProviders: AppState['entries'][number]['watchProviders']
  confirmUnrated?: boolean
  confirmTheme?: boolean
}

export async function addPick(input: AddPickInput): Promise<void> {
  const res = await fetch('/api/entries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  await parse(res)
}

export async function spinWheel(wheelId: WheelId): Promise<SpinResult> {
  const res = await fetch('/api/spin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wheelId }),
  })
  return parse<SpinResult>(res)
}
