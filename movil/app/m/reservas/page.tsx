'use client'

import { useState } from 'react'
import { MobileHeader } from '@/components/mobile/mobile-header'
import { MobileBottomNav } from '@/components/mobile/mobile-bottom-nav'
import { SearchBar } from '@/components/mobile/search-bar'
import { FilterChips } from '@/components/mobile/filter-chips'
import { ReservationCard } from '@/components/mobile/reservation-card'
import { EmptyState } from '@/components/mobile/empty-state'
import { useTenant } from '@/lib/property-context'
import { useReservas, useUnidades, createReservaManual } from '@/lib/supabase-hooks'
import { BookOpen, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const filterOptions = [
  { id: 'all', label: 'Todas' },
  { id: 'confirmed', label: 'Confirmadas' },
  { id: 'pending', label: 'Pendientes' },
  { id: 'cancelled', label: 'Canceladas' }
]

const emptyForm = {
  unidadId: '',
  nombreCliente: '',
  apellidosCliente: '',
  emailCliente: '',
  telefonoCliente: '',
  fechaEntrada: '',
  fechaSalida: '',
  numHuespedes: '1',
  importeTotal: '',
}

export default function MobileReservationsPage() {
  const { selectedTenant } = useTenant()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const { data: reservations, loading, refetch } = useReservas(selectedTenant.id)
  const { data: unidades } = useUnidades(selectedTenant.id)

  const filteredReservations = reservations.filter(reservation => {
    if (filter !== 'all' && reservation.status !== filter) return false
    if (search) {
      const s = search.toLowerCase()
      return (
        reservation.code.toLowerCase().includes(s) ||
        reservation.guestName.toLowerCase().includes(s) ||
        reservation.accommodationName.toLowerCase().includes(s)
      )
    }
    return true
  })

  const handleCreateReserva = async () => {
    if (!form.unidadId || !form.nombreCliente.trim() || !form.fechaEntrada || !form.fechaSalida) {
      setFormError('Alojamiento, nombre del huésped y fechas son obligatorios')
      return
    }
    if (form.fechaSalida <= form.fechaEntrada) {
      setFormError('La fecha de salida debe ser posterior a la de entrada')
      return
    }
    setSaving(true)
    setFormError(null)
    const { error } = await createReservaManual({
      propertyId: selectedTenant.id,
      unidadId: form.unidadId,
      nombreCliente: form.nombreCliente.trim(),
      apellidosCliente: form.apellidosCliente.trim() || undefined,
      emailCliente: form.emailCliente.trim() || undefined,
      telefonoCliente: form.telefonoCliente.trim() || undefined,
      fechaEntrada: form.fechaEntrada,
      fechaSalida: form.fechaSalida,
      numHuespedes: parseInt(form.numHuespedes) || 1,
      importeTotal: form.importeTotal ? parseFloat(form.importeTotal) : undefined,
    })
    setSaving(false)
    if (error) {
      setFormError(error)
      return
    }
    setSheetOpen(false)
    setForm(emptyForm)
    refetch()
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobileHeader title="Reservas" showBack backHref="/m" />

      <main className="flex-1 pb-20 overflow-y-auto">
        <div className="px-4 py-3 space-y-3 sticky top-0 bg-background z-10 border-b border-border">
          <SearchBar
            placeholder="Buscar reserva, huésped..."
            value={search}
            onChange={setSearch}
          />
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <FilterChips chips={filterOptions} selected={filter} onSelect={setFilter} />
            </div>
            <Button variant="outline" size="sm" onClick={() => setSheetOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Nueva
            </Button>
          </div>
        </div>

        <div className="px-4 py-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {filteredReservations.length} reserva{filteredReservations.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="px-4 py-2 space-y-3">
          {filteredReservations.length > 0 ? (
            filteredReservations.map(reservation => (
              <ReservationCard
                key={reservation.id}
                reservation={reservation}
              />
            ))
          ) : !loading ? (
            <EmptyState
              icon={BookOpen}
              title="No hay reservas"
              description={
                search || filter !== 'all'
                  ? 'No se encontraron reservas con estos filtros'
                  : 'Todavía no hay reservas registradas'
              }
              action={
                <Button onClick={() => setSheetOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva reserva
                </Button>
              }
            />
          ) : null}
        </div>
      </main>

      {/* Sheet: Nueva reserva manual */}
      <Sheet open={sheetOpen} onOpenChange={open => { setSheetOpen(open); if (!open) { setForm(emptyForm); setFormError(null) } }}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="mb-4">
            <SheetTitle>Nueva reserva directa</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 pb-6">
            <div className="space-y-1.5">
              <Label>Alojamiento <span className="text-red-500">*</span></Label>
              <Select value={form.unidadId} onValueChange={v => setForm(f => ({ ...f, unidadId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar alojamiento..." />
                </SelectTrigger>
                <SelectContent>
                  {unidades.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nombre <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="Nombre"
                  value={form.nombreCliente}
                  onChange={e => setForm(f => ({ ...f, nombreCliente: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Apellidos</Label>
                <Input
                  placeholder="Apellidos"
                  value={form.apellidosCliente}
                  onChange={e => setForm(f => ({ ...f, apellidosCliente: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="email@ejemplo.com"
                  value={form.emailCliente}
                  onChange={e => setForm(f => ({ ...f, emailCliente: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Teléfono</Label>
                <Input
                  type="tel"
                  placeholder="+34 600..."
                  value={form.telefonoCliente}
                  onChange={e => setForm(f => ({ ...f, telefonoCliente: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Entrada <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  value={form.fechaEntrada}
                  onChange={e => setForm(f => ({ ...f, fechaEntrada: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Salida <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  value={form.fechaSalida}
                  min={form.fechaEntrada}
                  onChange={e => setForm(f => ({ ...f, fechaSalida: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Huéspedes</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.numHuespedes}
                  onChange={e => setForm(f => ({ ...f, numHuespedes: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Importe (€)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.importeTotal}
                  onChange={e => setForm(f => ({ ...f, importeTotal: e.target.value }))}
                />
              </div>
            </div>

            {formError && <p className="text-sm text-red-500">{formError}</p>}
            <Button className="w-full" onClick={handleCreateReserva} disabled={saving}>
              {saving ? 'Guardando...' : 'Crear reserva'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <MobileBottomNav />
    </div>
  )
}
