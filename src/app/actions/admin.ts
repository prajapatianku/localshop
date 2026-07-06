'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

async function checkAdminRole() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile && profile.role === 'admin'
}

export async function getAdminAnalytics() {
  const isAdmin = await checkAdminRole()
  if (!isAdmin) return { error: 'Unauthorized' }

  const supabase = await createClient()

  // 1. Active shops
  const { count: activeShops } = await supabase
    .from('shops')
    .select('*', { count: 'exact', head: true })

  // 2. New registrations (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const { count: newShops } = await supabase
    .from('shops')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', thirtyDaysAgo.toISOString())

  // 3. Active subscriptions
  const { count: activeSubscriptions } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  // 4. Mock subscription revenue & Churn rate (since this is sandbox Stripe, we compute active subscription counts)
  // Let's assume a subscription costs ₹500/month
  const mockSubRevenue = (activeSubscriptions || 0) * 500
  
  // Churn calculation placeholder (standard industry metric or query expired subscriptions count vs total)
  const { count: expiredSubs } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'expired')
  
  const totalSubs = (activeSubscriptions || 0) + (expiredSubs || 0)
  const churnRate = totalSubs > 0 ? ((expiredSubs || 0) / totalSubs) * 100 : 0

  return {
    activeShops: activeShops || 0,
    newShops: newShops || 0,
    activeSubscriptions: activeSubscriptions || 0,
    subscriptionRevenue: mockSubRevenue,
    churnRate: Math.round(churnRate * 10) / 10
  }
}

export async function verifyShop(shopId: string, level: 'basic' | 'verified' | 'premium') {
  const isAdmin = await checkAdminRole()
  if (!isAdmin) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('shops')
    .update({ verification_level: level })
    .eq('id', shopId)

  if (error) return { error: error.message }

  revalidatePath('/admin')
  return { success: true }
}

export async function getReportsList() {
  const isAdmin = await checkAdminRole()
  if (!isAdmin) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      reporter: reporter_id (email, full_name),
      shop: reported_shop_id (name),
      product: reported_product_id (name)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error("Error fetching reports:", error.message)
    return []
  }
  return data
}

export async function updateReportStatus(reportId: string, status: 'resolved' | 'dismissed') {
  const isAdmin = await checkAdminRole()
  if (!isAdmin) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('reports')
    .update({ status })
    .eq('id', reportId)

  if (error) return { error: error.message }

  revalidatePath('/admin')
  return { success: true }
}
