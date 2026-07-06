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

    // Initialize Supabase Admin Client (bypasses RLS to update shop subscription details)
    const supabaseAdmin = createAdminClient()

    if (event === 'customer.subscription.updated' || event === 'invoice.payment_succeeded') {
      const shopId = data.shop_id
      const status = data.status || 'active' // 'active' | 'expired'
      const plan = data.plan // 'monthly' | 'yearly'

      // Calculate new period ending date
      const daysToAdd = plan === 'yearly' ? 365 : 30
      const endsAt = new Date()
      endsAt.setDate(endsAt.getDate() + daysToAdd)

      // Update subscription status in database
      const { error } = await supabaseAdmin
        .from('subscriptions')
        .update({
          status,
          ends_at: endsAt.toISOString(),
        })
        .eq('shop_id', shopId)

      if (error) {
        console.error('Database update error in webhook:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'Subscription successfully updated.' })
    }

    if (event === 'customer.subscription.deleted') {
      const shopId = data.shop_id

      const { error } = await supabaseAdmin
        .from('subscriptions')
        .update({
          status: 'expired',
          ends_at: new Date().toISOString()
        })
        .eq('shop_id', shopId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'Subscription marked as expired.' })
    }

    return NextResponse.json({ received: true, info: 'Unhandled event type' })
  } catch (err: any) {
    console.error('Webhook parsing error:', err)
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
