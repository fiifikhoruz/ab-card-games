'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ShoppingCart, Users, X, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/',          label: 'Dashboard', icon: LayoutDashboard },
  { href: '/sales',     label: 'Sales',     icon: ShoppingCart    },
  { href: '/customers', label: 'Customers', icon: Users           },
]

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()

  return (
    <aside className="flex flex-col h-full bg-surface-900 border-r border-surface-700 w-60">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-surface-700">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gold flex items-center justify-center">
              <Zap size={14} className="text-black" fill="currentColor" />
            </div>
            <span className="font-bold text-white text-sm tracking-wide">AB Card Games</span>
          </div>
          <p className="text-[10px] text-surface-400 mt-0.5 pl-9">Sales Hub</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="btn-ghost p-1 lg:hidden">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                active
                  ? 'bg-gold/15 text-gold'
                  : 'text-surface-400 hover:text-white hover:bg-surface-800'
              )}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 2} />
              {label}
              {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-gold" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-surface-700">
        <p className="text-[10px] text-surface-500">Made in Ghana, Played Everywhere.</p>
      </div>
    </aside>
  )
}
