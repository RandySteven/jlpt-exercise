import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useLocale } from '../i18n/locale'
import { activate } from '../lib/auth'

export const Route = createFileRoute('/activate')({
  validateSearch: (search: Record<string, unknown>): { token: string } => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  component: ActivatePage,
})

function ActivatePage() {
  const { token } = Route.useSearch()
  const navigate = useNavigate()
  const { t } = useLocale()
  const [error, setError] = useState('')

  useEffect(() => {
    document.title = `${t.activateTitle} · ${t.pageTitle}`
  }, [t.activateTitle, t.pageTitle])

  useEffect(() => {
    if (!token) {
      setError(t.activateMissing)
      return
    }

    let ignore = false
    void activate(token).then((failure) => {
      if (ignore) return
      if (failure) {
        setError(failure.message || t.authErrors[failure.code])
        return
      }
      void navigate({ to: '/sign-in', replace: true })
    })
    return () => {
      ignore = true
    }
  }, [navigate, t.activateMissing, t.authErrors, token])

  return (
    <section className="sheet narrow auth-sheet">
      <p className="eyebrow">{t.account}</p>
      <h1>{t.activateTitle}</h1>
      <p className="lede">{error || t.activateWorking}</p>
      {error ? (
        <Link to="/sign-in" className="btn primary">
          {t.signIn}
        </Link>
      ) : null}
    </section>
  )
}
