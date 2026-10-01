import { useState, type FormEvent } from 'react'
import { isApiError, login } from '../api.ts'

export function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(password)
      onUnlock()
    } catch (err) {
      if (isApiError(err)) setError(err.body.error)
      else setError('Could not check the password. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page gate">
      <p className="kicker">Family Choice Wheel</p>
      <h1>Friday Movie Night</h1>
      <form className="panel gate-card" onSubmit={(event) => void onSubmit(event)}>
        <label>
          Password
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoFocus
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Checking…' : 'Enter'}
        </button>
      </form>
    </main>
  )
}
