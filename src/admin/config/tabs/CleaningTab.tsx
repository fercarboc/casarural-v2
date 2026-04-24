// src/admin/config/tabs/CleaningTab.tsx
import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Phone, Mail, User, Building2, Loader2, Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useAdminTenant } from '../../context/AdminTenantContext'
import { cleaningResourceService } from '../../../modules/cleaning/services/cleaningResourceService'
import type { CleaningStaff, CleaningProvider } from '../../../modules/cleaning/types/cleaning.types'

// ── Staff form ────────────────────────────────────────────────────────────────

const EMPTY_STAFF = { name: '', phone: '', email: '' }
const EMPTY_PROVIDER = { name: '', contact_person: '', phone: '', email: '', notes: '' }

function inputCls(err?: boolean) {
  return `w-full rounded-xl border ${err ? 'border-red-500/50' : 'border-sidebar-border'} bg-admin-card px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:border-brand-400 focus:outline-none`
}

// ── Sección Personal propio ───────────────────────────────────────────────────

function StaffSection({ propertyId }: { propertyId: string }) {
  const [items,      setItems]      = useState<CleaningStaff[]>([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [editId,     setEditId]     = useState<string | null>(null)
  const [form,       setForm]       = useState(EMPTY_STAFF)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setItems(await cleaningResourceService.getStaff(propertyId, true))
    } finally {
      setLoading(false)
    }
  }, [propertyId])

  useEffect(() => { load() }, [load])

  function startEdit(s: CleaningStaff) {
    setEditId(s.id)
    setForm({ name: s.name, phone: s.phone ?? '', email: s.email ?? '' })
    setShowForm(false)
  }

  function cancelEdit() {
    setEditId(null)
    setForm(EMPTY_STAFF)
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('El nombre es obligatorio'); return }
    setSaving(true)
    setError('')
    try {
      if (editId) {
        const updated = await cleaningResourceService.updateStaff(editId, {
          name: form.name.trim(), phone: form.phone.trim() || null, email: form.email.trim() || null,
        })
        setItems(prev => prev.map(s => s.id === editId ? updated : s))
        setEditId(null)
      } else {
        const created = await cleaningResourceService.createStaff({
          property_id: propertyId, name: form.name.trim(),
          phone: form.phone.trim() || null, email: form.email.trim() || null, active: true,
        })
        setItems(prev => [...prev, created])
        setShowForm(false)
      }
      setForm(EMPTY_STAFF)
    } catch (e: any) {
      setError(e.message ?? 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(id: string) {
    if (!confirm('¿Dar de baja a esta persona?')) return
    await cleaningResourceService.deactivateStaff(id)
    setItems(prev => prev.map(s => s.id === id ? { ...s, active: false } : s))
  }

  async function handleReactivate(id: string) {
    await cleaningResourceService.updateStaff(id, { active: true })
    setItems(prev => prev.map(s => s.id === id ? { ...s, active: true } : s))
  }

  const active   = items.filter(s => s.active)
  const inactive = items.filter(s => !s.active)

  return (
    <div className="overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar-bg">
      <div className="flex items-center justify-between border-b border-sidebar-border bg-admin-card/70 px-5 py-4">
        <div className="flex items-center gap-2">
          <User size={15} className="text-brand-400" />
          <h3 className="text-sm font-semibold text-white">Personal propio</h3>
          <span className="rounded-full bg-brand-600/20 px-2 py-0.5 text-[10px] font-bold text-brand-300">{active.length}</span>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setEditId(null); setForm(EMPTY_STAFF); setError('') }}
          className="flex items-center gap-1.5 rounded-xl border border-brand-500/30 bg-brand-600/20 px-3 py-1.5 text-xs font-semibold text-brand-300 hover:bg-brand-600/30"
        >
          <Plus size={12} /> Añadir persona
        </button>
      </div>

      {showForm && (
        <div className="border-b border-sidebar-border bg-admin-card/40 px-5 py-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand-400">Nueva persona</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input placeholder="Nombre *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls()} />
            <input placeholder="Teléfono" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputCls()} />
            <input placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputCls()} />
          </div>
          {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Guardar
            </button>
            <button onClick={() => { setShowForm(false); setError('') }} className="rounded-xl border border-sidebar-border px-4 py-2 text-xs text-slate-400 hover:bg-sidebar-hover">Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex h-20 items-center justify-center"><Loader2 size={18} className="animate-spin text-slate-500" /></div>
      ) : active.length === 0 && !showForm ? (
        <p className="px-5 py-8 text-center text-sm text-slate-500">No hay personal de limpieza registrado.</p>
      ) : (
        <div className="divide-y divide-sidebar-border">
          {active.map(s => (
            <div key={s.id} className="px-5 py-3">
              {editId === s.id ? (
                <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <input placeholder="Nombre *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls()} />
                    <input placeholder="Teléfono" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputCls()} />
                    <input placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputCls()} />
                  </div>
                  {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
                  <div className="mt-2 flex gap-2">
                    <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
                      {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Guardar
                    </button>
                    <button onClick={cancelEdit} className="rounded-xl border border-sidebar-border px-3 py-1.5 text-xs text-slate-400 hover:bg-sidebar-hover">Cancelar</button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium text-slate-100">{s.name}</span>
                    {s.phone && <span className="flex items-center gap-1 text-xs text-slate-400"><Phone size={10} />{s.phone}</span>}
                    {s.email && <span className="flex items-center gap-1 text-xs text-slate-400"><Mail size={10} />{s.email}</span>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button onClick={() => startEdit(s)} className="rounded-lg p-1.5 text-slate-500 hover:bg-sidebar-hover hover:text-slate-300"><Pencil size={13} /></button>
                    <button onClick={() => handleDeactivate(s.id)} className="rounded-lg p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-300"><Trash2 size={13} /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {inactive.length > 0 && (
        <div className="border-t border-sidebar-border">
          <button
            onClick={() => setShowInactive(v => !v)}
            className="flex w-full items-center gap-2 px-5 py-3 text-xs text-slate-500 hover:text-slate-300"
          >
            {showInactive ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {inactive.length} inactivo{inactive.length !== 1 ? 's' : ''}
          </button>
          {showInactive && inactive.map(s => (
            <div key={s.id} className="flex items-center justify-between px-5 py-2 opacity-50">
              <span className="text-sm text-slate-400 line-through">{s.name}</span>
              <button onClick={() => handleReactivate(s.id)} className="rounded-lg border border-sidebar-border px-2.5 py-1 text-[10px] text-slate-400 hover:bg-sidebar-hover">Reactivar</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Sección Empresas de limpieza ──────────────────────────────────────────────

function ProviderSection({ propertyId }: { propertyId: string }) {
  const [items,    setItems]    = useState<CleaningProvider[]>([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId,   setEditId]   = useState<string | null>(null)
  const [form,     setForm]     = useState(EMPTY_PROVIDER)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setItems(await cleaningResourceService.getProviders(propertyId, true))
    } finally {
      setLoading(false)
    }
  }, [propertyId])

  useEffect(() => { load() }, [load])

  function startEdit(p: CleaningProvider) {
    setEditId(p.id)
    setForm({ name: p.name, contact_person: p.contact_person ?? '', phone: p.phone ?? '', email: p.email ?? '', notes: p.notes ?? '' })
    setShowForm(false)
  }

  function cancelEdit() { setEditId(null); setForm(EMPTY_PROVIDER) }

  async function handleSave() {
    if (!form.name.trim()) { setError('El nombre de la empresa es obligatorio'); return }
    setSaving(true)
    setError('')
    try {
      if (editId) {
        const updated = await cleaningResourceService.updateProvider(editId, {
          name: form.name.trim(), contact_person: form.contact_person.trim() || null,
          phone: form.phone.trim() || null, email: form.email.trim() || null, notes: form.notes.trim() || null,
        })
        setItems(prev => prev.map(p => p.id === editId ? updated : p))
        setEditId(null)
      } else {
        const created = await cleaningResourceService.createProvider({
          property_id: propertyId, name: form.name.trim(),
          contact_person: form.contact_person.trim() || null,
          phone: form.phone.trim() || null, email: form.email.trim() || null,
          notes: form.notes.trim() || null, active: true,
        })
        setItems(prev => [...prev, created])
        setShowForm(false)
      }
      setForm(EMPTY_PROVIDER)
    } catch (e: any) {
      setError(e.message ?? 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(id: string) {
    if (!confirm('¿Dar de baja a esta empresa?')) return
    await cleaningResourceService.deactivateProvider(id)
    setItems(prev => prev.map(p => p.id === id ? { ...p, active: false } : p))
  }

  async function handleReactivate(id: string) {
    await cleaningResourceService.updateProvider(id, { active: true })
    setItems(prev => prev.map(p => p.id === id ? { ...p, active: true } : p))
  }

  const ProviderForm = ({ inline = false }: { inline?: boolean }) => (
    <div className={inline ? 'px-5 py-3' : ''}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input placeholder="Nombre empresa *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls()} />
        <input placeholder="Persona de contacto" value={form.contact_person} onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} className={inputCls()} />
        <input placeholder="Teléfono" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputCls()} />
        <input placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputCls()} />
        <input placeholder="Notas (horario, condiciones…)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={`${inputCls()} sm:col-span-2`} />
      </div>
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
          {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Guardar
        </button>
        <button onClick={() => { setShowForm(false); setEditId(null); setError('') }} className="rounded-xl border border-sidebar-border px-4 py-2 text-xs text-slate-400 hover:bg-sidebar-hover">Cancelar</button>
      </div>
    </div>
  )

  const active   = items.filter(p => p.active)
  const inactive = items.filter(p => !p.active)

  return (
    <div className="overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar-bg">
      <div className="flex items-center justify-between border-b border-sidebar-border bg-admin-card/70 px-5 py-4">
        <div className="flex items-center gap-2">
          <Building2 size={15} className="text-violet-400" />
          <h3 className="text-sm font-semibold text-white">Empresas de limpieza</h3>
          <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-bold text-violet-300">{active.length}</span>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setEditId(null); setForm(EMPTY_PROVIDER); setError('') }}
          className="flex items-center gap-1.5 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-300 hover:bg-violet-500/20"
        >
          <Plus size={12} /> Añadir empresa
        </button>
      </div>

      {showForm && (
        <div className="border-b border-sidebar-border bg-admin-card/40 px-5 py-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-violet-400">Nueva empresa</p>
          <ProviderForm />
        </div>
      )}

      {loading ? (
        <div className="flex h-20 items-center justify-center"><Loader2 size={18} className="animate-spin text-slate-500" /></div>
      ) : active.length === 0 && !showForm ? (
        <p className="px-5 py-8 text-center text-sm text-slate-500">No hay empresas de limpieza registradas.</p>
      ) : (
        <div className="divide-y divide-sidebar-border">
          {active.map(p => (
            <div key={p.id} className="px-5 py-3">
              {editId === p.id ? (
                <>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-violet-400">Editando empresa</p>
                  <ProviderForm inline />
                </>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm font-semibold text-slate-100">{p.name}</span>
                      {p.contact_person && <span className="flex items-center gap-1 text-xs text-slate-400"><User size={10} />{p.contact_person}</span>}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-3">
                      {p.phone && <span className="flex items-center gap-1 text-xs text-slate-500"><Phone size={10} />{p.phone}</span>}
                      {p.email && <span className="flex items-center gap-1 text-xs text-slate-500"><Mail size={10} />{p.email}</span>}
                      {p.notes && <span className="text-xs text-slate-500 italic">{p.notes}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button onClick={() => startEdit(p)} className="rounded-lg p-1.5 text-slate-500 hover:bg-sidebar-hover hover:text-slate-300"><Pencil size={13} /></button>
                    <button onClick={() => handleDeactivate(p.id)} className="rounded-lg p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-300"><Trash2 size={13} /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {inactive.length > 0 && (
        <div className="border-t border-sidebar-border">
          <button onClick={() => setShowInactive(v => !v)} className="flex w-full items-center gap-2 px-5 py-3 text-xs text-slate-500 hover:text-slate-300">
            {showInactive ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {inactive.length} inactiva{inactive.length !== 1 ? 's' : ''}
          </button>
          {showInactive && inactive.map(p => (
            <div key={p.id} className="flex items-center justify-between px-5 py-2 opacity-50">
              <span className="text-sm text-slate-400 line-through">{p.name}</span>
              <button onClick={() => handleReactivate(p.id)} className="rounded-lg border border-sidebar-border px-2.5 py-1 text-[10px] text-slate-400 hover:bg-sidebar-hover">Reactivar</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export function CleaningTab() {
  const { property_id } = useAdminTenant()

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-sidebar-border bg-sidebar-bg px-5 py-4">
        <h2 className="text-sm font-semibold text-white">Personal y empresas de limpieza</h2>
        <p className="mt-1 text-xs text-slate-400">
          Gestiona el equipo propio y las empresas externas que puedes asignar a las tareas de limpieza.
        </p>
      </div>
      <StaffSection    propertyId={property_id} />
      <ProviderSection propertyId={property_id} />
    </div>
  )
}
