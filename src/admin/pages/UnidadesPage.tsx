import React, { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  Loader2,
  X,
  Home,
  BedDouble,
  Bath,
  Maximize2,
  Users,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertCircle,
  CalendarRange,
  Save,
  ChevronDown,
  ChevronUp,
  Power,
  Tag,
  Image as ImageIcon,
  FileText,
} from 'lucide-react'
import { supabase } from '../../integrations/supabase/client'
import { configService, Unidad, PeriodoEspecial } from '../../services/config.service'
import { useAdminTenant } from '../context/AdminTenantContext'
import UnitPhotoManager from '../components/UnitPhotoManager'
import UnitDescriptionForm from '../components/UnitDescriptionForm'

// ── Constantes ─────────────────────────────────────────────────────────────────
const TIPO_LABELS: Record<string, string> = {
  CASA_RURAL: 'Casa Rural',
  APARTAMENTO: 'Apartamento',
  HABITACION: 'Habitación',
}

// ── Tipos de formulario ────────────────────────────────────────────────────────
interface UnidadForm {
  nombre: string
  slug: string
  tipo: 'CASA_RURAL' | 'APARTAMENTO' | 'HABITACION'
  descripcion: string
  capacidad_base: string
  capacidad_maxima: string
  num_habitaciones: string
  num_banos: string
  superficie_m2: string
  activa: boolean
  precio_noche: string
  extra_huesped_noche: string
  tarifa_limpieza: string
  min_noches: string
  precio_noche_especial: string
  extra_huesped_especial: string
  tarifa_limpieza_especial: string
  min_noches_especial: string
}

interface PeriodoForm {
  id?: string
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  activa: boolean
}

interface UnidadDetalle extends Unidad {
  descripcion_corta?: string | null
  descripcion_larga?: string | null
  descripcion_extras?: string | null
  foto_portada?: string | null
}

const EMPTY_FORM: UnidadForm = {
  nombre: '',
  slug: '',
  tipo: 'CASA_RURAL',
  descripcion: '',
  capacidad_base: '10',
  capacidad_maxima: '11',
  num_habitaciones: '5',
  num_banos: '3',
  superficie_m2: '',
  activa: true,
  precio_noche: '330',
  extra_huesped_noche: '33',
  tarifa_limpieza: '60',
  min_noches: '2',
  precio_noche_especial: '370',
  extra_huesped_especial: '37',
  tarifa_limpieza_especial: '60',
  min_noches_especial: '3',
}

const EMPTY_PERIODO: PeriodoForm = {
  nombre: '',
  fecha_inicio: '',
  fecha_fin: '',
  activa: true,
}

function toSlug(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

// ── Componente principal ───────────────────────────────────────────────────────
export const UnidadesPage: React.FC = () => {
  const { property_id } = useAdminTenant()
  const [unidades, setUnidades] = useState<UnidadDetalle[]>([])
  const [periodos, setPeriodos] = useState<PeriodoEspecial[]>([])
  const [propertyId, setPropertyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [accessToken, setAccessToken] = useState<string>('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<UnidadForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [editingPricesId, setEditingPricesId] = useState<string | null>(null)
  const [pricesForm, setPricesForm] = useState<Partial<UnidadForm>>({})
  const [savingPrices, setSavingPrices] = useState(false)
  const [pricesError, setPricesError] = useState('')

  const [showPeriodos, setShowPeriodos] = useState(false)
  const [editingPeriodoId, setEditingPeriodoId] = useState<string | null>(null)
  const [showPeriodoForm, setShowPeriodoForm] = useState(false)
  const [periodoForm, setPeriodoForm] = useState<PeriodoForm>(EMPTY_PERIODO)
  const [savingPeriodo, setSavingPeriodo] = useState(false)
  const [periodoError, setPeriodoError] = useState('')

  const [showDetailModal, setShowDetailModal] = useState(false)
  const [detailUnit, setDetailUnit] = useState<UnidadDetalle | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setAccessToken(session?.access_token ?? '')

      const cfg = await configService.getConfig(property_id)
      const pid = cfg.property.id
      setPropertyId(pid)

      const { data: unidadesData, error: uError } = await supabase
        .from('unidades')
        .select(`
          id, nombre, slug, tipo,
          capacidad_base, capacidad_maxima,
          num_habitaciones, num_banos, superficie_m2,
          fotos, amenities, activa, orden,
          precio_noche, extra_huesped_noche, tarifa_limpieza, min_noches,
          precio_noche_especial, extra_huesped_especial, tarifa_limpieza_especial, min_noches_especial,
          descripcion_corta, descripcion_larga, descripcion_extras, foto_portada
        `)
        .eq('property_id', pid)
        .order('orden')

      if (uError) throw uError

      const { data: periodosData, error: pError } = await supabase
        .from('periodos_especiales')
        .select('id, nombre, fecha_inicio, fecha_fin, activa')
        .eq('property_id', pid)
        .order('fecha_inicio')

      if (pError) throw pError

      setUnidades((unidadesData as UnidadDetalle[]) ?? [])
      setPeriodos(periodosData ?? [])
    } catch {
      setError('No se pudieron cargar las unidades.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const flash = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 4000)
  }

  // ── CRUD Unidades ──────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError('')
    setShowForm(true)
    setEditingPricesId(null)
  }

  const openEdit = (u: UnidadDetalle) => {
    setEditingId(u.id)
    setForm({
      nombre: u.nombre,
      slug: u.slug,
      tipo: u.tipo,
      descripcion: '',
      capacidad_base: String(u.capacidad_base),
      capacidad_maxima: String(u.capacidad_maxima),
      num_habitaciones: String(u.num_habitaciones ?? ''),
      num_banos: String(u.num_banos ?? ''),
      superficie_m2: String(u.superficie_m2 ?? ''),
      activa: u.activa ?? true,
      precio_noche: String(u.precio_noche ?? 0),
      extra_huesped_noche: String(u.extra_huesped_noche ?? 0),
      tarifa_limpieza: String(u.tarifa_limpieza ?? 0),
      min_noches: String(u.min_noches ?? 1),
      precio_noche_especial: String(u.precio_noche_especial ?? ''),
      extra_huesped_especial: String(u.extra_huesped_especial ?? ''),
      tarifa_limpieza_especial: String(u.tarifa_limpieza_especial ?? ''),
      min_noches_especial: String(u.min_noches_especial ?? ''),
    })
    setError('')
    setShowForm(true)
    setEditingPricesId(null)
  }

  const openDetails = (u: UnidadDetalle) => {
    setDetailUnit(u)
    setShowDetailModal(true)
  }

  const closeDetails = async () => {
    setShowDetailModal(false)
    setDetailUnit(null)
    await load()
  }

  const handleSave = async () => {
    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    if (!form.slug.trim()) {
      setError('El slug es obligatorio')
      return
    }
    if (!propertyId) {
      setError('No se encontró la propiedad')
      return
    }

    setSaving(true)
    setError('')

    const payload = {
      property_id: propertyId,
      nombre: form.nombre.trim(),
      slug: form.slug.trim(),
      tipo: form.tipo,
      capacidad_base: parseInt(form.capacidad_base) || 1,
      capacidad_maxima: parseInt(form.capacidad_maxima) || 1,
      num_habitaciones: form.num_habitaciones ? parseInt(form.num_habitaciones) : null,
      num_banos: form.num_banos ? parseInt(form.num_banos) : null,
      superficie_m2: form.superficie_m2 ? parseInt(form.superficie_m2) : null,
      activa: form.activa,
      precio_noche: parseFloat(form.precio_noche) || 0,
      extra_huesped_noche: parseFloat(form.extra_huesped_noche) || 0,
      tarifa_limpieza: parseFloat(form.tarifa_limpieza) || 0,
      min_noches: parseInt(form.min_noches) || 1,
      precio_noche_especial: form.precio_noche_especial ? parseFloat(form.precio_noche_especial) : null,
      extra_huesped_especial: form.extra_huesped_especial ? parseFloat(form.extra_huesped_especial) : null,
      tarifa_limpieza_especial: form.tarifa_limpieza_especial ? parseFloat(form.tarifa_limpieza_especial) : null,
      min_noches_especial: form.min_noches_especial ? parseInt(form.min_noches_especial) : null,
    }

    try {
      if (editingId) {
        const { error: e } = await supabase.from('unidades').update(payload).eq('id', editingId)
        if (e) throw e
        flash('Unidad actualizada')
      } else {
        const maxOrden = Math.max(0, ...unidades.map((u) => u.orden ?? 0))
        const { error: e } = await supabase.from('unidades').insert({ ...payload, orden: maxOrden + 1 })
        if (e) throw e
        flash('Unidad creada')
      }
      setShowForm(false)
      load()
    } catch (e: any) {
      setError(e.message ?? 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const toggleActiva = async (u: UnidadDetalle) => {
    await supabase.from('unidades').update({ activa: !u.activa }).eq('id', u.id)
    load()
  }

  const handleDelete = async (u: UnidadDetalle) => {
    if (!confirm(`¿Eliminar "${u.nombre}"?`)) return
    const { error: e } = await supabase.from('unidades').delete().eq('id', u.id)
    if (e) {
      setError(e.message)
      return
    }
    flash('Unidad eliminada')
    load()
  }

  const moveOrden = async (u: UnidadDetalle, dir: 'up' | 'down') => {
    const idx = unidades.findIndex((x) => x.id === u.id)
    const swap = dir === 'up' ? unidades[idx - 1] : unidades[idx + 1]
    if (!swap) return

    await Promise.all([
      supabase.from('unidades').update({ orden: swap.orden }).eq('id', u.id),
      supabase.from('unidades').update({ orden: u.orden }).eq('id', swap.id),
    ])
    load()
  }

  // ── Precios inline ─────────────────────────────────────────────────────────
  const openPrices = (u: UnidadDetalle) => {
    setEditingPricesId(u.id)
    setPricesForm({
      precio_noche: String(u.precio_noche ?? 0),
      extra_huesped_noche: String(u.extra_huesped_noche ?? 0),
      tarifa_limpieza: String(u.tarifa_limpieza ?? 0),
      min_noches: String(u.min_noches ?? 1),
      precio_noche_especial: String(u.precio_noche_especial ?? ''),
      extra_huesped_especial: String(u.extra_huesped_especial ?? ''),
      tarifa_limpieza_especial: String(u.tarifa_limpieza_especial ?? ''),
      min_noches_especial: String(u.min_noches_especial ?? ''),
    })
    setPricesError('')
  }

  const savePrices = async () => {
    if (!editingPricesId) return

    setSavingPrices(true)
    setPricesError('')

    const { error: e } = await supabase
      .from('unidades')
      .update({
        precio_noche: parseFloat(pricesForm.precio_noche!) || 0,
        extra_huesped_noche: parseFloat(pricesForm.extra_huesped_noche!) || 0,
        tarifa_limpieza: parseFloat(pricesForm.tarifa_limpieza!) || 0,
        min_noches: parseInt(pricesForm.min_noches!) || 1,
        precio_noche_especial: pricesForm.precio_noche_especial
          ? parseFloat(pricesForm.precio_noche_especial)
          : null,
        extra_huesped_especial: pricesForm.extra_huesped_especial
          ? parseFloat(pricesForm.extra_huesped_especial)
          : null,
        tarifa_limpieza_especial: pricesForm.tarifa_limpieza_especial
          ? parseFloat(pricesForm.tarifa_limpieza_especial)
          : null,
        min_noches_especial: pricesForm.min_noches_especial
          ? parseInt(pricesForm.min_noches_especial)
          : null,
      })
      .eq('id', editingPricesId)

    setSavingPrices(false)

    if (e) {
      setPricesError(e.message)
      return
    }

    setEditingPricesId(null)
    flash('Precios guardados')
    load()
  }

  // ── Periodos especiales ────────────────────────────────────────────────────
  const openCreatePeriodo = () => {
    setEditingPeriodoId(null)
    setPeriodoForm(EMPTY_PERIODO)
    setPeriodoError('')
    setShowPeriodoForm(true)
  }

  const openEditPeriodo = (p: PeriodoEspecial) => {
    setEditingPeriodoId(p.id)
    setPeriodoForm({
      nombre: p.nombre,
      fecha_inicio: p.fecha_inicio,
      fecha_fin: p.fecha_fin,
      activa: p.activa,
    })
    setPeriodoError('')
    setShowPeriodoForm(true)
  }

  const savePeriodo = async () => {
    if (!periodoForm.nombre.trim() || !periodoForm.fecha_inicio || !periodoForm.fecha_fin) {
      setPeriodoError('Nombre, fecha inicio y fin son obligatorios')
      return
    }
    if (!propertyId) return

    setSavingPeriodo(true)
    setPeriodoError('')

    const payload = {
      property_id: propertyId,
      nombre: periodoForm.nombre.trim(),
      fecha_inicio: periodoForm.fecha_inicio,
      fecha_fin: periodoForm.fecha_fin,
      activa: periodoForm.activa,
    }

    try {
      if (editingPeriodoId) {
        const { error: e } = await supabase
          .from('periodos_especiales')
          .update(payload)
          .eq('id', editingPeriodoId)
        if (e) throw e
      } else {
        const { error: e } = await supabase.from('periodos_especiales').insert(payload)
        if (e) throw e
      }
      setShowPeriodoForm(false)
      load()
    } catch (e: any) {
      setPeriodoError(e.message ?? 'Error al guardar')
    } finally {
      setSavingPeriodo(false)
    }
  }

  const deletePeriodo = async (id: string) => {
    if (!confirm('¿Eliminar este periodo especial?')) return
    await supabase.from('periodos_especiales').delete().eq('id', id)
    load()
  }

  const activePeriodsCount = periodos.filter((p) => p.activa).length

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center rounded-3xl border border-slate-800/80 bg-[#08111f] shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-8 text-slate-100">
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-800/80 bg-[#08111f] px-6 py-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)] md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-50">Unidades</h1>
            <p className="mt-1.5 text-sm text-slate-300">
              Gestiona las unidades de alojamiento, capacidades y estrategias de precios.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <button
              onClick={() => {
                setShowPeriodos((p) => !p)
                setShowPeriodoForm(false)
              }}
              className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                showPeriodos
                  ? 'border-sky-500/40 bg-sky-500/10 text-sky-300 shadow-[0_0_18px_rgba(77,163,255,0.10)]'
                  : 'border-slate-700 bg-[#08111f] text-slate-100 hover:border-slate-500 hover:bg-[#0b1728]'
              }`}
            >
              <CalendarRange size={18} />
              Periodos especiales
              <span className="rounded-md bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-[#07111f]">
                {activePeriodsCount}
              </span>
            </button>

            <button
              onClick={openCreate}
              className="flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-[#07111f] shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400"
            >
              <Plus size={18} />
              Nueva unidad
            </button>
          </div>
        </header>

        {/* ── Feedback ───────────────────────────────────────────────────────── */}
        {success && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-800/80 bg-emerald-950/50 px-4 py-3 text-sm font-medium text-emerald-200 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
            <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
            {success}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-red-800/80 bg-red-950/40 px-4 py-3 text-sm font-medium text-red-200 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
            <AlertCircle size={15} className="shrink-0 text-red-400" />
            {error}
          </div>
        )}

        {/* ── Panel periodos especiales ─────────────────────────────────────── */}
        {showPeriodos && (
          <section className="overflow-hidden rounded-3xl border border-slate-800/80 bg-[#08111f] shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between border-b border-slate-800/80 bg-[#101c2e] px-6 py-4">
              <div className="flex items-center gap-2 text-amber-300">
                <CalendarRange size={18} />
                <h2 className="text-xs font-bold uppercase tracking-[0.22em]">
                  Gestión de temporadas
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={openCreatePeriodo}
                  className="rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-sky-300 transition-colors hover:text-sky-200"
                >
                  + Nuevo periodo
                </button>

                <button
                  onClick={() => setShowPeriodos(false)}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-[#182436] hover:text-slate-100"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            <div className="space-y-4 p-5">
              {periodos.length === 0 && !showPeriodoForm && (
                <p className="py-8 text-center text-sm text-slate-400">
                  Sin periodos. Añade uno para activar los precios especiales en esas fechas.
                </p>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {periodos.map((p) => (
                  <div
                    key={p.id}
                    className={`group flex items-center justify-between rounded-2xl border p-4 transition-all ${
                      !p.activa
                        ? 'border-slate-800 bg-[#08111f] opacity-70'
                        : 'border-slate-700 bg-[#08111f] hover:border-amber-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`h-2.5 w-2.5 rounded-full ${
                          p.activa
                            ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.45)]'
                            : 'bg-slate-500'
                        }`}
                      />

                      <div>
                        <h3 className="text-sm font-semibold text-slate-50">{p.nombre}</h3>
                        <p className="font-mono text-xs text-slate-300">
                          {p.fecha_inicio} — {p.fecha_fin}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                      {!p.activa && <Badge variant="default">Inactiva</Badge>}

                      <button
                        onClick={() => openEditPeriodo(p)}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-[#182436] hover:text-slate-100"
                      >
                        <Edit2 size={14} />
                      </button>

                      <button
                        onClick={() => deletePeriodo(p.id)}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-950/40 hover:text-red-300"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {showPeriodoForm && (
                <div className="mt-2 space-y-4 rounded-3xl border border-slate-700/80 bg-[#101c2e] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
                  <h4 className="text-base font-semibold text-slate-50">
                    {editingPeriodoId ? 'Editar periodo' : 'Nuevo periodo especial'}
                  </h4>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="md:col-span-3">
                      <label className={lbl}>Nombre *</label>
                      <input
                        value={periodoForm.nombre}
                        onChange={(e) => setPeriodoForm((p) => ({ ...p, nombre: e.target.value }))}
                        placeholder="Ej: Verano 2026, Navidad…"
                        className={input}
                      />
                    </div>

                    <div>
                      <label className={lbl}>Fecha inicio *</label>
                      <input
                        type="date"
                        value={periodoForm.fecha_inicio}
                        onChange={(e) =>
                          setPeriodoForm((p) => ({ ...p, fecha_inicio: e.target.value }))
                        }
                        className={input}
                      />
                    </div>

                    <div>
                      <label className={lbl}>Fecha fin *</label>
                      <input
                        type="date"
                        value={periodoForm.fecha_fin}
                        min={periodoForm.fecha_inicio}
                        onChange={(e) =>
                          setPeriodoForm((p) => ({ ...p, fecha_fin: e.target.value }))
                        }
                        className={input}
                      />
                    </div>

                    <div className="flex items-end pb-1">
                      <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-slate-200">
                        <input
                          type="checkbox"
                          checked={periodoForm.activa}
                          onChange={(e) =>
                            setPeriodoForm((p) => ({ ...p, activa: e.target.checked }))
                          }
                          className="rounded border-slate-600 bg-[#0f1b2d]"
                        />
                        Activo
                      </label>
                    </div>
                  </div>

                  {periodoError && (
                    <p className="flex items-center gap-1.5 text-xs text-red-300">
                      <AlertCircle size={12} /> {periodoError}
                    </p>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => setShowPeriodoForm(false)}
                      className="px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
                    >
                      Cancelar
                    </button>

                    <button
                      onClick={savePeriodo}
                      disabled={savingPeriodo}
                      className="flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-[#07111f] transition-all hover:bg-sky-400 disabled:opacity-50"
                    >
                      {savingPeriodo ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={13} />
                      )}
                      {editingPeriodoId ? 'Guardar' : 'Crear periodo'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Lista de unidades ─────────────────────────────────────────────── */}
        <div className="space-y-4">
          {unidades.length === 0 && !showForm && (
            <div className="space-y-3 rounded-3xl border border-dashed border-slate-700/80 bg-[#08111f] p-14 text-center shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#08111f]">
                <Home size={22} className="text-slate-400" />
              </div>
              <p className="font-semibold text-slate-200">Sin unidades todavía</p>
              <p className="text-sm text-slate-400">
                Crea la primera unidad para empezar a recibir reservas
              </p>
              <button
                onClick={openCreate}
                className="mt-2 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-[#07111f] shadow-lg shadow-emerald-500/20 hover:bg-emerald-400"
              >
                <Plus size={14} /> Crear unidad
              </button>
            </div>
          )}

          {unidades.map((u, idx) => {
            const pricesOpen = editingPricesId === u.id

            return (
              <div
                key={u.id}
                className={`overflow-hidden rounded-3xl border border-slate-700 shadow-[0_20px_60px_rgba(0,0,0,0.28)] transition-all duration-300 ${
                  pricesOpen
                    ? 'bg-[#08111f] ring-1 ring-sky-500/25'
                    : 'bg-[#08111f] hover:border-slate-500 hover:bg-[#0b1728]'
                } ${!u.activa ? 'opacity-75 grayscale-[0.12]' : ''}`}
              >
                <div className="flex flex-col gap-6 bg-[#08111f] p-5 lg:flex-row lg:items-center">
                  {/* Reorder Actions */}
                  <div className="hidden lg:flex lg:flex-col lg:gap-1">
                    <button
                      onClick={() => moveOrden(u, 'up')}
                      disabled={idx === 0}
                      className="rounded-lg p-1 text-slate-400 transition-colors hover:text-sky-300 disabled:opacity-25"
                      title="Subir"
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      onClick={() => moveOrden(u, 'down')}
                      disabled={idx === unidades.length - 1}
                      className="rounded-lg p-1 text-slate-400 transition-colors hover:text-sky-300 disabled:opacity-25"
                      title="Bajar"
                    >
                      <ArrowDown size={16} />
                    </button>
                  </div>

                  {/* Info Section */}
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-bold text-slate-50">{u.nombre}</h3>
                      <Badge variant="info">{TIPO_LABELS[u.tipo] ?? u.tipo}</Badge>
                      {!u.activa && <Badge variant="default">Inactiva</Badge>}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Users size={14} className="text-sky-300" />
                        <span className="text-xs font-medium">
                          {u.capacidad_base}–{u.capacidad_maxima} pax
                        </span>
                      </div>

                      {u.num_habitaciones && (
                        <div className="flex items-center gap-1.5">
                          <BedDouble size={14} className="text-sky-300" />
                          <span className="text-xs font-medium">{u.num_habitaciones} hab.</span>
                        </div>
                      )}

                      {u.num_banos && (
                        <div className="flex items-center gap-1.5">
                          <Bath size={14} className="text-sky-300" />
                          <span className="text-xs font-medium">{u.num_banos} baños</span>
                        </div>
                      )}

                      {u.superficie_m2 && (
                        <div className="flex items-center gap-1.5">
                          <Maximize2 size={14} className="text-sky-300" />
                          <span className="text-xs font-medium font-mono">{u.superficie_m2} m²</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Foto portada — alineada con el card de precios */}
                  {u.foto_portada ? (
                    <div className="hidden h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-slate-700 bg-[#0f1b2d] lg:block">
                      <img
                        src={u.foto_portada}
                        alt={u.nombre}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="hidden h-16 w-24 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-[#0f1b2d] lg:flex">
                      <ImageIcon size={16} className="text-slate-600" />
                    </div>
                  )}

                  {/* Prices Preview */}
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-[#0f1b2d] p-3">
                    <div className="space-y-1 border-r border-slate-700 pr-4">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        Base
                      </p>
                      <p className="leading-none text-lg font-bold text-emerald-300">
                        {u.precio_noche ?? 0}€
                        <span className="text-[10px] font-normal text-slate-400">/noche</span>
                      </p>
                    </div>

                    <div className="space-y-1 pl-1">
                      <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-amber-300">
                        <Tag size={8} /> Especial
                      </p>
                      <p className="leading-none text-lg font-bold text-amber-300">
                        {u.precio_noche_especial ?? '-'}€
                        <span className="text-[10px] font-normal text-slate-400">/noche</span>
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 border-t border-slate-700 pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                    <button
                      onClick={() => {
                        if (pricesOpen) setEditingPricesId(null)
                        else openPrices(u)
                      }}
                      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                        pricesOpen
                          ? 'bg-sky-500 text-[#07111f]'
                          : 'bg-[#0f1b2d] text-slate-200 hover:bg-[#16263a]'
                      }`}
                    >
                      Precios
                      {pricesOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    <button
                      onClick={() => openDetails(u)}
                      className="flex items-center gap-2 rounded-xl bg-[#0f1b2d] px-4 py-2 text-xs font-bold text-slate-200 transition-all hover:bg-[#16263a]"
                      title="Fotos y contenido"
                    >
                      <ImageIcon size={14} />
                      Detalles
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(u)}
                        className="rounded-lg p-2.5 text-slate-400 transition-all hover:bg-[#0f1b2d] hover:text-slate-50"
                        title="Editar unidad"
                      >
                        <Edit2 size={18} />
                      </button>

                      <button
                        onClick={() => toggleActiva(u)}
                        className={`rounded-lg p-2.5 transition-all ${
                          u.activa
                            ? 'text-emerald-300 hover:bg-emerald-500/10'
                            : 'text-slate-400 hover:bg-[#0f1b2d]'
                        }`}
                        title={u.activa ? 'Desactivar' : 'Activar'}
                      >
                        {u.activa ? <Power size={18} /> : <Eye size={18} />}
                      </button>

                      <button
                        onClick={() => handleDelete(u)}
                        className="rounded-lg p-2.5 text-slate-400 transition-all hover:bg-red-500/10 hover:text-red-300"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Price Panel */}
                {pricesOpen && (
                  <div className="overflow-hidden border-t border-slate-700">
                    <div className="space-y-6 bg-[#08111f] p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-base font-semibold text-slate-50">
                            Tarifas de {u.nombre}
                          </p>
                          <p className="mt-1 text-sm text-slate-300">
                            Los precios especiales se aplican en los periodos que hayas definido
                          </p>
                        </div>

                        <button
                          onClick={() => setEditingPricesId(null)}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-[#0f1b2d] hover:text-slate-100"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                        <PriceBlock
                          title="Configuración precio base"
                          subtitle="Aplica el resto del año"
                          icon={<CheckCircle2 size={18} className="text-emerald-300" />}
                        >
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <PriceField
                              label="Precio noche"
                              value={pricesForm.precio_noche ?? ''}
                              onChange={(v) => setPricesForm((p) => ({ ...p, precio_noche: v }))}
                              prefix="€"
                            />
                            <PriceField
                              label="Extra huésped"
                              value={pricesForm.extra_huesped_noche ?? ''}
                              onChange={(v) =>
                                setPricesForm((p) => ({ ...p, extra_huesped_noche: v }))
                              }
                              prefix="€"
                            />
                            <PriceField
                              label="Limpieza"
                              value={pricesForm.tarifa_limpieza ?? ''}
                              onChange={(v) =>
                                setPricesForm((p) => ({ ...p, tarifa_limpieza: v }))
                              }
                              prefix="€"
                            />
                            <PriceField
                              label="Mínimo noches"
                              value={pricesForm.min_noches ?? ''}
                              isInt
                              onChange={(v) => setPricesForm((p) => ({ ...p, min_noches: v }))}
                            />
                          </div>
                        </PriceBlock>

                        <PriceBlock
                          title="Configuración precio especial"
                          subtitle="Solo en periodos marcados"
                          icon={<AlertCircle size={18} className="text-amber-300" />}
                        >
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <PriceField
                              label="Precio noche"
                              value={pricesForm.precio_noche_especial ?? ''}
                              onChange={(v) =>
                                setPricesForm((p) => ({ ...p, precio_noche_especial: v }))
                              }
                              prefix="€"
                              placeholder="= base"
                            />
                            <PriceField
                              label="Extra huésped"
                              value={pricesForm.extra_huesped_especial ?? ''}
                              onChange={(v) =>
                                setPricesForm((p) => ({ ...p, extra_huesped_especial: v }))
                              }
                              prefix="€"
                              placeholder="= base"
                            />
                            <PriceField
                              label="Limpieza"
                              value={pricesForm.tarifa_limpieza_especial ?? ''}
                              onChange={(v) =>
                                setPricesForm((p) => ({ ...p, tarifa_limpieza_especial: v }))
                              }
                              prefix="€"
                              placeholder="= base"
                            />
                            <PriceField
                              label="Mínimo noches"
                              value={pricesForm.min_noches_especial ?? ''}
                              isInt
                              onChange={(v) =>
                                setPricesForm((p) => ({ ...p, min_noches_especial: v }))
                              }
                              placeholder="= base"
                            />
                          </div>
                        </PriceBlock>
                      </div>

                      {pricesError && (
                        <p className="flex items-center gap-1.5 text-xs text-red-300">
                          <AlertCircle size={12} /> {pricesError}
                        </p>
                      )}

                      <div className="flex justify-end border-t border-slate-700 pt-4">
                        <button
                          onClick={savePrices}
                          disabled={savingPrices}
                          className="flex items-center gap-2 rounded-2xl bg-sky-500 px-8 py-3 text-sm font-bold text-[#07111f] shadow-lg shadow-sky-500/20 transition-all hover:bg-sky-400 disabled:opacity-50"
                        >
                          {savingPrices ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Save size={18} />
                          )}
                          Guardar configuración de precios
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Formulario crear/editar unidad ───────────────────────────────── */}
      </div>

      {/* ── Modal crear / editar unidad ────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-700 bg-[#08111f] shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
            <UnidadFormPanel
              form={form}
              setForm={setForm}
              editingId={editingId}
              saving={saving}
              error={error}
              onSave={handleSave}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}

      {/* ── Modal detalles unidad ───────────────────────────────────────────── */}
      {showDetailModal && detailUnit && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-7xl overflow-hidden rounded-3xl border border-slate-700 bg-[#08111f] shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
            <div className="flex items-start justify-between border-b border-slate-800 bg-[#0b1728] px-6 py-5">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-bold text-slate-50">{detailUnit.nombre}</h2>
                  <Badge variant="info">{TIPO_LABELS[detailUnit.tipo] ?? detailUnit.tipo}</Badge>
                  {!detailUnit.activa && <Badge variant="default">Inactiva</Badge>}
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <Users size={14} className="text-sky-300" />
                    {detailUnit.capacidad_base}–{detailUnit.capacidad_maxima} pax
                  </div>

                  {detailUnit.num_habitaciones && (
                    <div className="flex items-center gap-1.5">
                      <BedDouble size={14} className="text-sky-300" />
                      {detailUnit.num_habitaciones} hab.
                    </div>
                  )}

                  {detailUnit.num_banos && (
                    <div className="flex items-center gap-1.5">
                      <Bath size={14} className="text-sky-300" />
                      {detailUnit.num_banos} baños
                    </div>
                  )}

                  {detailUnit.superficie_m2 && (
                    <div className="flex items-center gap-1.5">
                      <Maximize2 size={14} className="text-sky-300" />
                      {detailUnit.superficie_m2} m²
                    </div>
                  )}

                  <span className="rounded-md border border-slate-700 bg-[#0f1b2d] px-2 py-0.5 font-mono text-[11px] text-slate-300">
                    {detailUnit.slug}
                  </span>
                </div>
              </div>

              <button
                onClick={closeDetails}
                className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-[#182436] hover:text-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[calc(92vh-88px)] overflow-y-auto p-6">
              {!accessToken ? (
                <div className="rounded-2xl border border-amber-700/50 bg-amber-950/30 p-4 text-sm text-amber-200">
                  No se ha podido obtener el token de sesión. Cierra sesión y vuelve a entrar.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <section className="rounded-3xl border border-slate-800 bg-[#0b1728] p-5">
                    <div className="mb-4 flex items-center gap-2 text-sky-300">
                      <ImageIcon size={18} />
                      <h3 className="text-sm font-bold uppercase tracking-[0.18em]">
                        Fotos de la unidad
                      </h3>
                    </div>

                    <UnitPhotoManager unidadId={detailUnit.id} accessToken={accessToken} />
                  </section>

                  <section className="rounded-3xl border border-slate-800 bg-[#0b1728] p-5">
                    <div className="mb-4 flex items-center gap-2 text-sky-300">
                      <FileText size={18} />
                      <h3 className="text-sm font-bold uppercase tracking-[0.18em]">
                        Contenido público
                      </h3>
                    </div>

                    <UnitDescriptionForm
                      unidadId={detailUnit.id}
                      accessToken={accessToken}
                      initialValues={{
                        descripcion_corta: detailUnit.descripcion_corta ?? '',
                        descripcion_larga: detailUnit.descripcion_larga ?? '',
                        descripcion_extras: detailUnit.descripcion_extras ?? '',
                        amenities: detailUnit.amenities ?? [],
                      }}
                    />
                  </section>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Formulario de unidad ───────────────────────────────────────────────────────
function UnidadFormPanel({
  form,
  setForm,
  editingId,
  saving,
  error,
  onSave,
  onCancel,
}: {
  form: UnidadForm
  setForm: React.Dispatch<React.SetStateAction<UnidadForm>>
  editingId: string | null
  saving: boolean
  error: string
  onSave: () => void
  onCancel: () => void
}) {
  const set = (k: keyof UnidadForm, v: any) => setForm((p) => ({ ...p, [k]: v }))

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-800/80 bg-[#08111f] shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-between border-b border-slate-800/80 bg-[#0b1728] px-6 py-4">
        <h3 className="text-base font-semibold text-slate-50">
          {editingId ? 'Editar unidad' : 'Nueva unidad'}
        </h3>
        <button
          onClick={onCancel}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-[#182436] hover:text-slate-100"
        >
          <X size={15} />
        </button>
      </div>

      <div className="space-y-6 p-6">
        <div>
          <p className={section}>Datos generales</p>

          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={lbl}>Nombre *</label>
              <input
                autoFocus
                value={form.nombre}
                onChange={(e) => {
                  set('nombre', e.target.value)
                  if (!editingId) set('slug', toSlug(e.target.value))
                }}
                placeholder="Casa La Rasilla"
                className={input}
              />
            </div>

            <div>
              <label className={lbl}>Slug (URL)</label>
              <input
                value={form.slug}
                onChange={(e) => set('slug', e.target.value)}
                placeholder="casa-principal"
                className={`${input} font-mono`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
            <div className="md:col-span-1">
              <label className={lbl}>Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => set('tipo', e.target.value as any)}
                className={input}
              >
                {Object.entries(TIPO_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={lbl}>Cap. base</label>
              <input
                type="number"
                min={1}
                value={form.capacidad_base}
                onChange={(e) => set('capacidad_base', e.target.value)}
                className={input}
              />
            </div>

            <div>
              <label className={lbl}>Cap. máx.</label>
              <input
                type="number"
                min={1}
                value={form.capacidad_maxima}
                onChange={(e) => set('capacidad_maxima', e.target.value)}
                className={input}
              />
            </div>

            <div>
              <label className={lbl}>Hab.</label>
              <input
                type="number"
                min={0}
                value={form.num_habitaciones}
                onChange={(e) => set('num_habitaciones', e.target.value)}
                className={input}
              />
            </div>

            <div>
              <label className={lbl}>Baños</label>
              <input
                type="number"
                min={0}
                value={form.num_banos}
                onChange={(e) => set('num_banos', e.target.value)}
                className={input}
              />
            </div>

            <div>
              <label className={lbl}>m²</label>
              <input
                type="number"
                min={0}
                value={form.superficie_m2}
                onChange={(e) => set('superficie_m2', e.target.value)}
                placeholder="—"
                className={input}
              />
            </div>
          </div>
        </div>

        <div>
          <p className={section}>Precios</p>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <PriceBlock
              title="Configuración precio base"
              subtitle="Aplica el resto del año"
              icon={<CheckCircle2 size={18} className="text-emerald-300" />}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <PriceField
                  label="Precio noche"
                  value={form.precio_noche}
                  onChange={(v) => set('precio_noche', v)}
                  prefix="€"
                />
                <PriceField
                  label="Extra huésped"
                  value={form.extra_huesped_noche}
                  onChange={(v) => set('extra_huesped_noche', v)}
                  prefix="€"
                />
                <PriceField
                  label="Limpieza"
                  value={form.tarifa_limpieza}
                  onChange={(v) => set('tarifa_limpieza', v)}
                  prefix="€"
                />
                <PriceField
                  label="Mínimo noches"
                  value={form.min_noches}
                  isInt
                  onChange={(v) => set('min_noches', v)}
                />
              </div>
            </PriceBlock>

            <PriceBlock
              title="Configuración precio especial"
              subtitle="Solo en periodos marcados"
              icon={<AlertCircle size={18} className="text-amber-300" />}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <PriceField
                  label="Precio noche"
                  value={form.precio_noche_especial}
                  onChange={(v) => set('precio_noche_especial', v)}
                  prefix="€"
                  placeholder="= base"
                />
                <PriceField
                  label="Extra huésped"
                  value={form.extra_huesped_especial}
                  onChange={(v) => set('extra_huesped_especial', v)}
                  prefix="€"
                  placeholder="= base"
                />
                <PriceField
                  label="Limpieza"
                  value={form.tarifa_limpieza_especial}
                  onChange={(v) => set('tarifa_limpieza_especial', v)}
                  prefix="€"
                  placeholder="= base"
                />
                <PriceField
                  label="Mínimo noches"
                  value={form.min_noches_especial}
                  isInt
                  onChange={(v) => set('min_noches_especial', v)}
                  placeholder="= base"
                />
              </div>
            </PriceBlock>
          </div>
        </div>

        <div className="flex items-center gap-2.5 border-t border-slate-800/80 pt-3">
          <input
            type="checkbox"
            id="activa-chk"
            checked={form.activa}
            onChange={(e) => set('activa', e.target.checked)}
            className="rounded border-slate-600 bg-[#0f1b2d] text-sky-500"
          />
          <label
            htmlFor="activa-chk"
            className="cursor-pointer select-none text-sm text-slate-200"
          >
            Unidad activa
          </label>
        </div>

        {error && (
          <p className="flex items-center gap-1.5 rounded-xl border border-red-900/70 bg-red-950/30 px-3 py-2 text-sm text-red-200">
            <AlertCircle size={14} /> {error}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white"
          >
            Cancelar
          </button>

          <button
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-2xl bg-sky-500 px-5 py-2.5 text-sm font-bold text-[#07111f] shadow-lg shadow-sky-500/20 transition-all hover:bg-sky-400 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CheckCircle2 size={14} />
            )}
            {editingId ? 'Guardar cambios' : 'Crear unidad'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Componentes UI auxiliares ─────────────────────────────────────────────────
function Badge({
  children,
  variant = 'default',
}: {
  children: React.ReactNode
  variant?: 'default' | 'info' | 'success' | 'warning' | 'danger'
}) {
  const styles: Record<string, string> = {
    default: 'border-slate-600 bg-[#0f1b2d] text-slate-200',
    info: 'border-sky-500/20 bg-sky-500/10 text-sky-300',
    success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
    warning: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
    danger: 'border-red-500/20 bg-red-500/10 text-red-300',
  }

  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${styles[variant]}`}
    >
      {children}
    </span>
  )
}

function PriceBlock({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string
  subtitle: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-5 rounded-3xl border border-slate-700 bg-[#0b1728] p-5">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wide text-slate-50">{title}</h4>
          <p className="mt-0.5 text-xs text-slate-300">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

function PriceField({
  label,
  value,
  onChange,
  isInt,
  placeholder,
  prefix,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  isInt?: boolean
  placeholder?: string
  prefix?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium uppercase tracking-tight text-slate-300">
        {label}
      </label>

      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
            {prefix}
          </span>
        )}

        <input
          type="number"
          min={0}
          step={isInt ? 1 : 0.01}
          value={value}
          placeholder={placeholder ?? '0'}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-xl border border-slate-600 bg-[#0f1b2d] py-2.5 text-sm font-medium text-slate-50 placeholder-slate-400 transition-all focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 ${
            prefix ? 'pl-7 pr-3' : 'px-3'
          }`}
        />
      </div>
    </div>
  )
}

// ── Helpers de estilos ─────────────────────────────────────────────────────────
const lbl =
  'mb-2 block text-[12px] font-semibold uppercase tracking-wide text-slate-200'

const section =
  'mb-3 text-[12px] font-bold uppercase tracking-[0.18em] text-slate-300'

const input =
  'w-full rounded-2xl border border-slate-600 bg-[#0f1b2d] px-3 py-2.5 text-sm font-medium text-slate-50 placeholder-slate-400 transition-all focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20'