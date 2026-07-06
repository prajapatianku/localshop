'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signOut } from '@/app/actions/auth'
import { getAddresses, addAddress, deleteAddress } from '@/app/actions/user'
import { createClient } from '@/utils/supabase/client'
import { 
  LogOut, Shield, Key, Sparkles, User, MapPin, 
  Trash2, Plus, Star, Heart, Check, Loader
} from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [addresses, setAddresses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // New address states
  const [showAddAddress, setShowAddAddress] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addrErr, setAddrErr] = useState<string | null>(null)

  useEffect(() => {
    async function loadProfileAndAddresses() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
          setProfile(prof)

          const addrs = await getAddresses()
          setAddresses(addrs)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadProfileAndAddresses()
  }, [])

  const handleSignOut = async () => {
    await signOut()
  }

  const handleAddAddress = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setAdding(true)
    setAddrErr(null)

    const formData = new FormData(e.currentTarget)
    formData.append('latitude', '22.7996') // Standard default coordinates Bistupur
    formData.append('longitude', '86.1793')

    const result = await addAddress(formData)
    setAdding(false)

    if (result.error) {
      setAddrErr(result.error)
    } else {
      setShowAddAddress(false)
      const updatedAddrs = await getAddresses()
      setAddresses(updatedAddrs)
    }
  }

  const handleDeleteAddress = async (id: string) => {
    const confirmDelete = window.confirm("Delete this address?")
    if (!confirmDelete) return

    const result = await deleteAddress(id)
    if (result.success) {
      const updatedAddrs = await getAddresses()
      setAddresses(updatedAddrs)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center py-20">
        <Loader className="w-8 h-8 animate-spin text-sky-400 mb-4" />
        <p className="text-xs text-slate-500">Retrieving account data...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-5 pb-28 relative flex flex-col justify-between overflow-hidden">
      {/* Gradients */}
      <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full bg-sky-500/5 blur-[100px] pointer-events-none" />

      <div>
        <h1 className="text-xl font-black tracking-tight mb-6">My Account</h1>

        {/* Profile Card */}
        <div className="bg-slate-900/30 border border-slate-900 rounded-3xl p-5 mb-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center text-slate-950">
            <User className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-black text-slate-200 truncate capitalize">{profile?.full_name || 'User'}</h3>
            <span className="block text-[11px] text-slate-500 truncate">{profile?.email}</span>
            <span className="inline-block px-2 py-0.5 mt-1 rounded bg-slate-950/60 border border-slate-900 text-[8px] font-black uppercase text-sky-400 tracking-wider">
              {profile?.role}
            </span>
          </div>
        </div>

        {/* Hyperlocal Address Manager */}
        <div className="bg-slate-900/20 border border-slate-900 rounded-3xl p-5 mb-5 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-900/60 pb-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-sky-400" /> Saved Addresses
            </h3>
            <button
              onClick={() => setShowAddAddress(!showAddAddress)}
              className="p-1 text-sky-400 hover:text-sky-300 rounded active:scale-90 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
            </button>
          </div>

          {/* Add Address Form Toggle */}
          {showAddAddress && (
            <form onSubmit={handleAddAddress} className="space-y-3 bg-slate-950/40 p-3 rounded-2xl border border-slate-900/80">
              {addrErr && (
                <div className="text-[10px] text-rose-400">{addrErr}</div>
              )}
              <div>
                <label className="block text-[8px] font-bold text-slate-500 uppercase mb-1">Address Details</label>
                <input
                  name="addressLine"
                  type="text"
                  required
                  placeholder="e.g. Block C, Flat 102, Bistupur"
                  className="block w-full rounded-xl border-0 bg-slate-900 px-3 py-2 text-xs text-slate-200 ring-1 ring-inset ring-slate-850 outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="isDefault"
                  name="isDefault"
                  value="true"
                  type="checkbox"
                  className="rounded text-sky-500 bg-slate-900 border-slate-850 focus:ring-sky-500"
                />
                <label htmlFor="isDefault" className="text-[10px] text-slate-400 font-bold select-none">Set as default delivery address</label>
              </div>
              <button
                type="submit"
                disabled={adding}
                className="w-full py-2 bg-sky-500 text-slate-950 font-black rounded-xl text-[10px] uppercase active:scale-95 transition-all"
              >
                {adding ? 'Adding...' : 'Add Address'}
              </button>
            </form>
          )}

          {/* List Addresses */}
          {addresses.length === 0 ? (
            <p className="text-[10px] text-slate-500">No saved addresses. Add a delivery address above.</p>
          ) : (
            <div className="space-y-2.5">
              {addresses.map((addr) => (
                <div 
                  key={addr.id} 
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 border border-slate-900/60"
                >
                  <div className="flex items-start gap-2 overflow-hidden pr-3">
                    <MapPin className="w-3.5 h-3.5 text-slate-650 shrink-0 mt-0.5" />
                    <div className="overflow-hidden">
                      <p className="text-xs text-slate-300 truncate leading-tight">{addr.address_line}</p>
                      {addr.is_default && (
                        <span className="inline-block text-[8px] bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 px-1.5 py-0.2 rounded mt-1 uppercase tracking-wide">
                          Default
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteAddress(addr.id)}
                    className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg active:scale-90 transition-all shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Admin Gated Console Access */}
        {profile?.role === 'admin' && (
          <Link
            href="/admin"
            className="flex justify-between items-center bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-3xl text-xs text-indigo-300 font-bold transition-all active:scale-[0.98] mb-5"
          >
            <span className="flex items-center gap-2">
              <Key className="w-4 h-4" /> Admin Console
            </span>
            <Shield className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Sign Out Action */}
      <div>
        <button
          onClick={handleSignOut}
          className="flex w-full justify-center items-center gap-2 rounded-2xl bg-rose-500/10 border border-rose-500/20 px-4 py-3.5 text-xs font-bold text-rose-400 hover:bg-rose-500/20 active:scale-95 transition-all select-none"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </main>
  )
}
