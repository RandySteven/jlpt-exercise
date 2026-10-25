import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react'
import { useLocale } from '../i18n/locale'
import { activate, useAuth, type AuthFailure } from '../lib/auth'

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
  const [activationToken, setActivationToken] = useState('')
  const dialogRef = useRef<HTMLDialogElement>(null)
  const signingUp = mode === 'sign-up'

  useEffect(() => {
    document.title = `${signingUp ? t.signUpTitle : t.signInTitle} · ${t.pageTitle}`
  }, [signingUp, t.pageTitle, t.signInTitle, t.signUpTitle])

  useEffect(() => {
    if (user) void navigate({ to: '/' })
  }, [user, navigate])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!activationToken || !dialog || dialog.open) return
    dialog.showModal()
  }, [activationToken])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      if (!signingUp) {
        const failure = await signIn(email, password)
        if (failure) {
          setError(failure)
          return
        }
        void navigate({ to: '/' })
        return
      }

      const registered = await signUp(name, email, password)
      if ('code' in registered) {
        setError(registered)
        return
      }
      setActivationToken(registered.activationToken)
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
      {activationToken ? <ActivationDialog token={activationToken} dialogRef={dialogRef} /> : null}
    </section>
  )
}

function ActivationDialog({
  token,
  dialogRef,
}: {
  token: string
  dialogRef: RefObject<HTMLDialogElement | null>
}) {
  const { t } = useLocale()
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const submitted = String(new FormData(event.currentTarget).get('token') ?? '')
    setError('')
    if (!submitted) {
      setError(t.activateMissing)
      return
    }
    setPending(true)
    try {
      const failure = await activate(submitted)
      if (failure) {
        setError(failure.message || t.authErrors[failure.code])
        return
      }
      void navigate({ to: '/sign-in' })
    } finally {
      setPending(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="auth-dialog"
      aria-labelledby="activate-title"
      onCancel={(event) => event.preventDefault()}
    >
      <p className="eyebrow">{t.account}</p>
      <h2 id="activate-title">{t.activateTitle}</h2>
      <p className="lede">{t.activateBody}</p>
      <form onSubmit={onSubmit}>
        <input type="hidden" name="token" value={token} />
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="btn primary block" disabled={pending}>
          {pending ? t.activateWorking : t.activateAccount}
        </button>
      </form>
    </dialog>
  )
}
