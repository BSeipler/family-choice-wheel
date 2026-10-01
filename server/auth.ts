import { createHmac, timingSafeEqual } from 'node:crypto'
import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'

const PASSWORD = 'Skaterboy1515!'
const COOKIE = 'fcw_session'
const MAX_AGE_SEC = 60 * 60 * 24 * 30

function sign(payload: string): string {
  return createHmac('sha256', PASSWORD).update(payload).digest('base64url')
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export function passwordMatches(input: string): boolean {
  return safeEqual(input, PASSWORD)
}

export function sessionToken(): string {
  const exp = Date.now() + MAX_AGE_SEC * 1000
  const payload = String(exp)
  return `${payload}.${sign(payload)}`
}

export function sessionIsValid(token: string | undefined): boolean {
  if (!token) return false
  const dot = token.indexOf('.')
  if (dot <= 0) return false
  const payload = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const exp = Number(payload)
  if (!Number.isFinite(exp) || exp < Date.now()) return false
  return safeEqual(sig, sign(payload))
}

function cookieOptions(c: Context) {
  return {
    path: '/',
    httpOnly: true,
    secure: c.req.url.startsWith('https:'),
    sameSite: 'Lax' as const,
    maxAge: MAX_AGE_SEC,
  }
}

export function readSession(c: Context): boolean {
  return sessionIsValid(getCookie(c, COOKIE))
}

export function writeSession(c: Context): void {
  setCookie(c, COOKIE, sessionToken(), cookieOptions(c))
}

export function clearSession(c: Context): void {
  deleteCookie(c, COOKIE, { path: '/' })
}
