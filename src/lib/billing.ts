import type { LevelId } from '../data/types'
import { ApiError, api } from './api'

const STORAGE_KEY = 'jlpt-checkout'

/** Seeded in jlpt-exercise-be migration, in this insert order. */
export const PLANS: { id: number; level: LevelId; price: number; currency: string }[] = [
  { id: 1, level: 'N5', price: 15000, currency: 'IDR' },
  { id: 2, level: 'N4', price: 15000, currency: 'IDR' },
  { id: 3, level: 'N3', price: 15000, currency: 'IDR' },
  { id: 4, level: 'N2', price: 15000, currency: 'IDR' },
  { id: 5, level: 'N1', price: 15000, currency: 'IDR' },
]

export type SubscriptionResponse = {
  subscription_id: number
  redirect_url?: string
  status: string
  created_at: string
  updated_at: string
  start_date: string
  end_date: string
  plan_id: number
  plan_name: string
}

export type Checkout = {
  email: string
  idempotencyKey: string
  planId: number
  opened: boolean
  response?: SubscriptionResponse
}

type CreateEnvelope = {
  data?: { create_subscription_response?: SubscriptionResponse }
}

type ConfirmEnvelope = {
  data?: { payment_confirmation_response?: { redirect_url?: string } }
}

export type SubscriptionDetail = {
  subscription_id: number
  plan_id: number
  plan_name: string
  status: string
  created_at: string
  end_date: string
  start_date: string
  updated_at: string
}

export type PaymentRecord = {
  payment_id: number
  amount: number
  currency: string
  status: string
  created_at: string
}

type SubscriptionDetailEnvelope = {
  data?: { subscription_detail_response?: SubscriptionDetail }
}

type PaymentHistoryEnvelope = {
  data?: { payment_history_response?: { payment_history?: PaymentRecord[] } }
}

export async function hasActiveSubscription(token: string): Promise<boolean | null> {
  try {
    const detail = await getSubscriptionDetail(token)
    return detail?.status === 'ACTIVE'
  } catch {
    return null
  }
}

export async function getSubscriptionDetail(token: string): Promise<SubscriptionDetail | null> {
  try {
    const body = await api<SubscriptionDetailEnvelope>('/payment/subscription', { token })
    const detail = body.data?.subscription_detail_response
    if (!detail?.status || typeof detail.subscription_id !== 'number') return null
    return detail
  } catch (caught) {
    if (caught instanceof ApiError && (caught.status === 404 || caught.status === 400)) return null
    throw caught
  }
}

export async function listPayments(token: string, subscriptionId: number): Promise<PaymentRecord[]> {
  try {
    const body = await api<PaymentHistoryEnvelope>('/payment/payment-history', {
      method: 'POST',
      token,
      body: { subscription_id: subscriptionId, page: 1, limit: 20 },
    })
    return body.data?.payment_history_response?.payment_history ?? []
  } catch (caught) {
    if (caught instanceof ApiError && caught.status === 404) return []
    throw caught
  }
}

export function readCheckout(email: string): Checkout | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Checkout
    if (parsed.email !== email || typeof parsed.idempotencyKey !== 'string' || typeof parsed.planId !== 'number') {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function writeCheckout(value: Checkout) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
}

export async function startSubscription(token: string, planId: number, idempotencyKey: string) {
  let response = await createSubscription(token, planId, idempotencyKey)
  if (response.status === 'PENDING' && !response.redirect_url) {
    response = await createSubscription(token, planId, idempotencyKey)
  }
  return response
}

export function confirmSubscription(token: string, planId: number, idempotencyKey: string) {
  return api<ConfirmEnvelope>('/payment/confirmation', {
    method: 'POST',
    token,
    body: {
      idempotency_key: idempotencyKey,
      plan_id: planId,
      status: 'settlement',
    },
  })
}

export function formatPlanPrice(price: number, currency: string) {
  if (currency === 'IDR') return `Rp ${price.toLocaleString('id-ID')}`
  return `${price.toLocaleString()} ${currency}`
}

function createSubscription(token: string, planId: number, idempotencyKey: string) {
  return api<CreateEnvelope>('/payment/subscription', {
    method: 'POST',
    token,
    body: { idempotency_key: idempotencyKey, plan_id: planId },
  }).then((body) => {
    const response = body.data?.create_subscription_response
    if (!response?.status) throw new Error('Subscription response is missing')
    return response
  })
}
