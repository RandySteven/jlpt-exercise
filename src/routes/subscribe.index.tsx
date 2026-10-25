import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useLocale } from '../i18n/locale'
import { PLANS, formatPlanPrice, readCheckout } from '../lib/billing'
import { useAuth } from '../lib/auth'

export const Route = createFileRoute('/subscribe/')({
  component: SubscribePage,
})

function SubscribePage() {
  const { t } = useLocale()
  const { user } = useAuth()
  const checkout = user ? readCheckout(user.email) : null
  const active = checkout?.response?.status === 'ACTIVE'

  useEffect(() => {
    document.title = `${t.subscribeTitle} · ${t.pageTitle}`
  }, [t.pageTitle, t.subscribeTitle])

  if (!user) {
    return (
      <section className="sheet narrow">
        <p className="eyebrow">{t.subscribeEyebrow}</p>
        <h1>{t.subscribeTitle}</h1>
        <p className="lede">{t.subscribeSignIn}</p>
        <Link to="/sign-in" className="btn primary">
          {t.signIn}
        </Link>
      </section>
    )
  }

  return (
    <div className="level-page">
      {active ? (
        <section className="sheet narrow">
          <p className="eyebrow">{t.subscribeEyebrow}</p>
          <h1>{t.subscribeActive}</h1>
          <p className="lede">{t.subscribeActiveBody(checkout.response?.plan_name || '')}</p>
          <Link to="/generate" className="btn primary">
            {t.generateStart}
          </Link>
        </section>
      ) : (
        <section className="sheet">
          <p className="eyebrow">{t.subscribeEyebrow}</p>
          <h1>{t.subscribeTitle}</h1>
          <p className="lede">{t.subscribeLead}</p>
          <div className="level-grid" aria-label={t.subscribeTitle}>
            {PLANS.map((plan) => (
              <Link
                key={plan.id}
                to="/subscribe/$level"
                params={{ level: plan.level }}
                className="level-card plan-card"
              >
                <span className="level-kicker">{t.subscribeEyebrow}</span>
                <span className="level-id">{plan.level}</span>
                <span className="level-summary">{formatPlanPrice(plan.price, plan.currency)}</span>
                <span className="level-meta">{t.subscribeMonth}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
