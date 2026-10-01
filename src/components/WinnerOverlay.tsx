import type { Person, WheelEntry } from '../../shared/types.ts'
import { posterUrl, ratingLabel } from '../tmdb.ts'
import { WatchLinks } from './WatchLinks.tsx'

type Props = {
  person: Person
  entry: WheelEntry
  onClose: () => void
}

export function WinnerOverlay({ person, entry, onClose }: Props) {
  return (
    <div className="overlay" role="dialog" aria-labelledby="winner-title">
      <div className="overlay-card">
        {entry.posterPath && (
          <img
            src={posterUrl(entry.posterPath, 'w342') ?? ''}
            alt=""
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        )}
        <p className="eyebrow" style={{ color: person.color }}>
          {person.name} wins tonight
        </p>
        <h2 id="winner-title">{entry.title}</h2>
        <p className="muted">{ratingLabel(entry.certification)}</p>
        <WatchLinks providers={entry.watchProviders} />
        <p className="muted">Next week, {person.name} picks a new movie. Everyone else’s picks stay on the wheel.</p>
        <button type="button" className="primary" onClick={onClose}>
          Can’t wait
        </button>
      </div>
    </div>
  )
}
