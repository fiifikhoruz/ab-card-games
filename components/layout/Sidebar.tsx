'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ShoppingCart, Package, Users, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/',          label: 'Dashboard', icon: LayoutDashboard },
  { href: '/sales',     label: 'Sales',     icon: ShoppingCart    },
  { href: '/inventory', label: 'Inventory', icon: Package         },
  { href: '/customers', label: 'Customers', icon: Users           },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex flex-col h-full w-60 bg-surface-800 border-r border-surface-700">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-surface-700">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gold flex items-center justify-center flex-shrink-0">
            <Zap size={15} className="text-black" fill="currentColor" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">AB Card Games</p>
            <p className="text-[10px] text-surface-500 leading-tight">Sales Hub</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                active
                  ? 'bg-gold/10 text-gold'
                  : 'text-surface-400 hover:text-white hover:bg-surface-700'
              )}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 1.75} />
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
