'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Home, ShoppingBag, ShoppingCart, ScrollText, User, Store, LayoutDashboard, AlertOctagon } from 'lucide-react'

export default function BottomNav() {
  const pathname = usePathname()
  const [role, setRole] = useState<'customer' | 'shopkeeper' | 'admin' | null>(null)
  const [loading, setLoading] = useState(true)

  // Hide nav on authentication pages
  const hidePaths = ['/login', '/signup']
  const shouldHide = hidePaths.some(p => pathname === p || pathname.startsWith(p))

  useEffect(() => {
    async function fetchUserRole() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setRole(null)
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        setRole(profile?.role || 'customer')
      } catch (err) {
        console.error("Error loading user details in BottomNav:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchUserRole()
  }, [pathname]) // Refresh check when path changes

  if (shouldHide) return null

  // Define navigation layout based on roles
  let navItems = []

  if (role === 'shopkeeper') {
    navItems = [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Orders', href: '/dashboard/orders', icon: ScrollText },
      { label: 'Products', href: '/dashboard/products', icon: Store },
      { label: 'Profile', href: '/profile', icon: User },
    ]
  } else if (role === 'admin') {
    navItems = [
      { label: 'Admin', href: '/admin', icon: AlertOctagon },
      { label: 'Shops', href: '/', icon: Home },
      { label: 'Profile', href: '/profile', icon: User },
    ]
  } else {
    // Customer or Guest mode
    navItems = [
      { label: 'Browse', href: '/', icon: Home },
      { label: 'Cart', href: '/cart', icon: ShoppingCart },
      { label: 'Orders', href: '/orders', icon: ScrollText },
      { label: 'Profile', href: '/profile', icon: User },
    ]
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-xl border-t border-slate-900 px-2 py-2.5 pb-safe select-none">
      <div className="max-w-md mx-auto flex justify-around items-center">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-200 active:scale-95 text-center flex-1"
            >
              <Icon
                className={`w-[22px] h-[22px] transition-colors duration-200 ${
                  isActive
                    ? 'text-sky-400 stroke-[2.5px] filter drop-shadow-[0_0_8px_rgba(56,189,248,0.4)]'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              />
              <span
                className={`text-[9px] mt-1 font-medium tracking-wide transition-colors duration-200 ${
                  isActive ? 'text-sky-400 font-bold' : 'text-slate-500'
                }`}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
