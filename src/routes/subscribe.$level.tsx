import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useLocale } from '../i18n/locale'
import { ApiError } from '../lib/api'
import { useAuth } from '../lib/auth'
import {
  PLANS,
  confirmSubscription,
  formatPlanPrice,
  readCheckout,
  startSubscription,
  writeCheckout,
} from '../lib/billing'

export const Route = createFileRoute('/subscribe/$level')({
  component: PlanDetailPage,
})

function PlanDetailPage() {
  const { level } = Route.useParams()
  const plan = PLANS.find((item) => item.level === level)
  const { t } = useLocale()
  const { user, signOut } = useAuth()
  const [pending, setPending] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')
  const [active, setActive] = useState(false)
  const [processing, setProcessing] = useState(false)
  const checkout = user ? readCheckout(user.email) : null
  const started = checkout != null && checkout.planId === plan?.id && checkout.response?.status === 'PENDING'
  const paymentUrl = started ? checkout.response?.redirect_url : undefined

  useEffect(() => {
    document.title = `${plan?.level ?? t.subscribeTitle} · ${t.pageTitle}`
  }, [plan?.level, t.pageTitle, t.subscribeTitle])

  useEffect(() => {
    if (checkout != null && checkout.planId === plan?.id && checkout.response?.status === 'ACTIVE') setActive(true)
    if (checkout != null && checkout.planId === plan?.id && checkout.opened && checkout.response?.status === 'PENDING') {
      setProcessing(true)
    }
  }, [checkout, plan?.id])

  async function pay() {
    if (!user || !plan) return
    const tab = window.open('', '_blank')
    const existing = readCheckout(user.email)
    const reusable = existing && existing.response?.status === 'PENDING' && existing.planId === plan.id
    const next = {
      email: user.email,
      idempotencyKey: reusable ? existing.idempotencyKey : crypto.randomUUID(),
      planId: plan.id,
      opened: false,
    }
    setError('')
    setPending(true)
    try {
      const response = await startSubscription(user.accessToken, plan.id, next.idempotencyKey)
      if (response.status === 'ACTIVE') {
        tab?.close()
        writeCheckout({ ...next, response, opened: false })
        setActive(true)
        return
      }
      if (!response.redirect_url || !tab) {
        tab?.close()
        writeCheckout({ ...next, response, opened: false })
        setError(response.redirect_url ? t.subscribePopupBlocked : t.subscribeFailed)
        return
      }
      tab.location.href = response.redirect_url
      tab.opener = null
      writeCheckout({ ...next, response, opened: true })
      setProcessing(true)
    } catch (caught) {
      tab?.close()
      if (caught instanceof ApiError && caught.status === 401) {
        signOut()
        return
      }
      setError(caught instanceof Error ? caught.message : t.subscribeFailed)
    } finally {
      setPending(false)
    }
  }

  async function confirm() {
    if (!user || !plan) return
    const stored = readCheckout(user.email)
    if (!stored || stored.planId !== plan.id) return
    setConfirming(true)
    setError('')
    try {
      await confirmSubscription(user.accessToken, stored.planId, stored.idempotencyKey)
      writeCheckout({
        ...stored,
        response: stored.response ? { ...stored.response, status: 'ACTIVE' } : undefined,
      })
      setActive(true)
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

  if (!plan) {
    return (
      <section className="sheet narrow">
        <h1>{t.notFoundTitle}</h1>
        <p className="lede">{t.notFoundBody}</p>
        <Link to="/subscribe" className="btn primary">
          {t.subscribeBack}
        </Link>
      </section>
    )
  }

  if (!user) {
    return (
      <section className="sheet narrow">
        <p className="eyebrow">{t.subscribeEyebrow}</p>
        <h1>{plan.level}</h1>
        <p className="lede">{t.subscribeSignIn}</p>
        <Link to="/sign-in" className="btn primary">
          {t.signIn}
        </Link>
      </section>
    )
  }

  if (active) {
    return (
      <section className="sheet narrow">
        <p className="eyebrow">{t.subscribeEyebrow}</p>
        <h1>{plan.level}</h1>
        <p className="lede">{t.subscribeActiveBody(plan.level)}</p>
        <Link to="/generate" className="btn primary">
          {t.generateStart}
        </Link>
      </section>
    )
  }

  return (
    <section className="sheet narrow">
      <p className="eyebrow">{t.subscribeEyebrow}</p>
      <h1>{plan.level}</h1>
      <p className="lede">{t.subscribeDetailLead}</p>
      <p className="lede">
        {formatPlanPrice(plan.price, plan.currency)} {t.subscribeMonth}
      </p>
      {processing ? (
        <>
          <p className="wait-status">{t.subscribeProcessing}</p>
          <p className="lede">{t.subscribeProcessingBody}</p>
          <div className="wait-mark" aria-hidden="true" />
        </>
      ) : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="action-row">
        {processing ? null : (
          <button type="button" className="btn primary" onClick={() => void pay()} disabled={pending}>
            {pending ? t.subscribeLoading : t.subscribePayment}
          </button>
        )}
        {processing && paymentUrl ? (
          <a className="btn ghost" href={paymentUrl} target="_blank" rel="noreferrer">
            {t.subscribeReopen}
          </a>
        ) : null}
        {started || processing ? (
          <button type="button" className="btn primary" onClick={() => void confirm()} disabled={confirming}>
            {confirming ? t.subscribeConfirming : t.subscribeConfirm}
          </button>
        ) : null}
      </div>
      <p className="auth-switch">
        <Link to="/subscribe">{t.subscribeBack}</Link>
      </p>
    </section>
  )
}
