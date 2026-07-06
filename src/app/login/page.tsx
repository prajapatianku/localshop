'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from '@/app/actions/auth'
import { Mail, Lock, ShoppingBag, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const result = await signIn(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else if (result?.success) {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center px-4 py-8 relative overflow-hidden">
      {/* Decorative Gradients */}
      <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] rounded-full bg-sky-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md mx-auto z-10">
        <div className="text-center mb-6">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-400 to-indigo-500 items-center justify-center shadow-lg shadow-sky-500/20 mb-3">
            <ShoppingBag className="w-6 h-6 text-slate-950 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-slate-100 via-sky-100 to-indigo-300 bg-clip-text text-transparent">
            Local Shop
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Welcome back! Discover nearby stores.
          </p>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-900 px-5 py-6 rounded-3xl shadow-xl">
          <h2 className="text-lg font-bold text-slate-100 mb-4">Sign In</h2>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs text-rose-400">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-medium text-slate-400 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="name@example.com"
                  className="block w-full rounded-2xl border-0 bg-slate-950/60 pl-10 pr-4 py-3 text-slate-200 ring-1 ring-inset ring-slate-900 placeholder:text-slate-600 focus:ring-2 focus:ring-sky-500 sm:text-xs outline-none transition-all duration-200"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-medium text-slate-400">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="block w-full rounded-2xl border-0 bg-slate-950/60 pl-10 pr-4 py-3 text-slate-200 ring-1 ring-inset ring-slate-900 placeholder:text-slate-600 focus:ring-2 focus:ring-sky-500 sm:text-xs outline-none transition-all duration-200"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 py-3.5 text-xs font-bold text-slate-950 shadow-lg shadow-sky-500/10 hover:from-sky-400 hover:to-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]"
              >
                {loading ? 'Signing in...' : 'Sign In'}
                {!loading && <ArrowRight className="w-4 h-4 stroke-[2.5]" />}
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            New to Local Shop?{' '}
            <Link href="/signup" className="font-semibold text-sky-400 hover:text-sky-300 transition-colors">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
