import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { ApiError, api } from './api'

const SESSION_KEY = 'jlpt-session'
const MIN_PASSWORD = 8

export type AuthUser = {
  name: string
  email: string
  accessToken: string
}

type Session = AuthUser & {
  refreshToken: string
}

export type AuthErrorCode =
  | 'invalid-email'
  | 'short-password'
  | 'missing-name'
  | 'email-taken'
  | 'invalid-credentials'
  | 'too-many-attempts'
  | 'request-failed'

export type AuthFailure = {
  code: AuthErrorCode
  message?: string
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type RegisteredAccount = {
  activationToken: string
}

interface AuthContextValue {
  user: AuthUser | null
  signIn: (email: string, password: string) => Promise<AuthFailure | null>
  signUp: (name: string, email: string, password: string) => Promise<AuthFailure | RegisteredAccount>
  signOut: () => void
}

type LoginEnvelope = {
  data?: {
    login?: {
      access_token?: string
      refresh_token?: string
    }
  }
}

type RegisterEnvelope = {
  data?: {
    register?: {
      activation_token?: string
    }
  }
}

const activations = new Map<string, Promise<AuthFailure | null>>()

const AuthContext = createContext<AuthContextValue | null>(null)

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function readAccessToken() {
  return readSession()?.accessToken ?? null
}

function readSession(): AuthUser | null {
  const parsed = readJson(SESSION_KEY)
  if (!parsed || typeof parsed !== 'object') return null
  const session = parsed as Session
  if (
    typeof session.name !== 'string' ||
    typeof session.email !== 'string' ||
    typeof session.accessToken !== 'string' ||
    !session.accessToken
  ) {
    return null
  }
  return { name: session.name, email: session.email, accessToken: session.accessToken }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function validateCredentials(email: string, password: string): AuthErrorCode | null {
  if (!EMAIL.test(email)) return 'invalid-email'
  if (password.length < MIN_PASSWORD) return 'short-password'
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readSession)

  const signIn = useCallback(async (email: string, password: string, name?: string): Promise<AuthFailure | null> => {
    const normalized = normalizeEmail(email)
    const invalid = validateCredentials(normalized, password)
    if (invalid) return { code: invalid }

    try {
      const body = await api<LoginEnvelope>('/auth/login', {
        method: 'POST',
        body: { email: normalized, password },
      })
      const login = body.data?.login
      if (!login?.access_token || !login.refresh_token) return { code: 'request-failed' }
      const previous = readSession()
      const displayName = name?.trim() || (previous?.email === normalized ? previous.name : normalized)
      const session: Session = {
        name: displayName.slice(0, 40),
        email: normalized,
        accessToken: login.access_token,
        refreshToken: login.refresh_token,
      }
      writeJson(SESSION_KEY, session)
      setUser({ name: session.name, email: session.email, accessToken: session.accessToken })
      return null
    } catch (caught) {
      return failureFrom(caught)
    }
  }, [])

  const signUp = useCallback(async (name: string, email: string, password: string): Promise<AuthFailure | RegisteredAccount> => {
    const trimmedName = name.trim()
    if (!trimmedName) return { code: 'missing-name' }

    const normalized = normalizeEmail(email)
    const invalid = validateCredentials(normalized, password)
    if (invalid) return { code: invalid }

    const [firstName, ...rest] = trimmedName.split(/\s+/)
    try {
      const registered = await api<RegisterEnvelope>('/auth/register', {
        method: 'POST',
        body: {
          first_name: firstName,
          last_name: rest.join(' '),
          email: normalized,
          username: usernameFrom(normalized),
          password,
          phone_number: '',
          address: '',
          date_of_birth: '',
          additional_info: {},
        },
      })
      const activationToken = registered.data?.register?.activation_token
      if (!activationToken) return { code: 'request-failed' }
      return { activationToken }
    } catch (caught) {
      return failureFrom(caught)
    }
  }, [])

  const signOut = useCallback(() => {
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, signIn, signUp, signOut }),
    [user, signIn, signUp, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}

export function activate(token: string): Promise<AuthFailure | null> {
  const existing = activations.get(token)
  if (existing) return existing

  const pending = api('/auth/activated', {
    method: 'POST',
    body: { token },
  })
    .then(() => null)
    .catch((caught: unknown) => {
      activations.delete(token)
      return failureFrom(caught)
    })
  activations.set(token, pending)
  return pending
}

function usernameFrom(email: string) {
  const local = email.split('@')[0] ?? 'user'
  const cleaned = local.replace(/[^a-z0-9_]/g, '').slice(0, 32)
  return cleaned || 'user'
}

function failureFrom(caught: unknown): AuthFailure {
  if (caught instanceof ApiError) {
    if (caught.status === 401 || caught.status === 404) return { code: 'invalid-credentials' }
    if (caught.status === 409) return { code: 'email-taken' }
    if (caught.status === 429) return { code: 'too-many-attempts' }
    return { code: 'request-failed', message: caught.message }
  }
  return { code: 'request-failed' }
}
