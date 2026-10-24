import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useLocale } from '../i18n/locale'
import { ApiError } from '../lib/api'
import {
  PLANS,
  confirmSubscription,
  formatPlanPrice,
  readCheckout,
  startSubscription,
  writeCheckout,
  type SubscriptionResponse,
} from '../lib/billing'
import { useAuth } from '../lib/auth'

export const Route = createFileRoute('/subscribe')({
  component: SubscribePage,
})

type Phase = 'plans' | 'loading' | 'pay' | 'active' | 'error'

function SubscribePage() {
  const { t } = useLocale()
  const { user, signOut } = useAuth()
  const [phase, setPhase] = useState<Phase>('plans')
  const [status, setStatus] = useState('')
  const [planName, setPlanName] = useState('')
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    document.title = `${t.subscribeTitle} · ${t.pageTitle}`
  }, [t.pageTitle, t.subscribeTitle])

  useEffect(() => {
    if (!user) return
    const stored = readCheckout(user.email)
    if (!stored?.response) return
    applyResponse(stored.response, stored.opened)
  }, [user])

  function applyResponse(response: SubscriptionResponse, opened: boolean) {
    setStatus(response.status)
    setPlanName(response.plan_name)
    if (response.status === 'ACTIVE') {
      setPhase('active')
      return
    }
    if (response.redirect_url && opened) {
      setPhase('pay')
      return
    }
    if (response.redirect_url) setPhase('pay')
  }

  async function subscribe(planId: number) {
    if (!user) return
    const existing = readCheckout(user.email)
    const reusable = existing && existing.response?.status === 'PENDING' && existing.planId === planId
    const checkout = {
      email: user.email,
      idempotencyKey: reusable ? existing.idempotencyKey : crypto.randomUUID(),
      planId,
      opened: reusable ? existing.opened : false,
    }
    setError('')
    setPhase('loading')
    try {
      const response = await startSubscription(user.accessToken, planId, checkout.idempotencyKey)
      writeCheckout({ ...checkout, response })
      applyResponse(response, checkout.opened)
      if (response.status !== 'ACTIVE' && !response.redirect_url) {
        setError(t.subscribeFailed)
        setPhase('error')
      }
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        signOut()
        return
      }
      setError(caught instanceof Error ? caught.message : t.subscribeFailed)
      setPhase('error')
    }
  }

  function openPayment() {
    if (!user) return
    const stored = readCheckout(user.email)
    const url = stored?.response?.redirect_url
    if (!stored || !url) return
    writeCheckout({ ...stored, opened: true })
    window.location.assign(url)
  }

  async function confirm() {
    if (!user) return
    const stored = readCheckout(user.email)
    if (!stored) return
    setConfirming(true)
    setError('')
    try {
      await confirmSubscription(user.accessToken, stored.planId, stored.idempotencyKey)
      const response = stored.response
        ? { ...stored.response, status: 'ACTIVE' }
        : undefined
      if (response) writeCheckout({ ...stored, response })
      setPlanName(response?.plan_name || planName)
      setStatus('ACTIVE')
      setPhase('active')
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        signOut()
        return
      }
      setError(caught instanceof Error ? caught.message : t.subscribeFailed)
    } finally {
      setConfirming(false)
    }
  }

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
      {phase === 'loading' ? (
        <section className="sheet narrow generate-wait" aria-busy="true" aria-live="polite">
          <p className="eyebrow">{t.subscribeEyebrow}</p>
          <h1>{t.subscribeLoading}</h1>
          <div className="wait-mark" aria-hidden="true" />
        </section>
      ) : null}

      {phase === 'active' ? (
        <section className="sheet narrow">
          <p className="eyebrow">{t.subscribeEyebrow}</p>
          <h1>{t.subscribeActive}</h1>
          <p className="lede">{t.subscribeActiveBody(planName || status)}</p>
          <Link to="/generate" className="btn primary">
            {t.generateStart}
          </Link>
        </section>
      ) : null}

      {phase === 'pay' ? (
        <section className="sheet narrow">
          <p className="eyebrow">{t.subscribeEyebrow}</p>
          <h1>{planName || t.subscribeTitle}</h1>
          <p className="lede">{t.subscribePayLead}</p>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="action-row">
            <button type="button" className="btn primary" onClick={openPayment}>
              {t.subscribePay}
            </button>
            <button type="button" className="btn ghost" onClick={() => void confirm()} disabled={confirming}>
              {confirming ? t.subscribeConfirming : t.subscribeConfirm}
            </button>
          </div>
        </section>
      ) : null}

      {phase === 'plans' || phase === 'error' ? (
        <section className="sheet">
          <p className="eyebrow">{t.subscribeEyebrow}</p>
          <h1>{t.subscribeTitle}</h1>
          <p className="lede">{t.subscribeLead}</p>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="level-grid" aria-label={t.subscribeTitle}>
            {PLANS.map((plan) => (
              <button key={plan.id} type="button" className="level-card plan-card" onClick={() => void subscribe(plan.id)}>
                <span className="level-kicker">{t.subscribeEyebrow}</span>
                <span className="level-id">{plan.level}</span>
                <span className="level-summary">{formatPlanPrice(plan.price, plan.currency)}</span>
                <span className="level-meta">{t.subscribeMonth}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
