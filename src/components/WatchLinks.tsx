import type { WatchProviders } from '../../shared/types.ts'
import { providerLogo } from '../tmdb.ts'

type Props = {
  providers: WatchProviders | null
}

function Row({ label, items }: { label: string; items: WatchProviders['stream'] }) {
  if (items.length === 0) return null
  return (
    <div className="provider-row">
      <span>{label}</span>
      <div className="provider-logos">
        {items.map((item) => (
          <img
            key={`${label}-${item.id}`}
            src={providerLogo(item.logoPath) ?? undefined}
            alt={item.name}
            title={item.name}
          />
        ))}
      </div>
    </div>
  )
}

export function WatchLinks({ providers }: Props) {
  if (!providers) {
    return <p className="muted">No streaming info for this region.</p>
  }
  const empty = providers.stream.length + providers.rent.length + providers.buy.length === 0
  if (empty) {
    return <p className="muted">No streaming info for this region.</p>
  }
  const inner = (
    <div className="watch-links">
      <Row label="Stream" items={providers.stream} />
      <Row label="Rent" items={providers.rent} />
      <Row label="Buy" items={providers.buy} />
    </div>
  )
  if (providers.link) {
    return (
      <a className="watch-links-wrap" href={providers.link} target="_blank" rel="noreferrer">
        {inner}
      </a>
    )
  }
  return inner
}
