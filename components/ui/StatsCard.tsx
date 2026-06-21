import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string
  sub?: string
  icon: LucideIcon
  trend?: { value: string; positive: boolean }
  accent?: boolean
  className?: string
}

export default function StatsCard({
  title, value, sub, icon: Icon, trend, accent, className
}: StatsCardProps) {
  return (
    <div className={cn('stat-card', className)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-surface-400 uppercase tracking-wider">{title}</p>
        <div className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center',
          accent ? 'bg-gold/15' : 'bg-surface-700'
        )}>
          <Icon size={17} className={accent ? 'text-gold' : 'text-surface-400'} />
        </div>
      </div>

      <div>
        <p className={cn(
          'text-2xl font-bold tracking-tight',
          accent ? 'text-gold-gradient' : 'text-white'
        )}>
          {value}
        </p>
        {sub && <p className="text-xs text-surface-400 mt-0.5">{sub}</p>}
      </div>

      {trend && (
        <div className={cn(
          'flex items-center gap-1 text-xs font-medium',
          trend.positive ? 'text-emerald-400' : 'text-red-400'
        )}>
          <span>{trend.positive ? '↑' : '↓'}</span>
          <span>{trend.value}</span>
          <span className="text-surface-500">vs last period</span>
        </div>
      )}
    </div>
  )
}
