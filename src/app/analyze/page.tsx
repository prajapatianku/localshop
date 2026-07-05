'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, ArrowLeft, TrendingUp, ShieldAlert, Award, Brain, BarChart2 } from 'lucide-react'
import { getClosedTrades } from '../trade/actions'
import { getStrategies } from '../strategies/actions'

interface Trade {
  id: string
  symbol: string
  pnl: number
  followed_sl_tp_rules: boolean
  exit_datetime: string
  strategies?: { name: string }
}

interface Strategy {
  id: string
  name: string
}

export default function AnalyzePage() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Strategy filter state
  const [strategyFilter, setStrategyFilter] = useState('ALL')

  useEffect(() => {
    async function load() {
      try {
        const [tradesData, stratsData] = await Promise.all([
          getClosedTrades(),
          getStrategies()
        ])
        setTrades(tradesData as unknown as Trade[])
        setStrategies(stratsData as Strategy[])
      } catch (err: any) {
        setError(err.message || 'Failed to load analysis.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Filter trades based on strategy selector
  const filteredTrades = strategyFilter === 'ALL'
    ? trades
    : trades.filter(t => t.strategies?.name === strategyFilter)

  // 1. Overall Metrics
  const totalTrades = filteredTrades.length
  const winningTrades = filteredTrades.filter(t => t.pnl > 0)
  const losingTrades = filteredTrades.filter(t => t.pnl <= 0)
  
  const overallWinRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0

  // 2. Rules Followed Metrics
  const followedTrades = filteredTrades.filter(t => t.followed_sl_tp_rules === true)
  const followedWins = followedTrades.filter(t => t.pnl > 0)
  const winRateFollowed = followedTrades.length > 0 ? (followedWins.length / followedTrades.length) * 100 : 0

  // 3. Rules Broken Metrics
  const brokenTrades = filteredTrades.filter(t => t.followed_sl_tp_rules === false)
  const brokenWins = brokenTrades.filter(t => t.pnl > 0)
  const brokenLosses = brokenTrades.filter(t => t.pnl <= 0)
  const winRateBroken = brokenTrades.length > 0 ? (brokenWins.length / brokenTrades.length) * 100 : 0

  // Discipline Impact Insight
  const lossRateWhenBroken = brokenTrades.length > 0 
    ? (brokenLosses.length / brokenTrades.length) * 100 
    : 0

  const disciplineInsight = brokenTrades.length > 0
    ? `You lose money ${lossRateWhenBroken.toFixed(0)}% of the time you skip your SL/TP rules.`
    : "No rule-break data available yet. Maintain your 100% discipline!"

  // 4. Equity Curve Data Points
  const chronoTrades = [...filteredTrades].sort(
    (a, b) => new Date(a.exit_datetime).getTime() - new Date(b.exit_datetime).getTime()
  )

  let cumulativePnl = 0
  const equityPoints = chronoTrades.map((t) => {
    cumulativePnl += Number(t.pnl)
    return cumulativePnl
  })

  // SVG Chart Parameters
  const chartHeight = 160
  const chartWidth = 340
  const padding = 20

  let pathD = ''
  let fillD = ''

  if (equityPoints.length > 0) {
    const minPnl = Math.min(0, ...equityPoints)
    const maxPnl = Math.max(0, ...equityPoints)
    const pnlRange = maxPnl - minPnl || 100

    const points = equityPoints.map((val, idx) => {
      const x = padding + (idx / (equityPoints.length - 1 || 1)) * (chartWidth - padding * 2)
      const y = padding + (1 - (val - minPnl) / pnlRange) * (chartHeight - padding * 2)
      return { x, y }
    })

    pathD = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
    const baselineY = padding + (1 - (0 - minPnl) / pnlRange) * (chartHeight - padding * 2)
    fillD = `${pathD} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-6 pb-28 relative">
      <div className="absolute top-0 right-0 w-[50%] h-[30%] rounded-full bg-emerald-500/5 blur-[80px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-all active:scale-95">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Performance Analyze</h1>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-400 mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mb-4" />
          <p className="text-sm">Calculating analysis statistics...</p>
        </div>
      ) : trades.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 p-8 text-center flex flex-col items-center justify-center py-16 bg-slate-900/20">
          <BarChart2 className="w-10 h-10 text-slate-600 mb-3" />
          <h3 className="text-base font-semibold text-slate-300">Analysis needs data</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
            Please log and close at least one trade to activate the analytical dashboard.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Strategy Selector Dropdown Filter */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-4">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Select Strategy Focus</label>
            <select
              value={strategyFilter}
              onChange={(e) => setStrategyFilter(e.target.value)}
              className="block w-full rounded-xl border-0 bg-slate-950/80 py-2.5 px-3 text-xs text-slate-300 ring-1 ring-inset ring-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none font-semibold"
            >
              <option value="ALL">All Strategies Performance</option>
              {strategies.map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          {filteredTrades.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-800 p-8 text-center py-16 bg-slate-900/20">
              <BarChart2 className="w-8 h-8 text-slate-650 mb-2 mx-auto" />
              <h3 className="text-sm font-semibold text-slate-400">No trades recorded for this strategy</h3>
            </div>
          ) : (
            <>
              {/* Equity Line Chart */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 shadow-sm">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Cumulative Performance Curve</h3>
                
                <div className="flex items-center justify-center bg-slate-950/40 rounded-2xl py-3 border border-slate-900">
                  <svg width={chartWidth} height={chartHeight} className="overflow-visible">
                    {/* Horizontal Baseline at 0 P&L */}
                    {equityPoints.length > 0 && (() => {
                      const minPnl = Math.min(0, ...equityPoints)
                      const maxPnl = Math.max(0, ...equityPoints)
                      const pnlRange = maxPnl - minPnl || 100
                      const zeroY = padding + (1 - (0 - minPnl) / pnlRange) * (chartHeight - padding * 2)
                      return (
                        <line 
                          x1={padding} 
                          y1={zeroY} 
                          x2={chartWidth - padding} 
                          y2={zeroY} 
                          stroke="#334155" 
                          strokeWidth="1" 
                          strokeDasharray="4" 
                        />
                      )
                    })()}

                    {/* Gradient Fill */}
                    {fillD && (
                      <>
                        <defs>
                          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        <path d={fillD} fill="url(#chartGrad)" />
                      </>
                    )}

                    {/* Line Path */}
                    {pathD && (
                      <path 
                        d={pathD} 
                        fill="none" 
                        stroke="#10b981" 
                        strokeWidth="2.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                      />
                    )}
                  </svg>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2 px-1">
                  <span>Start</span>
                  <span>{totalTrades} Trades Logged</span>
                  <span>P/L: {cumulativePnl.toFixed(2)}</span>
                </div>
              </div>

              {/* Win Rates Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Overall Win Rate Card */}
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Win Rate</span>
                  <div className="mt-4">
                    <span className="text-3xl font-black text-slate-100">{overallWinRate.toFixed(0)}%</span>
                    <span className="block text-[10px] text-slate-500 mt-1">Accuracy Percentage</span>
                  </div>
                </div>

                {/* Wins vs Losses Counts */}
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Distribution</span>
                  <div className="mt-4 flex justify-between items-baseline">
                    <div>
                      <span className="text-2xl font-bold text-emerald-400">{winningTrades.length}</span>
                      <span className="block text-[9px] text-slate-500 uppercase font-semibold">Wins</span>
                    </div>
                    <div className="border-l border-slate-800 h-6 mx-2" />
                    <div>
                      <span className="text-2xl font-bold text-rose-400">{losingTrades.length}</span>
                      <span className="block text-[9px] text-slate-500 uppercase font-semibold">Losses</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rule Adherence Comparison */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Discipline Impact Study</h3>
                
                <div className="space-y-3">
                  {/* Rules Followed Win Rate */}
                  <div className="flex justify-between items-center bg-slate-950/40 border border-slate-900 p-4 rounded-2xl">
                    <div className="flex items-center gap-2.5">
                      <Award className="w-5 h-5 text-emerald-400" />
                      <div>
                        <span className="block text-xs font-bold text-slate-200">Rules Followed</span>
                        <span className="block text-[10px] text-slate-500">{followedTrades.length} Trades</span>
                      </div>
                    </div>
                    <span className="text-lg font-black text-emerald-400">{winRateFollowed.toFixed(0)}% <span className="text-[10px] text-slate-500 font-semibold">WR</span></span>
                  </div>

                  {/* Rules Broken Win Rate */}
                  <div className="flex justify-between items-center bg-slate-950/40 border border-slate-900 p-4 rounded-2xl">
                    <div className="flex items-center gap-2.5">
                      <ShieldAlert className="w-5 h-5 text-rose-450" />
                      <div>
                        <span className="block text-xs font-bold text-slate-200">Rules Broken</span>
                        <span className="block text-[10px] text-slate-500">{brokenTrades.length} Trades</span>
                      </div>
                    </div>
                    <span className="text-lg font-black text-rose-400">{winRateBroken.toFixed(0)}% <span className="text-[10px] text-slate-500 font-semibold">WR</span></span>
                  </div>
                </div>
              </div>

              {/* Cognitive Discipline Insight */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-300">Psychology Insight</h4>
                  <p className={`text-sm mt-1.5 font-bold leading-snug ${brokenTrades.length > 0 ? 'text-amber-400' : 'text-slate-405'}`}>
                    "{disciplineInsight}"
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1.5 leading-normal">
                    Skipping SL/TP limits exposes you to emotional exit errors. Keeping targets in place guarantees process mathematical integrity.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </main>
  )
}
