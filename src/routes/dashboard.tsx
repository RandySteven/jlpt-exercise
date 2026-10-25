import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useLocale } from '../i18n/locale'
import { loadAccount, type AccountDashboard } from '../lib/account'
import { ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatPlanPrice } from '../lib/billing'

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const { locale, t } = useLocale()
  const { user, signOut } = useAuth()
  const [account, setAccount] = useState<AccountDashboard | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(Boolean(user))

  useEffect(() => {
    document.title = `${t.dashboardTitle} · ${t.pageTitle}`
  }, [t.dashboardTitle, t.pageTitle])

  useEffect(() => {
    if (!user) return
    let cancel = false
    setLoading(true)
    setError('')
    loadAccount(user.accessToken)
      .then((next) => {
        if (!cancel) setAccount(next)
      })
      .catch((caught) => {
        if (cancel) return
        if (caught instanceof ApiError && caught.status === 401) {
          signOut()
          return
        }
        setError(caught instanceof Error && caught.message ? caught.message : t.dashboardFailed)
      })
      .finally(() => {
        if (!cancel) setLoading(false)
      })
    return () => {
      cancel = true
    }
  }, [signOut, t.dashboardFailed, user])

  if (!user) {
    return (
      <section className="sheet narrow">
        <p className="eyebrow">{t.dashboardEyebrow}</p>
        <h1>{t.dashboardTitle}</h1>
        <p className="lede">{t.dashboardSignIn}</p>
        <Link to="/sign-in" className="btn primary">
          {t.signIn}
        </Link>
      </section>
    )
  }

  if (loading) {
    return (
      <section className="sheet narrow" aria-busy="true">
        <p className="eyebrow">{t.dashboardEyebrow}</p>
        <h1>{t.dashboardTitle}</h1>
        <p className="lede">{t.dashboardLoading}</p>
      </section>
    )
  }

  if (error || !account) {
    return (
      <section className="sheet narrow">
        <p className="eyebrow">{t.dashboardEyebrow}</p>
        <h1>{t.dashboardTitle}</h1>
        <p className="form-error" role="alert">
          {error || t.dashboardFailed}
        </p>
      </section>
    )
  }

  const subscription = account.subscription

  return (
    <div className="level-page">
      <section className="sheet">
        <p className="eyebrow">{t.dashboardEyebrow}</p>
        <h1>{t.dashboardTitle}</h1>
        <h2>{t.dashboardProfile}</h2>
        <dl className="fact-grid dashboard-facts">
          <div>
            <dt>{t.nameLabel}</dt>
            <dd>{account.profile.user_name}</dd>
          </div>
          <div>
            <dt>{t.emailLabel}</dt>
            <dd>{account.profile.user_email}</dd>
          </div>
        </dl>
      </section>

      <section className="sheet">
        <h2>{t.dashboardSubscription}</h2>
        {subscription ? (
          <dl className="fact-grid dashboard-facts">
            <div>
              <dt>{t.dashboardPlan}</dt>
              <dd>{subscription.plan_name}</dd>
            </div>
            <div>
              <dt>{t.dashboardStatus}</dt>
              <dd>
                <span className={statusClass(subscription.status)}>{subscription.status}</span>
              </dd>
            </div>
            <div>
              <dt>{t.dashboardStarts}</dt>
              <dd>{formatWhen(subscription.start_date, locale)}</dd>
            </div>
            <div>
              <dt>{t.dashboardEnds}</dt>
              <dd>{formatWhen(subscription.end_date, locale)}</dd>
            </div>
          </dl>
        ) : (
          <>
            <p className="lede">{t.dashboardNone}</p>
            <Link to="/subscribe" className="btn primary">
              {t.dashboardSubscribe}
            </Link>
          </>
        )}
      </section>

      <section className="sheet">
        <h2>{t.dashboardPayments}</h2>
        {account.payments.length === 0 ? (
          <p className="lede">{t.dashboardPaymentsEmpty}</p>
        ) : (
          <ul className="payment-list">
            {account.payments.map((payment) => (
              <li key={payment.payment_id} className="payment-row">
                <span>{formatPlanPrice(payment.amount, payment.currency)}</span>
                <span className={statusClass(payment.status)}>{payment.status}</span>
                <time dateTime={payment.created_at}>{formatWhen(payment.created_at, locale)}</time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function statusClass(status: string) {
  if (status === 'ACTIVE' || status === 'PAID') return 'pill pass'
  if (status === 'FAILED' || status === 'CANCELLED') return 'pill fail'
  return 'pill'
}

function formatWhen(value: string, locale: 'en' | 'id') {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(locale === 'id' ? 'id-ID' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}
