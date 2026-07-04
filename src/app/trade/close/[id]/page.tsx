'use client'

import React, { useState, useEffect, use, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Award, Info, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react'
import { getTradeById, closeTrade } from '../../actions'

interface CloseTradePageProps {
  params: Promise<{ id: string }>
}

interface Trade {
  id: string
  symbol: string
  direction: 'BUY' | 'SELL'
  entry_price: number
  sl: number
  tp: number
  strategies?: { name: string }
}

export default function CloseTradePage({ params }: CloseTradePageProps) {
  const router = useRouter()
  const { id } = use(params)

  const [trade, setTrade] = useState<Trade | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Form states
  const [exitPrice, setExitPrice] = useState('')
  const [exitDatetime, setExitDatetime] = useState('')
  const [performedAsExpected, setPerformedAsExpected] = useState<boolean | null>(null)
  const [followedSlTpRules, setFollowedSlTpRules] = useState<boolean | null>(null)

  // Feedback states
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [modalType, setModalType] = useState<'success' | 'warning'>('success')

  const [isPending, startTransition] = useTransition()

  // Set default exit date time to current local time
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

  // Real-time P/L calculations
  let pnl = 0
  let pnlPercent = 0
  let rMultiple = 0
  const entryVal = Number(trade?.entry_price || 0)
  const exitVal = Number(exitPrice || 0)
  const slVal = Number(trade?.sl || 0)

  if (trade && !isNaN(exitVal) && exitVal > 0) {
    pnl = trade.direction === 'BUY' ? (exitVal - entryVal) : (entryVal - exitVal)
    pnlPercent = (pnl / entryVal) * 100
    const risk = Math.abs(entryVal - slVal)
    rMultiple = risk > 0 ? pnl / risk : 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!exitPrice || !exitDatetime || performedAsExpected === null || followedSlTpRules === null) {
      setError('Please fill in all details, including rule compliance questions.')
      return
    }

    const numExit = Number(exitPrice)
    if (isNaN(numExit) || numExit <= 0) {
      setError('Please enter a valid exit price.')
      return
    }

    startTransition(async () => {
      const result = await closeTrade({
        tradeId: id,
        exitPrice: numExit,
        exitDatetime: new Date(exitDatetime).toISOString(),
        performedAsExpected: performedAsExpected,
        followedSlTpRules: followedSlTpRules
      })

      if (result?.error) {
        setError(result.error)
      } else if (result?.success) {
        // Trigger feedback modal
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
        <p className="text-sm text-slate-500">Retrieving active trade...</p>
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
            {trade.symbol} • {trade.direction}
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
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Strategy</span>
            <span className="block font-bold text-slate-300 mt-0.5">{trade.strategies?.name || 'Manual'}</span>
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Entry Price</span>
            <span className="block font-bold text-slate-300 mt-0.5">{trade.entry_price}</span>
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
        {/* Exit parameters */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Exit Price
            </label>
            <input
              type="number"
              step="any"
              required
              placeholder="0.00"
              value={exitPrice}
              onChange={(e) => setExitPrice(e.target.value)}
              className="block w-full rounded-2xl border-0 bg-slate-900 px-4 py-3.5 text-slate-100 placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500 sm:text-sm outline-none"
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
              className="block w-full rounded-2xl border-0 bg-slate-900 px-4 py-3.5 text-slate-100 focus:ring-2 focus:ring-emerald-500 sm:text-sm outline-none"
            />
          </div>
        </div>

        {/* Real-time Math Output Card */}
        {exitPrice && !isNaN(exitVal) && exitVal > 0 && (
          <div className="bg-slate-900/20 border border-slate-900 rounded-3xl p-5 relative overflow-hidden">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Computed Performance</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">PnL</span>
                <span className={`block text-lg font-black mt-1 ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">% Change</span>
                <span className={`block text-lg font-black mt-1 ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {pnl >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                </span>
              </div>
              <div>
                <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">R-Multiple</span>
                <span className={`block text-lg font-black mt-1 ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {pnl >= 0 ? '+' : ''}{rMultiple.toFixed(2)}R
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

        {/* Submit */}
        <div>
          <button
            type="submit"
            disabled={isPending || performedAsExpected === null || followedSlTpRules === null}
            className="flex w-full justify-center rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-4 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/15 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] transition-all disabled:opacity-50 select-none font-bold"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Logging Close...
              </span>
            ) : (
              'Submit & Log Trade'
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
