import { ApiError, api } from './api'
import { getSubscriptionDetail, listPayments, type PaymentRecord, type SubscriptionDetail } from './billing'

export type UserProfile = {
  id: number
  user_name: string
  user_email: string
}

export type AccountDashboard = {
  profile: UserProfile
  subscription: SubscriptionDetail | null
  payments: PaymentRecord[]
}

type ProfileEnvelope = {
  data?: { user_profile?: UserProfile }
}

export async function loadAccount(token: string): Promise<AccountDashboard> {
  const profile = await getUserProfile(token)
  const subscription = await getSubscriptionDetail(token)
  if (!subscription) return { profile, subscription: null, payments: [] }
  const payments = await listPayments(token, subscription.subscription_id)
  return { profile, subscription, payments }
}

function getUserProfile(token: string) {
  return api<ProfileEnvelope>('/auth/profile', { token }).then((body) => {
    const profile = body.data?.user_profile
    if (!profile?.user_email || !profile.user_name) throw new ApiError('Profile is missing', 500)
    return profile
  })
}
