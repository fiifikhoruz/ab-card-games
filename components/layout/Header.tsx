'use client'

import { useState } from 'react'
import { Menu, Bell, Search, Plus } from 'lucide-react'
import Link from 'next/link'

interface HeaderProps {
  title: string
  subtitle?: string
  onMenuClick: () => void
  action?: { label: string; href: string }
}

export default function Header({ title, subtitle, onMenuClick, action }: HeaderProps) {
  const [showSearch, setShowSearch] = useState(false)

  return (
    <header className="sticky top-0 z-20 bg-surface-900/95 backdrop-blur border-b border-surface-700">
      <div className="flex items-center gap-4 px-4 md:px-6 py-4">
        {/* Mobile menu */}
        <button
          onClick={onMenuClick}
          className="lg:hidden btn-ghost p-2 -ml-2"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-white truncate">{title}</h1>
          {subtitle && <p className="text-xs text-surface-400 mt-0.5 truncate">{subtitle}</p>}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            className="btn-ghost p-2"
            onClick={() => setShowSearch(!showSearch)}
            aria-label="Search"
          >
            <Search size={18} />
          </button>

          <button className="btn-ghost p-2 relative" aria-label="Notifications">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-gold rounded-full" />
          </button>

          {action && (
            <Link href={action.href} className="btn-primary py-2 px-4 text-xs hidden sm:flex">
              <Plus size={16} />
              {action.label}
            </Link>
          )}
        </div>
      </div>

      {/* Search bar (expanded) */}
      {showSearch && (
        <div className="px-4 md:px-6 pb-3">
          <input
            type="search"
            placeholder="Search orders, customers, products..."
            className="input"
            autoFocus
          />
        </div>
      )}
    </header>
  )
}
