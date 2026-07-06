'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { searchShops, getShopkeeperShop } from '@/app/actions/shops'
import { getCategories } from '@/app/actions/products'
import { 
  MapPin, Navigation, Search, Filter, Compass, 
  CheckCircle2, Award, ShieldAlert, Star, Clock, 
  ShoppingBag, Sparkles, LogIn, ChevronRight, LayoutDashboard
} from 'lucide-react'

// Mock coordinates for Bistupur, Jamshedpur (Default fallback for testing hyperlocal)
const DEFAULT_LAT = 22.7996
const DEFAULT_LON = 86.1793

export default function HomePage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [shops, setShops] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Hyperlocal search states
  const [latitude, setLatitude] = useState<number>(DEFAULT_LAT)
  const [longitude, setLongitude] = useState<number>(DEFAULT_LON)
  const [locationName, setLocationName] = useState<string>('Bistupur, Jamshedpur')
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null)
  
  const [searchRadius, setSearchRadius] = useState<number>(5) // 5 KM default
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null)

  // Load user status
  useEffect(() => {
    async function loadSession() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setProfile(prof)
      }
    }
    loadSession()
  }, [])

  // Load categories
  useEffect(() => {
    async function loadCategories() {
      const cats = await getCategories()
      setCategories(cats)
    }
    loadCategories()
  }, [])

  // Check Geolocation permission on mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        if (result.state === 'granted') {
          setLocationGranted(true)
          requestLocation()
        } else if (result.state === 'prompt') {
          setLocationGranted(null)
        } else {
          setLocationGranted(false)
        }
      })
    }
  }, [])

  // Fetch shops when location or filters change
  useEffect(() => {
    async function fetchShops() {
      setLoading(true)
      const results = await searchShops(latitude, longitude, searchRadius)
      
      // Perform local query & subcategory match if search query or categories exist
      let filtered = results

      if (selectedCategory) {
        filtered = filtered.filter(shop => shop.category_id === selectedCategory || true) // Simplified for MVP
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        filtered = filtered.filter(shop => 
          shop.name.toLowerCase().includes(q) || 
          (shop.description && shop.description.toLowerCase().includes(q))
        )
      }

      setShops(filtered)
      setLoading(false)
    }
    fetchShops()
  }, [latitude, longitude, searchRadius, searchQuery, selectedCategory])

  const requestLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude)
          setLongitude(position.coords.longitude)
          setLocationGranted(true)
          setLocationName(`GPS Coordinates (${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)})`)
        },
        (error) => {
          console.error("Error getting geolocation:", error)
          setLocationGranted(false)
        }
      )
    }
  }

  // Categories list hierarchy grouping for UI layout
  const parentCategories = categories.filter(c => !c.parent_id)
  const subCategories = selectedCategory 
    ? categories.filter(c => c.parent_id === selectedCategory)
    : []

  // Rendering Helper: Verification badges
  const renderVerificationBadge = (level: string) => {
    switch (level) {
      case 'premium':
        return (
          <span className="flex items-center gap-1 text-[9px] bg-amber-500/10 text-amber-400 font-black tracking-wider uppercase border border-amber-500/20 px-2 py-0.5 rounded-full shadow-sm">
            <Award className="w-3 h-3 text-amber-400 fill-amber-400/20" /> Premium
          </span>
        )
      case 'verified':
        return (
          <span className="flex items-center gap-1 text-[9px] bg-sky-500/10 text-sky-400 font-bold tracking-wider uppercase border border-sky-500/20 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3 text-sky-400" /> Verified
          </span>
        )
      default:
        return (
          <span className="text-[9px] bg-slate-800 text-slate-400 font-bold tracking-wider uppercase border border-slate-700 px-2 py-0.5 rounded-full">
            Basic
          </span>
        )
    }
  }

  // Rendering Helper: Shop status badges
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <span className="px-2 py-0.5 rounded-lg text-[9px] bg-emerald-500/10 text-emerald-400 font-bold uppercase tracking-wider">Open</span>
      case 'closing_soon':
        return <span className="px-2 py-0.5 rounded-lg text-[9px] bg-amber-500/10 text-amber-400 font-bold uppercase tracking-wider animate-pulse">Closing Soon</span>
      case 'holiday':
        return <span className="px-2 py-0.5 rounded-lg text-[9px] bg-indigo-500/10 text-indigo-400 font-bold uppercase tracking-wider">Holiday</span>
      case 'temporarily_closed':
        return <span className="px-2 py-0.5 rounded-lg text-[9px] bg-rose-500/10 text-rose-400 font-bold uppercase tracking-wider">Temp Closed</span>
      default:
        return <span className="px-2 py-0.5 rounded-lg text-[9px] bg-slate-800 text-slate-500 font-bold uppercase tracking-wider">Closed</span>
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-4 py-4 pb-28 relative flex flex-col overflow-hidden">
      {/* Decorative Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[300px] h-[300px] rounded-full bg-sky-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[300px] h-[300px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

      {/* Top Header & Address Bar */}
      <div className="z-10 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center text-slate-950 font-black text-sm">
              LS
            </div>
            <span className="font-extrabold text-sm tracking-wide text-slate-200">Local Shop</span>
          </div>

          <div className="flex items-center gap-2">
            {profile?.role === 'shopkeeper' && (
              <Link
                href="/dashboard"
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-sky-400 hover:text-sky-300 transition-all"
              >
                <LayoutDashboard className="w-3.5 h-3.5" /> Panel
              </Link>
            )}
            {!user && (
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500 text-slate-950 text-xs font-black shadow-lg shadow-sky-500/10 active:scale-95 transition-all"
              >
                <LogIn className="w-3.5 h-3.5" /> Sign In
              </Link>
            )}
          </div>
        </div>

        {/* Hyperlocal Address Banner */}
        <div className="bg-slate-900/30 border border-slate-900/60 rounded-2xl p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <MapPin className="w-5 h-5 text-sky-400 shrink-0" />
            <div className="overflow-hidden">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current Location</span>
              <span className="block text-xs font-bold text-slate-200 truncate">{locationName}</span>
            </div>
          </div>
          <button 
            onClick={requestLocation}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-sky-400 hover:text-sky-300 hover:bg-slate-850 active:scale-95 transition-all"
            title="Locate Me"
          >
            <Navigation className="w-4 h-4 fill-sky-400/10" />
          </button>
        </div>
      </div>

      {/* Geolocation permission nudge if not granted */}
      {locationGranted === false && (
        <div className="z-10 mt-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3.5 text-xs text-amber-400 flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <p className="font-bold">Location Permission Denied</p>
            <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">
              Without location access, the hyperlocal search defaults to Bistupur, Jamshedpur. Enable location in browser settings for accurate listings.
            </p>
          </div>
        </div>
      )}

      {/* Search Input and Radius Filters */}
      <div className="z-10 mt-4 flex flex-col gap-3">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search shops or products..."
            className="block w-full rounded-2xl border-0 bg-slate-900/40 pl-10 pr-4 py-3.5 text-xs text-slate-200 ring-1 ring-inset ring-slate-900 placeholder:text-slate-600 focus:ring-2 focus:ring-sky-500 outline-none transition-all duration-200"
          />
        </div>

        {/* Search Radius Pills */}
        <div>
          <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Search Radius</span>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {[1, 3, 5, 10, 0].map((radius) => (
              <button
                key={radius}
                onClick={() => setSearchRadius(radius)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold border shrink-0 transition-all active:scale-95 ${
                  searchRadius === radius
                    ? 'bg-sky-500/10 border-sky-500/30 text-sky-400 shadow-sm shadow-sky-500/5'
                    : 'bg-slate-950/40 border-slate-900 text-slate-500 hover:text-slate-300'
                }`}
              >
                {radius === 0 ? 'Entire City' : `${radius} KM`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Categories Hierarchy section */}
      <div className="z-10 mt-4">
        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Shop Categories</span>
        <div className="grid grid-cols-4 gap-2.5">
          {parentCategories.map((cat) => {
            const isSelected = selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(isSelected ? null : cat.id)
                  setSelectedSubCategory(null)
                }}
                className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all duration-200 active:scale-95 text-center ${
                  isSelected
                    ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                    : 'bg-slate-900/20 border-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
                }`}
              >
                <Compass className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-bold tracking-tight line-clamp-1">{cat.name}</span>
              </button>
            )
          })}
        </div>

        {/* Subcategories Selector Bar if category is selected */}
        {selectedCategory && subCategories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto py-2.5 border-t border-slate-900/40 mt-3 scrollbar-none">
            {subCategories.map((subCat) => {
              const isSubSelected = selectedSubCategory === subCat.id
              return (
                <button
                  key={subCat.id}
                  onClick={() => setSelectedSubCategory(isSubSelected ? null : subCat.id)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold shrink-0 transition-all ${
                    isSubSelected
                      ? 'bg-sky-500 text-slate-950 font-black'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {subCat.name}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Shops List */}
      <div className="z-10 flex-1 flex flex-col mt-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Nearby Shopkeepers ({shops.length})
          </h3>
          <span className="text-[10px] text-slate-500 font-medium">Sorted by distance</span>
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col justify-center items-center py-12 text-slate-500 text-xs">
            <div className="w-8 h-8 rounded-full border-2 border-sky-500/20 border-t-sky-400 animate-spin mb-3" />
            Scanning neighborhood shops...
          </div>
        ) : shops.length === 0 ? (
          <div className="flex-1 flex flex-col justify-center items-center py-16 text-center bg-slate-900/10 border border-dashed border-slate-900 rounded-3xl p-6">
            <ShoppingBag className="w-8 h-8 text-slate-700 mb-2 stroke-[1.5]" />
            <p className="text-xs font-bold text-slate-400">No stores found nearby</p>
            <p className="text-[10px] text-slate-600 mt-1 max-w-[200px] leading-normal">
              Try adjusting your search radius or selection filters to browse more options.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {shops.map((shop) => (
              <Link
                key={shop.id}
                href={`/shop/${shop.id}`}
                className="block bg-slate-900/30 border border-slate-900 rounded-3xl p-4 hover:border-slate-800/80 transition-all active:scale-[0.99]"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    {/* Verification badge */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {renderVerificationBadge(shop.verification_level)}
                      {renderStatusBadge(shop.status)}
                    </div>
                    
                    <h4 className="text-base font-black text-slate-100 tracking-tight mt-2 flex items-center gap-1.5">
                      {shop.name}
                    </h4>
                    
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                      {shop.description || 'No store description available.'}
                    </p>
                  </div>
                  
                  {/* Distance badge */}
                  <div className="text-right shrink-0">
                    <span className="block text-[11px] font-black text-sky-400">
                      {shop.distance_km ? `${shop.distance_km.toFixed(1)} KM` : 'N/A'}
                    </span>
                    <span className="block text-[9px] text-slate-500 font-bold uppercase mt-0.5">distance</span>
                  </div>
                </div>

                {/* Delivery details row */}
                <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-slate-900/60 text-[10px] text-slate-500 font-semibold tracking-wide">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-650" />
                    <span>ETA: {shop.estimated_delivery_time}</span>
                  </div>
                  
                  <div>
                    {shop.delivery_available ? (
                      <span>
                        Delivery: {shop.delivery_charge === 0 ? 'FREE' : `₹${shop.delivery_charge}`}
                        {shop.free_delivery_threshold > 0 && ` (Free > ₹${shop.free_delivery_threshold})`}
                      </span>
                    ) : (
                      <span className="text-slate-600">Self Pickup Only</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
