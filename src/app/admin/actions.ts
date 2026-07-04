'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

// Helper to assert current user is an admin
async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error || profile?.role !== 'admin') {
    throw new Error('Unauthorized')
  }
  
  return user
}

export async function getAdminStats() {
  await verifyAdmin()
  const supabaseAdmin = createAdminClient()

  // Fetch all subscriptions for aggregation
  const { data: subs, error } = await supabaseAdmin
    .from('subscriptions')
    .select('plan, status')

  if (error) throw error

  const totalUsers = subs?.length || 0
  const activeSubs = subs?.filter(s => s.status === 'active').length || 0
  const trials = subs?.filter(s => s.status === 'trialing').length || 0
  
  // Paid conversion %: users who purchased a paid plan (monthly/yearly) out of total users
  const paidUsers = subs?.filter(s => s.plan === 'monthly' || s.plan === 'yearly').length || 0
  const conversionRate = totalUsers > 0 ? (paidUsers / totalUsers) * 100 : 0

  return {
    totalUsers,
    activeSubs,
    trials,
    conversionRate
  }
}

export async function getAdminUsers() {
  await verifyAdmin()
  const supabaseAdmin = createAdminClient()

  // 1. Fetch profiles and subscriptions
  const [{ data: profiles }, { data: subscriptions }] = await Promise.all([
    supabaseAdmin.from('profiles').select('*'),
    supabaseAdmin.from('subscriptions').select('*')
  ])

  // Merge the records into a single admin users grid
  const mergedUsers = (profiles || []).map(profile => {
    const sub = (subscriptions || []).find(s => s.user_id === profile.id)
    return {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      created_at: profile.created_at,
      plan: sub?.plan || 'trial',
      status: sub?.status || 'trialing',
      trial_ends_at: sub?.trial_ends_at || new Date().toISOString(),
      current_period_end: sub?.current_period_end || null
    }
  })

  // Sort by signup date desc
  mergedUsers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return mergedUsers
}

interface UpdateSubParams {
  userId: string
  plan: 'trial' | 'monthly' | 'yearly' | 'free'
  status: 'trialing' | 'active' | 'expired' | 'canceled'
  trialDaysToAdd?: number
  currentPeriodEndDaysToAdd?: number
}

export async function adminUpdateSubscription(params: UpdateSubParams) {
  await verifyAdmin()
  const supabaseAdmin = createAdminClient()

  const updates: Record<string, any> = {
    plan: params.plan,
    status: params.status,
  }

  if (params.status === 'trialing') {
    const trialEnds = new Date()
    trialEnds.setDate(trialEnds.getDate() + (params.trialDaysToAdd || 14))
    updates.trial_ends_at = trialEnds.toISOString()
    updates.current_period_end = null
  } else if (params.status === 'active') {
    const periodEnd = new Date()
    periodEnd.setDate(periodEnd.getDate() + (params.currentPeriodEndDaysToAdd || 30))
    updates.current_period_end = periodEnd.toISOString()
  } else {
    updates.current_period_end = new Date().toISOString() // Expired now
  }

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update(updates)
    .eq('user_id', params.userId)

  if (error) throw error

  revalidatePath('/admin')
  return { success: true }
}
