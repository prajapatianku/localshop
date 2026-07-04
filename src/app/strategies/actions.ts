'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getStrategies() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('strategies')
    .select('*, strategy_rules(*)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error

  // Sort rules of each strategy by sort_order
  if (data) {
    data.forEach(strat => {
      if (strat.strategy_rules) {
        strat.strategy_rules.sort((a: any, b: any) => a.sort_order - b.sort_order)
      }
    })
  }
  return data || []
}

export async function createStrategy(name: string, rules: string[]) {
  if (!name.trim()) return { error: 'Strategy name is required.' }
  const filteredRules = rules.map(r => r.trim()).filter(Boolean)
  if (filteredRules.length === 0) return { error: 'At least one rule is required.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // Check if this is the user's first strategy to make it active automatically
  const { count } = await supabase
    .from('strategies')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('deleted_at', null)

  const isFirst = count === 0

  const { data: strategy, error: stratError } = await supabase
    .from('strategies')
    .insert({
      name: name.trim(),
      user_id: user.id,
      is_active: isFirst,
    })
    .select()
    .single()

  if (stratError || !strategy) {
    return { error: stratError?.message || 'Failed to create strategy.' }
  }

  // Insert rules
  const rulesToInsert = filteredRules.map((ruleText, index) => ({
    strategy_id: strategy.id,
    rule_text: ruleText,
    sort_order: index + 1,
  }))

  const { error: rulesError } = await supabase
    .from('strategy_rules')
    .insert(rulesToInsert)

  if (rulesError) {
    // Clean up strategy if rules failed
    await supabase.from('strategies').delete().eq('id', strategy.id)
    return { error: rulesError.message }
  }

  revalidatePath('/strategies')
  revalidatePath('/')
  return { success: true }
}

export async function updateStrategy(id: string, name: string, rules: string[]) {
  if (!name.trim()) return { error: 'Strategy name is required.' }
  const filteredRules = rules.map(r => r.trim()).filter(Boolean)
  if (filteredRules.length === 0) return { error: 'At least one rule is required.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // Update strategy name
  const { error: stratError } = await supabase
    .from('strategies')
    .update({ name: name.trim() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (stratError) {
    return { error: stratError.message }
  }

  // Delete existing rules for this strategy
  const { error: deleteError } = await supabase
    .from('strategy_rules')
    .delete()
    .eq('strategy_id', id)

  if (deleteError) {
    return { error: deleteError.message }
  }

  const rulesToInsert = filteredRules.map((ruleText, index) => ({
    strategy_id: id,
    rule_text: ruleText,
    sort_order: index + 1,
  }))

  const { error: rulesError } = await supabase
    .from('strategy_rules')
    .insert(rulesToInsert)

  if (rulesError) {
    return { error: rulesError.message }
  }

  revalidatePath('/strategies')
  revalidatePath('/')
  return { success: true }
}

export async function deleteStrategy(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // Check if strategy was active
  const { data: currentStrat } = await supabase
    .from('strategies')
    .select('is_active')
    .eq('id', id)
    .single()

  const wasActive = currentStrat?.is_active

  // Soft delete
  const { error } = await supabase
    .from('strategies')
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  // If deleted strategy was active, assign active role to another one
  if (wasActive) {
    const { data: nextStrat } = await supabase
      .from('strategies')
      .select('id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle()

    if (nextStrat) {
      await supabase
        .from('strategies')
        .update({ is_active: true })
        .eq('id', nextStrat.id)
    }
  }

  revalidatePath('/strategies')
  revalidatePath('/')
  return { success: true }
}

export async function setActiveStrategy(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // Set all user strategies to inactive
  await supabase
    .from('strategies')
    .update({ is_active: false })
    .eq('user_id', user.id)
    .is('deleted_at', null)

  // Set selected strategy to active
  const { error } = await supabase
    .from('strategies')
    .update({ is_active: true })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/strategies')
  revalidatePath('/')
  return { success: true }
}

export async function getStrategyById(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('strategies')
    .select('*, strategy_rules(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .single()

  if (error) throw error

  if (data && data.strategy_rules) {
    data.strategy_rules.sort((a: any, b: any) => a.sort_order - b.sort_order)
  }

  return data
}
