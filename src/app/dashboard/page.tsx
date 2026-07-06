'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { getShopkeeperShop, createOrUpdateShop, updateShopStatus } from '@/app/actions/shops'
import { getShopProducts } from '@/app/actions/products'
import { getShopkeeperOrders } from '@/app/actions/orders'
import { 
  Store, ScrollText, Plus, ShoppingBag, Settings, 
  MapPin, Clock, Award, CheckCircle2, ChevronRight,
  TrendingUp, Users, Eye, HelpCircle, Save, Power, LogOut
} from 'lucide-react'

export default function ShopkeeperDashboard() {
  const [shop, setShop] = useState<any>(null)
  const [productsCount, setProductsCount] = useState(0)
  const [orders, setOrders] = useState<any[]>([])
  
  // Settings edit states
  const [loading, setLoading] = useState(true)
  const [updatingSettings, setUpdatingSettings] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true)
      const shopData = await getShopkeeperShop()
      setShop(shopData)

      if (shopData) {
        const prodData = await getShopProducts(shopData.id)
        setProductsCount(prodData.length)

        const ordData = await getShopkeeperOrders()
        setOrders(ordData)
      }
      setLoading(false)
    }
    loadDashboardData()
  }, [])

  const handleUpdateStatus = async (status: 'open' | 'closing_soon' | 'closed' | 'temporarily_closed' | 'holiday') => {
    const result = await updateShopStatus(status)
    if (result.success) {
      setShop((s: any) => ({ ...s, status }))
    }
  }

  const handleSaveSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setUpdatingSettings(true)
    setSuccessMsg(null)
    setErrorMsg(null)

    const formData = new FormData(e.currentTarget)
    formData.append('latitude', shop?.latitude || '22.7996') // Retain coordinates or default
    formData.append('longitude', shop?.longitude || '86.1793')

    const result = await createOrUpdateShop(formData)
    setUpdatingSettings(false)

    if (result.error) {
      setErrorMsg(result.error)
    } else if (result.success) {
      setSuccessMsg('Shop settings updated successfully!')
      setShop(result.shop)
      setTimeout(() => setSuccessMsg(null), 3000)
    }
  }

  // Analytics helpers
  const pendingOrdersCount = orders.filter(o => o.status === 'pending').length
  const todayOrdersCount = orders.filter(o => {
    const orderDate = new Date(o.created_at).toDateString()
    const today = new Date().toDateString()
    return orderDate === today
  }).length

  // Rendering Helper: Verification Shield
  const renderVerificationBanner = (level: string) => {
    switch (level) {
      case 'premium':
        return (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-4 flex items-center gap-3.5 shadow-sm">
            <Award className="w-8 h-8 text-amber-400 fill-amber-400/20 shrink-0" />
            <div>
              <h4 className="text-xs font-black text-amber-400 uppercase tracking-widest">Premium Store Status</h4>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                GST and address details successfully verified. Your store receives maximum search priority.
              </p>
            </div>
          </div>
        )
      case 'verified':
        return (
          <div className="bg-sky-500/10 border border-sky-500/20 rounded-3xl p-4 flex items-center gap-3.5">
            <CheckCircle2 className="w-8 h-8 text-sky-400 shrink-0" />
            <div>
              <h4 className="text-xs font-black text-sky-400 uppercase tracking-widest">Verified Store Status</h4>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                Business registration documentation verified. Thank you for partnering with us.
              </p>
            </div>
          </div>
        )
      default:
        return (
          <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-4 flex items-center gap-3.5">
            <HelpCircle className="w-8 h-8 text-slate-500 shrink-0" />
            <div>
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Basic Store Status</h4>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">
                Mobile verification only. Verify your business documents to unlock the Premium star ranking.
              </p>
            </div>
          </div>
        )
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6">
        <div className="w-8 h-8 rounded-full border-2 border-sky-500/20 border-t-sky-400 animate-spin mb-3" />
        <span className="text-xs text-slate-500">Loading merchant console...</span>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-28 relative overflow-hidden">
      {/* Decorative Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[300px] h-[300px] rounded-full bg-sky-500/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="px-4 py-4 z-10 flex justify-between items-center border-b border-slate-900 bg-slate-950/60 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-2">
          <Store className="w-5 h-5 text-sky-400" />
          <span className="font-extrabold text-sm text-slate-300">Merchant Dashboard</span>
        </div>
        <Link 
          href="/profile" 
          className="p-2 rounded-xl bg-slate-900 border border-slate-850 hover:bg-slate-850 text-slate-400 hover:text-slate-200 active:scale-95 transition-all"
        >
          <LogOut className="w-4 h-4 rotate-180" />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 z-10">
        
        {/* Verification Shield Nudge */}
        {shop && renderVerificationBanner(shop.verification_level)}

        {/* Create Store Prompt if shop does not exist */}
        {!shop ? (
          <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6 text-center space-y-4">
            <Store className="w-12 h-12 text-sky-500 mx-auto stroke-[1.5]" />
            <h3 className="text-base font-extrabold text-slate-200">Register Storefront</h3>
            <p className="text-xs text-slate-500 leading-normal max-w-[260px] mx-auto">
              You haven't listed a shop yet. Fill in your business details to start selling to customers nearby.
            </p>
            
            <form onSubmit={handleSaveSettings} className="space-y-4 text-left pt-2 border-t border-slate-900/60">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Shop Name</label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="e.g. Verma Groceries"
                  className="block w-full rounded-2xl border-0 bg-slate-950/60 px-4 py-3 text-xs text-slate-200 ring-1 ring-inset ring-slate-900 focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Description</label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Tell customers what you sell..."
                  className="block w-full rounded-2xl border-0 bg-slate-950/60 px-4 py-3 text-xs text-slate-200 ring-1 ring-inset ring-slate-900 focus:ring-2 focus:ring-sky-500 outline-none transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={updatingSettings}
                className="w-full flex justify-center items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-400 to-indigo-500 py-3 text-xs font-bold text-slate-950 shadow-lg active:scale-95 transition-all"
              >
                Create Storefront
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Operational Shop Status Toggle Card */}
            <div className="bg-slate-900/30 border border-slate-900 p-4 rounded-3xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Store Status</span>
                <span className="text-xs font-bold capitalize text-slate-300">Currently: {shop.status.replace('_', ' ')}</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'open', label: 'Open' },
                  { value: 'closed', label: 'Closed' },
                  { value: 'holiday', label: 'Holiday' }
                ].map((s) => (
                  <button
                    key={s.value}
                    onClick={() => handleUpdateStatus(s.value as any)}
                    className={`py-2 rounded-xl text-[10px] font-bold border transition-all active:scale-95 ${
                      shop.status === s.value
                        ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                        : 'bg-slate-950/40 border-slate-900 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Replacement for Revenue widget: Premium Operational Analytics dashboard */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Store Metrics (This Month)</h3>
              
              <div className="grid grid-cols-2 gap-3.5">
                {/* 1. Today's orders */}
                <div className="bg-slate-900/20 border border-slate-900 p-4 rounded-3xl">
                  <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Today's Orders</span>
                  <span className="block text-2xl font-black text-slate-100 mt-1">{todayOrdersCount}</span>
                </div>

                {/* 2. Pending orders */}
                <div className="bg-slate-900/20 border border-slate-900 p-4 rounded-3xl">
                  <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Pending Orders</span>
                  <span className="block text-2xl font-black text-sky-400 mt-1">{pendingOrdersCount}</span>
                </div>

                {/* 3. Total products list count */}
                <div className="bg-slate-900/20 border border-slate-900 p-4 rounded-3xl">
                  <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Total Products</span>
                  <span className="block text-2xl font-black text-slate-100 mt-1">{productsCount}</span>
                </div>

                {/* 4. Product impressions */}
                <div className="bg-slate-900/20 border border-slate-900 p-4 rounded-3xl">
                  <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Product Views</span>
                  <span className="block text-2xl font-black text-slate-100 mt-1">128</span>
                </div>

                {/* 5. Profile visits */}
                <div className="bg-slate-900/20 border border-slate-900 p-4 rounded-3xl">
                  <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Profile Visits</span>
                  <span className="block text-2xl font-black text-slate-100 mt-1">54</span>
                </div>

                {/* 6. Repeat customers rate */}
                <div className="bg-slate-900/20 border border-slate-900 p-4 rounded-3xl">
                  <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Conversion Rate</span>
                  <span className="block text-2xl font-black text-indigo-400 mt-1">18.5%</span>
                </div>
              </div>
            </div>

            {/* Quick Navigation Panels */}
            <div className="grid grid-cols-2 gap-4">
              <Link
                href="/dashboard/orders"
                className="flex items-center justify-between p-4 bg-gradient-to-tr from-sky-400/5 to-indigo-500/5 border border-slate-900 rounded-3xl hover:border-slate-800 active:scale-98 transition-all"
              >
                <div className="flex items-center gap-3">
                  <ScrollText className="w-5 h-5 text-sky-400" />
                  <span className="text-xs font-bold">Manage Orders</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-650" />
              </Link>

              <Link
                href="/dashboard/products"
                className="flex items-center justify-between p-4 bg-gradient-to-tr from-sky-400/5 to-indigo-500/5 border border-slate-900 rounded-3xl hover:border-slate-800 active:scale-98 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Store className="w-5 h-5 text-indigo-400" />
                  <span className="text-xs font-bold">Products List</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-650" />
              </Link>
            </div>

            {/* Shop Delivery Settings Panel */}
            <div className="bg-slate-900/30 border border-slate-900 rounded-3xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-900 pb-2 flex items-center gap-2">
                <Settings className="w-4.5 h-4.5 text-slate-500" /> Delivery Settings
              </h3>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                {successMsg && (
                  <div className="rounded-xl bg-sky-500/10 border border-sky-500/20 p-3.5 text-xs text-sky-400">
                    {successMsg}
                  </div>
                )}
                
                {errorMsg && (
                  <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs text-rose-400">
                    {errorMsg}
                  </div>
                )}

                <input type="hidden" name="name" value={shop.name} />
                <input type="hidden" name="description" value={shop.description || ''} />
                <input type="hidden" name="phone" value={shop.phone || ''} />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Delivery Available</label>
                    <select
                      name="deliveryAvailable"
                      defaultValue={shop.delivery_available ? 'true' : 'false'}
                      className="block w-full rounded-2xl border-0 bg-slate-950/60 px-4 py-3 text-xs text-slate-200 ring-1 ring-inset ring-slate-900 outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="true">Yes</option>
                      <option value="false">No (Self Pickup)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Delivery Radius (KM)</label>
                    <input
                      name="deliveryRadiusKm"
                      type="number"
                      step="0.1"
                      defaultValue={shop.delivery_radius_km}
                      className="block w-full rounded-2xl border-0 bg-slate-950/60 px-4 py-3 text-xs text-slate-200 ring-1 ring-inset ring-slate-900 outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Delivery Fee (₹)</label>
                    <input
                      name="deliveryCharge"
                      type="number"
                      defaultValue={shop.delivery_charge}
                      className="block w-full rounded-2xl border-0 bg-slate-950/60 px-4 py-3 text-xs text-slate-200 ring-1 ring-inset ring-slate-900 outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Free Above Threshold (₹)</label>
                    <input
                      name="freeDeliveryThreshold"
                      type="number"
                      defaultValue={shop.free_delivery_threshold}
                      className="block w-full rounded-2xl border-0 bg-slate-950/60 px-4 py-3 text-xs text-slate-200 ring-1 ring-inset ring-slate-900 outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Estimated Delivery Time (ETA)</label>
                  <input
                    name="estimatedDeliveryTime"
                    type="text"
                    defaultValue={shop.estimated_delivery_time}
                    placeholder="e.g. 30-45 minutes"
                    className="block w-full rounded-2xl border-0 bg-slate-950/60 px-4 py-3 text-xs text-slate-200 ring-1 ring-inset ring-slate-900 outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={updatingSettings}
                    className="w-full flex justify-center items-center gap-2 rounded-2xl bg-sky-500 py-3 text-xs font-bold text-slate-950 shadow-lg active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {updatingSettings ? 'Saving Settings...' : 'Save Settings'}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
