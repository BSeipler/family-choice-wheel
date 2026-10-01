import { isAllowedRating, isBlockedRating } from '../shared/ratings.ts'
import type { WatchProvider, WatchProviders } from '../shared/types.ts'

const API = 'https://api.themoviedb.org/3'
const IMG = 'https://image.tmdb.org/t/p'

export type SearchMovie = {
  id: number
  title: string
  originalTitle: string
  year: string
  posterPath: string | null
  overview: string
  certification: string | null
}

function keyQuery(apiKey: string): string {
  return `api_key=${encodeURIComponent(apiKey)}`
}

async function tmdb<T>(apiKey: string, path: string, params = ''): Promise<T> {
  const joiner = path.includes('?') || params.startsWith('?') ? '&' : '?'
  const url = `${API}${path}${joiner}${keyQuery(apiKey)}${params ? `&${params}` : ''}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(res.status === 401 ? 'TMDB API key looks invalid.' : `TMDB request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

export function posterUrl(path: string | null | undefined, size: 'w92' | 'w185' | 'w342' | 'w500' = 'w342'): string | null {
  if (!path) return null
  return `${IMG}/${size}${path}`
}

export function providerLogo(path: string | null | undefined): string | null {
  if (!path) return null
  return `${IMG}/w92${path}`
}

type SearchResponse = {
  results: Array<{
    id: number
    title: string
    original_title: string
    release_date?: string
    poster_path: string | null
    overview: string
    adult: boolean
  }>
}

type ReleaseDates = {
  results: Array<{
    iso_3166_1: string
    release_dates: Array<{ certification: string }>
  }>
}

type KeywordsResponse = {
  keywords: Array<{ id: number; name: string }>
}

type ProvidersResponse = {
  results: Record<
    string,
    {
      link?: string
      flatrate?: Array<{ provider_id: number; provider_name: string; logo_path: string | null }>
      rent?: Array<{ provider_id: number; provider_name: string; logo_path: string | null }>
      buy?: Array<{ provider_id: number; provider_name: string; logo_path: string | null }>
    }
  >
}

const certCache = new Map<number, string | null>()

export async function getCertification(apiKey: string, tmdbId: number): Promise<string | null> {
  if (certCache.has(tmdbId)) return certCache.get(tmdbId) ?? null
  const data = await tmdb<ReleaseDates>(apiKey, `/movie/${tmdbId}/release_dates`)
  const us = data.results.find((r) => r.iso_3166_1 === 'US')
  const cert =
    us?.release_dates.map((d) => d.certification.trim()).find((value) => value.length > 0) ?? null
  certCache.set(tmdbId, cert)
  return cert
}

export async function searchMovies(apiKey: string, query: string): Promise<SearchMovie[]> {
  const data = await tmdb<SearchResponse>(
    apiKey,
    '/search/movie',
    `query=${encodeURIComponent(query)}&include_adult=false&language=en-US`,
  )
  const top = data.results.filter((r) => !r.adult).slice(0, 8)
  const rated = await Promise.all(
    top.map(async (movie) => {
      const certification = await getCertification(apiKey, movie.id).catch(() => null)
      return {
        id: movie.id,
        title: movie.title,
        originalTitle: movie.original_title,
        year: movie.release_date?.slice(0, 4) ?? '',
        posterPath: movie.poster_path,
        overview: movie.overview,
        certification,
      } satisfies SearchMovie
    }),
  )
  return rated.filter((movie) => !isBlockedRating(movie.certification))
}

export async function getKeywords(apiKey: string, tmdbId: number): Promise<string[]> {
  const data = await tmdb<KeywordsResponse>(apiKey, `/movie/${tmdbId}/keywords`)
  return data.keywords.map((k) => k.name)
}

function mapProviders(
  list: Array<{ provider_id: number; provider_name: string; logo_path: string | null }> | undefined,
): WatchProvider[] {
  if (!list) return []
  const seen = new Set<number>()
  return list
    .filter((p) => {
      if (seen.has(p.provider_id)) return false
      seen.add(p.provider_id)
      return true
    })
    .map((p) => ({
      id: p.provider_id,
      name: p.provider_name,
      logoPath: p.logo_path,
    }))
}

export async function getWatchProviders(
  apiKey: string,
  tmdbId: number,
  region: string,
): Promise<WatchProviders> {
  const data = await tmdb<ProvidersResponse>(apiKey, `/movie/${tmdbId}/watch/providers`)
  const country = data.results[region.toUpperCase()]
  return {
    link: country?.link ?? null,
    stream: mapProviders(country?.flatrate),
    rent: mapProviders(country?.rent),
    buy: mapProviders(country?.buy),
  }
}

export function ratingLabel(cert: string | null): string {
  if (!cert) return 'NR'
  return cert
}

export function ratingTone(cert: string | null): 'ok' | 'missing' | 'blocked' {
  if (isBlockedRating(cert)) return 'blocked'
  if (isAllowedRating(cert)) return 'ok'
  return 'missing'
}
