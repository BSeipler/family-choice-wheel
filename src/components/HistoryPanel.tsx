import type { HistoryRow, Person } from '../../shared/types.ts'
import { posterUrl, ratingLabel } from '../tmdb.ts'

type Props = {
  history: HistoryRow[]
  people: Person[]
}

export function HistoryPanel({ history, people }: Props) {
  const wins = history.filter((row) => row.wonAt).sort((a, b) => (b.wonAt ?? 0) - (a.wonAt ?? 0))
  if (wins.length === 0) {
    return <p className="muted">No Friday night winners yet. Spin the wheel to start a history.</p>
  }
  return (
    <ul className="history-list">
      {wins.map((row) => {
        const person = people.find((p) => p.id === row.personId)
        const date = new Date(row.wonAt ?? row.pickedAt)
        return (
          <li key={row.id}>
            {row.posterPath ? (
              <img
                src={posterUrl(row.posterPath, 'w92') ?? ''}
                alt=""
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <span className="poster-fallback" />
            )}
            <div>
              <strong>{row.title}</strong>
              <p className="muted">
                {date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                {person ? ` · ${person.name}` : ''}
                {row.certification ? ` · ${ratingLabel(row.certification)}` : ''}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
