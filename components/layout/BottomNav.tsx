'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ShoppingCart, Package, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/',          label: 'Dashboard', icon: LayoutDashboard },
  { href: '/sales',     label: 'Sales',     icon: ShoppingCart    },
  { href: '/inventory', label: 'Inventory', icon: Package         },
  { href: '/customers', label: 'Customers', icon: Users           },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-surface-800/95 backdrop-blur-md border-t border-surface-700"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch h-14">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors',
                active ? 'text-gold' : 'text-surface-500'
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
              <span className={cn('text-[10px] font-medium', active ? 'text-gold' : 'text-surface-500')}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
