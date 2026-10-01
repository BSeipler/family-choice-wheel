export type WheelId = 'regular' | 'halloween' | 'christmas'

export type Person = {
  id: string
  name: string
  color: string
  sortOrder: number
}

export type WatchProvider = {
  id: number
  name: string
  logoPath: string | null
}

export type WatchProviders = {
  link: string | null
  stream: WatchProvider[]
  rent: WatchProvider[]
  buy: WatchProvider[]
}

export type WheelEntry = {
  id: string
  wheelId: WheelId
  personId: string
  tmdbId: number
  title: string
  posterPath: string | null
  certification: string | null
  watchProviders: WatchProviders | null
  addedAt: number
}

export type HistoryRow = {
  id: string
  tmdbId: number
  title: string
  posterPath: string | null
  certification: string | null
  personId: string
  wheelId: WheelId
  pickedAt: number
  wonAt: number | null
}

export type Settings = {
  tmdbApiKey: string
  watchRegion: string
}

export type AppState = {
  settings: Settings
  people: Person[]
  entries: WheelEntry[]
  history: HistoryRow[]
  calendarWheel: WheelId
}

export type ApiErrorBody = {
  error: string
  code?:
    | 'COOLDOWN'
    | 'RATING_BLOCKED'
    | 'RATING_MISSING'
    | 'THEME'
    | 'INCOMPLETE'
    | 'NOT_FOUND'
    | 'DB'
    | 'UNAUTHORIZED'
  personName?: string
  pickedAt?: number
  certification?: string | null
  theme?: 'halloween' | 'christmas'
}

export type SpinResult = {
  entry: WheelEntry
  person: Person
}
