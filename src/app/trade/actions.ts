'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getActiveTrade() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('trades')
    .select('*, strategies(name)')
    .eq('user_id', user.id)
    .eq('status', 'OPEN')
    .maybeSingle()

  if (error) {
    console.error('Error fetching active trade:', error)
    return null
  }

  return data
}

export async function getActiveStrategyWithRules() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Get active strategy
  const { data: strategy, error: stratError } = await supabase
    .from('strategies')
    .select('id, name')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (stratError) {
    return { error: stratError.message }
  }

  if (!strategy) {
    // Check if they have ANY strategy at all to recommend setting active
    const { data: anyStrat } = await supabase
      .from('strategies')
      .select('id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle()

    return { 
      error: 'no_active_strategy', 
      hasAnyStrategy: !!anyStrat 
    }
  }

  // Get rules
  const { data: rules, error: rulesError } = await supabase
    .from('strategy_rules')
    .select('id, rule_text, sort_order')
    .eq('strategy_id', strategy.id)
    .order('sort_order', { ascending: true })

  if (rulesError) {
    return { error: rulesError.message }
  }

  return {
    strategy,
    rules: rules || []
  }
}

interface PlaceTradeParams {
  strategyId: string
  symbol: string
  direction: 'BUY' | 'SELL'
  entryPrice: number
  sl: number
  tp: number
  quantity: number | null
  entryDatetime: string
  checklist: { ruleId: string; checked: boolean }[]
}

export async function placeTrade(params: PlaceTradeParams) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // 1. Verify no active trade is open
  const activeTrade = await getActiveTrade()
  if (activeTrade) {
    return { error: 'You already have an active trade open. Close it first before starting a new one.' }
  }

  // 2. Verify all checklist items are checked
  const allChecked = params.checklist.every(item => item.checked)
  if (!allChecked || params.checklist.length === 0) {
    return { error: 'Discipline error: All rules in the checklist must be verified and checked.' }
  }

  // 3. Insert the trade
  const { data: trade, error: tradeError } = await supabase
    .from('trades')
    .insert({
      user_id: user.id,
      strategy_id: params.strategyId,
      symbol: params.symbol.toUpperCase().trim(),
      direction: params.direction,
      entry_price: params.entryPrice,
      sl: params.sl,
      tp: params.tp,
      entry_datetime: params.entryDatetime,
      status: 'OPEN',
    })
    .select()
    .single()

  if (tradeError || !trade) {
    return { error: tradeError?.message || 'Failed to place trade.' }
  }

  // 4. Save checklist results
  const checklistRows = params.checklist.map(item => ({
    trade_id: trade.id,
    strategy_rule_id: item.ruleId,
    checked: item.checked,
  }))

  const { error: checklistError } = await supabase
    .from('trade_checklist_results')
    .insert(checklistRows)

  if (checklistError) {
    // rollback trade if checklist fails
    await supabase.from('trades').delete().eq('id', trade.id)
    return { error: checklistError.message }
  }

  revalidatePath('/')
  revalidatePath('/journal')
  revalidatePath('/analyze')
  return { success: true }
}

interface CloseTradeParams {
  tradeId: string
  exitPrice: number
  exitDatetime: string
  performedAsExpected: boolean
  followedSlTpRules: boolean
}

export async function closeTrade(params: CloseTradeParams) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // 1. Fetch the trade
  const { data: trade, error: fetchError } = await supabase
    .from('trades')
    .select('*')
    .eq('id', params.tradeId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !trade) {
    return { error: fetchError?.message || 'Trade not found.' }
  }

  const entryPrice = Number(trade.entry_price)
  const exitPrice = Number(params.exitPrice)
  const sl = Number(trade.sl)
  const direction = trade.direction

  // Calculate P&L: pnl = (exit - entry) for BUY, (entry - exit) for SELL.
  // We don't have quantity stored in schema since quantity is optional in prompt's table definition
  // but it's optional for display. Let's store P/L as price differential (or multiplier if they want, let's keep it as difference)
  // Wait! The prompt says "Quantity/Lot size (optional)" in description, but in the trades table schema it was:
  // trades(id, user_id, strategy_id, symbol, direction, entry_price, sl, tp, entry_datetime, exit_price, exit_datetime, pnl, pnl_type, status, performed_as_expected, followed_sl_tp_rules, created_at)
  // It has pnl and pnl_type, but no quantity column listed in the schema.
  // Wait, let's calculate P/L in points/dollars and assume a standard multiplier of 1 for the basic P/L if no quantity.
  // Or we can save P/L directly. Let's do `pnl = (direction === 'BUY' ? (exitPrice - entryPrice) : (entryPrice - exitPrice))`
  const pnlMultiplier = 1
  const rawPnl = direction === 'BUY' ? (exitPrice - entryPrice) : (entryPrice - exitPrice)
  const computedPnl = rawPnl * pnlMultiplier

  // Calculate R-Multiple:
  // Risk (R) = abs(entry - sl)
  const risk = Math.abs(entryPrice - sl)
  const rMultiple = risk > 0 ? rawPnl / risk : 0

  // Update trade record
  const { error: updateError } = await supabase
    .from('trades')
    .update({
      exit_price: exitPrice,
      exit_datetime: params.exitDatetime,
      pnl: computedPnl,
      pnl_type: 'amount', // We'll label as amount
      status: 'CLOSED',
      performed_as_expected: params.performedAsExpected,
      followed_sl_tp_rules: params.followedSlTpRules,
    })
    .eq('id', params.tradeId)
    .eq('user_id', user.id)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath('/')
  revalidatePath('/journal')
  revalidatePath('/analyze')

  return { 
    success: true, 
    followedRules: params.followedSlTpRules 
  }
}
