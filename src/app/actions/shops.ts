'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getShopkeeperShop() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: shop, error } = await supabase
    .from('shops')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (error) {
    console.error("Error fetching shopkeeper's shop:", error.message)
    return null
  }

  return shop
}

export async function createOrUpdateShop(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const phone = formData.get('phone') as string
  const deliveryAvailable = formData.get('deliveryAvailable') === 'true'
  const deliveryRadiusKm = parseFloat(formData.get('deliveryRadiusKm') as string || '5')
  const deliveryCharge = parseFloat(formData.get('deliveryCharge') as string || '30')
  const freeDeliveryThreshold = parseFloat(formData.get('freeDeliveryThreshold') as string || '500')
  const estimatedDeliveryTime = formData.get('estimatedDeliveryTime') as string || '30-45 minutes'
  
  const latitude = parseFloat(formData.get('latitude') as string || '0')
  const longitude = parseFloat(formData.get('longitude') as string || '0')

  if (!name) return { error: 'Shop name is required' }

  // Check if shop already exists
  const existingShop = await getShopkeeperShop()

  const shopData = {
    owner_id: user.id,
    name,
    description,
    phone,
    delivery_available: deliveryAvailable,
    delivery_radius_km: deliveryRadiusKm,
    delivery_charge: deliveryCharge,
    free_delivery_threshold: freeDeliveryThreshold,
    estimated_delivery_time: estimatedDeliveryTime,
    latitude,
    longitude
  }

  let result
  if (existingShop) {
    result = await supabase
      .from('shops')
      .update(shopData)
      .eq('id', existingShop.id)
      .select()
  } else {
    result = await supabase
      .from('shops')
      .insert(shopData)
      .select()
  }

  if (result.error) {
    return { error: result.error.message }
  }

  revalidatePath('/dashboard')
  return { success: true, shop: result.data[0] }
}

export async function updateShopStatus(status: 'open' | 'closing_soon' | 'closed' | 'temporarily_closed' | 'holiday') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const shop = await getShopkeeperShop()
  if (!shop) return { error: 'Shop not found' }

  const { error } = await supabase
    .from('shops')
    .update({ status })
    .eq('id', shop.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

// Distance calculation using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

export async function searchShops(latitude: number, longitude: number, radiusKm: number, categorySlug?: string) {
  const supabase = await createClient()

  // Retrieve active shops (with subscription checking can be done here or in RLS, we check subscription status)
  // Let's grab shops and their subscriptions
  const { data: shops, error } = await supabase
    .from('shops')
    .select(`
      *,
      subscriptions (status, ends_at)
    `)

  if (error) {
    console.error("Error querying shops:", error.message)
    return []
  }

  // Filter shops by status, location radius, and subscription validity
  const filtered = shops.filter(shop => {
    // 1. Check subscription rules:
    // If shopkeeper subscription has expired, it is STILL visible in search, but cannot add products/receive orders (handled in orders).
    // So subscription state does not hide the shop from SEO/search as requested: "Expired Subscription: Shop still visible".
    
    // 2. Geolocation distance filter
    if (shop.latitude === null || shop.longitude === null) return false
    
    const distance = calculateDistance(latitude, longitude, parseFloat(shop.latitude), parseFloat(shop.longitude))
    
    // Check if the distance falls within user search radius
    // radiusKm is the user-selected search radius (1, 3, 5, 10 km)
    // If radiusKm is 0 (Entire city) we don't filter by distance
    if (radiusKm > 0 && distance > radiusKm) return false

    // Attach calculated distance
    shop.distance_km = distance
    return true
  })

  // Sort by nearest first
  return filtered.sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0))
}

export async function getShopDetails(shopId: string) {
  const supabase = await createClient()
  
  const { data: shop, error } = await supabase
    .from('shops')
    .select(`
      *,
      owner: owner_id (full_name, phone),
      subscriptions (status)
    `)
    .eq('id', shopId)
    .single()

  if (error) {
    console.error("Error fetching shop details:", error.message)
    return null
  }

  return shop
}
