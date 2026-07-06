'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getCategories() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error("Error fetching categories:", error.message)
    return []
  }
  return data
}

export async function getShopProducts(shopId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      product_images (image_url)
    `)
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error("Error fetching products:", error.message)
    return []
  }
  return data
}

export async function getProductDetails(productId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      shop: shop_id (*),
      product_images (*)
    `)
    .eq('id', productId)
    .single()

  if (error) {
    console.error("Error fetching product details:", error.message)
    return null
  }
  return data
}

export async function saveProduct(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Verify user owns the shop
  const { data: shop } = await supabase
    .from('shops')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!shop) return { error: 'You must create a shop first' }

  // Check subscription limit rules
  // If subscription has expired, you cannot add new products
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('shop_id', shop.id)
    .maybeSingle()

  const isExpired = subscription && subscription.status === 'expired'
  
  const id = formData.get('id') as string // null if new product

  if (!id && isExpired) {
    return { error: 'Cannot add new products: Your subscription has expired. Please renew.' }
  }

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const price = parseFloat(formData.get('price') as string || '0')
  const categoryId = formData.get('categoryId') as string || null
  const availabilityStatus = formData.get('availabilityStatus') as 'in_stock' | 'limited_stock' | 'out_of_stock' || 'in_stock'
  
  // Enforce Product variants logic: e.g. [{"name":"S","price_override":100}]
  const variantsJson = formData.get('variants') as string || '[]'
  let variants = []
  try {
    variants = JSON.parse(variantsJson)
  } catch {
    variants = []
  }

  // Enforce image limit logic: Min 1, Max 5
  const imageUrlsJson = formData.get('imageUrls') as string || '[]'
  let imageUrls: string[] = []
  try {
    imageUrls = JSON.parse(imageUrlsJson)
  } catch {
    imageUrls = []
  }

  if (imageUrls.length < 1) {
    return { error: 'At least 1 product image is required' }
  }
  if (imageUrls.length > 5) {
    return { error: 'A maximum of 5 product images is allowed' }
  }

  if (!name || price <= 0) {
    return { error: 'Name and a positive price are required' }
  }

  const productData = {
    shop_id: shop.id,
    category_id: categoryId,
    name,
    description,
    price,
    availability_status: availabilityStatus,
    variants
  }

  let product
  if (id) {
    const { data, error } = await supabase
      .from('products')
      .update(productData)
      .eq('id', id)
      .select()
      .single()

    if (error) return { error: error.message }
    product = data
  } else {
    const { data, error } = await supabase
      .from('products')
      .insert(productData)
      .select()
      .single()

    if (error) return { error: error.message }
    product = data
  }

  // Rebuild image associations
  // First drop old product images
  await supabase
    .from('product_images')
    .delete()
    .eq('product_id', product.id)

  // Then insert new ones
  const newImages = imageUrls.map(url => ({
    product_id: product.id,
    image_url: url
  }))

  const { error: imgError } = await supabase
    .from('product_images')
    .insert(newImages)

  if (imgError) {
    return { error: 'Product saved, but failed to save images: ' + imgError.message }
  }

  revalidatePath('/dashboard')
  return { success: true, product }
}

export async function deleteProduct(productId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Fetch product to verify shop ownership
  const { data: product } = await supabase
    .from('products')
    .select('shop_id')
    .eq('id', productId)
    .single()

  if (!product) return { error: 'Product not found' }

  const { data: shop } = await supabase
    .from('shops')
    .select('id')
    .eq('id', product.shop_id)
    .eq('owner_id', user.id)
    .single()

  if (!shop) return { error: 'Unauthorized operation' }

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}
