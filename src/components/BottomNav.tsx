'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ListChecks, BookOpen, BarChart3, User } from 'lucide-react'

export default function BottomNav() {
  const pathname = usePathname()

  // Hide nav on authentication and gating routes
  const hidePaths = ['/login', '/signup', '/subscribe']
  const shouldHide = hidePaths.some(p => pathname === p || pathname.startsWith(p))
  
  if (shouldHide) return null

  const navItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Strategies', href: '/strategies', icon: ListChecks },
    { label: 'Journal', href: '/journal', icon: BookOpen },
    { label: 'Analyze', href: '/analyze', icon: BarChart3 },
    { label: 'Profile', href: '/profile', icon: User },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-t border-slate-800/80 px-2 py-2.5 pb-safe select-none">
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
                    ? 'text-emerald-400 stroke-[2.5px] filter drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              />
              <span
                className={`text-[9px] mt-1 font-medium tracking-wide transition-colors duration-200 ${
                  isActive ? 'text-emerald-400 font-bold' : 'text-slate-500'
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
