import Link from 'next/link'
import { getActiveTrade, getActiveStrategyWithRules } from './trade/actions'
import { AlertCircle, ArrowUpRight, TrendingUp, ShieldCheck, Play, ArrowRight, Activity, LogOut } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'

export default async function Home() {
  const activeTrade = await getActiveTrade()
  const activeStrategyRes = await getActiveStrategyWithRules()
  
  // Determine where the "Ready to Trade" button will route
  let readyToTradeRoute = '/trade/checklist'
  let warningMessage = null

  if (activeStrategyRes.error === 'no_active_strategy') {
    if (!activeStrategyRes.hasAnyStrategy) {
      readyToTradeRoute = '/strategies/create'
      warningMessage = 'You need to create a strategy before you can journal a trade.'
    } else {
      readyToTradeRoute = '/strategies'
      warningMessage = 'Please select and activate a trading strategy first.'
    }
  }

  // Get current user details for welcome message
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const email = user?.email || 'Trader'
  const username = email.split('@')[0]

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-6 pb-28 relative flex flex-col justify-between overflow-hidden">
      {/* Glow backgrounds */}
      <div className="absolute top-[-10%] right-[-10%] w-[70%] h-[50%] rounded-full bg-emerald-500/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[70%] h-[50%] rounded-full bg-teal-500/5 blur-[100px] pointer-events-none" />

      {/* Top Greeting */}
      <div className="z-10">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-sm">
              GT
            </div>
            <span className="font-extrabold text-sm tracking-wide text-slate-300">Gully Trader</span>
          </div>
          <Link
            href="/profile"
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/80 text-slate-400 hover:text-slate-200 transition-all"
          >
            <LogOut className="w-4 h-4 rotate-180" />
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-xl font-medium text-slate-400">
            Welcome back,
          </h1>
          <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight capitalize mt-0.5">
            {username}
          </h2>
        </div>
      </div>

      {/* Main Action Loop Area */}
      <div className="flex-1 flex flex-col justify-center items-center py-6 z-10">
        {activeTrade ? (
          /* Active Trade Card */
          <div className="w-full bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden ring-1 ring-emerald-500/20">
            <div className="absolute top-0 right-0 bg-emerald-500/10 border-b border-l border-emerald-500/20 text-emerald-400 px-3.5 py-1 rounded-bl-2xl text-[9px] font-extrabold tracking-widest uppercase flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              LIVE POSITION
            </div>

            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Active Trade
            </span>

            <div className="flex items-baseline gap-3 mt-2">
              <h3 className="text-3xl font-black tracking-tight text-slate-100">
                {activeTrade.symbol}
              </h3>
              <span className="px-2 py-0.5 rounded-lg text-[9px] bg-slate-800 text-slate-300 font-extrabold uppercase tracking-wider">
                {activeTrade.trade_legs?.length || 0} Leg{(activeTrade.trade_legs?.length || 0) !== 1 ? 's' : ''}
              </span>
            </div>

            <p className="text-xs text-slate-500 mt-2">
              Strategy: {activeTrade.strategies?.name || 'Manual'}
            </p>

            {/* Render active trade legs */}
            <div className="space-y-2 mt-5 border-t border-slate-850 pt-4">
              {(activeTrade.trade_legs || []).map((leg: any, idx: number) => (
                <div key={leg.id} className="flex justify-between items-center bg-slate-950/40 border border-slate-900 rounded-xl p-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                      leg.action === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {leg.action === 'BUY' ? 'BUY' : 'SELL'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 text-[8px] font-bold uppercase">
                      {leg.option_type === 'NONE' ? 'SPOT' : leg.option_type}
                    </span>
                  </div>
                  <div className="text-right text-slate-400">
                    <span className="font-bold text-slate-300">{leg.entry_price}</span>
                    <span className="text-[10px] text-slate-500 ml-1.5">({leg.lot_size} Lots)</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-slate-850 text-center">
              <div>
                <span className="block text-[10px] font-bold text-rose-500/80 uppercase tracking-wider">Stop Loss</span>
                <span className="block text-sm font-extrabold text-rose-400/90 mt-1">{activeTrade.sl}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-emerald-500/80 uppercase tracking-wider">Take Profit</span>
                <span className="block text-sm font-extrabold text-emerald-400/90 mt-1">{activeTrade.tp}</span>
              </div>
            </div>

            <Link
              href={`/trade/close/${activeTrade.id}`}
              className="mt-6 flex w-full justify-center items-center gap-1.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-4 text-sm font-extrabold text-slate-950 shadow-lg shadow-emerald-500/15 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] transition-all select-none"
            >
              Close Trade
              <ArrowUpRight className="w-4.5 h-4.5" />
            </Link>
          </div>
        ) : (
          /* Ready to Trade Glowing Center Button */
          <div className="flex flex-col items-center">
            {warningMessage && (
              <div className="mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3.5 text-xs text-amber-400 flex items-center gap-2 max-w-[280px] text-center">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
                <span>{warningMessage}</span>
              </div>
            )}

            <Link
              href={readyToTradeRoute}
              className="w-48 h-48 rounded-full bg-gradient-to-tr from-emerald-400 via-teal-500 to-emerald-600 flex flex-col items-center justify-center text-slate-950 font-black text-xl tracking-wide shadow-2xl shadow-emerald-500/30 hover:scale-105 active:scale-[0.97] transition-all duration-300 relative group select-none"
            >
              {/* Outer pulsing ring */}
              <div className="absolute inset-0 rounded-full border-4 border-emerald-400/30 animate-pulse group-hover:scale-110 transition-all duration-300" />
              <Activity className="w-8 h-8 mb-2 stroke-[2.5px] text-slate-950" />
              <span>Ready to</span>
              <span className="tracking-widest uppercase text-2xl font-black mt-0.5">Trade</span>
            </Link>

            {activeStrategyRes.strategy && (
              <p className="mt-6 text-xs text-slate-500 font-semibold tracking-wider uppercase text-center flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Strategy: {activeStrategyRes.strategy.name}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Tiny Insight Card / Quick Tip at bottom */}
      <div className="mt-auto bg-slate-900/30 border border-slate-900 rounded-2xl p-4 flex items-start gap-3 z-10">
        <TrendingUp className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-bold text-slate-300">Trading Discipline Tip</h4>
          <p className="text-[11px] text-slate-500 mt-1 leading-normal">
            Traders who strictly follow a rule-based execution process increase their long-term expectancy by over 40%. Don't skip the checks.
          </p>
        </div>
      </div>
    </main>
  )
}
