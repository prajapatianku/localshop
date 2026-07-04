'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, LogOut, Shield, Key, Sparkles, User, BadgeAlert } from 'lucide-react'
import { logout } from '@/app/auth/actions'
import { createClient } from '@/utils/supabase/client'

interface Profile {
  email: string
  role: string
}

interface Subscription {
  plan: string
  status: string
  trial_ends_at: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const [profRes, subRes] = await Promise.all([
            supabase.from('profiles').select('email, role').eq('id', user.id).single(),
            supabase.from('subscriptions').select('plan, status, trial_ends_at').eq('user_id', user.id).single()
          ])

          if (!profRes.error) setProfile(profRes.data)
          if (!subRes.error) setSubscription(subRes.data)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleLogout = async () => {
    await logout()
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mb-4" />
        <p className="text-sm text-slate-500">Retrieving account data...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-6 pb-28 relative flex flex-col justify-between">
      <div className="absolute top-0 right-0 w-[50%] h-[30%] rounded-full bg-emerald-500/5 blur-[80px] pointer-events-none" />

      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-8">My Account</h1>

        {/* Profile Card */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 mb-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-slate-950">
            <User className="w-6 h-6 stroke-[2.5px]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-200 truncate">{profile?.email.split('@')[0]}</h3>
            <span className="block text-xs text-slate-500 truncate">{profile?.email}</span>
          </div>
        </div>

        {/* Access Rights */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 mb-6 space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Access & Billing</h3>
          
          <div className="flex justify-between items-center bg-slate-950/40 border border-slate-900 p-4 rounded-2xl text-sm">
            <span className="text-slate-400">Subscription Status</span>
            <span className={`px-2 py-0.5 rounded-lg text-xs font-black uppercase tracking-wide ${
              subscription?.status === 'active' 
                ? 'bg-emerald-500/10 text-emerald-400' 
                : subscription?.status === 'trialing' 
                ? 'bg-teal-500/10 text-teal-400' 
                : 'bg-rose-500/10 text-rose-400'
            }`}>
              {subscription?.status}
            </span>
          </div>

          <div className="flex justify-between items-center bg-slate-950/40 border border-slate-900 p-4 rounded-2xl text-sm">
            <span className="text-slate-400">Plan Tier</span>
            <span className="font-bold text-slate-200 capitalize">{subscription?.plan}</span>
          </div>

          {/* Admin Gated Panel Access */}
          {profile?.role === 'admin' && (
            <Link
              href="/admin"
              className="flex justify-between items-center bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl text-sm text-indigo-300 font-bold transition-all active:scale-[0.98]"
            >
              <span className="flex items-center gap-2">
                <Key className="w-4 h-4" /> Admin Console
              </span>
              <Shield className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      {/* Logout Action */}
      <div className="space-y-4">
        {subscription?.status !== 'active' && subscription?.status !== 'trialing' && (
          <Link
            href="/subscribe"
            className="flex w-full justify-center items-center gap-1.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-4 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/15 hover:from-emerald-400 hover:to-teal-400 active:scale-95 transition-all select-none"
          >
            Upgrade to Premium
          </Link>
        )}

        <button
          onClick={handleLogout}
          className="flex w-full justify-center items-center gap-2 rounded-2xl bg-rose-500/10 border border-rose-500/20 px-4 py-4 text-sm font-bold text-rose-400 hover:bg-rose-500/20 active:scale-95 transition-all select-none"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </main>
  )
}
