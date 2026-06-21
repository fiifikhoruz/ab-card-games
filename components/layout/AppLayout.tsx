'use client'

import Link from 'next/link'
import Image from 'next/image'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'

interface AppLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export default function AppLayout({ children, title, subtitle }: AppLayoutProps) {
  return (
    <div className="min-h-dvh bg-surface-900">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden lg:flex fixed left-0 top-0 bottom-0 w-60 z-20">
        <Sidebar />
      </div>

      {/* Main area */}
      <div className="lg:pl-60 flex flex-col min-h-dvh">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-surface-900/95 backdrop-blur-md border-b border-surface-700 px-4 lg:px-6 h-14 flex items-center gap-3">
          {/* Logo — mobile only (desktop shows in sidebar) */}
          <Link href="/" className="lg:hidden flex-shrink-0">
            <Image
              src="/logo.png"
              alt="AB Card Games"
              width={36}
              height={36}
              className="w-9 h-9 object-contain"
              priority
            />
          </Link>
          <div>
            <h1 className="text-[17px] font-bold text-white leading-none">{title}</h1>
            {subtitle && (
              <p className="text-xs text-surface-500 mt-0.5">{subtitle}</p>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 py-5 pb-24 lg:px-6 lg:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav — hidden on desktop */}
      <BottomNav />
    </div>
  )
}
