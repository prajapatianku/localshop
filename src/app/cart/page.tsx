'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { placeOrder } from '@/app/actions/orders'
import { getShopDetails } from '@/app/actions/shops'
import { 
  ShoppingCart, Trash2, MapPin, Truck, ChevronRight,
  ArrowLeft, CheckCircle2, ShieldAlert, ShoppingBag, Plus, Minus
} from 'lucide-react'

export default function CartPage() {
  const router = useRouter()
  const [cart, setCart] = useState<any[]>([])
  const [shop, setShop] = useState<any>(null)
  
  // Checkout states
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load cart from LocalStorage on mount
  useEffect(() => {
    const cartRaw = localStorage.getItem('localshop_cart')
    if (cartRaw) {
      const parsed = JSON.parse(cartRaw)
      setCart(parsed)
    }
  }, [])

  // Load shop details once cart is populated
  useEffect(() => {
    async function loadShopDetails() {
      if (cart.length > 0) {
        const shopId = cart[0].shopId
        const data = await getShopDetails(shopId)
        setShop(data)
      } else {
        setShop(null)
      }
    }
    loadShopDetails()
  }, [cart])

  // Update item quantity in state & storage
  const updateQuantity = (productId: string, variantName: string | null, delta: number) => {
    const updated = cart.map(item => {
      if (item.productId === productId && item.variantName === variantName) {
        const newQty = Math.max(1, item.quantity + delta)
        return { ...item, quantity: newQty }
      }
      return item
    })
    setCart(updated)
    localStorage.setItem('localshop_cart', JSON.stringify(updated))
  }

  // Delete item from cart
  const deleteItem = (productId: string, variantName: string | null) => {
    const filtered = cart.filter(item => 
      !(item.productId === productId && item.variantName === variantName)
    )
    setCart(filtered)
    localStorage.setItem('localshop_cart', JSON.stringify(filtered))
    window.dispatchEvent(new Event('storage'))
  }

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)
  
  const deliveryCharge = shop && subtotal >= shop.free_delivery_threshold
    ? 0
    : (shop?.delivery_charge || 0)
    
  const total = subtotal + deliveryCharge

  // Progress threshold helper for Free Delivery
  const progressToFreeDelivery = shop && shop.free_delivery_threshold > 0
    ? Math.min(100, (subtotal / shop.free_delivery_threshold) * 100)
    : 0

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (cart.length === 0) return
    if (!address.trim()) {
      setError('Please provide a delivery address.')
      return
    }

    setLoading(true)
    const result = await placeOrder(cart, address)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else if (result.success) {
      // Clear cart
      localStorage.removeItem('localshop_cart')
      window.dispatchEvent(new Event('storage'))
      router.push('/orders')
      router.refresh()
    }
  }

  if (cart.length === 0) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6 text-center">
        <ShoppingCart className="w-12 h-12 text-slate-800 mb-4 stroke-[1.5]" />
        <h1 className="text-xl font-bold text-slate-200">Your Cart is Empty</h1>
        <p className="text-xs text-slate-500 mt-1 max-w-[240px] leading-normal">
          Browse neighborhood shops and add items to your cart to start shopping.
        </p>
        <Link href="/" className="mt-6 px-4 py-2.5 rounded-xl bg-sky-500 text-slate-950 text-xs font-bold active:scale-95 transition-all">
          Go Shopping
        </Link>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-28 relative overflow-hidden">
      {/* Decorative Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[300px] h-[300px] rounded-full bg-sky-500/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="px-4 py-4 z-10 flex items-center gap-3 border-b border-slate-900 bg-slate-950/60 backdrop-blur-md sticky top-0">
        <Link href="/" className="p-2 rounded-xl bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 active:scale-95 transition-all">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <span className="font-extrabold text-sm text-slate-300">My Cart</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 z-10">
        {/* Merchant Info Banner */}
        {shop && (
          <div className="bg-slate-900/30 border border-slate-900 p-4 rounded-3xl">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Ordering from</span>
            <h2 className="text-base font-extrabold text-slate-200 mt-1">{shop.name}</h2>
            <p className="text-[10px] text-slate-500 mt-0.5">{shop.description || 'Neighborhood merchant'}</p>
          </div>
        )}

        {/* Free Delivery Goal Tracker */}
        {shop && shop.free_delivery_threshold > 0 && (
          <div className="bg-slate-900/10 border border-slate-900/80 p-4 rounded-3xl">
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wide">
              <span>Free Delivery Target</span>
              <span>
                {subtotal >= shop.free_delivery_threshold 
                  ? 'FREE DELIVERY SECURED!' 
                  : `Add ₹${shop.free_delivery_threshold - subtotal} more for free delivery`}
              </span>
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-900">
              <div 
                className="bg-gradient-to-r from-sky-400 to-indigo-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressToFreeDelivery}%` }}
              />
            </div>
          </div>
        )}

        {/* Cart items list */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cart Items</h3>
          
          {cart.map((item, idx) => (
            <div 
              key={idx} 
              className="flex gap-3 bg-slate-900/20 border border-slate-900 p-3.5 rounded-3xl items-center justify-between"
            >
              {/* Product preview */}
              <div className="flex items-center gap-3 overflow-hidden">
                <img 
                  src={item.image} 
                  alt={item.name} 
                  className="w-11 h-11 object-cover rounded-xl bg-slate-950 shrink-0 border border-slate-900"
                />
                <div className="overflow-hidden">
                  <h4 className="text-xs font-bold text-slate-200 truncate">{item.name}</h4>
                  {item.variantName && (
                    <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide">Option: {item.variantName}</span>
                  )}
                  <span className="block text-[11px] font-black text-sky-400 mt-1">₹{item.price}</span>
                </div>
              </div>

              {/* Adjusters */}
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-slate-950 border border-slate-900 rounded-xl p-0.5">
                  <button
                    onClick={() => updateQuantity(item.productId, item.variantName, -1)}
                    className="p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-900 rounded active:scale-90 transition-all"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-5 text-center text-[10px] font-bold text-slate-300">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.productId, item.variantName, 1)}
                    className="p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-900 rounded active:scale-90 transition-all"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Delete */}
                <button
                  onClick={() => deleteItem(item.productId, item.variantName)}
                  className="p-2 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 rounded-xl active:scale-95 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Checkout Form */}
        <form onSubmit={handleCheckout} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Delivery Address</label>
            <div className="relative">
              <div className="absolute top-3.5 left-3.5 text-slate-500">
                <MapPin className="w-4 h-4" />
              </div>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                rows={2}
                placeholder="Enter complete building name, block, flat, street address..."
                className="block w-full rounded-2xl border-0 bg-slate-900/40 pl-10 pr-4 py-3.5 text-xs text-slate-200 ring-1 ring-inset ring-slate-900 placeholder:text-slate-650 focus:ring-2 focus:ring-sky-500 outline-none transition-all duration-200 resize-none"
              />
            </div>
          </div>

          {/* Pricing Details */}
          <div className="bg-slate-900/10 border border-slate-900/80 p-4 rounded-3xl space-y-2 text-xs font-medium text-slate-400">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-900 pb-2 mb-2">Price Details</h4>
            
            <div className="flex justify-between items-center">
              <span>Items Subtotal</span>
              <span className="text-slate-200">₹{subtotal}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span>Local Delivery Fee</span>
              <span className="text-slate-200">{deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge}`}</span>
            </div>

            <div className="flex justify-between items-center text-sm font-black border-t border-slate-900/60 pt-3 text-slate-100 mt-2">
              <span className="flex items-center gap-1"><Truck className="w-4 h-4 text-sky-400" /> Grand Total</span>
              <span className="text-sky-400">₹{total}</span>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs text-rose-400">
              {error}
            </div>
          )}

          {/* Place Order button */}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full justify-center items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-400 to-indigo-500 py-4 text-sm font-black text-slate-950 shadow-lg shadow-sky-500/10 hover:from-sky-300 hover:to-indigo-400 transition-all select-none active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing Order...' : `Place Order (₹${total})`}
            {!loading && <ChevronRight className="w-4.5 h-4.5 stroke-[2.5]" />}
          </button>
        </form>
      </div>
    </main>
  )
}
