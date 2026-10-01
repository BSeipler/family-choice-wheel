const ALLOWED = new Set([
  'G',
  'PG',
  'PG-13',
  'TV-Y',
  'TV-Y7',
  'TV-G',
  'TV-PG',
  'TV-14',
  'PASSED',
  'APPROVED',
])

const BLOCKED = new Set(['R', 'NC-17', 'TV-MA', 'X', 'NC17', '18', 'R18+', 'R18'])

const MISSING = new Set(['', 'NR', 'UR', 'UNRATED', 'NOT RATED', 'NOT-RATED', 'N/A'])

export function normalizeCertification(value: string | null | undefined): string {
  return (value ?? '').trim().toUpperCase().replace(/\s+/g, ' ')
}

export function isBlockedRating(value: string | null | undefined): boolean {
  const cert = normalizeCertification(value)
  if (BLOCKED.has(cert)) return true
  if (cert.startsWith('R ') || cert === 'R') return true
  if (cert.includes('NC-17') || cert.includes('TV-MA')) return true
  return false
}

export function isAllowedRating(value: string | null | undefined): boolean {
  const cert = normalizeCertification(value)
  if (!cert) return false
  return ALLOWED.has(cert)
}

export function isMissingRating(value: string | null | undefined): boolean {
  const cert = normalizeCertification(value)
  return MISSING.has(cert) || cert.length === 0
}
