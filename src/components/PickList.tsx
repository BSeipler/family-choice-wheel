import type { Person, WheelEntry } from '../../shared/types.ts'
import { posterUrl, ratingLabel } from '../tmdb.ts'
import { WatchLinks } from './WatchLinks.tsx'

type Props = {
  people: Person[]
  entries: WheelEntry[]
}

export function PickList({ people, entries }: Props) {
  return (
    <ul className="pick-list">
      {people.map((person) => {
        const entry = entries.find((item) => item.personId === person.id)
        return (
          <li key={person.id} className="pick-card" style={{ borderColor: person.color }}>
            {entry?.posterPath ? (
              <img
                src={posterUrl(entry.posterPath, 'w185') ?? ''}
                alt=""
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : (
              <div className="poster-fallback tall" style={{ background: person.color }} />
            )}
            <div>
              <p className="picker" style={{ color: person.color }}>
                {person.name}
              </p>
              {entry ? (
                <>
                  <h3>{entry.title}</h3>
                  <p className="muted">{ratingLabel(entry.certification)}</p>
                  <WatchLinks providers={entry.watchProviders} />
                </>
              ) : (
                <p className="muted">Needs a movie before you can spin.</p>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
