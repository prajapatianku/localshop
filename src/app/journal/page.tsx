'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Calendar, Filter, Loader2, RefreshCw, Smile, AlertCircle, ArrowLeft, ArrowUpRight, TrendingUp, TrendingDown, BookOpen } from 'lucide-react'
import { getClosedTrades } from '../trade/actions'
import { getStrategies } from '../strategies/actions'

interface Trade {
  id: string
  symbol: string
  direction: 'BUY' | 'SELL'
  entry_price: number
  exit_price: number
  entry_datetime: string
  exit_datetime: string
  pnl: number
  pnl_type: string
  status: string
  performed_as_expected: boolean
  followed_sl_tp_rules: boolean
  strategies?: { name: string }
}

interface Strategy {
  id: string
  name: string
}

export default function JournalPage() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filter States
  const [strategyFilter, setStrategyFilter] = useState('ALL')
  const [outcomeFilter, setOutcomeFilter] = useState('ALL') // ALL, WIN, LOSS
  const [disciplineFilter, setDisciplineFilter] = useState('ALL') // ALL, FOLLOWED, BROKEN
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const loadData = async (isRef = false) => {
    try {
      if (isRef) setRefreshing(true)
      else setLoading(true)

      const [tradesData, stratsData] = await Promise.all([
        getClosedTrades(),
        getStrategies()
      ])

      setTrades(tradesData as unknown as Trade[])
      setStrategies(stratsData as Strategy[])
    } catch (err: any) {
      setError(err.message || 'Failed to load journal records.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Apply filters client-side
  const filteredTrades = trades.filter((trade) => {
    // Strategy Filter
    if (strategyFilter !== 'ALL' && trade.strategies?.name !== strategyFilter) {
      return false
    }

    // Outcome Filter (Win / Loss)
    if (outcomeFilter === 'WIN' && trade.pnl <= 0) return false
    if (outcomeFilter === 'LOSS' && trade.pnl > 0) return false

    // Discipline Filter (Followed SL/TP)
    if (disciplineFilter === 'FOLLOWED' && !trade.followed_sl_tp_rules) return false
    if (disciplineFilter === 'BROKEN' && trade.followed_sl_tp_rules) return false

    // Date Filters
    if (startDate) {
      const start = new Date(startDate).getTime()
      const tradeTime = new Date(trade.exit_datetime).getTime()
      if (tradeTime < start) return false
    }
    if (endDate) {
      const end = new Date(endDate).getTime() + 86400000 // include the whole end day
      const tradeTime = new Date(trade.exit_datetime).getTime()
      if (tradeTime > end) return false
    }

    return true
  })

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-6 pb-28 relative">
      <div className="absolute top-0 left-0 w-[50%] h-[30%] rounded-full bg-indigo-500/5 blur-[80px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-all active:scale-95">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Journal</h1>
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

      {/* Filter Panel */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 mb-6 space-y-4">
        <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <Filter className="w-4 h-4 text-emerald-400" />
          <span>Filters</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Strategy */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Strategy</label>
            <select
              value={strategyFilter}
              onChange={(e) => setStrategyFilter(e.target.value)}
              className="block w-full rounded-xl border-0 bg-slate-950/80 py-2.5 px-3 text-xs text-slate-300 ring-1 ring-inset ring-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="ALL">All Strategies</option>
              {strategies.map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Outcome */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Outcome</label>
            <select
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value)}
              className="block w-full rounded-xl border-0 bg-slate-950/80 py-2.5 px-3 text-xs text-slate-300 ring-1 ring-inset ring-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="ALL">All Results</option>
              <option value="WIN">Wins only</option>
              <option value="LOSS">Losses only</option>
            </select>
          </div>

          {/* Discipline */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Discipline</label>
            <select
              value={disciplineFilter}
              onChange={(e) => setDisciplineFilter(e.target.value)}
              className="block w-full rounded-xl border-0 bg-slate-950/80 py-2.5 px-3 text-xs text-slate-300 ring-1 ring-inset ring-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="ALL">All Discipline</option>
              <option value="FOLLOWED">Rules Followed</option>
              <option value="BROKEN">Rules Broken</option>
            </select>
          </div>

          {/* Date range inputs */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="block w-full rounded-xl border-0 bg-slate-950/80 py-2.5 px-2 text-xs text-slate-300 ring-1 ring-inset ring-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="block w-full rounded-xl border-0 bg-slate-950/80 py-2.5 px-2 text-xs text-slate-300 ring-1 ring-inset ring-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setStrategyFilter('ALL')
                setOutcomeFilter('ALL')
                setDisciplineFilter('ALL')
                setStartDate('')
                setEndDate('')
              }}
              className="w-full text-center py-2.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Trades List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mb-4" />
          <p className="text-sm">Fetching historical logs...</p>
        </div>
      ) : filteredTrades.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 p-8 text-center flex flex-col items-center justify-center py-16 bg-slate-900/20">
          <BookOpen className="w-10 h-10 text-slate-600 mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No matching trades</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
            Adjust your filters or log new trades to populate your journal.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTrades.map((trade) => {
            const isWin = trade.pnl > 0
            const followed = trade.followed_sl_tp_rules
            return (
              <div
                key={trade.id}
                className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/80 rounded-2xl p-5 transition-all hover:border-slate-700"
              >
                {/* Top metadata */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">
                      {formatDate(trade.exit_datetime)}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-200 mt-0.5">
                      {trade.symbol}
                    </h3>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    {followed ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-400 border border-emerald-500/20 uppercase tracking-wide">
                        Rules Followed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[9px] font-bold text-rose-400 border border-rose-500/20 uppercase tracking-wide">
                        Rules Broken
                      </span>
                    )}

                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide ${
                      trade.direction === 'BUY' 
                        ? 'bg-emerald-500/10 text-emerald-400' 
                        : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {trade.direction}
                    </span>
                  </div>
                </div>

                {/* Sub details */}
                <p className="text-xs text-slate-500">
                  Strategy: <span className="font-semibold text-slate-400">{trade.strategies?.name || 'Manual'}</span>
                </p>

                {/* Price mapping & PNL */}
                <div className="mt-4 pt-3 border-t border-slate-800/30 flex items-center justify-between">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-left">
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Entry</span>
                      <span className="text-xs font-semibold text-slate-300 block">{trade.entry_price}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Exit</span>
                      <span className="text-xs font-semibold text-slate-300 block">{trade.exit_price}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Profit / Loss</span>
                    <div className="flex items-center gap-1 mt-0.5 justify-end">
                      {isWin ? (
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                      )}
                      <span className={`text-base font-black ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isWin ? '+' : ''}{Number(trade.pnl).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Extra insight flags */}
                {trade.performed_as_expected !== undefined && (
                  <div className="mt-3 pt-3 border-t border-slate-800/30 flex justify-between text-[10px] text-slate-500">
                    <span>Performance Expectation Alignment:</span>
                    <span className={`font-semibold ${trade.performed_as_expected ? 'text-emerald-500/80' : 'text-rose-500/80'}`}>
                      {trade.performed_as_expected ? 'As Expected' : 'Deviation'}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
