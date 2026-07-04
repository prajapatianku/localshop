'use client'

import React, { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, ArrowUp, ArrowDown, Loader2 } from 'lucide-react'
import { getStrategyById, updateStrategy } from '../../actions'

interface EditStrategyPageProps {
  params: Promise<{ id: string }>
}

export default function EditStrategyPage({ params }: EditStrategyPageProps) {
  const router = useRouter()
  const { id } = use(params)

  const [name, setName] = useState('')
  const [rules, setRules] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadStrategy() {
      try {
        const data = await getStrategyById(id)
        if (data) {
          setName(data.name)
          setRules(data.strategy_rules?.map((r: any) => r.rule_text) || [''])
        } else {
          setError('Strategy not found.')
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load strategy details.')
      } finally {
        setLoading(false)
      }
    }

    loadStrategy()
  }, [id])

  const handleAddRule = () => {
    setRules([...rules, ''])
  }

  const handleRemoveRule = (index: number) => {
    if (rules.length === 1) {
      setError('A strategy must have at least one rule.')
      return
    }
    const newRules = [...rules]
    newRules.splice(index, 1)
    setRules(newRules)
    setError(null)
  }

  const handleRuleChange = (index: number, value: string) => {
    const newRules = [...rules]
    newRules[index] = value
    setRules(newRules)
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const newRules = [...rules]
    const temp = newRules[index]
    newRules[index] = newRules[index - 1]
    newRules[index - 1] = temp
    setRules(newRules)
  }

  const handleMoveDown = (index: number) => {
    if (index === rules.length - 1) return
    const newRules = [...rules]
    const temp = newRules[index]
    newRules[index] = newRules[index + 1]
    newRules[index + 1] = temp
    setRules(newRules)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Strategy name is required.')
      return
    }

    const validRules = rules.map(r => r.trim()).filter(Boolean)
    if (validRules.length === 0) {
      setError('At least one non-empty rule is required.')
      return
    }

    setSaving(true)
    const result = await updateStrategy(id, name, validRules)
    setSaving(false)

    if (result?.error) {
      setError(result.error)
    } else if (result?.success) {
      router.push('/strategies')
      router.refresh()
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-6 pb-28 relative">
      <div className="absolute top-0 left-0 w-[50%] h-[30%] rounded-full bg-indigo-500/5 blur-[80px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/strategies" className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-all active:scale-95">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Edit Strategy</h1>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mb-4" />
          <p className="text-sm">Fetching strategy rules...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-400">
              {error}
            </div>
          )}

          {/* Strategy Name */}
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-slate-300">
              Strategy Name
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. SL Hunting"
              className="block w-full rounded-2xl border-0 bg-slate-900 px-4 py-3.5 text-slate-100 shadow-sm ring-1 ring-inset ring-slate-800 placeholder:text-slate-500 focus:ring-2 focus:ring-inset focus:ring-emerald-500 sm:text-sm outline-none transition-all duration-200"
            />
          </div>

          {/* Rules Checklist Builder */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-slate-300">
                Rules Checklist (in order)
              </label>
              <button
                type="button"
                onClick={handleAddRule}
                className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Rule
              </button>
            </div>

            <div className="space-y-3">
              {rules.map((rule, index) => (
                <div key={index} className="flex items-center gap-2 bg-slate-900/40 border border-slate-800/80 p-3 rounded-2xl">
                  <span className="text-xs font-bold text-slate-600 w-5 text-center">
                    {index + 1}
                  </span>

                  <input
                    type="text"
                    required
                    value={rule}
                    onChange={(e) => handleRuleChange(index, e.target.value)}
                    placeholder={`Rule ${index + 1} description`}
                    className="flex-1 min-w-0 bg-transparent border-0 text-slate-100 placeholder:text-slate-600 focus:ring-0 p-0 text-sm outline-none"
                  />

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="p-1 rounded text-slate-500 hover:text-slate-300 disabled:opacity-30 disabled:hover:text-slate-500"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === rules.length - 1}
                      className="p-1 rounded text-slate-500 hover:text-slate-300 disabled:opacity-30 disabled:hover:text-slate-500"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveRule(index)}
                      className="p-1 rounded text-slate-600 hover:text-rose-400 hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex w-full justify-center rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-4 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/15 hover:from-emerald-400 hover:to-teal-400 active:scale-95 transition-all disabled:opacity-50 select-none"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      )}
    </main>
  )
}
