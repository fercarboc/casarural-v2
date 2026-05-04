'use client'

import { useState } from 'react'
import { MobileHeader } from '@/components/mobile/mobile-header'
import { MobileBottomNav } from '@/components/mobile/mobile-bottom-nav'
import { FilterChips } from '@/components/mobile/filter-chips'
import { StatusBadge } from '@/components/mobile/status-badge'
import { useTenant } from '@/lib/property-context'
import { useReservas, useUnidades, useBloqueos, createBloqueo } from '@/lib/supabase-hooks'
import { ChevronLeft, ChevronRight, LogIn, LogOut, Home, Plus, Ban } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

const viewOptions = [
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' }
]

const emptyForm = { unidadId: '', fechaInicio: '', fechaFin: '', motivo: '' }

export default function MobileCalendarPage() {
  const { selectedTenant } = useTenant()
  const [view, setView] = useState('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [sheetOpen, setSheetOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const { data: reservas } = useReservas(selectedTenant.id)
  const { data: unidades } = useUnidades(selectedTenant.id)
  const { data: bloqueos, refetch: refetchBloqueos } = useBloqueos(selectedTenant.id)

  const shortStayUnidades = unidades.filter(u => u.modality === 'corta-estancia')

  const getWeekDays = (date: Date) => {
    const days = []
    const startOfWeek = new Date(date)
    startOfWeek.setDate(date.getDate() - date.getDay() + 1)
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      days.push(day)
    }
    return days
  }

  const weekDays = getWeekDays(currentDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() + direction * 7)
    setCurrentDate(newDate)
  }

  const formatDate = (date: Date) => date.toLocaleDateString('es-ES', { day: 'numeric' })
  const formatDayName = (date: Date) =>
    date.toLocaleDateString('es-ES', { weekday: 'short' }).charAt(0).toUpperCase()
  const formatMonthYear = (date: Date) =>
    date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

  const isToday = (date: Date) => {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d.getTime() === today.getTime()
  }

  const getReservationForDate = (accommodationId: string, date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return reservas.find(r => {
      if (r.accommodationId !== accommodationId || r.status === 'cancelled') return false
      return r.checkIn <= dateStr && r.checkOut > dateStr
    })
  }

  const getBloqueoForDate = (unidadId: string, date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return bloqueos.find(b => b.unidadId === unidadId && b.fechaInicio <= dateStr && b.fechaFin >= dateStr)
  }

  const isCheckIn = (accommodationId: string, date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return reservas.some(r => r.accommodationId === accommodationId && r.checkIn === dateStr && r.status !== 'cancelled')
  }

  const isCheckOut = (accommodationId: string, date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return reservas.some(r => r.accommodationId === accommodationId && r.checkOut === dateStr && r.status !== 'cancelled')
  }

  const todayStr = today.toISOString().split('T')[0]
  const todayCheckIns = reservas.filter(r => r.checkIn === todayStr && r.status !== 'cancelled')
  const todayCheckOuts = reservas.filter(r => r.checkOut === todayStr && r.status !== 'cancelled')

  const handleCreateBloqueo = async () => {
    if (!form.unidadId || !form.fechaInicio || !form.fechaFin) {
      setFormError('Selecciona alojamiento y fechas')
      return
    }
    if (form.fechaFin < form.fechaInicio) {
      setFormError('La fecha fin debe ser posterior a la fecha inicio')
      return
    }
    setSaving(true)
    setFormError(null)
    const { error } = await createBloqueo({
      propertyId: selectedTenant.id,
      unidadId: form.unidadId,
      fechaInicio: form.fechaInicio,
      fechaFin: form.fechaFin,
      motivo: form.motivo || undefined,
    })
    setSaving(false)
    if (error) {
      setFormError(error)
      return
    }
    setSheetOpen(false)
    setForm(emptyForm)
    refetchBloqueos()
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobileHeader title="Calendario" showBack backHref="/m" />

      <main className="flex-1 pb-20 overflow-y-auto">
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <FilterChips chips={viewOptions} selected={view} onSelect={setView} />
            <Button variant="outline" size="sm" onClick={() => setSheetOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Bloqueo
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => navigateWeek(-1)}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h3 className="text-base font-semibold capitalize">
              {formatMonthYear(currentDate)}
            </h3>
            <Button variant="ghost" size="icon" onClick={() => navigateWeek(1)}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Week Header */}
        <div className="px-4 py-2 border-b border-border bg-muted/50">
          <div className="flex">
            <div className="w-28 shrink-0" />
            <div className="flex-1 flex">
              {weekDays.map((day, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'flex-1 text-center py-2',
                    isToday(day) && 'bg-primary text-primary-foreground rounded-lg'
                  )}
                >
                  <p className="text-xs font-medium">{formatDayName(day)}</p>
                  <p className={cn('text-lg font-semibold', !isToday(day) && 'text-foreground')}>
                    {formatDate(day)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="px-4 py-2">
          <p className="text-xs text-muted-foreground mb-2 px-1">Alojamientos de corta estancia</p>
          {shortStayUnidades.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Sin alojamientos de corta estancia</p>
          )}
          {shortStayUnidades.map((u) => (
            <div key={u.id} className="flex items-stretch border-b border-border py-2">
              <div className="w-28 shrink-0 pr-2">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Home className="h-3.5 w-3.5 text-primary shrink-0" />
                  <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                </div>
                <p className="text-xs text-muted-foreground">{u.capacity}P</p>
              </div>
              <div className="flex-1 flex gap-1">
                {weekDays.map((day, idx) => {
                  const reservation = getReservationForDate(u.id, day)
                  const bloqueo = getBloqueoForDate(u.id, day)
                  const checkIn = isCheckIn(u.id, day)
                  const checkOut = isCheckOut(u.id, day)

                  return (
                    <div
                      key={idx}
                      className={cn(
                        'flex-1 min-h-[48px] rounded-lg flex flex-col items-center justify-center text-xs',
                        bloqueo
                          ? 'bg-slate-200 border border-slate-400'
                          : reservation
                            ? reservation.status === 'confirmed'
                              ? 'bg-green-100 border border-green-300'
                              : 'bg-amber-100 border border-amber-300'
                            : 'bg-muted/30'
                      )}
                    >
                      {bloqueo && <Ban className="h-3.5 w-3.5 text-slate-500" />}
                      {!bloqueo && checkIn && <LogIn className="h-3.5 w-3.5 text-green-600" />}
                      {!bloqueo && checkOut && <LogOut className="h-3.5 w-3.5 text-amber-600" />}
                      {!bloqueo && !reservation && !checkIn && !checkOut && (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="px-4 py-4 border-t border-border mt-2">
          <p className="text-xs text-muted-foreground mb-2">Leyenda</p>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-100 border border-green-300" />
              <span className="text-xs">Confirmada</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-amber-100 border border-amber-300" />
              <span className="text-xs">Pendiente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-slate-200 border border-slate-400" />
              <span className="text-xs">Bloqueado</span>
            </div>
            <div className="flex items-center gap-2">
              <LogIn className="h-4 w-4 text-green-600" />
              <span className="text-xs">Entrada</span>
            </div>
            <div className="flex items-center gap-2">
              <LogOut className="h-4 w-4 text-amber-600" />
              <span className="text-xs">Salida</span>
            </div>
          </div>
        </div>

        {/* Daily Summary */}
        <div className="px-4 py-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Hoy
          </h3>
          <div className="space-y-2">
            {todayCheckIns.map(r => (
              <div key={`in-${r.id}`} className="bg-card rounded-lg border border-border p-3 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <LogIn className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{r.guestName}</p>
                  <p className="text-xs text-muted-foreground">{r.accommodationName}</p>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
            {todayCheckOuts.map(r => (
              <div key={`out-${r.id}`} className="bg-card rounded-lg border border-border p-3 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100">
                  <LogOut className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{r.guestName}</p>
                  <p className="text-xs text-muted-foreground">{r.accommodationName}</p>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
            {todayCheckIns.length === 0 && todayCheckOuts.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay entradas ni salidas hoy
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Sheet: Nuevo bloqueo */}
      <Sheet open={sheetOpen} onOpenChange={open => { setSheetOpen(open); if (!open) { setForm(emptyForm); setFormError(null) } }}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="mb-4">
            <SheetTitle>Nuevo bloqueo</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 pb-6">
            <div className="space-y-1.5">
              <Label>Alojamiento</Label>
              <Select value={form.unidadId} onValueChange={v => setForm(f => ({ ...f, unidadId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar alojamiento..." />
                </SelectTrigger>
                <SelectContent>
                  {shortStayUnidades.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fecha inicio</Label>
                <Input
                  type="date"
                  value={form.fechaInicio}
                  onChange={e => setForm(f => ({ ...f, fechaInicio: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fecha fin</Label>
                <Input
                  type="date"
                  value={form.fechaFin}
                  min={form.fechaInicio}
                  onChange={e => setForm(f => ({ ...f, fechaFin: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Motivo (opcional)</Label>
              <Textarea
                value={form.motivo}
                onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))}
                placeholder="Mantenimiento, reforma, uso personal..."
                rows={2}
              />
            </div>
            {formError && <p className="text-sm text-red-500">{formError}</p>}
            <Button className="w-full" onClick={handleCreateBloqueo} disabled={saving}>
              {saving ? 'Guardando...' : 'Crear bloqueo'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <MobileBottomNav />
    </div>
  )
}
