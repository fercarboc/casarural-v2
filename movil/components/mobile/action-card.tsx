import { cn } from '@/lib/utils'
import { LucideIcon, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface ActionCardProps {
  title: string
  description?: string
  icon: LucideIcon
  iconColor?: string
  href?: string
  onClick?: () => void
  badge?: string | number
  badgeColor?: string
  className?: string
}

export function ActionCard({
  title,
  description,
  icon: Icon,
  iconColor = 'text-primary',
  href,
  onClick,
  badge,
  badgeColor = 'bg-primary text-primary-foreground',
  className
}: ActionCardProps) {
  const content = (
    <div
      className={cn(
        'bg-card rounded-xl p-4 border border-border flex items-center gap-4',
        (href || onClick) && 'active:scale-[0.98] transition-transform cursor-pointer',
        className
      )}
    >
      <div className={cn('p-3 rounded-lg bg-muted shrink-0', iconColor)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground truncate">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {badge !== undefined && (
          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', badgeColor)}>
            {badge}
          </span>
        )}
        {(href || onClick) && (
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  if (onClick) {
    return <button onClick={onClick} className="w-full text-left">{content}</button>
  }

  return content
}
