'use client'

import React, { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, Loader2, Sparkles, CreditCard, ShieldAlert, BadgeInfo, LogOut } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { logout } from '@/app/auth/actions'

interface Subscription {
  plan: string
  status: string
  trial_ends_at: string
  current_period_end: string | null
}

export default function SubscribePage() {
  const router = useRouter()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [simulationMsg, setSimulationMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleLogout = async () => {
    await logout()
    router.push('/login')
    router.refresh()
  }

  const loadSubscription = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (!error) {
          setSubscription(data as Subscription)
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSubscription()
  }, [])

  // Simulate payment webhook call
  const handleSimulatePayment = async (plan: 'monthly' | 'yearly') => {
    if (!userId) return

    startTransition(async () => {
      setSimulationMsg(null)
      try {
        const response = await fetch('/api/webhooks/subscription', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            event: 'customer.subscription.updated',
            data: {
              user_id: userId,
              plan: plan,
              status: 'active',
              payment_provider_id: 'sub_sim_' + Math.random().toString(36).substr(2, 9)
            }
          })
        })

        const resData = await response.json()
        if (resData.success) {
          setSimulationMsg(`Success! Activated mock ${plan} plan. Refreshing...`)
          setTimeout(() => {
            router.push('/')
            router.refresh()
          }, 1500)
        } else {
          setSimulationMsg(`Error: ${resData.error || 'Failed to mock payment'}`)
        }
      } catch (err: any) {
        setSimulationMsg(`Connection error: ${err.message}`)
      }
    })
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mb-4" />
        <p className="text-sm text-slate-500">Checking billing info...</p>
      </main>
    )
  }

  // Calculate remaining trial days
  let trialDaysRemaining = 0
  let isTrialExpired = true
  if (subscription && subscription.status === 'trialing') {
    const ends = new Date(subscription.trial_ends_at).getTime()
    const now = Date.now()
    trialDaysRemaining = Math.max(0, Math.ceil((ends - now) / (1000 * 60 * 60 * 24)))
    isTrialExpired = trialDaysRemaining <= 0
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-6 pb-28 relative">
      <div className="absolute top-0 left-0 w-[50%] h-[30%] rounded-full bg-emerald-500/5 blur-[80px] pointer-events-none" />

      {/* Title */}
      <div className="text-center mt-6 mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 via-emerald-100 to-teal-300 bg-clip-text text-transparent">
          Gully Trader Premium
        </h1>
        <p className="text-sm text-slate-400 mt-2">
          Enforce discipline. Perfect your strategy execution.
        </p>
      </div>

      {/* Trial Banner */}
      {subscription && subscription.status === 'trialing' && (
        <div className={`rounded-3xl p-5 border mb-8 flex gap-3.5 items-start ${
          isTrialExpired 
            ? 'bg-rose-500/5 border-rose-500/20 text-rose-200' 
            : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-200'
        }`}>
          {isTrialExpired ? (
            <>
              <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-rose-400">Trial Period Ended</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Your 14-day free trial has expired. Subscribe below to restore access to your trade logs and strategies.
                </p>
              </div>
            </>
          ) : (
            <>
              <BadgeInfo className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-emerald-400">{trialDaysRemaining} Trial Days Left</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  You are currently on your free trial. Subscribe now to lock in premium access and avoid disruptions.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Pricing Cards */}
      <div className="space-y-6">
        {/* Monthly Card */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-200">Monthly Plan</h3>
            <p className="text-xs text-slate-500 mt-1">Flexible monthly billing</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-black text-slate-100">$9</span>
              <span className="text-xs text-slate-500">/ month</span>
            </div>

            <ul className="mt-6 space-y-3 border-t border-slate-800/40 pt-5 text-xs text-slate-400">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" /> Complete Strategies Management
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" /> Strict Pre-flight Entry Checklist
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" /> Analytical Discipline Dashboard
              </li>
            </ul>
          </div>

          <button
            onClick={() => handleSimulatePayment('monthly')}
            disabled={isPending}
            className="mt-6 flex w-full justify-center rounded-2xl bg-slate-900 border border-slate-800 py-3.5 text-xs font-bold text-slate-300 hover:bg-slate-800 active:scale-95 transition-all select-none"
          >
            Choose Monthly
          </button>
        </div>

        {/* Yearly Card */}
        <div className="bg-slate-900/60 border border-emerald-500/30 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between shadow-lg shadow-emerald-500/5">
          <div className="absolute top-0 right-0 bg-emerald-500/10 border-b border-l border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-bl-xl text-[9px] font-bold tracking-wider uppercase">
            Best Value
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-lg font-bold text-slate-200">Yearly Plan</h3>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 text-[9px] font-bold uppercase tracking-wider">
                Save 27%
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Billed annually</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-black text-slate-100">$79</span>
              <span className="text-xs text-slate-500">/ year</span>
            </div>

            <ul className="mt-6 space-y-3 border-t border-slate-800/40 pt-5 text-xs text-slate-400">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" /> All Monthly Plan features
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" /> Priority Support & Future Features
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" /> 100% Satisfaction Guarantee
              </li>
            </ul>
          </div>

          <button
            onClick={() => handleSimulatePayment('yearly')}
            disabled={isPending}
            className="mt-6 flex w-full justify-center rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3.5 text-xs font-bold text-slate-950 shadow-md hover:from-emerald-400 hover:to-teal-400 active:scale-95 transition-all select-none"
          >
            Choose Yearly
          </button>
        </div>
      </div>

      {/* DEV SANDBOX TESTING PANEL */}
      <div className="mt-10 border border-dashed border-slate-800 rounded-3xl p-5 bg-slate-900/10">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
          <CreditCard className="w-4 h-4 text-emerald-400" />
          Developer Sandbox Testing Panel
        </h3>
        <p className="text-[10px] text-slate-500 leading-normal mb-4">
          Real Stripe / Razorpay payments are stubbed. Use these triggers to dispatch mock webhook events to verify gateway activation flows locally.
        </p>

        {simulationMsg && (
          <div className="mb-4 rounded-xl bg-slate-950 border border-slate-800 p-3 text-[11px] text-emerald-400">
            {simulationMsg}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleSimulatePayment('monthly')}
            disabled={isPending}
            className="py-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-950 text-[10px] border border-slate-800 text-slate-400 active:scale-95 transition-all flex items-center justify-center gap-1"
          >
            {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            Simulate Monthly Webhook
          </button>
          <button
            onClick={() => handleSimulatePayment('yearly')}
            disabled={isPending}
            className="py-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-950 text-[10px] border border-slate-800 text-slate-400 active:scale-95 transition-all flex items-center justify-center gap-1"
          >
            {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            Simulate Yearly Webhook
          </button>
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <button
          onClick={handleLogout}
          className="text-xs font-extrabold text-rose-400 hover:text-rose-300 flex items-center gap-1.5 py-2 px-4 rounded-xl border border-rose-500/20 bg-rose-500/5 transition-all active:scale-95 select-none"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </main>
  )
}
