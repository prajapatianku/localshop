'use client'

import React, { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Check, Loader2, Play, ShieldCheck, AlertCircle } from 'lucide-react'
import { getActiveStrategyWithRules, placeTrade } from '../actions'

interface Rule {
  id: string
  rule_text: string
  sort_order: number
}

interface Strategy {
  id: string
  name: string
}

export default function ChecklistAndPlacePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [strategy, setStrategy] = useState<Strategy | null>(null)
  const [rules, setRules] = useState<Rule[]>([])
  
  // Checklist checked state
  const [checkedRules, setCheckedRules] = useState<Record<string, boolean>>({})
  const [allRulesChecked, setAllRulesChecked] = useState(false)
  const [hasAnyStrategy, setHasAnyStrategy] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Form states
  const [symbol, setSymbol] = useState('')
  const [direction, setDirection] = useState<'BUY' | 'SELL'>('BUY')
  const [entryPrice, setEntryPrice] = useState('')
  const [sl, setSl] = useState('')
  const [tp, setTp] = useState('')
  const [quantity, setQuantity] = useState('')
  const [entryDatetime, setEntryDatetime] = useState('')
  
  const [isPending, startTransition] = useTransition()

  // Setup current local time as default datetime-local format
  useEffect(() => {
    const now = new Date()
    const offset = now.getTimezoneOffset() * 60000
    const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, 16)
    setEntryDatetime(localISOTime)
  }, [])

  // Load strategy and rules
  useEffect(() => {
    async function load() {
      const res = await getActiveStrategyWithRules()
      if (res.error) {
        if (res.error === 'no_active_strategy') {
          setHasAnyStrategy(res.hasAnyStrategy ?? false)
          // If no strategies exist, redirect straight to create
          if (!res.hasAnyStrategy) {
            router.push('/strategies/create')
          }
        } else {
          setErrorMessage(res.error)
        }
        setLoading(false)
        return
      }

      if (res.strategy && res.rules) {
        setStrategy(res.strategy)
        setRules(res.rules)
        // Initialize checked state
        const initialChecked: Record<string, boolean> = {}
        res.rules.forEach(r => {
          initialChecked[r.id] = false
        })
        setCheckedRules(initialChecked)
      }
      setLoading(false)
    }
    load()
  }, [router])

  // Check if all rules are checked
  useEffect(() => {
    if (rules.length === 0) {
      setAllRulesChecked(false)
      return
    }
    const allChecked = rules.every(r => checkedRules[r.id] === true)
    setAllRulesChecked(allChecked)
  }, [checkedRules, rules])

  const handleToggleRule = (ruleId: string) => {
    setCheckedRules(prev => ({
      ...prev,
      [ruleId]: !prev[ruleId]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!strategy) return

    if (!symbol || !entryPrice || !sl || !tp || !entryDatetime) {
      setErrorMessage('Please fill in all required fields.')
      return
    }

    const numEntry = Number(entryPrice)
    const numSl = Number(sl)
    const numTp = Number(tp)

    if (isNaN(numEntry) || isNaN(numSl) || isNaN(numTp)) {
      setErrorMessage('Prices must be valid numbers.')
      return
    }

    // Safety checks on SL/TP rules
    if (direction === 'BUY') {
      if (numSl >= numEntry) {
        setErrorMessage('For a BUY trade, Stop Loss must be less than Entry Price.')
        return
      }
      if (numTp <= numEntry) {
        setErrorMessage('For a BUY trade, Take Profit must be greater than Entry Price.')
        return
      }
    } else {
      if (numSl <= numEntry) {
        setErrorMessage('For a SELL trade, Stop Loss must be greater than Entry Price.')
        return
      }
      if (numTp >= numEntry) {
        setErrorMessage('For a SELL trade, Take Profit must be less than Entry Price.')
        return
      }
    }

    startTransition(async () => {
      const checklistArray = rules.map(r => ({
        ruleId: r.id,
        checked: checkedRules[r.id] || false
      }))

      const result = await placeTrade({
        strategyId: strategy.id,
        symbol,
        direction,
        entryPrice: numEntry,
        sl: numSl,
        tp: numTp,
        quantity: quantity ? Number(quantity) : null,
        entryDatetime: new Date(entryDatetime).toISOString(),
        checklist: checklistArray
      })

      if (result?.error) {
        setErrorMessage(result.error)
      } else if (result?.success) {
        router.push('/')
        router.refresh()
      }
    })
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mb-4" />
        <p className="text-sm text-slate-500">Checking strategies...</p>
      </main>
    )
  }

  if (!strategy) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-6 pb-28 flex flex-col justify-center items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-6">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-200">No Active Strategy Selected</h2>
        <p className="text-sm text-slate-400 mt-2 max-w-xs">
          {hasAnyStrategy 
            ? 'You have strategies, but none are set as active. Set an active strategy first.' 
            : 'Create your first strategy to start tracking your trades.'}
        </p>
        <Link
          href="/strategies"
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3.5 text-sm font-bold text-slate-950 hover:from-emerald-400 hover:to-teal-400 shadow-lg active:scale-95 transition-all select-none"
        >
          {hasAnyStrategy ? 'Manage Strategies' : 'Create Strategy'}
        </Link>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-6 pb-28 relative">
      <div className="absolute top-0 right-0 w-[50%] h-[30%] rounded-full bg-emerald-500/5 blur-[80px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-all active:scale-95">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold leading-tight">Prepare Trade</h1>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-0.5 text-emerald-400">
            Strategy: {strategy.name}
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-400 mb-6 flex gap-2 items-start">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* STEP 1: Discipline Checklist */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
            Pre-Flight Checklist
          </h2>
        </div>

        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          Verify and check every rule of your strategy. ALL boxes must be checked before the trade entry form will be unlocked.
        </p>

        <div className="space-y-3">
          {rules.map((rule, index) => {
            const isChecked = checkedRules[rule.id]
            return (
              <button
                key={rule.id}
                type="button"
                onClick={() => handleToggleRule(rule.id)}
                className={`w-full flex items-start gap-4 p-4 rounded-2xl border text-left transition-all duration-200 select-none ${
                  isChecked
                    ? 'bg-emerald-500/5 border-emerald-500/30 text-slate-200'
                    : 'bg-slate-900/60 border-slate-800/80 text-slate-400'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                    isChecked
                      ? 'bg-emerald-500 border-emerald-500 text-slate-950 scale-105'
                      : 'border-slate-700 bg-slate-950'
                  }`}
                >
                  {isChecked && <Check className="w-4.5 h-4.5 stroke-[3]" />}
                </div>
                <div className="text-sm leading-snug">
                  <span className="font-bold text-slate-500 mr-1">{index + 1}.</span>
                  {rule.rule_text}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* STEP 2: Place Trade Form (Unlocked conditionally) */}
      <div className={`mt-6 transition-all duration-500 origin-top ${
        allRulesChecked 
          ? 'opacity-100 scale-100 pointer-events-auto h-auto' 
          : 'opacity-30 scale-95 pointer-events-none select-none blur-[1px]'
      }`}>
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              Trade Details
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Symbol & Direction */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Symbol
                </label>
                <input
                  type="text"
                  required={allRulesChecked}
                  disabled={!allRulesChecked}
                  placeholder="e.g. BTCUSD, NIFTY"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="block w-full rounded-2xl border-0 bg-slate-900 px-4 py-3.5 text-slate-100 placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500 sm:text-sm outline-none uppercase font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Direction
                </label>
                <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-2xl border border-slate-800/80">
                  <button
                    type="button"
                    disabled={!allRulesChecked}
                    onClick={() => setDirection('BUY')}
                    className={`py-2 rounded-xl text-xs font-extrabold transition-all duration-200 select-none ${
                      direction === 'BUY'
                        ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/10'
                        : 'text-slate-400'
                    }`}
                  >
                    BUY
                  </button>
                  <button
                    type="button"
                    disabled={!allRulesChecked}
                    onClick={() => setDirection('SELL')}
                    className={`py-2 rounded-xl text-xs font-extrabold transition-all duration-200 select-none ${
                      direction === 'SELL'
                        ? 'bg-rose-500 text-slate-950 font-bold shadow-md shadow-rose-500/10'
                        : 'text-slate-400'
                    }`}
                  >
                    SELL
                  </button>
                </div>
              </div>
            </div>

            {/* Price Inputs Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Entry Price
                </label>
                <input
                  type="number"
                  step="any"
                  required={allRulesChecked}
                  disabled={!allRulesChecked}
                  placeholder="0.00"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  className="block w-full rounded-2xl border-0 bg-slate-900 px-4 py-3.5 text-slate-100 placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500 sm:text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Quantity (Optional)
                </label>
                <input
                  type="number"
                  step="any"
                  disabled={!allRulesChecked}
                  placeholder="1.0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="block w-full rounded-2xl border-0 bg-slate-900 px-4 py-3.5 text-slate-100 placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500 sm:text-sm outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 text-rose-400">
                  Stop Loss (SL)
                </label>
                <input
                  type="number"
                  step="any"
                  required={allRulesChecked}
                  disabled={!allRulesChecked}
                  placeholder="SL Level"
                  value={sl}
                  onChange={(e) => setSl(e.target.value)}
                  className="block w-full rounded-2xl border-0 bg-slate-900 px-4 py-3.5 text-slate-100 placeholder:text-slate-600 focus:ring-2 focus:ring-rose-500 sm:text-sm outline-none text-rose-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 text-emerald-400">
                  Take Profit (TP)
                </label>
                <input
                  type="number"
                  step="any"
                  required={allRulesChecked}
                  disabled={!allRulesChecked}
                  placeholder="TP Level"
                  value={tp}
                  onChange={(e) => setTp(e.target.value)}
                  className="block w-full rounded-2xl border-0 bg-slate-900 px-4 py-3.5 text-slate-100 placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500 sm:text-sm outline-none text-emerald-200"
                />
              </div>
            </div>

            {/* Entry Date & Time */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Entry Date & Time
              </label>
              <input
                type="datetime-local"
                required={allRulesChecked}
                disabled={!allRulesChecked}
                value={entryDatetime}
                onChange={(e) => setEntryDatetime(e.target.value)}
                className="block w-full rounded-2xl border-0 bg-slate-900 px-4 py-3.5 text-slate-100 focus:ring-2 focus:ring-emerald-500 sm:text-sm outline-none"
              />
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isPending || !allRulesChecked}
                className="flex w-full justify-center rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-4 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/15 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] transition-all disabled:opacity-50 select-none"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Placing Trade...
                  </span>
                ) : (
                  'Place Trade'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
