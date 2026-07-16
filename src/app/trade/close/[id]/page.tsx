'use client'

import React, { useState, useEffect, use, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Award, Info, AlertTriangle, CheckCircle2, ChevronRight, Layers } from 'lucide-react'
import { getTradeById, closeTrade } from '../../actions'

interface CloseTradePageProps {
  params: Promise<{ id: string }>
}

interface TradeLeg {
  id: string
  action: 'BUY' | 'SELL'
  option_type: 'CALL' | 'PUT' | 'NONE'
  entry_price: number
  lot_size: number
}

interface Trade {
  id: string
  symbol: string
  sl: number
  tp: number
  strategies?: { name: string }
  trade_legs?: TradeLeg[]
}

export default function CloseTradePage({ params }: CloseTradePageProps) {
  const router = useRouter()
  const { id } = use(params)

  const [trade, setTrade] = useState<Trade | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Form states
  const [exitDatetime, setExitDatetime] = useState('')
  const [performedAsExpected, setPerformedAsExpected] = useState<boolean | null>(null)
  const [followedSlTpRules, setFollowedSlTpRules] = useState<boolean | null>(null)
  
  // Exits states mapped by legId
  const [legExits, setLegExits] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState('')

  // Feedback states
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [modalType, setModalType] = useState<'success' | 'warning'>('success')

  const [isPending, startTransition] = useTransition()

  // Set default exit date time to local current time
  useEffect(() => {
    const now = new Date()
    const offset = now.getTimezoneOffset() * 60000
    const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, 16)
    setExitDatetime(localISOTime)
  }, [])

  // Load trade details
  useEffect(() => {
    async function load() {
      try {
        const data = await getTradeById(id)
        if (data) {
          setTrade(data as unknown as Trade)
          // Initialize exits mapping
          const initialExits: Record<string, string> = {}
          data.trade_legs?.forEach((l: any) => {
            initialExits[l.id] = ''
          })
          setLegExits(initialExits)
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

  const handleExitChange = (legId: string, val: string) => {
    setLegExits(prev => ({
      ...prev,
      [legId]: val
    }))
  }

  // Real-time calculations:
  // Leg PnLs and Sum
  let overallPnl = 0
  const legPnls: Record<string, number> = {}
  let isAllExitsFilled = true

  if (trade && trade.trade_legs) {
    trade.trade_legs.forEach(leg => {
      const exitStr = legExits[leg.id]
      if (!exitStr || isNaN(Number(exitStr))) {
        isAllExitsFilled = false
        legPnls[leg.id] = 0
      } else {
        const entry = Number(leg.entry_price)
        const exit = Number(exitStr)
        const lots = Number(leg.lot_size)
        const pnl = leg.action === 'BUY' ? (exit - entry) * lots : (entry - exit) * lots
        legPnls[leg.id] = pnl
        overallPnl += pnl
      }
    })
  }

  // R-Multiple calculation:
  // Using sl on parent trade as target. Net premium entry?
  // We can calculate overall premium entry if we sum up premium cost:
  // Buy legs add cost, Sell legs credit.
  // Net Entry cost = sum (Buy entry * lots) - sum (Sell entry * lots)
  // Let's keep it simple: risk = abs(net entry - sl) if sl is specified, 
  // or just show net P/L.
  let netEntryCost = 0
  if (trade && trade.trade_legs) {
    trade.trade_legs.forEach(leg => {
      const entry = Number(leg.entry_price)
      const lots = Number(leg.lot_size)
      if (leg.action === 'BUY') {
        netEntryCost += (entry * lots)
      } else {
        netEntryCost -= (entry * lots)
      }
    })
  }
  const slVal = Number(trade?.sl || 0)
  const risk = Math.abs(netEntryCost - slVal)
  const rMultiple = risk > 0 ? overallPnl / risk : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!exitDatetime || performedAsExpected === null || followedSlTpRules === null) {
      setError('Please answer all compliance questions.')
      return
    }

    if (!isAllExitsFilled) {
      setError('Please fill in exit prices for all legs.')
      return
    }

    startTransition(async () => {
      const closedLegsArray = Object.keys(legExits).map(legId => ({
        legId,
        exitPrice: Number(legExits[legId])
      }))

      const result = await closeTrade({
        tradeId: id,
        exitDatetime: new Date(exitDatetime).toISOString(),
        performedAsExpected,
        followedSlTpRules,
        legs: closedLegsArray,
        notes: notes.trim() || undefined
      })

      if (result?.error) {
        setError(result.error)
      } else if (result?.success) {
        setModalType(result.followedRules ? 'success' : 'warning')
        setShowFeedbackModal(true)
      }
    })
  }

  const handleModalClose = () => {
    setShowFeedbackModal(false)
    router.push('/journal')
    router.refresh()
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mb-4" />
        <p className="text-sm text-slate-500">Retrieving active trade details...</p>
      </main>
    )
  }

  if (!trade) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-6 flex flex-col justify-center items-center text-center">
        <p className="text-sm text-slate-400">Trade not found or already closed.</p>
        <Link href="/" className="mt-4 text-emerald-400 text-xs font-bold uppercase tracking-wider">
          Return to Dashboard
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
          <h1 className="text-xl font-bold">Close Position</h1>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider text-emerald-400">
            {trade.symbol} • {trade.strategies?.name || 'Manual'}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-400 mb-6">
          {error}
        </div>
      )}

      {/* Trade Meta Details card */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 mb-6 text-sm">
        <div className="grid grid-cols-2 gap-y-3 gap-x-4">
          <div>
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Net Entry Debit/Credit</span>
            <span className="block font-bold text-slate-300 mt-0.5">{netEntryCost.toFixed(2)}</span>
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Legs count</span>
            <span className="block font-bold text-slate-300 mt-0.5">{trade.trade_legs?.length || 0}</span>
          </div>
          <div>
            <span className="block text-[10px] font-bold text-rose-500/80 uppercase tracking-wider">Stop Loss</span>
            <span className="block font-bold text-rose-400/90 mt-0.5">{trade.sl}</span>
          </div>
          <div>
            <span className="block text-[10px] font-bold text-emerald-500/80 uppercase tracking-wider">Take Profit</span>
            <span className="block font-bold text-emerald-400/90 mt-0.5">{trade.tp}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* LEGS CLOSE INPUTS SECTION */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-emerald-400" />
            Leg Exit Prices
          </h3>

          <div className="space-y-4">
            {trade.trade_legs?.map((leg, idx) => (
              <div key={leg.id} className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-400">Leg #{idx + 1}</span>
                  <div className="flex gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                      leg.action === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {leg.action === 'BUY' ? 'Long' : 'Short'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[8px] font-bold uppercase">
                      {leg.option_type === 'NONE' ? 'SPOT' : leg.option_type}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block">Entry:</span>
                    <span className="text-slate-300 font-bold block">{leg.entry_price} ({leg.lot_size} Lots)</span>
                  </div>
                  {legExits[leg.id] && !isNaN(Number(legExits[leg.id])) && (
                    <div className="text-right">
                      <span className="text-slate-500 block">PnL:</span>
                      <span className={`font-bold block ${legPnls[leg.id] >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {legPnls[leg.id] >= 0 ? '+' : ''}{legPnls[leg.id].toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Exit Price
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="Enter Exit Price"
                    value={legExits[leg.id]}
                    onChange={(e) => handleExitChange(leg.id, e.target.value)}
                    className="block w-full rounded-xl border-0 bg-slate-900 px-3 py-2.5 text-xs text-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Global Exit Date Time */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Exit Date & Time (Overall Trade Close)
          </label>
          <input
            type="datetime-local"
            required
            value={exitDatetime}
            onChange={(e) => setExitDatetime(e.target.value)}
            className="block w-full rounded-2xl border-0 bg-slate-900 px-4 py-3.5 text-slate-100 focus:ring-2 focus:ring-emerald-500 sm:text-sm outline-none"
          />
        </div>

        {/* Real-time Math Output Card */}
        {isAllExitsFilled && (
          <div className="bg-slate-900/20 border border-slate-900 rounded-3xl p-5 relative overflow-hidden">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Aggregated Trade Performance</h3>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div>
                <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Total PnL</span>
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
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <Info className="w-4 h-4 text-emerald-400" />
            Discipline Compliance Verification
          </h3>

          {/* Question 1 */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-300">
              Did the trade perform according to you?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPerformedAsExpected(true)}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all select-none border ${
                  performedAsExpected === true
                    ? 'bg-slate-800 border-slate-700 text-slate-100 font-extrabold shadow-sm'
                    : 'bg-transparent border-slate-900 text-slate-500'
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setPerformedAsExpected(false)}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all select-none border ${
                  performedAsExpected === false
                    ? 'bg-slate-800 border-slate-700 text-slate-100 font-extrabold shadow-sm'
                    : 'bg-transparent border-slate-900 text-slate-500'
                }`}
              >
                No
              </button>
            </div>
          </div>

          {/* Question 2 */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-300">
              Did you follow your SL and TP rules?
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFollowedSlTpRules(true)}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all select-none border ${
                  followedSlTpRules === true
                    ? 'bg-slate-800 border-slate-700 text-slate-100 font-extrabold shadow-sm'
                    : 'bg-transparent border-slate-900 text-slate-500'
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setFollowedSlTpRules(false)}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all select-none border ${
                  followedSlTpRules === false
                    ? 'bg-slate-800 border-slate-700 text-slate-100 font-extrabold shadow-sm'
                    : 'bg-transparent border-slate-900 text-slate-500'
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
            className="block w-full rounded-2xl border-0 bg-slate-950 px-4 py-3 text-xs text-slate-250 placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
          />
        </div>

        {/* Submit */}
        <div>
          <button
            type="submit"
            disabled={isPending || performedAsExpected === null || followedSlTpRules === null || !isAllExitsFilled}
            className="flex w-full justify-center rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-4 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/15 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] transition-all disabled:opacity-50 select-none font-bold"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Logging Close...
              </span>
            ) : (
              'Submit & Log Close'
            )}
          </button>
        </div>
      </form>

      {/* FEEDBACK OVERLAY MODAL */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center flex flex-col items-center">
            
            {modalType === 'success' ? (
              <>
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6">
                  <Award className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-100">Disciplined Execution!</h3>
                <p className="mt-3 text-sm text-emerald-400 font-semibold uppercase tracking-wider">
                  "Amazing, you followed your rules!"
                </p>
                <p className="mt-2 text-xs text-slate-400 max-w-[240px] leading-relaxed">
                  Following your plan consistently is the key to trading profitability. Keep up the high standards.
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-400 mb-6">
                  <AlertTriangle className="w-8 h-8 text-amber-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-100">Trade Process Completed</h3>
                <p className="mt-3 text-sm text-slate-300 font-semibold uppercase tracking-wider">
                  "You did not follow your rules this time."
                </p>
                <p className="mt-2 text-xs text-slate-500 max-w-[240px] leading-relaxed">
                  Discipline is a muscle. Review your strategy triggers and focus on rule alignment on the next position.
                </p>
              </>
            )}

            <button
              onClick={handleModalClose}
              className="mt-8 flex w-full justify-center items-center gap-1.5 rounded-2xl bg-slate-800 border border-slate-700 px-4 py-3.5 text-sm font-bold text-slate-100 hover:bg-slate-700 active:scale-95 transition-all select-none"
            >
              Go to Journal
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
