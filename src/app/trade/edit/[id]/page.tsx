'use client'

import React, { useState, useEffect, use, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Save, AlertCircle, Layers } from 'lucide-react'
import { getTradeById, saveEditedTrade } from '../../actions'

interface EditTradePageProps {
  params: Promise<{ id: string }>
}

interface TradeLeg {
  id: string
  action: 'BUY' | 'SELL'
  option_type: 'CALL' | 'PUT' | 'NONE'
  entry_price: number
  lot_size: number
  exit_price: number | null
}

interface Trade {
  id: string
  symbol: string
  sl: number
  tp: number
  entry_datetime: string
  exit_datetime: string
  performed_as_expected: boolean
  followed_sl_tp_rules: boolean
  strategies?: { name: string }
  trade_legs?: TradeLeg[]
  notes?: string
}

interface LegEditState {
  id: string
  action: 'BUY' | 'SELL'
  optionType: 'CALL' | 'PUT' | 'NONE'
  entryPrice: string
  lotSize: string
  exitPrice: string
}

export default function EditTradePage({ params }: EditTradePageProps) {
  const router = useRouter()
  const { id } = use(params)

  const [trade, setTrade] = useState<Trade | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // General details state
  const [symbol, setSymbol] = useState('')
  const [sl, setSl] = useState('')
  const [tp, setTp] = useState('')
  const [entryDatetime, setEntryDatetime] = useState('')
  const [exitDatetime, setExitDatetime] = useState('')
  const [performedAsExpected, setPerformedAsExpected] = useState<boolean | null>(null)
  const [followedSlTpRules, setFollowedSlTpRules] = useState<boolean | null>(null)
  
  // Legs list state
  const [legs, setLegs] = useState<LegEditState[]>([])
  const [notes, setNotes] = useState('')

  const [isPending, startTransition] = useTransition()

  // Load trade details
  useEffect(() => {
    async function load() {
      try {
        const data = await getTradeById(id)
        if (data) {
          const t = data as unknown as Trade
          setTrade(t)
          setSymbol(t.symbol)
          setSl(t.sl.toString())
          setTp(t.tp.toString())
          
          // Format ISO datetime string to datetime-local format
          const formattedEntry = new Date(t.entry_datetime).toISOString().slice(0, 16)
          const formattedExit = new Date(t.exit_datetime).toISOString().slice(0, 16)
          setEntryDatetime(formattedEntry)
          setExitDatetime(formattedExit)
          
          setPerformedAsExpected(t.performed_as_expected)
          setFollowedSlTpRules(t.followed_sl_tp_rules)
          setNotes(t.notes || '')

          // Map legs
          const mappedLegs = (t.trade_legs || []).map(l => ({
            id: l.id,
            action: l.action,
            optionType: l.option_type,
            entryPrice: l.entry_price.toString(),
            lotSize: l.lot_size.toString(),
            exitPrice: l.exit_price !== null ? l.exit_price.toString() : ''
          }))
          setLegs(mappedLegs)
        } else {
          setError('Trade record not found.')
        }
      } catch (err: any) {
        setError(err.message || 'Failed to retrieve trade data.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleLegChange = (idx: number, field: keyof LegEditState, value: any) => {
    const newLegs = [...legs]
    newLegs[idx] = {
      ...newLegs[idx],
      [field]: value
    }
    setLegs(newLegs)
  }

  // Real-time calculations:
  // Leg PnLs and Sum
  let overallPnl = 0
  const legPnls: Record<string, number> = {}
  let isAllInputsFilled = true

  legs.forEach(leg => {
    const entry = Number(leg.entryPrice)
    const exit = Number(leg.exitPrice)
    const lots = Number(leg.lotSize)

    if (isNaN(entry) || isNaN(lots) || leg.entryPrice === '' || leg.lotSize === '') {
      isAllInputsFilled = false
    }

    if (leg.exitPrice === '' || isNaN(exit)) {
      legPnls[leg.id] = 0
    } else {
      const pnl = leg.action === 'BUY' ? (exit - entry) * lots : (entry - exit) * lots
      legPnls[leg.id] = pnl
      overallPnl += pnl
    }
  })

  // Risk & R-Multiple Calculation
  let netEntryCost = 0
  legs.forEach(leg => {
    const entry = Number(leg.entryPrice)
    const lots = Number(leg.lotSize)
    if (!isNaN(entry) && !isNaN(lots)) {
      if (leg.action === 'BUY') netEntryCost += (entry * lots)
      else netEntryCost -= (entry * lots)
    }
  })
  const slVal = Number(sl || 0)
  const risk = Math.abs(netEntryCost - slVal)
  const rMultiple = risk > 0 ? overallPnl / risk : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!symbol || !sl || !tp || !entryDatetime || !exitDatetime || performedAsExpected === null || followedSlTpRules === null) {
      setError('Please fill in all general parameters.')
      return
    }

    if (!isAllInputsFilled) {
      setError('Please fill in entry price and lot size on all legs.')
      return
    }

    startTransition(async () => {
      const legsArray = legs.map(l => ({
        id: l.id,
        action: l.action,
        optionType: l.optionType,
        entryPrice: Number(l.entryPrice),
        lotSize: Number(l.lotSize),
        exitPrice: l.exitPrice !== '' ? Number(l.exitPrice) : null
      }))

      const result = await saveEditedTrade({
        tradeId: id,
        symbol,
        sl: Number(sl),
        tp: Number(tp),
        entryDatetime: new Date(entryDatetime).toISOString(),
        exitDatetime: new Date(exitDatetime).toISOString(),
        performedAsExpected,
        followedSlTpRules,
        legs: legsArray,
        notes: notes.trim() || undefined
      })

      if (result?.error) {
        setError(result.error)
      } else if (result?.success) {
        router.push('/journal')
        router.refresh()
      }
    })
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mb-4" />
        <p className="text-sm text-slate-500">Retrieving trade record details...</p>
      </main>
    )
  }

  if (!trade) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-6 flex flex-col justify-center items-center text-center">
        <p className="text-sm text-slate-400">Trade details not found.</p>
        <Link href="/journal" className="mt-4 text-emerald-400 text-xs font-bold uppercase tracking-wider">
          Return to Journal
        </Link>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-6 pb-28 relative">
      <div className="absolute top-0 right-0 w-[50%] h-[30%] rounded-full bg-emerald-500/5 blur-[80px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/journal" className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-all active:scale-95">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Edit Position</h1>
          <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">
            Edit details for trade {symbol}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-400 mb-6 flex gap-2 items-start">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* General Details Form Card */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Symbol / Ticker
            </label>
            <input
              type="text"
              required
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="block w-full rounded-2xl border-0 bg-slate-950 px-4 py-3.5 text-slate-100 placeholder:text-slate-650 focus:ring-2 focus:ring-emerald-500 sm:text-sm outline-none uppercase font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-rose-400 uppercase tracking-wider mb-2">
                Stop Loss (SL)
              </label>
              <input
                type="number"
                step="any"
                required
                value={sl}
                onChange={(e) => setSl(e.target.value)}
                className="block w-full rounded-2xl border-0 bg-slate-950 px-4 py-3.5 text-slate-100 focus:ring-2 focus:ring-rose-550 sm:text-sm outline-none text-rose-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
                Take Profit (TP)
              </label>
              <input
                type="number"
                step="any"
                required
                value={tp}
                onChange={(e) => setTp(e.target.value)}
                className="block w-full rounded-2xl border-0 bg-slate-955 px-4 py-3.5 text-slate-100 focus:ring-2 focus:ring-emerald-500 sm:text-sm outline-none text-emerald-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Entry Date & Time
            </label>
            <input
              type="datetime-local"
              required
              value={entryDatetime}
              onChange={(e) => setEntryDatetime(e.target.value)}
              className="block w-full rounded-2xl border-0 bg-slate-950 px-4 py-3.5 text-slate-100 focus:ring-2 focus:ring-emerald-500 sm:text-sm outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Exit Date & Time
            </label>
            <input
              type="datetime-local"
              required
              value={exitDatetime}
              onChange={(e) => setExitDatetime(e.target.value)}
              className="block w-full rounded-2xl border-0 bg-slate-950 px-4 py-3.5 text-slate-100 focus:ring-2 focus:ring-emerald-500 sm:text-sm outline-none"
            />
          </div>
        </div>

        {/* LEGS DETAIL CARD */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-emerald-400" />
            Leg Configurations
          </h3>

          <div className="space-y-4">
            {legs.map((leg, idx) => (
              <div key={leg.id} className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-500">Leg #{idx + 1}</span>
                  {leg.exitPrice !== '' && !isNaN(Number(leg.exitPrice)) && (
                    <span className={`font-bold ${legPnls[leg.id] >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      PnL: {legPnls[leg.id] >= 0 ? '+' : ''}{legPnls[leg.id].toFixed(2)}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Action Selector */}
                  <div>
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Action</span>
                    <div className="grid grid-cols-2 p-0.5 bg-slate-950 rounded-xl border border-slate-850">
                      <button
                        type="button"
                        onClick={() => handleLegChange(idx, 'action', 'BUY')}
                        className={`py-1 text-[10px] font-extrabold uppercase rounded-lg transition-all ${
                          leg.action === 'BUY'
                            ? 'bg-emerald-500 text-slate-950 shadow'
                            : 'text-slate-500'
                        }`}
                      >
                        Buy
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLegChange(idx, 'action', 'SELL')}
                        className={`py-1 text-[10px] font-extrabold uppercase rounded-lg transition-all ${
                          leg.action === 'SELL'
                            ? 'bg-rose-500 text-slate-950 shadow'
                            : 'text-slate-500'
                        }`}
                      >
                        Sell
                      </button>
                    </div>
                  </div>

                  {/* Option Type Selector */}
                  <div>
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Type</span>
                    <div className="grid grid-cols-3 p-0.5 bg-slate-955 rounded-xl border border-slate-850">
                      {['CALL', 'PUT', 'NONE'].map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleLegChange(idx, 'optionType', type)}
                          className={`py-1 text-[9px] font-extrabold uppercase rounded-lg transition-all ${
                            leg.optionType === type
                              ? 'bg-slate-850 text-slate-200 shadow'
                              : 'text-slate-500'
                          }`}
                        >
                          {type === 'NONE' ? 'SPOT' : type}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {/* Entry Price */}
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Entry Price
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="Entry"
                      value={leg.entryPrice}
                      onChange={(e) => handleLegChange(idx, 'entryPrice', e.target.value)}
                      className="block w-full rounded-xl border-0 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  {/* Lot Size */}
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Lot Size
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="Lots"
                      value={leg.lotSize}
                      onChange={(e) => handleLegChange(idx, 'lotSize', e.target.value)}
                      className="block w-full rounded-xl border-0 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  {/* Exit Price */}
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Exit Price
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Exit"
                      value={leg.exitPrice}
                      onChange={(e) => handleLegChange(idx, 'exitPrice', e.target.value)}
                      className="block w-full rounded-xl border-0 bg-slate-950 px-3 py-2 text-xs text-slate-250 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Real-time Math Performance Indicator card */}
        {isAllInputsFilled && (
          <div className="bg-slate-900/20 border border-slate-900 rounded-3xl p-5">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 text-center">Recalculated Performance</h3>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div>
                <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Recalculated PnL</span>
                <span className={`block text-xl font-black mt-1 ${overallPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {overallPnl >= 0 ? '+' : ''}{overallPnl.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">R-Multiple</span>
                <span className={`block text-xl font-black mt-1 ${overallPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {overallPnl >= 0 ? '+' : ''}{rMultiple.toFixed(2)}R
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Compliance checklist questions */}
        <div className="space-y-4 bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Discipline Compliance Verification
          </h3>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-350">
              Did the trade perform according to you?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPerformedAsExpected(true)}
                className={`py-2 rounded-xl text-xs font-bold border transition-all select-none ${
                  performedAsExpected === true
                    ? 'bg-slate-800 border-slate-700 text-slate-100 font-extrabold shadow-sm'
                    : 'bg-transparent border-slate-900 text-slate-550'
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setPerformedAsExpected(false)}
                className={`py-2 rounded-xl text-xs font-bold border transition-all select-none ${
                  performedAsExpected === false
                    ? 'bg-slate-800 border-slate-700 text-slate-100 font-extrabold shadow-sm'
                    : 'bg-transparent border-slate-900 text-slate-550'
                }`}
              >
                No
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-350">
              Did you follow your SL and TP rules?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFollowedSlTpRules(true)}
                className={`py-2 rounded-xl text-xs font-bold border transition-all select-none ${
                  followedSlTpRules === true
                    ? 'bg-slate-800 border-slate-700 text-slate-100 font-extrabold shadow-sm'
                    : 'bg-transparent border-slate-900 text-slate-550'
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setFollowedSlTpRules(false)}
                className={`py-2 rounded-xl text-xs font-bold border transition-all select-none ${
                  followedSlTpRules === false
                    ? 'bg-slate-800 border-slate-700 text-slate-100 font-extrabold shadow-sm'
                    : 'bg-transparent border-slate-900 text-slate-550'
                }`}
              >
                No
              </button>
            </div>
          </div>
        </div>

        {/* Notes Section */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Trade Reflection & Notes
          </label>
          <textarea
            placeholder="Describe what went well, how you felt, or reasons behind exit execution deviations..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="block w-full rounded-2xl border-0 bg-slate-950 px-4 py-3 text-xs text-slate-250 placeholder:text-slate-650 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
          />
        </div>

        {/* Submit */}
        <div>
          <button
            type="submit"
            disabled={isPending || performedAsExpected === null || followedSlTpRules === null || !isAllInputsFilled}
            className="flex w-full justify-center rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-4 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/15 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] transition-all disabled:opacity-50 select-none font-bold"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving Changes...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Save className="w-4 h-4" />
                Save Changes & Recalculate
              </span>
            )}
          </button>
        </div>
      </form>
    </main>
  )
}
