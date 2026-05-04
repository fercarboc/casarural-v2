import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  iconColor?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  onClick?: () => void
  className?: string
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  iconColor = 'text-primary',
  trend,
  onClick,
  className
}: MetricCardProps) {
  const Wrapper = onClick ? 'button' : 'div'

  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        'bg-card rounded-xl p-4 border border-border',
        onClick && 'active:scale-[0.98] transition-transform cursor-pointer w-full text-left',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold text-foreground mt-1">{value}</p>
          {trend && (
            <p
              className={cn(
                'text-xs mt-1',
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              )}
            >
              {trend.isPositive ? '+' : ''}{trend.value}% vs mes anterior
            </p>
          )}
        </div>
        <div className={cn('p-2 rounded-lg bg-muted', iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Wrapper>
  )
}
