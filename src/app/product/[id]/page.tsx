'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getProductDetails } from '@/app/actions/products'
import { 
  ShoppingBag, ShoppingCart, Star, Clock, 
  MapPin, ShieldCheck, ChevronRight, ArrowLeft,
  Info, Check, Plus, Minus, AlertTriangle
} from 'lucide-react'

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const productId = params.id as string

  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeImageIdx, setActiveImageIdx] = useState(0)
  
  // Selection states
  const [selectedVariant, setSelectedVariant] = useState<any>(null)
  const [quantity, setQuantity] = useState(1)
  const [cartError, setCartError] = useState<string | null>(null)
  const [cartSuccess, setCartSuccess] = useState(false)

  useEffect(() => {
    async function loadProduct() {
      setLoading(true)
      const data = await getProductDetails(productId)
      setProduct(data)
      if (data && data.variants && data.variants.length > 0) {
        setSelectedVariant(data.variants[0])
      }
      setLoading(false)
    }
    loadProduct()
  }, [productId])

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6">
        <div className="w-8 h-8 rounded-full border-2 border-sky-500/20 border-t-sky-400 animate-spin mb-3" />
        <span className="text-xs text-slate-500">Loading catalog item...</span>
      </main>
    )
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-4" />
        <h1 className="text-xl font-bold text-slate-200">Product Not Found</h1>
        <p className="text-xs text-slate-500 mt-1">This product is no longer listed in our database.</p>
        <Link href="/" className="mt-6 px-4 py-2.5 rounded-xl bg-sky-500 text-slate-950 text-xs font-bold">
          Go Back Home
        </Link>
      </main>
    )
  }

  const images = product.product_images && product.product_images.length > 0
    ? product.product_images.map((img: any) => img.image_url)
    : ['/placeholder.png']

  const isOutOfStock = product.availability_status === 'out_of_stock'
  const isLimited = product.availability_status === 'limited_stock'

  // Pricing calculations based on variant override if exists
  const currentPrice = selectedVariant && selectedVariant.price_override 
    ? parseFloat(selectedVariant.price_override)
    : product.price

  // Cart operations using LocalStorage
  const handleAddToCart = () => {
    setCartError(null)
    setCartSuccess(false)

    if (isOutOfStock) {
      setCartError('This item is currently out of stock.')
      return
    }

    try {
      const cartRaw = localStorage.getItem('localshop_cart')
      let cart = cartRaw ? JSON.parse(cartRaw) : []

      // Cart Rule: Customer can order products from only one shop per order.
      if (cart.length > 0) {
        const firstItemShopId = cart[0].shopId
        if (firstItemShopId !== product.shop_id) {
          // Show alert and option to clear
          const confirmClear = window.confirm(
            "Cart Rule: You can only order products from one shop per order. Would you like to clear your current cart and add this item?"
          )
          if (confirmClear) {
            cart = []
          } else {
            return
          }
        }
      }

      // Add or update quantity
      const existingItemIdx = cart.findIndex((item: any) => 
        item.productId === product.id && 
        item.variantName === (selectedVariant ? selectedVariant.name : null)
      )

      if (existingItemIdx > -1) {
        cart[existingItemIdx].quantity += quantity
      } else {
        cart.push({
          productId: product.id,
          shopId: product.shop_id,
          name: product.name,
          price: currentPrice,
          variantName: selectedVariant ? selectedVariant.name : null,
          quantity: quantity,
          image: images[0]
        })
      }

      localStorage.setItem('localshop_cart', JSON.stringify(cart))
      setCartSuccess(true)
      
      // Dispatch storage event to notify BottomNav / components
      window.dispatchEvent(new Event('storage'))

      setTimeout(() => {
        setCartSuccess(false)
      }, 3000)

    } catch (err) {
      console.error("Cart error:", err)
      setCartError('Failed to update cart.')
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-28 relative overflow-hidden">
      {/* Gradients */}
      <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] rounded-full bg-sky-500/5 blur-[120px] pointer-events-none" />

      {/* Top sticky header */}
      <div className="px-4 py-4 z-10 flex justify-between items-center border-b border-slate-900 bg-slate-950/60 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-3">
          <Link href={`/shop/${product.shop_id}`} className="p-2 rounded-xl bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 active:scale-95 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="font-extrabold text-sm text-slate-300">Product Details</span>
        </div>
        
        <Link href="/cart" className="p-2 rounded-xl bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 active:scale-95 transition-all relative">
          <ShoppingCart className="w-4.5 h-4.5" />
        </Link>
      </div>

      {/* Images Gallery Container (Carousel limit: 5 images max) */}
      <div className="w-full bg-slate-950 aspect-square relative border-b border-slate-900">
        <img 
          src={images[activeImageIdx]} 
          alt={product.name} 
          className="w-full h-full object-cover"
        />

        {/* Carousel Indicators */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
            {images.map((_: any, idx: number) => (
              <button

                key={idx}
                onClick={() => setActiveImageIdx(idx)}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  activeImageIdx === idx ? 'bg-sky-400 w-4' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        )}

        {/* Stock Status Overlays */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-[1px] flex items-center justify-center">
            <span className="text-xs font-black tracking-widest text-rose-400 uppercase border border-rose-500/20 px-3 py-1 rounded-xl bg-rose-950/40">
              Temporarily Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Product Content Details */}
      <div className="px-4 py-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start gap-4">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Sold by: {product.shop?.name || 'Local Store'}
              </span>
              <h1 className="text-xl font-black tracking-tight text-slate-100 mt-1">
                {product.name}
              </h1>
            </div>
            <div className="text-right shrink-0">
              <span className="block text-xl font-black text-sky-400">
                ₹{currentPrice}
              </span>
              {selectedVariant && (
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  per {selectedVariant.name}
                </span>
              )}
            </div>
          </div>

          {/* Stock Availability indicator description */}
          <div className="mt-4">
            {isLimited && !isOutOfStock && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                <Info className="w-3.5 h-3.5" /> Limited Stock Available
              </div>
            )}
            {!isOutOfStock && !isLimited && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                <Check className="w-3.5 h-3.5" /> In Stock
              </div>
            )}
          </div>

          {/* Description */}
          <div className="mt-5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</h4>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              {product.description || 'No description available for this product.'}
            </p>
          </div>

          {/* Product Variants (Grocery: 500g/1kg, Clothing: S/M/L, Electronics: Colors) */}
          {product.variants && product.variants.length > 0 && (
            <div className="mt-5">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Select Options</h4>
              <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
                {product.variants.map((v: any, idx: number) => {
                  const isSelected = selectedVariant?.name === v.name
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedVariant(v)}
                      className={`px-4 py-2.5 rounded-2xl text-xs font-bold border transition-all shrink-0 active:scale-95 ${
                        isSelected
                          ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                          : 'bg-slate-900 border-slate-850 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {v.name}
                      {v.price_override && ` (+₹${v.price_override - product.price})`}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Purchase Area */}
        <div className="mt-8 pt-5 border-t border-slate-900/60 space-y-4">
          {cartError && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs text-rose-400">
              {cartError}
            </div>
          )}

          {cartSuccess && (
            <div className="rounded-xl bg-sky-500/10 border border-sky-500/20 p-3.5 text-xs text-sky-400 flex items-center gap-2">
              <Check className="w-4 h-4" /> Added to cart successfully!
            </div>
          )}

          {!isOutOfStock && (
            <div className="flex items-center justify-between gap-4">
              {/* Quantity selector */}
              <div className="flex items-center bg-slate-900 border border-slate-850 rounded-2xl p-1 shrink-0">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-slate-800 active:scale-90 transition-all"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center text-xs font-black text-slate-200">{quantity}</span>
                <button
                  onClick={() => setQuantity(q => q + 1)}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-slate-800 active:scale-90 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Add to Cart button */}
              <button
                onClick={handleAddToCart}
                className="flex-1 flex justify-center items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-400 to-indigo-500 py-3.5 text-xs font-black text-slate-950 shadow-lg shadow-sky-500/10 hover:from-sky-300 hover:to-indigo-400 transition-all select-none active:scale-[0.98]"
              >
                <ShoppingCart className="w-4 h-4 stroke-[2.5]" /> Add To Cart
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
