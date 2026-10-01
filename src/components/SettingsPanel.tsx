import { useState, type FormEvent } from 'react'
import type { Person, Settings } from '../../shared/types.ts'
import { addPerson, removePerson, saveSettings, updatePerson } from '../api.ts'

const COLORS = ['#c94c4c', '#3d7ea6', '#3c9d6e', '#d4a017', '#7b5ea7', '#d46a2e', '#2aa3a3', '#d45d8d']

type Props = {
  people: Person[]
  settings: Settings
  onChange: () => Promise<void>
}

export function SettingsPanel({ people, settings, onChange }: Props) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[people.length % COLORS.length])
  const [apiKey, setApiKey] = useState(settings.tmdbApiKey)
  const [region, setRegion] = useState(settings.watchRegion || 'US')
  const [status, setStatus] = useState<string | null>(null)

  async function onAdd(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await addPerson(name.trim(), color)
    setName('')
    setColor(COLORS[(people.length + 1) % COLORS.length])
    await onChange()
  }

  async function onSaveKey(e: FormEvent) {
    e.preventDefault()
    await saveSettings(apiKey.trim(), region.trim().toUpperCase() || 'US')
    setStatus('Saved. Movie search will use this key.')
    await onChange()
  }

  return (
    <div className="settings">
      <section>
        <h3>Family</h3>
        <p className="muted">Each person gets a color. Their slice on the wheel always uses it.</p>
        <ul className="people-admin">
          {people.map((person) => (
            <li key={person.id}>
              <input
                type="color"
                value={person.color}
                onChange={(e) => void updatePerson(person.id, { color: e.target.value }).then(onChange)}
                aria-label={`${person.name} color`}
              />
              <input
                defaultValue={person.name}
                onBlur={(e) => {
                  const next = e.target.value.trim()
                  if (next && next !== person.name) void updatePerson(person.id, { name: next }).then(onChange)
                }}
              />
              <button
                type="button"
                className="ghost danger"
                onClick={() => {
                  if (window.confirm(`Remove ${person.name} from the wheel?`)) {
                    void removePerson(person.id).then(onChange)
                  }
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <form className="inline-form" onSubmit={(e) => void onAdd(e)}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Color" />
          <button type="submit" className="primary">
            Add person
          </button>
        </form>
      </section>

      <section>
        <h3>TMDB</h3>
        <p className="muted">
          Free key from{' '}
          <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer">
            themoviedb.org
          </a>
          . Needed for search, posters, ratings, and streaming links.
        </p>
        <form className="stack-form" onSubmit={(e) => void onSaveKey(e)}>
          <label>
            API key
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
            />
          </label>
          <label>
            Watch region
            <input value={region} onChange={(e) => setRegion(e.target.value)} maxLength={2} />
          </label>
          <button type="submit" className="primary">
            Save
          </button>
        </form>
        {status && <p className="ok">{status}</p>}
      </section>
    </div>
  )
}
