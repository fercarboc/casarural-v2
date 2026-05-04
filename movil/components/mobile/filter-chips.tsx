'use client'

import { cn } from '@/lib/utils'
import { useState } from 'react'

interface FilterChip {
  id: string
  label: string
}

interface FilterChipsProps {
  chips: FilterChip[]
  selected?: string
  onSelect?: (id: string) => void
  className?: string
}

export function FilterChips({
  chips,
  selected: controlledSelected,
  onSelect,
  className
}: FilterChipsProps) {
  const [internalSelected, setInternalSelected] = useState(chips[0]?.id || '')
  const selected = controlledSelected ?? internalSelected
  const setSelected = onSelect ?? setInternalSelected

  return (
    <div className={cn('flex gap-2 overflow-x-auto scrollbar-hide pb-1', className)}>
      {chips.map((chip) => (
        <button
          key={chip.id}
          onClick={() => setSelected(chip.id)}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
            selected === chip.id
              ? 'bg-primary text-primary-foreground'
              : 'bg-card border border-border text-foreground hover:bg-muted'
          )}
        >
          {chip.label}
        </button>
      ))}
    </div>
  )
}
