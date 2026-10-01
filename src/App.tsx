import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AppState, SpinResult, WheelId } from '../shared/types.ts'
import { fetchSession, fetchState, isApiError, logout, spinWheel } from './api.ts'
import { HistoryPanel } from './components/HistoryPanel.tsx'
import { MovieSearch } from './components/MovieSearch.tsx'
import { PasswordGate } from './components/PasswordGate.tsx'
import { PickList } from './components/PickList.tsx'
import { SeasonalBanner } from './components/SeasonalBanner.tsx'
import { SettingsPanel } from './components/SettingsPanel.tsx'
import { WinnerOverlay } from './components/WinnerOverlay.tsx'
import { targetRotation, Wheel, type WheelSlice } from './components/Wheel.tsx'

type Tab = 'tonight' | 'history' | 'settings'

function previewWheel(): WheelId | null {
  const value = new URLSearchParams(window.location.search).get('season')
  if (value === 'halloween' || value === 'christmas' || value === 'regular') return value
  return null
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

export default function App() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [state, setState] = useState<AppState | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('tonight')
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [spinError, setSpinError] = useState<string | null>(null)
  const [winner, setWinner] = useState<SpinResult | null>(null)
  const preview = previewWheel()

  const refresh = useCallback(async () => {
    try {
      const next = await fetchState()
      setState(next)
      setLoadError(null)
    } catch (err) {
      if (isApiError(err) && err.body.code === 'UNAUTHORIZED') {
        setAuthed(false)
        setState(null)
        return
      }
      setLoadError(err instanceof Error ? err.message : 'Could not load family data.')
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void fetchSession()
      .then((ok) => {
        if (!cancelled) setAuthed(ok)
      })
      .catch(() => {
        if (!cancelled) setAuthed(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (authed) void refresh()
  }, [authed, refresh])

  async function lock() {
    await logout()
    setState(null)
    setWinner(null)
    setAuthed(false)
  }

  const activeWheel: WheelId = preview ?? state?.calendarWheel ?? 'regular'
  const people = state?.people ?? []
  const entries = useMemo(
    () => (state?.entries ?? []).filter((entry) => entry.wheelId === activeWheel),
    [activeWheel, state?.entries],
  )

  const slices: WheelSlice[] = people.map((person) => ({
    personId: person.id,
    name: person.name,
    color: person.color,
    title: entries.find((entry) => entry.personId === person.id)?.title ?? null,
  }))

  const needingPick = people.filter((person) => !entries.some((entry) => entry.personId === person.id))
  const canSpin = people.length > 0 && needingPick.length === 0 && !spinning

  async function onSpin() {
    if (!canSpin) return
    setSpinError(null)
    setSpinning(true)
    try {
      const result = await spinWheel(activeWheel)
      const index = Math.max(
        0,
        slices.findIndex((slice) => slice.personId === result.person.id),
      )
      const from = rotation
      const to = targetRotation(from, index, Math.max(slices.length, 1))
      const duration = 4500
      const start = performance.now()
      await new Promise<void>((resolve) => {
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration)
          setRotation(from + (to - from) * easeOutCubic(t))
          if (t < 1) requestAnimationFrame(tick)
          else resolve()
        }
        requestAnimationFrame(tick)
      })
      setWinner(result)
      await refresh()
    } catch (err) {
      if (isApiError(err)) setSpinError(err.body.error)
      else setSpinError(err instanceof Error ? err.message : 'Spin failed')
    } finally {
      setSpinning(false)
    }
  }

  if (authed === null) {
    return (
      <main className="page">
        <h1>Family Choice Wheel</h1>
        <p className="muted">Loading…</p>
      </main>
    )
  }

  if (!authed) {
    return <PasswordGate onUnlock={() => setAuthed(true)} />
  }

  if (loadError && !state) {
    return (
      <main className="page">
        <h1>Family Choice Wheel</h1>
        <p className="error">{loadError}</p>
        <button type="button" className="primary" onClick={() => void refresh()}>
          Try again
        </button>
      </main>
    )
  }

  if (!state) {
    return (
      <main className="page">
        <h1>Family Choice Wheel</h1>
        <p className="muted">Loading the wheel…</p>
      </main>
    )
  }

  return (
    <div className="app" data-theme={activeWheel}>
      <header className="top">
        <button type="button" className="ghost lock-btn" onClick={() => void lock()}>
          Lock
        </button>
        <p className="kicker">Family Choice Wheel</p>
        <h1>Friday Movie Night</h1>
        <SeasonalBanner wheel={activeWheel} preview={Boolean(preview)} />
      </header>

      <nav className="tabs" aria-label="Main">
        <button type="button" className={tab === 'tonight' ? 'active' : ''} onClick={() => setTab('tonight')}>
          Tonight
        </button>
        <button type="button" className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>
          History
        </button>
        <button type="button" className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>
          Family & Settings
        </button>
      </nav>

      {tab === 'tonight' && (
        <div className="tonight">
          <section className="wheel-col">
            <Wheel slices={slices} rotation={rotation} spinning={spinning} />
            <button type="button" className="spin-btn" disabled={!canSpin} onClick={() => void onSpin()}>
              {spinning ? 'Spinning…' : 'Spin'}
            </button>
            {!canSpin && !spinning && (
              <p className="muted center">
                {people.length === 0
                  ? 'Add your family in Family & Settings.'
                  : `Waiting on ${needingPick.map((p) => p.name).join(', ')} to pick.`}
              </p>
            )}
            {spinError && <p className="error center">{spinError}</p>}
          </section>
          <section className="picks-col">
            <h2>On the wheel</h2>
            <PickList people={people} entries={entries} />
            <h2>Add or replace a movie</h2>
            <MovieSearch
              apiKey={state.settings.tmdbApiKey}
              watchRegion={state.settings.watchRegion}
              wheelId={activeWheel}
              people={people}
              defaultPersonId={needingPick[0]?.id ?? people[0]?.id ?? null}
              onAdded={refresh}
            />
          </section>
        </div>
      )}

      {tab === 'history' && (
        <section className="panel">
          <h2>Winners</h2>
          <HistoryPanel history={state.history} people={people} />
        </section>
      )}

      {tab === 'settings' && (
        <section className="panel">
          <SettingsPanel people={people} settings={state.settings} onChange={refresh} />
        </section>
      )}

      {winner && (
        <WinnerOverlay
          person={winner.person}
          entry={winner.entry}
          onClose={() => setWinner(null)}
        />
      )}
    </div>
  )
}
