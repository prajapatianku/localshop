import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

/**
 * Webhook handler for payment providers (Stripe/Razorpay)
 * To wire this up, point your payment webhook settings to:
 * https://your-domain.com/api/webhooks/subscription
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // =========================================================================
    // TODO: SECURITY CHECK
    // - For Stripe: Verify signature using stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
    // - For Razorpay: Verify signature using crypto.createHmac('sha256', secret).update(body).digest('hex')
    // =========================================================================

    const { event, data } = body

    // Initialize Supabase Admin Client (bypasses RLS to update user subscription metadata)
    const supabaseAdmin = createAdminClient()

    if (event === 'customer.subscription.updated' || event === 'invoice.payment_succeeded') {
      const userId = data.user_id
      const plan = data.plan // 'monthly' | 'yearly'
      const status = data.status // 'active' | 'expired' | 'trialing'
      const providerId = data.payment_provider_id || 'sub_mock_' + Math.random().toString(36).substr(2, 9)

      // Calculate new period ending date
      const daysToAdd = plan === 'yearly' ? 365 : 30
      const currentPeriodEnd = new Date()
      currentPeriodEnd.setDate(currentPeriodEnd.getDate() + daysToAdd)

      const { error } = await supabaseAdmin
        .from('subscriptions')
        .update({
          plan,
          status,
          current_period_end: currentPeriodEnd.toISOString(),
          payment_provider_id: providerId,
        })
        .eq('user_id', userId)

      if (error) {
        console.error('Database update error in webhook:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'Subscription successfully updated.' })
    }

    if (event === 'customer.subscription.deleted') {
      const userId = data.user_id

      const { error } = await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'expired',
          current_period_end: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'Subscription marked as expired.' })
    }

    return NextResponse.json({ received: true, info: 'Unhandle event type' })
  } catch (err: any) {
    console.error('Webhook parsing error:', err)
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
