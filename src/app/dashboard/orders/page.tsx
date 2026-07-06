'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { getShopkeeperOrders, updateOrderStatus } from '@/app/actions/orders'
import { 
  ScrollText, Clock, MapPin, Truck, AlertTriangle, 
  CheckCircle2, XCircle, ArrowLeft, Loader, Check, Play, User
} from 'lucide-react'

export default function ShopkeeperOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadOrders() {
      setLoading(true)
      const data = await getShopkeeperOrders()
      setOrders(data)
      setLoading(false)
    }
    loadOrders()
  }, [])

  const handleUpdateStatus = async (orderId: string, status: 'accepted' | 'rejected' | 'dispatched' | 'completed') => {
    setUpdatingId(orderId)
    setError(null)
    const result = await updateOrderStatus(orderId, status)
    
    if (result.error) {
      setError(result.error)
      setUpdatingId(null)
    } else {
      // Refresh list
      const data = await getShopkeeperOrders()
      setOrders(data)
      setUpdatingId(null)
    }
  }

  // Rendering Helper: Status Pill
  const renderStatusPill = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2.5 py-0.5 rounded-lg text-[9px] bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20 uppercase tracking-wider animate-pulse">
            Pending Approval
          </span>
        )
      case 'accepted':
        return (
          <span className="px-2.5 py-0.5 rounded-lg text-[9px] bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 uppercase tracking-wider">
            Preparing Order
          </span>
        )
      case 'dispatched':
        return (
          <span className="px-2.5 py-0.5 rounded-lg text-[9px] bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20 uppercase tracking-wider">
            On The Way
          </span>
        )
      case 'completed':
        return (
          <span className="px-2.5 py-0.5 rounded-lg text-[9px] bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Completed
          </span>
        )
      case 'rejected':
        return (
          <span className="px-2.5 py-0.5 rounded-lg text-[9px] bg-rose-500/10 text-rose-400 font-bold border border-rose-500/20 uppercase tracking-wider">
            Rejected
          </span>
        )
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-lg text-[9px] bg-slate-800 text-slate-500 font-bold border border-slate-700 uppercase tracking-wider">
            Cancelled
          </span>
        )
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-28 relative overflow-hidden">
      {/* Decorative Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[300px] h-[300px] rounded-full bg-sky-500/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="px-4 py-4 z-10 flex items-center gap-3 border-b border-slate-900 bg-slate-950/60 backdrop-blur-md sticky top-0">
        <Link href="/dashboard" className="p-2 rounded-xl bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 active:scale-95 transition-all">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <span className="font-extrabold text-sm text-slate-300">Incoming Orders</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 z-10">
        {error && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs text-rose-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex flex-col justify-center items-center py-16 text-slate-500 text-xs">
            <Loader className="w-8 h-8 rounded-full border-2 border-sky-500/20 border-t-sky-400 animate-spin mb-3 text-sky-400" />
            Loading incoming orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col justify-center items-center py-16 text-center bg-slate-900/10 border border-dashed border-slate-900 rounded-3xl p-6">
            <ScrollText className="w-8 h-8 text-slate-800 mb-2 stroke-[1.5]" />
            <p className="text-xs font-bold text-slate-400">No Orders Received</p>
            <p className="text-[10px] text-slate-650 mt-1 max-w-[200px] leading-normal">
              You haven't received any orders yet. Once a customer places an order, it will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const formattedDate = new Date(order.created_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              })

              return (
                <div 
                  key={order.id} 
                  className="bg-slate-900/30 border border-slate-900 rounded-3xl p-4.5 space-y-4 relative overflow-hidden"
                >
                  {/* Status header */}
                  <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                    <div>
                      <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest">Order ID</span>
                      <span className="block text-[10px] font-bold text-slate-300 font-mono">#{order.id.slice(0, 8).toUpperCase()}</span>
                    </div>
                    {renderStatusPill(order.status)}
                  </div>

                  {/* Customer Info */}
                  <div className="space-y-1">
                    <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-500" /> Customer Details
                    </span>
                    <h4 className="text-sm font-black text-slate-200">{order.customer?.full_name || 'Buyer'}</h4>
                    <span className="block text-[10px] text-slate-400">Call: <a href={`tel:${order.customer?.phone}`} className="underline text-sky-400">{order.customer?.phone || 'No phone'}</a></span>
                    <span className="block text-[10px] text-slate-500">{formattedDate}</span>
                  </div>

                  {/* Items summary */}
                  <div className="space-y-2 bg-slate-950/40 border border-slate-900/60 p-2.5 rounded-2xl">
                    <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1">Items Requested</span>
                    {order.order_items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-[11px] text-slate-400">
                        <span className="truncate pr-4 flex-1">
                          {item.product?.name || 'Catalog Item'}
                          {item.variant_name && ` (${item.variant_name})`}
                        </span>
                        <span className="shrink-0 text-slate-500 font-bold">
                          {item.quantity} x <span className="text-slate-400">₹{item.price_per_item}</span>
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Total and actions row */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-900/60 flex-wrap gap-3">
                    <div>
                      <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest">Total Payout</span>
                      <span className="block text-sm font-black text-sky-400">₹{order.total_amount}</span>
                    </div>

                    {/* Order State Transition Actions */}
                    <div className="flex gap-2">
                      {order.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'rejected')}
                            disabled={updatingId === order.id}
                            className="px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 font-bold text-[10px] uppercase tracking-wider transition-all disabled:opacity-50"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(order.id, 'accepted')}
                            disabled={updatingId === order.id}
                            className="px-3.5 py-2 rounded-xl bg-sky-500 text-slate-950 font-black text-[10px] uppercase tracking-wider transition-all disabled:opacity-50"
                          >
                            Accept
                          </button>
                        </>
                      )}

                      {order.status === 'accepted' && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'dispatched')}
                          disabled={updatingId === order.id}
                          className="px-3.5 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1"
                        >
                          <Truck className="w-3.5 h-3.5 text-slate-950" /> Dispatch
                        </button>
                      )}

                      {order.status === 'dispatched' && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'completed')}
                          disabled={updatingId === order.id}
                          className="px-3.5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" /> Complete
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Delivery Location Text */}
                  <div className="flex items-start gap-2 bg-slate-950/20 border border-slate-900 p-2.5 rounded-2xl text-[10px] text-slate-400">
                    <MapPin className="w-4 h-4 text-slate-650 shrink-0 mt-0.5" />
                    <p className="leading-relaxed"><strong>Delivery to: </strong>{order.delivery_address}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
