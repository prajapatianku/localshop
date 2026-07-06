'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signUp } from '@/app/actions/auth'
import { User, Store, Mail, Lock, Phone, UserCheck, ArrowRight, ShoppingBag } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState<'customer' | 'shopkeeper'>('customer')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    const formData = new FormData(e.currentTarget)
    formData.append('role', selectedRole)
    
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const result = await signUp(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else if (result?.success) {
      setSuccessMessage(result.message || 'Signup successful! Please check your email for confirmation.')
      setLoading(false)
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center px-4 py-8 relative overflow-hidden">
      {/* Premium Glassmorphic Decorative Gradients */}
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
            Join the neighborhood hyperlocal marketplace.
          </p>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-900 px-5 py-6 rounded-3xl shadow-xl">
          <h2 className="text-lg font-bold text-slate-100 mb-4">Create your account</h2>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs text-rose-400">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="rounded-xl bg-sky-500/10 border border-sky-500/20 p-3.5 text-xs text-sky-400">
                {successMessage}
              </div>
            )}

            {!successMessage && (
              <>
                {/* Role Selector Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('customer')}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all duration-200 text-center ${
                      selectedRole === 'customer'
                        ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                        : 'bg-slate-950/40 border-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <User className="w-5 h-5" />
                    <span className="text-xs font-bold">Buyer / Customer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole('shopkeeper')}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all duration-200 text-center ${
                      selectedRole === 'shopkeeper'
                        ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                        : 'bg-slate-950/40 border-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Store className="w-5 h-5" />
                    <span className="text-xs font-bold">Merchant / Seller</span>
                  </button>
                </div>

                {/* Input Fields */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <input
                        name="fullName"
                        type="text"
                        required
                        placeholder="John Doe"
                        className="block w-full rounded-2xl border-0 bg-slate-950/60 pl-10 pr-4 py-3 text-slate-200 ring-1 ring-inset ring-slate-900 placeholder:text-slate-600 focus:ring-2 focus:ring-sky-500 sm:text-xs outline-none transition-all duration-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Phone Number
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        name="phone"
                        type="tel"
                        required
                        placeholder="+91 98765 43210"
                        className="block w-full rounded-2xl border-0 bg-slate-950/60 pl-10 pr-4 py-3 text-slate-200 ring-1 ring-inset ring-slate-900 placeholder:text-slate-600 focus:ring-2 focus:ring-sky-500 sm:text-xs outline-none transition-all duration-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        name="email"
                        type="email"
                        required
                        placeholder="name@example.com"
                        className="block w-full rounded-2xl border-0 bg-slate-950/60 pl-10 pr-4 py-3 text-slate-200 ring-1 ring-inset ring-slate-900 placeholder:text-slate-600 focus:ring-2 focus:ring-sky-500 sm:text-xs outline-none transition-all duration-200"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">
                        Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          name="password"
                          type="password"
                          required
                          placeholder="••••••••"
                          className="block w-full rounded-2xl border-0 bg-slate-950/60 pl-10 pr-4 py-3 text-slate-200 ring-1 ring-inset ring-slate-900 placeholder:text-slate-600 focus:ring-2 focus:ring-sky-500 sm:text-xs outline-none transition-all duration-200"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">
                        Confirm
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          name="confirmPassword"
                          type="password"
                          required
                          placeholder="••••••••"
                          className="block w-full rounded-2xl border-0 bg-slate-950/60 pl-10 pr-4 py-3 text-slate-200 ring-1 ring-inset ring-slate-900 placeholder:text-slate-600 focus:ring-2 focus:ring-sky-500 sm:text-xs outline-none transition-all duration-200"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full justify-center items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 py-3.5 text-xs font-bold text-slate-950 shadow-lg shadow-sky-500/10 hover:from-sky-400 hover:to-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]"
                  >
                    {loading ? 'Creating account...' : 'Create Account'}
                    {!loading && <ArrowRight className="w-4 h-4 stroke-[2.5]" />}
                  </button>
                </div>
              </>
            )}
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-sky-400 hover:text-sky-300 transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
