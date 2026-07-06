'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getCustomerOrders() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      shop: shop_id (name, phone),
      order_items (
        *,
        product: product_id (name)
      )
    `)
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error("Error fetching customer orders:", error.message)
    return []
  }
  return data
}

export async function getShopkeeperOrders() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: shop } = await supabase
    .from('shops')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!shop) return []

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customer: customer_id (full_name, phone),
      order_items (
        *,
        product: product_id (name)
      )
    `)
    .eq('shop_id', shop.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error("Error fetching shopkeeper orders:", error.message)
    return []
  }
  return data
}

export async function placeOrder(cartItems: any[], deliveryAddress: string) {
  if (cartItems.length === 0) return { error: 'Cart is empty' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized. Please sign in.' }

  // Enforce Cart Rule: Customer can order products from only one shop per order.
  const shopId = cartItems[0].shopId
  const allFromSameShop = cartItems.every(item => item.shopId === shopId)
  if (!allFromSameShop) {
    return { error: 'Cart Rule Violation: You can only order from one shop per order.' }
  }

  // Fetch shop to get delivery charge & subscription validation
  const { data: shop } = await supabase
    .from('shops')
    .select(`
      *,
      subscriptions (status)
    `)
    .eq('id', shopId)
    .single()

  if (!shop) return { error: 'Shop not found' }

  // Enforce Subscription Rule: Expired Subscription cannot receive new orders
  const subscription = shop.subscriptions?.[0]
  if (subscription && subscription.status === 'expired') {
    return { error: 'This shop is temporarily unable to accept orders. Please try another shop.' }
  }

  // Calculate totals
  let subtotal = 0
  for (const item of cartItems) {
    subtotal += item.price * item.quantity
  }

  // Delivery charge calculations
  const charge = subtotal >= shop.free_delivery_threshold ? 0 : shop.delivery_charge
  const total = subtotal + charge

  // Create order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_id: user.id,
      shop_id: shopId,
      status: 'pending',
      delivery_address: deliveryAddress,
      delivery_charge: charge,
      total_amount: total
    })
    .select()
    .single()

  if (orderError) return { error: orderError.message }

  // Insert order items
  const newOrderItems = cartItems.map(item => ({
    order_id: order.id,
    product_id: item.productId,
    variant_name: item.variantName || null,
    quantity: item.quantity,
    price_per_item: item.price
  }))

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(newOrderItems)

  if (itemsError) {
    // Delete parent order if item insertion fails
    await supabase.from('orders').delete().eq('id', order.id)
    return { error: 'Failed to record items: ' + itemsError.message }
  }

  return { success: true, orderId: order.id }
}

export async function updateOrderStatus(orderId: string, status: 'accepted' | 'rejected' | 'dispatched' | 'completed' | 'cancelled') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Fetch the order
  const { data: order } = await supabase
    .from('orders')
    .select('*, shop: shop_id(owner_id)')
    .eq('id', orderId)
    .single()

  if (!order) return { error: 'Order not found' }

  const isCustomer = order.customer_id === user.id
  const isShopOwner = order.shop.owner_id === user.id

  if (!isCustomer && !isShopOwner) {
    return { error: 'Unauthorized access' }
  }

  // Enforce Cancellation Rules
  if (status === 'cancelled') {
    if (isCustomer) {
      // Customer: Can cancel before acceptance (i.e. only when status is 'pending')
      if (order.status !== 'pending') {
        return { error: 'Cancellation disabled: Shop has already accepted/dispatched your order.' }
      }
    } else if (isShopOwner) {
      // Shopkeeper cancellation is rejection
      return { error: 'Use reject status instead' }
    }
  }

  if (status === 'rejected') {
    // Shop: Can reject anytime before dispatch
    if (!isShopOwner) return { error: 'Unauthorized' }
    if (order.status === 'dispatched' || order.status === 'completed') {
      return { error: 'Cannot reject order: Already dispatched/completed.' }
    }
  }

  if (status === 'dispatched') {
    if (!isShopOwner) return { error: 'Unauthorized' }
    if (order.status !== 'accepted' && order.status !== 'pending') {
      return { error: 'Can only dispatch pending or accepted orders.' }
    }
  }

  const { error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId)

  if (error) return { error: error.message }

  revalidatePath('/orders')
  revalidatePath('/dashboard')
  return { success: true }
}
