'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// 1. Address Actions
export async function getAddresses() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .order('is_default', { ascending: false })

  if (error) {
    console.error("Error fetching addresses:", error.message)
    return []
  }
  return data
}

export async function addAddress(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const addressLine = formData.get('addressLine') as string
  const latitude = parseFloat(formData.get('latitude') as string || '0')
  const longitude = parseFloat(formData.get('longitude') as string || '0')
  const isDefault = formData.get('isDefault') === 'true'

  if (!addressLine) return { error: 'Address text is required' }

  const { data, error } = await supabase
    .from('addresses')
    .insert({
      user_id: user.id,
      address_line: addressLine,
      latitude,
      longitude,
      is_default: isDefault
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/profile')
  return { success: true, address: data }
}

export async function deleteAddress(addressId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('addresses')
    .delete()
    .eq('id', addressId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/profile')
  return { success: true }
}

// 2. Reviews Actions
export async function addReview(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized. Please sign in.' }

  const shopId = formData.get('shopId') as string
  const rating = parseInt(formData.get('rating') as string || '5')
  const reviewText = formData.get('reviewText') as string

  if (!shopId || rating < 1 || rating > 5) {
    return { error: 'Invalid parameters' }
  }

  // Double check if customer completed an order (RLS also verifies this via security definer has_completed_order)
  const { data: hasCompleted } = await supabase.rpc('has_completed_order', {
    cust_id: user.id,
    sh_id: shopId
  })

  // Fallback direct check if RPC fails or is restricted
  const { data: orders } = await supabase
    .from('orders')
    .select('id')
    .eq('customer_id', user.id)
    .eq('shop_id', shopId)
    .eq('status', 'completed')
    .limit(1)

  if ((!orders || orders.length === 0) && !hasCompleted) {
    return { error: 'Review Restricted: You can only review shops from which you have completed an order.' }
  }

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      customer_id: user.id,
      shop_id: shopId,
      rating,
      review_text: reviewText
    })
    .select()
    .single()

  if (error) {
    if (error.message.includes("duplicate key")) {
      return { error: 'You have already reviewed this shop.' }
    }
    return { error: error.message }
  }

  revalidatePath(`/shop/${shopId}`)
  return { success: true, review: data }
}

export async function getShopReviews(shopId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      *,
      customer: customer_id (full_name)
    `)
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error("Error fetching reviews:", error.message)
    return []
  }
  return data
}

// 3. Wishlist (Favorites) Actions
export async function toggleFavorite(shopId?: string, productId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  if (!shopId && !productId) return { error: 'Invalid parameters' }

  // Check if exists
  const query = supabase.from('favorites').select('id').eq('user_id', user.id)
  if (shopId) query.eq('shop_id', shopId)
  if (productId) query.eq('product_id', productId)

  const { data: existing } = await query.maybeSingle()

  if (existing) {
    // Delete
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('id', existing.id)
    if (error) return { error: error.message }
    return { success: true, favorited: false }
  } else {
    // Insert
    const { error } = await supabase
      .from('favorites')
      .insert({
        user_id: user.id,
        shop_id: shopId || null,
        product_id: productId || null
      })
    if (error) return { error: error.message }
    return { success: true, favorited: true }
  }
}

export async function getFavorites() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { shops: [], products: [] }

  const { data: favoriteShops } = await supabase
    .from('favorites')
    .select(`
      *,
      shop: shop_id (*, product_images: shop_images (image_url))
    `)
    .eq('user_id', user.id)
    .not('shop_id', 'is', null)

  const { data: favoriteProducts } = await supabase
    .from('favorites')
    .select(`
      *,
      product: product_id (*, product_images (image_url))
    `)
    .eq('user_id', user.id)
    .not('product_id', 'is', null)

  return {
    shops: favoriteShops ? favoriteShops.map(f => f.shop) : [],
    products: favoriteProducts ? favoriteProducts.map(f => f.product) : []
  }
}

// 4. Abuse Reporting
export async function fileReport(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const shopId = formData.get('shopId') as string || null
  const productId = formData.get('productId') as string || null
  const reason = formData.get('reason') as string

  if (!reason) return { error: 'Reason for report is required' }
  if (!shopId && !productId) return { error: 'Please report a shop or a product.' }

  const { error } = await supabase
    .from('reports')
    .insert({
      reporter_id: user.id,
      reported_shop_id: shopId,
      reported_product_id: productId,
      reason,
      status: 'pending'
    })

  if (error) return { error: error.message }
  return { success: true }
}
