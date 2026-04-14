// src/admin/pages/SuperAdminPage.tsx
import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Building2, Check, AlertCircle, Loader2,
  Eye, EyeOff, ToggleLeft, ToggleRight, X,
  Globe, ChevronDown, ChevronRight, Trash2,
} from 'lucide-react'
import { listProperties, createProperty, togglePropertyActiva } from '../../services/properties.service'
import type { PropertySummary } from '../../services/properties.service'
import { listDomains, addDomain, removeDomain } from '../../services/domains.service'
import type { CustomDomain } from '../../services/domains.service'

// ─── Modal nueva propiedad ─────────────────────────────────────────────────────

function CreatePropertyModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [nombre,    setNombre]    = useState('')
  const [slug,      setSlug]      = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [showPwd,   setShowPwd]   = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [done,      setDone]      = useState(false)

  // Auto-generar slug a partir del nombre
  const handleNombreChange = (v: string) => {
    setNombre(v)
    setSlug(
      v.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    )
  }

  const canSubmit = nombre.trim() && slug.trim() && /^[a-z0-9-]+$/.test(slug) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && password.length >= 6 && !loading

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError('')
    try {
      await createProperty({ nombre: nombre.trim(), slug: slug.trim(), admin_email: email, admin_password: password })
      setDone(true)
      setTimeout(() => { onCreated(); onClose() }, 1000)
    } catch (err: any) {
      setError(err.message ?? 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-sidebar-border bg-sidebar-bg shadow-2xl">

        <div className="flex items-center justify-between border-b border-sidebar-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600/20">
              <Building2 size={16} className="text-brand-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Nueva propiedad</h2>
              <p className="text-[11px] text-slate-500">Nuevo cliente en la plataforma</p>
            </div>
          </div>
          <button onClick={onClose} disabled={loading}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-40">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Nombre de la propiedad *
            </label>
            <input
              type="text"
              value={nombre}
              onChange={e => handleNombreChange(e.target.value)}
              disabled={loading || done}
              autoFocus
              placeholder="Casa Rural El Ejemplo"
              className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Slug (URL) *
            </label>
            <input
              type="text"
              value={slug}
              onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              disabled={loading || done}
              placeholder="casa-rural-el-ejemplo"
              className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
            />
            {slug && !/^[a-z0-9-]+$/.test(slug) && (
              <p className="mt-1 text-xs text-amber-400">Solo letras minúsculas, números y guiones</p>
            )}
          </div>

          <div className="border-t border-slate-800 pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Usuario administrador inicial
            </p>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={loading || done}
                  placeholder="admin@cliente.com"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Contraseña * <span className="font-normal text-slate-500">(mínimo 6 caracteres)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={loading || done}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 pr-11 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={loading}
              className="flex-1 rounded-xl border border-slate-600 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={!canSubmit}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all disabled:opacity-50 ${
                done ? 'bg-emerald-600 text-white' : 'bg-brand-600 text-white hover:bg-brand-700'
              }`}>
              {done ? (
                <><Check size={15} /> Creada</>
              ) : loading ? (
                <><Loader2 size={15} className="animate-spin" /> Creando…</>
              ) : (
                <><Plus size={15} /> Crear propiedad</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Panel de dominios (se monta al expandir una propiedad) ───────────────────

function DomainsPanel({ propertyId }: { propertyId: string }) {
  const [domains,  setDomains]  = useState<CustomDomain[]>([])
  const [loading,  setLoading]  = useState(true)
  const [newDomain, setNewDomain] = useState('')
  const [adding,   setAdding]   = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [error,    setError]    = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try { setDomains(await listDomains(propertyId)) }
    catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [propertyId])

  useEffect(() => { load() }, [load])

  async function handleAdd() {
    const d = newDomain.trim().toLowerCase()
    if (!d) return
    setAdding(true)
    setError('')
    try {
      const created = await addDomain(propertyId, d)
      setDomains(prev => [...prev, created])
      setNewDomain('')
    } catch (e: any) { setError(e.message) }
    finally { setAdding(false) }
  }

  async function handleRemove(id: string) {
    setRemoving(id)
    setError('')
    try {
      await removeDomain(propertyId, id)
      setDomains(prev => prev.filter(d => d.id !== id))
    } catch (e: any) { setError(e.message) }
    finally { setRemoving(null) }
  }

  return (
    <div className="border-t border-sidebar-border bg-slate-900/40 px-5 py-4 space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
        <Globe size={12} /> Dominios personalizados
      </p>

      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1.5">
          <AlertCircle size={12} />{error}
        </p>
      )}

      {loading ? (
        <Loader2 size={14} className="animate-spin text-slate-500" />
      ) : (
        <div className="space-y-1.5">
          {domains.length === 0 && (
            <p className="text-xs text-slate-600">Sin dominios registrados</p>
          )}
          {domains.map(d => (
            <div key={d.id} className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-slate-200">{d.domain}</span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                  d.verified ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                }`}>
                  {d.verified ? 'verificado' : 'pendiente'}
                </span>
              </div>
              <button
                onClick={() => handleRemove(d.id)}
                disabled={removing === d.id}
                className="text-slate-600 hover:text-red-400 transition-colors disabled:opacity-40"
              >
                {removing === d.id
                  ? <Loader2 size={13} className="animate-spin" />
                  : <Trash2 size={13} />
                }
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Añadir dominio */}
      <div className="flex gap-2 pt-1">
        <input
          type="text"
          value={newDomain}
          onChange={e => setNewDomain(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="casarural.com"
          disabled={adding}
          className="flex-1 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-1.5 font-mono text-xs text-slate-100 placeholder-slate-600 outline-none focus:border-brand-400 disabled:opacity-50"
        />
        <button
          onClick={handleAdd}
          disabled={!newDomain.trim() || adding}
          className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          {adding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          Añadir
        </button>
      </div>

      <p className="text-[10px] text-slate-600 leading-relaxed">
        Añade el dominio en Vercel → Project Settings → Domains y apunta el DNS a Vercel.
        El estado "pendiente" cambia a "verificado" manualmente tras confirmar el DNS.
      </p>
    </div>
  )
}

// ─── Tarjeta de propiedad ──────────────────────────────────────────────────────

function PropertyCard({
  property,
  toggling,
  onToggle,
}: {
  property:  PropertySummary
  toggling:  string | null
  onToggle:  (p: PropertySummary) => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-2xl border border-sidebar-border overflow-hidden">
      {/* Cabecera de la tarjeta */}
      <div className="flex items-center gap-3 px-5 py-4 bg-sidebar-bg">
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-slate-500 hover:text-slate-300 transition-colors"
        >
          {expanded
            ? <ChevronDown size={16} />
            : <ChevronRight size={16} />
          }
        </button>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white truncate">{property.nombre}</p>
          <p className="font-mono text-xs text-slate-500">{property.slug}</p>
        </div>

        <span className="text-xs text-slate-600">
          {new Date(property.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>

        <button
          onClick={() => onToggle(property)}
          disabled={toggling === property.id}
          className="flex items-center gap-1.5 text-xs font-medium transition-colors disabled:opacity-50"
        >
          {toggling === property.id ? (
            <Loader2 size={14} className="animate-spin text-slate-400" />
          ) : property.activa ? (
            <><ToggleRight size={16} className="text-emerald-400" /><span className="text-emerald-400">Activa</span></>
          ) : (
            <><ToggleLeft size={16} className="text-slate-500" /><span className="text-slate-500">Inactiva</span></>
          )}
        </button>
      </div>

      {/* Panel de dominios (expandible) */}
      {expanded && <DomainsPanel propertyId={property.id} />}
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────────────────────────

export function SuperAdminPage() {
  const [properties, setProperties] = useState<PropertySummary[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [showModal,  setShowModal]  = useState(false)
  const [toggling,   setToggling]   = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setProperties(await listProperties())
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleToggle(p: PropertySummary) {
    setToggling(p.id)
    try {
      await togglePropertyActiva(p.id, !p.activa)
      setProperties(prev => prev.map(x => x.id === p.id ? { ...x, activa: !x.activa } : x))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setToggling(null)
    }
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Propiedades</h1>
          <p className="mt-0.5 text-sm text-slate-500">Clientes activos en la plataforma</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-brand-700 active:scale-95"
        >
          <Plus size={16} />
          Nueva propiedad
        </button>
      </div>

      {/* Error global */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle size={15} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-slate-500" />
        </div>
      ) : properties.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 py-16 text-center text-slate-500">
          <Building2 size={32} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No hay propiedades registradas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {properties.map(p => (
            <PropertyCard
              key={p.id}
              property={p}
              toggling={toggling}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      {showModal && (
        <CreatePropertyModal
          onClose={() => setShowModal(false)}
          onCreated={load}
        />
      )}
    </div>
  )
}
