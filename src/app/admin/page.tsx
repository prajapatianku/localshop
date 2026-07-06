'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { getAdminAnalytics, verifyShop, getReportsList, updateReportStatus } from '@/app/actions/admin'
import { 
  ArrowLeft, Search, ShieldCheck, RefreshCw, Key, Award, 
  CheckCircle2, AlertOctagon, ShieldAlert, Check, X, Store, ShoppingBag, Loader
} from 'lucide-react'


export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Moderation tab state
  const [activeTab, setActiveTab] = useState<'analytics' | 'reports'>('analytics')
  
  // Verification action states
  const [targetShopId, setTargetShopId] = useState('')
  const [verifying, setVerifying] = useState(false)

  const loadData = async (isRef = false) => {
    try {
      if (isRef) setRefreshing(true)
      else setLoading(true)

      const [statsData, reportsData] = await Promise.all([
        getAdminAnalytics(),
        getReportsList()
      ])

      if (statsData.error) {
        setError(statsData.error)
      } else {
        setStats(statsData)
        setReports(reportsData)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load admin controls.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleVerifyShop = async (shopId: string, level: 'basic' | 'verified' | 'premium') => {
    if (!shopId) return
    setVerifying(true)
    const result = await verifyShop(shopId, level)
    setVerifying(false)
    if (result.error) {
      alert(result.error)
    } else {
      alert(`Shop verification updated to ${level}!`)
      setTargetShopId('')
      loadData(true)
    }
  }

  const handleUpdateReport = async (reportId: string, status: 'resolved' | 'dismissed') => {
    const result = await updateReportStatus(reportId, status)
    if (result.error) {
      alert(result.error)
    } else {
      alert(`Report marked as ${status}`)
      loadData(true)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-5 pb-28 relative overflow-hidden">
      {/* Decorative Gradients */}
      <div className="absolute top-0 left-0 w-[300px] h-[300px] rounded-full bg-sky-500/5 blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 z-10 sticky top-0 bg-slate-950/60 backdrop-blur-md py-2 border-b border-slate-900">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="p-2 rounded-xl bg-slate-900 border border-slate-850 text-slate-400 hover:text-slate-200 transition-all active:scale-95">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-base font-black text-slate-200 tracking-tight">Admin Console</h1>
        </div>
        <button
          onClick={() => loadData(true)}
          disabled={refreshing || loading}
          className="p-2 rounded-xl bg-slate-900 border border-slate-850 text-slate-400 hover:text-slate-200 active:scale-90 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs text-rose-400 mb-5">
          {error}
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex gap-2 p-1 bg-slate-900/30 border border-slate-900 rounded-2xl mb-5 z-10 relative">
        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 text-center py-2 rounded-xl text-[10px] font-extrabold uppercase transition-all select-none ${
            activeTab === 'analytics'
              ? 'bg-slate-900 text-sky-400 shadow'
              : 'text-slate-500 hover:text-slate-400'
          }`}
        >
          Operational Stats
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`flex-1 text-center py-2 rounded-xl text-[10px] font-extrabold uppercase transition-all select-none ${
            activeTab === 'reports'
              ? 'bg-slate-900 text-sky-400 shadow'
              : 'text-slate-500 hover:text-slate-400'
          }`}
        >
          Flagged Reports ({reports.length})
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Loader className="w-8 h-8 animate-spin text-sky-400 mb-4" />
          <p className="text-xs">Loading database console...</p>
        </div>
      ) : activeTab === 'analytics' ? (
        /* Tab 1: Operational Stats */
        <div className="space-y-6 z-10 relative">
          {stats && (
            <div className="grid grid-cols-2 gap-3.5">
              <div className="bg-slate-900/20 border border-slate-900 rounded-3xl p-4">
                <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Sub Revenue (Est)</span>
                <span className="block text-2xl font-black mt-1 text-sky-400">₹{stats.subscriptionRevenue}</span>
              </div>
              <div className="bg-slate-900/20 border border-slate-900 rounded-3xl p-4">
                <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Active Subs</span>
                <span className="block text-2xl font-black mt-1 text-slate-200">{stats.activeSubscriptions}</span>
              </div>
              <div className="bg-slate-900/20 border border-slate-900 rounded-3xl p-4">
                <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Active Shops</span>
                <span className="block text-2xl font-black mt-1 text-slate-200">{stats.activeShops}</span>
              </div>
              <div className="bg-slate-900/20 border border-slate-900 rounded-3xl p-4">
                <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Churn Rate</span>
                <span className="block text-2xl font-black mt-1 text-indigo-400">{stats.churnRate}%</span>
              </div>
            </div>
          )}

          {/* Shop Verification Form Trigger Panel */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-3xl p-5 space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-900 pb-2">
              Verify Neighborhood Shop
            </h3>
            
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Shop UUID Reference</label>
                <input
                  type="text"
                  placeholder="Paste Shop ID..."
                  value={targetShopId}
                  onChange={(e) => setTargetShopId(e.target.value)}
                  className="block w-full rounded-2xl border-0 bg-slate-950/60 px-4 py-3 text-slate-200 ring-1 ring-inset ring-slate-900 focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleVerifyShop(targetShopId, 'basic')}
                  disabled={verifying}
                  className="py-2.5 rounded-xl border border-slate-900 bg-slate-950/60 text-[9px] font-black uppercase text-slate-400 hover:text-slate-200"
                >
                  Basic
                </button>
                <button
                  type="button"
                  onClick={() => handleVerifyShop(targetShopId, 'verified')}
                  disabled={verifying}
                  className="py-2.5 rounded-xl bg-sky-500 text-slate-950 font-black text-[9px] uppercase hover:bg-sky-400"
                >
                  Verify
                </button>
                <button
                  type="button"
                  onClick={() => handleVerifyShop(targetShopId, 'premium')}
                  disabled={verifying}
                  className="py-2.5 rounded-xl bg-amber-500 text-slate-950 font-black text-[9px] uppercase hover:bg-amber-400"
                >
                  Premium
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Tab 2: Flagged Abuse Reports */
        <div className="space-y-4 z-10 relative">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Flags Log</h3>
            <span className="text-[10px] text-slate-500">{reports.length} pending moderation</span>
          </div>

          {reports.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-900 p-8 text-center bg-slate-900/10">
              <ShieldCheck className="w-8 h-8 text-slate-800 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No abuse reports flagged in database.</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {reports.map((rep) => (
                <div 
                  key={rep.id} 
                  className="bg-slate-900/30 border border-slate-900 rounded-3xl p-4 space-y-3.5 text-xs"
                >
                  <div className="flex justify-between items-start border-b border-slate-900 pb-2">
                    <div>
                      <span className="block text-[8px] font-bold text-rose-400 uppercase tracking-wider">Report ID</span>
                      <span className="block text-[10px] font-mono text-slate-400">#{rep.id.slice(0, 8).toUpperCase()}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                      rep.status === 'pending' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {rep.status}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-slate-400">
                      <strong>Reporter: </strong>{rep.reporter?.full_name || 'User'} ({rep.reporter?.email})
                    </p>
                    {rep.reported_shop_id && (
                      <p className="text-slate-400 flex items-center gap-1">
                        <Store className="w-3.5 h-3.5 text-slate-650" /> <strong>Shop: </strong> {rep.shop?.name}
                      </p>
                    )}
                    {rep.reported_product_id && (
                      <p className="text-slate-400 flex items-center gap-1">
                        <ShoppingBag className="w-3.5 h-3.5 text-slate-650" /> <strong>Product: </strong> {rep.product?.name}
                      </p>
                    )}
                    <p className="text-slate-400 leading-normal bg-slate-950/40 p-2.5 rounded-xl border border-slate-900/60 mt-2">
                      <strong>Reason: </strong> {rep.reason}
                    </p>
                  </div>

                  {/* Actions */}
                  {rep.status === 'pending' && (
                    <div className="flex gap-2 pt-2 border-t border-slate-900/60 justify-end">
                      <button
                        onClick={() => handleUpdateReport(rep.id, 'dismissed')}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-900 text-[10px] font-bold text-slate-400 uppercase tracking-wide active:scale-95"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => handleUpdateReport(rep.id, 'resolved')}
                        className="px-3.5 py-1.5 rounded-xl bg-sky-500 text-slate-950 font-black text-[10px] uppercase tracking-wide active:scale-95"
                      >
                        Resolve
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  )
}
