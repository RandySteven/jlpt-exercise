import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState, type FormEvent } from 'react'
import { useLocale } from '../i18n/locale'
import { useAuth, type AuthFailure } from '../lib/auth'

type AuthMode = 'sign-in' | 'sign-up'

export function AuthForm({ mode }: { mode: AuthMode }) {
  const { t } = useLocale()
  const { user, signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<AuthFailure | null>(null)
  const [pending, setPending] = useState(false)
  const signingUp = mode === 'sign-up'

  useEffect(() => {
    document.title = `${signingUp ? t.signUpTitle : t.signInTitle} · ${t.pageTitle}`
  }, [signingUp, t.pageTitle, t.signInTitle, t.signUpTitle])

  useEffect(() => {
    if (user) void navigate({ to: '/' })
  }, [user, navigate])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      const code = signingUp ? await signUp(name, email, password) : await signIn(email, password)
      if (code) {
        setError(code)
        return
      }
      void navigate({ to: '/' })
    } finally {
      setPending(false)
    }
  }

  const errorText = error ? error.message || t.authErrors[error.code] : ''

  return (
    <section className="sheet narrow auth-sheet">
      <p className="eyebrow">{t.account}</p>
      <h1>{signingUp ? t.signUpTitle : t.signInTitle}</h1>
      <p className="lede">{signingUp ? t.signUpLead : t.signInLead}</p>
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        {errorText ? (
          <p className="form-error" role="alert">
            {errorText}
          </p>
        ) : null}
        {signingUp ? (
          <label className="field">
            <span>{t.nameLabel}</span>
            <input
              name="name"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
        ) : null}
        <label className="field">
          <span>{t.emailLabel}</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>{t.passwordLabel}</span>
          <input
            name="password"
            type="password"
            autoComplete={signingUp ? 'new-password' : 'current-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        <button type="submit" className="btn primary block" disabled={pending}>
          {pending ? (signingUp ? t.authPendingSignUp : t.authPendingSignIn) : signingUp ? t.signUp : t.signIn}
        </button>
      </form>
      <p className="auth-switch">
        {signingUp ? t.authSwitchToSignIn : t.authSwitchToSignUp}{' '}
        <Link to={signingUp ? '/sign-in' : '/sign-up'}>{signingUp ? t.signIn : t.signUp}</Link>
      </p>
    </section>
  )
}
