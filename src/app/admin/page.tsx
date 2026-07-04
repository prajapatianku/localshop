'use client'

import React, { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { Loader2, ArrowLeft, Search, ShieldCheck, UserCheck, Calendar, Sparkles, RefreshCw, Key } from 'lucide-react'
import { getAdminStats, getAdminUsers, adminUpdateSubscription } from './actions'

interface AdminUser {
  id: string
  email: string
  role: string
  created_at: string
  plan: 'trial' | 'monthly' | 'yearly' | 'free'
  status: 'trialing' | 'active' | 'expired' | 'canceled'
  trial_ends_at: string
  current_period_end: string | null
}

interface Stats {
  totalUsers: number
  activeSubs: number
  trials: number
  conversionRate: number
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL') // ALL, trialing, active, expired

  // Actions transitions
  const [isPending, startTransition] = useTransition()
  const [activeUserActionsId, setActiveUserActionsId] = useState<string | null>(null)

  const loadData = async (isRef = false) => {
    try {
      if (isRef) setRefreshing(true)
      else setLoading(true)

      const [statsData, usersData] = await Promise.all([
        getAdminStats(),
        getAdminUsers()
      ])

      setStats(statsData)
      setUsers(usersData as AdminUser[])
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

  const handleUpdateSubscription = (
    userId: string, 
    plan: 'trial' | 'monthly' | 'yearly' | 'free', 
    status: 'trialing' | 'active' | 'expired' | 'canceled',
    days?: number
  ) => {
    startTransition(async () => {
      try {
        await adminUpdateSubscription({
          userId,
          plan,
          status,
          trialDaysToAdd: status === 'trialing' ? days : undefined,
          currentPeriodEndDaysToAdd: status === 'active' ? days : undefined
        })
        setActiveUserActionsId(null)
        await loadData(true)
      } catch (err: any) {
        alert(err.message || 'Action failed')
      }
    })
  }

  // Filter users list
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-6 pb-28 relative">
      <div className="absolute top-0 left-0 w-[50%] h-[30%] rounded-full bg-emerald-500/5 blur-[80px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-all active:scale-95">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
        </div>
        <button
          onClick={() => loadData(true)}
          disabled={refreshing || loading}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 active:scale-90 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-400 mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mb-4" />
          <p className="text-sm">Retrieving database statistics...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats Summary Cards */}
          {stats && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4">
                <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Total Users</span>
                <span className="block text-2xl font-black mt-1 text-slate-200">{stats.totalUsers}</span>
              </div>
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4">
                <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Active Paid Subs</span>
                <span className="block text-2xl font-black mt-1 text-emerald-400">{stats.activeSubs}</span>
              </div>
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4">
                <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Trial Users</span>
                <span className="block text-2xl font-black mt-1 text-teal-400">{stats.trials}</span>
              </div>
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4">
                <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Paid Conversion</span>
                <span className="block text-2xl font-black mt-1 text-indigo-400">{stats.conversionRate.toFixed(1)}%</span>
              </div>
            </div>
          )}

          {/* Search and Gating filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search users by email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full rounded-xl border-0 bg-slate-900 pl-10 pr-4 py-3 text-xs text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div className="flex gap-2 p-1 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
              {['ALL', 'trialing', 'active', 'expired'].map(status => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`flex-1 text-center py-2 rounded-xl text-[10px] font-extrabold uppercase transition-all select-none ${
                    statusFilter === status
                      ? 'bg-slate-800 text-slate-100'
                      : 'text-slate-500 hover:text-slate-400'
                  }`}
                >
                  {status === 'trialing' ? 'Trials' : status === 'ALL' ? 'All' : status}
                </button>
              ))}
            </div>
          </div>

          {/* User List Cards */}
          <div className="space-y-4">
            {filteredUsers.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-800 p-8 text-center bg-slate-900/10">
                <p className="text-xs text-slate-500">No users match your filters.</p>
              </div>
            ) : (
              filteredUsers.map((u) => {
                const isSelected = activeUserActionsId === u.id
                return (
                  <div
                    key={u.id}
                    className={`bg-slate-900/50 backdrop-blur-sm border rounded-2xl p-4 transition-all duration-300 ${
                      isSelected ? 'border-emerald-500/50 shadow-md' : 'border-slate-800/80'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <span className="block text-[10px] text-slate-500 font-semibold">
                          Signed up: {formatDate(u.created_at)}
                        </span>
                        <h4 className="text-xs font-bold text-slate-200 mt-0.5 truncate max-w-[180px]">
                          {u.email}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wide ${
                          u.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : u.status === 'trialing'
                            ? 'bg-teal-500/10 text-teal-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {u.status}
                        </span>
                        
                        {u.role === 'admin' && (
                          <span className="p-1 rounded bg-indigo-500/10 text-indigo-400">
                            <Key className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-850 flex justify-between items-center text-[10px] text-slate-500">
                      <div>
                        <span>Plan: </span>
                        <span className="font-semibold text-slate-300 capitalize">{u.plan}</span>
                      </div>
                      <div>
                        {u.status === 'trialing' ? (
                          <span>Ends: {formatDate(u.trial_ends_at)}</span>
                        ) : u.current_period_end ? (
                          <span>Period: {formatDate(u.current_period_end)}</span>
                        ) : null}
                      </div>
                    </div>

                    {/* Expandable Controls Panel */}
                    <div className="mt-3">
                      {isSelected ? (
                        <div className="mt-3 pt-3 border-t border-slate-800/40 space-y-3">
                          <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                            Modify User Subscription
                          </span>
                          
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              onClick={() => handleUpdateSubscription(u.id, 'monthly', 'active', 30)}
                              disabled={isPending}
                              className="py-2 px-1 text-[9px] font-extrabold uppercase rounded-xl bg-emerald-500 text-slate-950 text-center hover:bg-emerald-400 transition-all"
                            >
                              Grant +30d
                            </button>
                            <button
                              onClick={() => handleUpdateSubscription(u.id, 'trial', 'trialing', 14)}
                              disabled={isPending}
                              className="py-2 px-1 text-[9px] font-extrabold uppercase rounded-xl bg-teal-500 text-slate-950 text-center hover:bg-teal-400 transition-all"
                            >
                              Reset Trial
                            </button>
                            <button
                              onClick={() => handleUpdateSubscription(u.id, 'trial', 'expired')}
                              disabled={isPending}
                              className="py-2 px-1 text-[9px] font-extrabold uppercase rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-center hover:bg-rose-500/20 transition-all"
                            >
                              Revoke
                            </button>
                          </div>

                          <button
                            onClick={() => setActiveUserActionsId(null)}
                            className="w-full text-center text-[10px] text-slate-500 py-1"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setActiveUserActionsId(u.id)}
                          className="w-full text-center py-1.5 text-[9px] font-extrabold uppercase tracking-wider text-slate-400 hover:text-slate-200 border border-slate-800 rounded-xl bg-slate-950/20 hover:bg-slate-900 transition-all"
                        >
                          Modify Subscription Access
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </main>
  )
}
