import { useEffect, useMemo, useState } from 'react'
import { isMissingRating } from '../../shared/ratings.ts'
import { isChristmasMovie, isHalloweenMovie } from '../../shared/theme.ts'
import type { Person, WheelId } from '../../shared/types.ts'
import { isApiError, type AddPickInput, addPick } from '../api.ts'
import { getKeywords, getWatchProviders, posterUrl, ratingLabel, searchMovies, type SearchMovie } from '../tmdb.ts'

type Props = {
  apiKey: string
  watchRegion: string
  wheelId: WheelId
  people: Person[]
  defaultPersonId: string | null
  onAdded: () => Promise<void>
}

export function MovieSearch({ apiKey, watchRegion, wheelId, people, defaultPersonId, onAdded }: Props) {
  const [query, setQuery] = useState('')
  const [personId, setPersonId] = useState(defaultPersonId ?? people[0]?.id ?? '')
  const [results, setResults] = useState<SearchMovie[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<SearchMovie | null>(null)
  const [keywords, setKeywords] = useState<string[]>([])
  const [providers, setProviders] = useState<AddPickInput['watchProviders']>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [confirmUnrated, setConfirmUnrated] = useState(false)
  const [confirmTheme, setConfirmTheme] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setPersonId(defaultPersonId ?? people[0]?.id ?? '')
  }, [defaultPersonId, people])

  useEffect(() => {
    if (!apiKey || query.trim().length < 2) {
      setResults([])
      return
    }
    const handle = window.setTimeout(() => {
      setSearching(true)
      searchMovies(apiKey, query.trim())
        .then(setResults)
        .catch((err: unknown) => setMessage(err instanceof Error ? err.message : 'Search failed'))
        .finally(() => setSearching(false))
    }, 300)
    return () => window.clearTimeout(handle)
  }, [apiKey, query])

  async function choose(movie: SearchMovie) {
    if (!apiKey) return
    setSelected(movie)
    setConfirmUnrated(false)
    setConfirmTheme(false)
    setMessage(null)
    setLoadingDetails(true)
    try {
      const [keys, watch] = await Promise.all([
        getKeywords(apiKey, movie.id),
        getWatchProviders(apiKey, movie.id, watchRegion),
      ])
      setKeywords(keys)
      setProviders(watch)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not load movie details')
    } finally {
      setLoadingDetails(false)
    }
  }

  const themeIssue = useMemo(() => {
    if (!selected) return null
    if (wheelId === 'halloween' && !isHalloweenMovie(selected.title, selected.originalTitle, keywords)) {
      return 'This does not look like a Halloween movie.'
    }
    if (wheelId === 'christmas' && !isChristmasMovie(selected.title, selected.originalTitle, keywords)) {
      return 'This does not look like a Christmas movie.'
    }
    return null
  }, [keywords, selected, wheelId])

  const unrated = selected ? isMissingRating(selected.certification) : false

  async function submit() {
    if (!selected || !personId) return
    setBusy(true)
    setMessage(null)
    try {
      await addPick({
        wheelId,
        personId,
        tmdbId: selected.id,
        title: selected.title,
        originalTitle: selected.originalTitle,
        posterPath: selected.posterPath,
        certification: selected.certification,
        keywords,
        watchProviders: providers,
        confirmUnrated: confirmUnrated || undefined,
        confirmTheme: confirmTheme || undefined,
      })
      setSelected(null)
      setQuery('')
      setResults([])
      await onAdded()
    } catch (err) {
      if (isApiError(err)) {
        setMessage(err.body.error)
        if (err.body.pickedAt) {
          const when = new Date(err.body.pickedAt).toLocaleDateString()
          setMessage(`${err.body.error} ${err.body.personName ?? ''} picked it on ${when}.`.replace(/\s+/g, ' '))
        }
      } else {
        setMessage(err instanceof Error ? err.message : 'Could not add movie')
      }
    } finally {
      setBusy(false)
    }
  }

  if (!apiKey) {
    return <p className="muted">Add a TMDB API key in Family & Settings to search for movies.</p>
  }

  if (people.length === 0) {
    return <p className="muted">Add family members before picking movies.</p>
  }

  return (
    <div className="movie-search">
      <div className="search-row">
        <label>
          Who’s picking
          <select value={personId} onChange={(e) => setPersonId(e.target.value)}>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grow">
          Search movies
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Harry Potter, Jurassic Park…"
          />
        </label>
      </div>
      {searching && <p className="muted">Searching…</p>}
      {results.length > 0 && !selected && (
        <ul className="search-results">
          {results.map((movie) => (
            <li key={movie.id}>
              <button type="button" onClick={() => void choose(movie)}>
                {movie.posterPath ? (
                  <img src={posterUrl(movie.posterPath, 'w92') ?? ''} alt="" />
                ) : (
                  <span className="poster-fallback" />
                )}
                <span>
                  <strong>{movie.title}</strong>
                  <em>
                    {movie.year}
                    {movie.certification ? ` · ${ratingLabel(movie.certification)}` : ''}
                  </em>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {selected && (
        <div className="selected-movie">
          {selected.posterPath && <img src={posterUrl(selected.posterPath, 'w185') ?? ''} alt="" />}
          <div>
            <h3>
              {selected.title}{' '}
              <small>
                {selected.year} · {ratingLabel(selected.certification)}
              </small>
            </h3>
            {loadingDetails && <p className="muted">Checking rating, theme, and where to watch…</p>}
            {unrated && (
              <label className="confirm">
                <input
                  type="checkbox"
                  checked={confirmUnrated}
                  onChange={(e) => setConfirmUnrated(e.target.checked)}
                />
                No US rating on file. Add it anyway.
              </label>
            )}
            {themeIssue && (
              <label className="confirm">
                <input type="checkbox" checked={confirmTheme} onChange={(e) => setConfirmTheme(e.target.checked)} />
                {themeIssue} Add anyway.
              </label>
            )}
            <div className="selected-actions">
              <button type="button" className="primary" disabled={busy || loadingDetails} onClick={() => void submit()}>
                Add to wheel
              </button>
              <button type="button" className="ghost" onClick={() => setSelected(null)}>
                Back
              </button>
            </div>
          </div>
        </div>
      )}
      {message && <p className="error">{message}</p>}
    </div>
  )
}
