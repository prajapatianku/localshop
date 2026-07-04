'use client'

import React, { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Edit3, CheckCircle, Circle, ArrowLeft, Loader2, Sparkles } from 'lucide-react'
import { getStrategies, deleteStrategy, setActiveStrategy } from './actions'

interface Rule {
  id: string
  rule_text: string
  sort_order: number
}

interface Strategy {
  id: string
  name: string
  is_active: boolean
  strategy_rules?: Rule[]
}

export default function StrategiesPage() {
  const router = useRouter()
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const load = async () => {
    try {
      const data = await getStrategies()
      setStrategies(data as Strategy[])
    } catch (err: any) {
      setError(err.message || 'Failed to load strategies.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleSetActive = (id: string) => {
    startTransition(async () => {
      const res = await setActiveStrategy(id)
      if (res?.error) {
        setError(res.error)
      } else {
        await load()
      }
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this strategy? Historical trades using this strategy will be preserved.')) return
    startTransition(async () => {
      const res = await deleteStrategy(id)
      if (res?.error) {
        setError(res.error)
      } else {
        await load()
      }
    })
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-6 pb-28 relative">
      <div className="absolute top-0 right-0 w-[50%] h-[30%] rounded-full bg-emerald-500/5 blur-[80px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-all active:scale-95">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            My Strategies
          </h1>
        </div>
        <Link
          href="/strategies/create"
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:from-emerald-400 hover:to-teal-400 shadow-md shadow-emerald-500/10 active:scale-95 transition-all select-none"
        >
          <Plus className="w-4 h-4" />
          New
        </Link>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-400 mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mb-4" />
          <p className="text-sm">Loading your strategies...</p>
        </div>
      ) : strategies.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 p-8 text-center flex flex-col items-center justify-center py-16 bg-slate-900/25">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-4">
            <Sparkles className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-300">No strategies yet</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-[240px] mx-auto">
            Create your first strategy and define its rules to start disciplined journaling.
          </p>
          <Link
            href="/strategies/create"
            className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 border border-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 active:scale-95 transition-all"
          >
            Create Strategy
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {strategies.map((strat) => (
            <div
              key={strat.id}
              className={`rounded-2xl border transition-all duration-300 relative overflow-hidden bg-slate-900/50 backdrop-blur-sm ${
                strat.is_active
                  ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/20'
                  : 'border-slate-800/80 hover:border-slate-700'
              }`}
            >
              {strat.is_active && (
                <div className="absolute top-0 right-0 bg-emerald-500/10 border-b border-l border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-bl-xl text-[10px] font-bold tracking-wider uppercase flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Active
                </div>
              )}

              <div className="p-5">
                <h3 className="text-base font-bold text-slate-200 pr-16 truncate">{strat.name}</h3>
                
                <p className="text-xs text-slate-500 mt-1.5">
                  {strat.strategy_rules?.length || 0} {(strat.strategy_rules?.length || 0) === 1 ? 'Rule' : 'Rules'} defined
                </p>

                {strat.strategy_rules && strat.strategy_rules.length > 0 && (
                  <ol className="mt-4 space-y-2 border-t border-slate-800/40 pt-4">
                    {strat.strategy_rules.slice(0, 3).map((rule, idx) => (
                      <li key={rule.id} className="text-xs text-slate-400 flex items-start gap-2">
                        <span className="text-slate-600 font-semibold">{idx + 1}.</span>
                        <span className="truncate">{rule.rule_text}</span>
                      </li>
                    ))}
                    {strat.strategy_rules.length > 3 && (
                      <li className="text-[10px] text-slate-600 font-medium pl-5 italic">
                        + {strat.strategy_rules.length - 3} more rules
                      </li>
                    )}
                  </ol>
                )}

                <div className="mt-5 pt-4 border-t border-slate-800/40 flex items-center justify-between gap-3">
                  {strat.is_active ? (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 py-1">
                      <CheckCircle className="w-4 h-4" />
                      Active Strategy
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSetActive(strat.id)}
                      disabled={isPending}
                      className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 active:scale-95 transition-all py-1 select-none"
                    >
                      <Circle className="w-4 h-4 text-slate-600" />
                      Set Active
                    </button>
                  )}

                  <div className="flex items-center gap-1">
                    <Link
                      href={`/strategies/edit/${strat.id}`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 active:scale-95 transition-all"
                    >
                      <Edit3 className="w-4.5 h-4.5" />
                    </Link>
                    <button
                      onClick={() => handleDelete(strat.id)}
                      disabled={isPending}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 active:scale-95 transition-all"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
