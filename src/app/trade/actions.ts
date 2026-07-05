'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getActiveTrade() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch open trade along with its legs and strategy name (excluding soft-deleted)
  const { data, error } = await supabase
    .from('trades')
    .select('*, strategies(name), trade_legs(*)')
    .eq('user_id', user.id)
    .eq('status', 'OPEN')
    .is('deleted_at', null)
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

interface PlaceLegParam {
  action: 'BUY' | 'SELL'
  optionType: 'CALL' | 'PUT' | 'NONE'
  entryPrice: number
  lotSize: number
}

interface PlaceTradeParams {
  strategyId: string
  symbol: string
  sl: number
  tp: number
  entryDatetime: string
  checklist: { ruleId: string; checked: boolean }[]
  legs: PlaceLegParam[]
}

export async function placeTrade(params: PlaceTradeParams) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  if (params.legs.length === 0) {
    return { error: 'At least one trade leg is required.' }
  }

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

  // 3. Insert parent trade
  const { data: trade, error: tradeError } = await supabase
    .from('trades')
    .insert({
      user_id: user.id,
      strategy_id: params.strategyId,
      symbol: params.symbol.toUpperCase().trim(),
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

  // 4. Insert legs
  const legRows = params.legs.map(leg => ({
    trade_id: trade.id,
    action: leg.action,
    option_type: leg.optionType,
    entry_price: leg.entryPrice,
    lot_size: leg.lotSize,
  }))

  const { error: legsError } = await supabase
    .from('trade_legs')
    .insert(legRows)

  if (legsError) {
    await supabase.from('trades').delete().eq('id', trade.id)
    return { error: legsError.message }
  }

  // 5. Save checklist results
  const checklistRows = params.checklist.map(item => ({
    trade_id: trade.id,
    strategy_rule_id: item.ruleId,
    checked: item.checked,
  }))

  const { error: checklistError } = await supabase
    .from('trade_checklist_results')
    .insert(checklistRows)

  if (checklistError) {
    await supabase.from('trades').delete().eq('id', trade.id)
    return { error: checklistError.message }
  }

  revalidatePath('/')
  revalidatePath('/journal')
  revalidatePath('/analyze')
  return { success: true }
}

interface CloseLegParam {
  legId: string
  exitPrice: number
}

interface CloseTradeParams {
  tradeId: string
  exitDatetime: string
  performedAsExpected: boolean
  followedSlTpRules: boolean
  legs: CloseLegParam[]
}

export async function closeTrade(params: CloseTradeParams) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: trade, error: fetchError } = await supabase
    .from('trades')
    .select('*, trade_legs(*)')
    .eq('id', params.tradeId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !trade) {
    return { error: fetchError?.message || 'Trade not found.' }
  }

  let totalPnl = 0

  for (const closeLeg of params.legs) {
    const originalLeg = (trade.trade_legs || []).find((l: any) => l.id === closeLeg.legId)
    if (!originalLeg) continue

    const entry = Number(originalLeg.entry_price)
    const exit = Number(closeLeg.exitPrice)
    const lotSize = Number(originalLeg.lot_size)
    const action = originalLeg.action

    const legPnl = action === 'BUY' ? (exit - entry) * lotSize : (entry - exit) * lotSize
    totalPnl += legPnl

    const { error: legUpdateError } = await supabase
      .from('trade_legs')
      .update({
        exit_price: exit,
        exit_datetime: params.exitDatetime,
        pnl: legPnl
      })
      .eq('id', closeLeg.legId)

    if (legUpdateError) {
      return { error: legUpdateError.message }
    }
  }

  const { error: updateError } = await supabase
    .from('trades')
    .update({
      exit_datetime: params.exitDatetime,
      pnl: totalPnl,
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

export async function getTradeById(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('trades')
    .select('*, strategies(name), trade_legs(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  if (error) throw error
  return data
}

export async function getClosedTrades() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('trades')
    .select('*, strategies(name), trade_legs(*)')
    .eq('user_id', user.id)
    .eq('status', 'CLOSED')
    .is('deleted_at', null)
    .order('exit_datetime', { ascending: false })

  if (error) throw error
  return data || []
}

// ----------------------------------------------------
// V3 UPDATE: Soft Delete & Edit Actions
// ----------------------------------------------------

export async function softDeleteTrade(tradeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('trades')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', tradeId)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/')
  revalidatePath('/journal')
  revalidatePath('/analyze')
  return { success: true }
}

interface EditLegParam {
  id: string
  action: 'BUY' | 'SELL'
  optionType: 'CALL' | 'PUT' | 'NONE'
  entryPrice: number
  lotSize: number
  exitPrice: number | null
}

interface EditTradeParams {
  tradeId: string
  symbol: string
  sl: number
  tp: number
  entryDatetime: string
  exitDatetime: string
  performedAsExpected: boolean
  followedSlTpRules: boolean
  legs: EditLegParam[]
}

export async function saveEditedTrade(params: EditTradeParams) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // 1. Fetch trade to verify ownership
  const { data: trade, error: fetchError } = await supabase
    .from('trades')
    .select('id')
    .eq('id', params.tradeId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !trade) {
    return { error: 'Trade record not found or access denied.' }
  }

  let totalPnl = 0

  // 2. Update legs individually and compute P/L
  for (const leg of params.legs) {
    let legPnl: number | null = null
    
    if (leg.exitPrice !== null && !isNaN(leg.exitPrice)) {
      const entry = Number(leg.entryPrice)
      const exit = Number(leg.exitPrice)
      const lots = Number(leg.lotSize)
      legPnl = leg.action === 'BUY' ? (exit - entry) * lots : (entry - exit) * lots
      totalPnl += legPnl
    }

    const { error: legUpdateError } = await supabase
      .from('trade_legs')
      .update({
        action: leg.action,
        option_type: leg.optionType,
        entry_price: leg.entryPrice,
        lot_size: leg.lotSize,
        exit_price: leg.exitPrice,
        exit_datetime: params.exitDatetime,
        pnl: legPnl
      })
      .eq('id', leg.id)
      .eq('trade_id', params.tradeId)

    if (legUpdateError) {
      return { error: `Failed to update leg: ${legUpdateError.message}` }
    }
  }

  // 3. Update the parent trade record
  const { error: tradeUpdateError } = await supabase
    .from('trades')
    .update({
      symbol: params.symbol.toUpperCase().trim(),
      sl: params.sl,
      tp: params.tp,
      entry_datetime: params.entryDatetime,
      exit_datetime: params.exitDatetime,
      pnl: totalPnl,
      performed_as_expected: params.performedAsExpected,
      followed_sl_tp_rules: params.followedSlTpRules,
    })
    .eq('id', params.tradeId)
    .eq('user_id', user.id)

  if (tradeUpdateError) {
    return { error: `Failed to update trade: ${tradeUpdateError.message}` }
  }

  revalidatePath('/')
  revalidatePath('/journal')
  revalidatePath('/analyze')

  return { success: true }
}
