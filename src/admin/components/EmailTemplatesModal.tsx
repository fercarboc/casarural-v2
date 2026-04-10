// src/admin/components/EmailTemplatesModal.tsx
import { useState, useEffect, useCallback } from 'react'
import {
  X, Mail, Save, Check, AlertCircle, Loader2,
  ChevronDown, ChevronUp, Plus, Eye, EyeOff, Info,
  ShieldAlert, FilePlus,
} from 'lucide-react'
import { supabase } from '../../integrations/supabase/client'
import {
  EMAIL_TEMPLATE_DEFAULTS,
  BASE_TEMPLATE_KEYS,
} from '../data/emailTemplateDefaults'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface DbTemplate {
  id: string
  key: string
  asunto: string
  cuerpo_html: string
  activa: boolean
  property_id: string
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface TemplateState {
  id: string | null
  key: string
  asunto: string
  cuerpo_html: string
  activa: boolean
  status: SaveStatus
  errorMsg: string
  open: boolean
  showVars: boolean
  confirmPending: boolean   // true = mostrando diálogo de confirmación
  isBase: boolean
}

interface Props {
  propertyId: string
  onClose: () => void
}

// ─── Plantilla nueva — estado inicial ─────────────────────────────────────────

const STARTER_HTML = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>Email</title></head>
<body style="margin:0;padding:0;background:#F5F5F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden;">
      <tr><td style="background:#2D4A3E;padding:28px 40px;">
        <p style="margin:0;font-size:20px;font-weight:700;color:#fff;">{{property_name}}</p>
      </td></tr>
      <tr><td style="padding:32px 40px;">
        <p style="margin:0;font-size:16px;color:#1C2B25;">Hola {{guest_name}},</p>
        <p style="margin:12px 0 0;font-size:14px;color:#555;">Escribe aquí el contenido de tu email.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`

function makeBaseState(key: string, isBase: boolean): TemplateState {
  const def = EMAIL_TEMPLATE_DEFAULTS.find(d => d.key === key)
  return {
    id: null,
    key,
    asunto: def?.asunto ?? '',
    cuerpo_html: def?.cuerpo_html ?? STARTER_HTML,
    activa: true,
    status: 'idle',
    errorMsg: '',
    open: false,
    showVars: false,
    confirmPending: false,
    isBase,
  }
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function EmailTemplatesModal({ propertyId, onClose }: Props) {
  const [loading, setLoading]     = useState(true)
  const [creating, setCreating]   = useState(false)
  const [createError, setCreateError] = useState('')

  // Map key → state (base + custom cargados de BD)
  const [templates, setTemplates] = useState<Map<string, TemplateState>>(() => {
    const m = new Map<string, TemplateState>()
    EMAIL_TEMPLATE_DEFAULTS.forEach(d => m.set(d.key, makeBaseState(d.key, true)))
    return m
  })

  // Formulario de nueva plantilla
  const [showNewForm, setShowNewForm]   = useState(false)
  const [newKey, setNewKey]             = useState('')
  const [newKeyError, setNewKeyError]   = useState('')
  const [savingNew, setSavingNew]       = useState(false)

  // ── Carga ────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('email_templates')
      .select('id, key, asunto, cuerpo_html, activa, property_id')
      .eq('property_id', propertyId)
      .order('key', { ascending: true })

    if (!error && data) {
      setTemplates(prev => {
        const next = new Map(prev)

        // Actualizar/crear estado para cada fila de BD
        for (const row of (data as DbTemplate[])) {
          const isBase = (BASE_TEMPLATE_KEYS as string[]).includes(row.key)
          const existing = next.get(row.key)
          next.set(row.key, {
            ...(existing ?? makeBaseState(row.key, isBase)),
            id: row.id,
            asunto: row.asunto,
            cuerpo_html: row.cuerpo_html,
            activa: row.activa,
          })
        }

        // Abrir la primera base automáticamente
        const firstKey = EMAIL_TEMPLATE_DEFAULTS[0].key
        const first = next.get(firstKey)
        if (first) next.set(firstKey, { ...first, open: true })

        return next
      })
    }
    setLoading(false)
  }, [propertyId])

  useEffect(() => { load() }, [load])

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function updTemplate(key: string, patch: Partial<TemplateState>) {
    setTemplates(prev => {
      const next = new Map(prev)
      const cur = next.get(key)
      if (cur) next.set(key, { ...cur, ...patch })
      return next
    })
  }

  // ── Guardar plantilla (con confirmación gestionada en la card) ─────────────

  async function doSave(key: string) {
    const s = templates.get(key)
    if (!s) return
    if (!s.asunto.trim() || !s.cuerpo_html.trim()) {
      updTemplate(key, { status: 'error', errorMsg: 'Asunto y cuerpo HTML son obligatorios', confirmPending: false })
      return
    }

    updTemplate(key, { status: 'saving', confirmPending: false, errorMsg: '' })

    const payload = {
      property_id: propertyId,
      key,
      asunto: s.asunto.trim(),
      cuerpo_html: s.cuerpo_html,
      activa: s.activa,
    }

    let error: any = null
    let savedId = s.id

    if (s.id) {
      const res = await supabase.from('email_templates').update(payload).eq('id', s.id)
      error = res.error
    } else {
      const res = await supabase.from('email_templates').insert(payload).select('id').single()
      error = res.error
      if (!error && res.data) savedId = res.data.id
    }

    if (error) {
      updTemplate(key, { status: 'error', errorMsg: error.message })
      setTimeout(() => updTemplate(key, { status: 'idle' }), 4000)
    } else {
      updTemplate(key, { status: 'saved', id: savedId })
      setTimeout(() => updTemplate(key, { status: 'idle' }), 2500)
    }
  }

  // ── Crear plantillas base faltantes ──────────────────────────────────────────

  async function createMissingTemplates() {
    setCreating(true)
    setCreateError('')

    const missing = EMAIL_TEMPLATE_DEFAULTS.filter(d => !templates.get(d.key)?.id)
    if (missing.length === 0) { setCreating(false); return }

    const rows = missing.map(d => ({
      property_id: propertyId,
      key: d.key,
      asunto: d.asunto,
      cuerpo_html: d.cuerpo_html,
      activa: true,
    }))

    const { data, error } = await supabase
      .from('email_templates').insert(rows).select('id, key')

    if (error) {
      setCreateError(error.message)
    } else if (data) {
      setTemplates(prev => {
        const next = new Map(prev)
        for (const row of (data as { id: string; key: string }[])) {
          const cur = next.get(row.key)
          if (cur) next.set(row.key, { ...cur, id: row.id })
        }
        return next
      })
    }
    setCreating(false)
  }

  // ── Alta nueva plantilla ──────────────────────────────────────────────────────

  function validateNewKey(k: string): string {
    if (!k.trim()) return 'La clave es obligatoria'
    if (!/^[a-z0-9_]+$/.test(k)) return 'Solo letras minúsculas, números y guión bajo'
    if (templates.has(k)) return 'Ya existe una plantilla con esa clave'
    return ''
  }

  async function handleCreateNew() {
    const err = validateNewKey(newKey)
    if (err) { setNewKeyError(err); return }
    setSavingNew(true)

    const payload = {
      property_id: propertyId,
      key: newKey.trim(),
      asunto: '',
      cuerpo_html: STARTER_HTML,
      activa: true,
    }

    const { data, error } = await supabase
      .from('email_templates').insert(payload).select('id').single()

    if (error) {
      setNewKeyError(error.message)
    } else {
      const newState: TemplateState = {
        ...makeBaseState(newKey.trim(), false),
        id: data.id,
        cuerpo_html: STARTER_HTML,
        open: true,
      }
      setTemplates(prev => {
        const next = new Map(prev)
        next.set(newKey.trim(), newState)
        return next
      })
      setNewKey('')
      setShowNewForm(false)
    }
    setSavingNew(false)
  }

  // ── Datos derivados ───────────────────────────────────────────────────────────

  const missingCount = EMAIL_TEMPLATE_DEFAULTS.filter(d => !templates.get(d.key)?.id).length
  const baseTemplates   = EMAIL_TEMPLATE_DEFAULTS.map(d => templates.get(d.key)!).filter(Boolean)
  const customTemplates = Array.from(templates.values()).filter(t => !t.isBase)
  const totalCount = templates.size

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-8 overflow-y-auto">
      <div className="w-full max-w-3xl rounded-2xl bg-admin-bg border border-sidebar-border shadow-2xl mb-8">

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-sidebar-border bg-sidebar-bg px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600/20">
              <Mail size={16} className="text-brand-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Plantillas de email</h2>
              <p className="text-[11px] text-slate-500">
                {totalCount} plantilla{totalCount !== 1 ? 's' : ''} · 3 base + {customTemplates.length} personalizadas
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
              <Loader2 size={20} className="animate-spin" /> Cargando plantillas…
            </div>
          ) : (
            <>
              {/* Banner faltantes */}
              {missingCount > 0 && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-400" />
                  <div className="flex-1 text-sm text-amber-300">
                    <strong>{missingCount}</strong> plantilla{missingCount > 1 ? 's' : ''} base no {missingCount > 1 ? 'existen' : 'existe'} en BD.
                  </div>
                  <button
                    onClick={createMissingTemplates}
                    disabled={creating}
                    className="shrink-0 flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-500 disabled:opacity-50 transition-colors"
                  >
                    {creating
                      ? <><Loader2 size={12} className="animate-spin" /> Creando…</>
                      : <><Plus size={12} /> Crear plantillas base</>}
                  </button>
                </div>
              )}
              {createError && (
                <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle size={12} />{createError}</p>
              )}

              {/* ── Plantillas base ── */}
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 px-1">Plantillas base del sistema</p>
              {baseTemplates.map(state => (
                <TemplateCard
                  key={state.key}
                  state={state}
                  propertyId={propertyId}
                  onToggleOpen={() => updTemplate(state.key, { open: !state.open })}
                  onToggleVars={() => updTemplate(state.key, { showVars: !state.showVars })}
                  onChange={patch => updTemplate(state.key, patch)}
                  onRequestSave={() => updTemplate(state.key, { confirmPending: true })}
                  onConfirmSave={() => doSave(state.key)}
                  onCancelSave={() => updTemplate(state.key, { confirmPending: false })}
                />
              ))}

              {/* ── Plantillas personalizadas ── */}
              {customTemplates.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 px-1 pt-2">Plantillas personalizadas</p>
                  {customTemplates.map(state => (
                    <TemplateCard
                      key={state.key}
                      state={state}
                      propertyId={propertyId}
                      onToggleOpen={() => updTemplate(state.key, { open: !state.open })}
                      onToggleVars={() => updTemplate(state.key, { showVars: !state.showVars })}
                      onChange={patch => updTemplate(state.key, patch)}
                      onRequestSave={() => updTemplate(state.key, { confirmPending: true })}
                      onConfirmSave={() => doSave(state.key)}
                      onCancelSave={() => updTemplate(state.key, { confirmPending: false })}
                    />
                  ))}
                </>
              )}

              {/* ── Formulario nueva plantilla ── */}
              {showNewForm ? (
                <div className="rounded-xl border border-brand-600/40 bg-brand-600/5 p-5 space-y-4">
                  <p className="text-sm font-semibold text-white flex items-center gap-2">
                    <FilePlus size={15} className="text-brand-400" /> Nueva plantilla personalizada
                  </p>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Clave única <span className="font-normal text-slate-500">(ej: bienvenida_viajero)</span>
                    </label>
                    <input
                      type="text"
                      value={newKey}
                      onChange={e => { setNewKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')); setNewKeyError('') }}
                      placeholder="mi_plantilla_custom"
                      className="w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                    />
                    {newKeyError && <p className="mt-1 text-xs text-red-400 flex items-center gap-1"><AlertCircle size={11} />{newKeyError}</p>}
                    <p className="mt-1 text-[11px] text-slate-500">
                      Se usa como <code className="text-brand-400">template_key</code> al llamar a la función <code className="text-brand-400">send-email</code>.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateNew}
                      disabled={savingNew || !newKey.trim()}
                      className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
                    >
                      {savingNew ? <><Loader2 size={13} className="animate-spin" /> Creando…</> : <><Plus size={13} /> Crear y editar</>}
                    </button>
                    <button
                      onClick={() => { setShowNewForm(false); setNewKey(''); setNewKeyError('') }}
                      className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm text-slate-400 hover:bg-slate-700 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewForm(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-600 py-3 text-sm text-slate-400 hover:border-brand-500 hover:text-brand-400 transition-colors"
                >
                  <FilePlus size={15} /> Nueva plantilla personalizada
                </button>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-sidebar-border px-6 py-4">
          <button onClick={onClose} className="rounded-xl border border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700 transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── TemplateCard ─────────────────────────────────────────────────────────────

function TemplateCard({
  state, onToggleOpen, onToggleVars, onChange,
  onRequestSave, onConfirmSave, onCancelSave,
}: {
  state: TemplateState
  propertyId: string
  onToggleOpen: () => void
  onToggleVars: () => void
  onChange: (patch: Partial<TemplateState>) => void
  onRequestSave: () => void
  onConfirmSave: () => void
  onCancelSave: () => void
}) {
  const def     = EMAIL_TEMPLATE_DEFAULTS.find(d => d.key === state.key)
  const exists  = !!state.id
  const isSaving = state.status === 'saving'
  const isSaved  = state.status === 'saved'
  const isError  = state.status === 'error'

  const label       = def?.label       ?? state.key
  const description = def?.description ?? 'Plantilla personalizada'
  const variables   = def?.variables   ?? []

  return (
    <div className={`rounded-xl border overflow-hidden transition-colors ${
      !exists ? 'border-amber-500/30 bg-amber-500/5' : 'border-sidebar-border bg-sidebar-bg'
    }`}>
      {/* Card header */}
      <button
        onClick={onToggleOpen}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-800/40 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`text-xs font-mono px-2 py-0.5 rounded-md shrink-0 ${
            exists ? 'bg-brand-600/20 text-brand-400' : 'bg-amber-600/20 text-amber-400'
          }`}>
            {state.key}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{label}</p>
            <p className="text-[11px] text-slate-500 truncate">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-3">
          {!exists && <span className="text-[10px] font-bold uppercase text-amber-400 border border-amber-500/40 rounded px-1.5 py-0.5">Falta</span>}
          {exists && <span className={`w-2 h-2 rounded-full ${state.activa ? 'bg-emerald-500' : 'bg-slate-500'}`} title={state.activa ? 'Activa' : 'Inactiva'} />}
          {state.open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </button>

      {/* Form expandido */}
      {state.open && (
        <div className="border-t border-sidebar-border px-5 pb-5 pt-4 space-y-4">

          {/* Asunto */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Asunto del email</label>
            <input
              type="text"
              value={state.asunto}
              onChange={e => onChange({ asunto: e.target.value })}
              disabled={isSaving}
              className="w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-50"
              placeholder="Asunto…"
            />
          </div>

          {/* Activa toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => onChange({ activa: !state.activa })}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:opacity-50 ${
                state.activa ? 'bg-brand-600' : 'bg-slate-600'
              }`}
            >
              <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                state.activa ? 'translate-x-4' : 'translate-x-0.5'
              }`} />
            </button>
            <span className="text-sm text-slate-300">{state.activa ? 'Plantilla activa' : 'Plantilla inactiva'}</span>
          </div>

          {/* Variables (solo para plantillas base con variables definidas) */}
          {variables.length > 0 && (
            <div>
              <button
                type="button"
                onClick={onToggleVars}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
              >
                <Info size={13} />
                {state.showVars ? 'Ocultar variables' : 'Ver variables disponibles'}
                {state.showVars ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
              {state.showVars && (
                <div className="mt-2 grid grid-cols-1 gap-1 rounded-xl border border-slate-700 bg-slate-900 p-3 sm:grid-cols-2">
                  {variables.map(v => (
                    <div key={v.name} className="flex items-start gap-1.5 text-xs">
                      <code className="shrink-0 rounded bg-slate-800 px-1.5 py-0.5 font-mono text-brand-400 text-[11px]">{v.name}</code>
                      <span className="text-slate-500 pt-0.5">{v.desc}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* HTML body */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Cuerpo HTML</label>
            <textarea
              value={state.cuerpo_html}
              onChange={e => onChange({ cuerpo_html: e.target.value })}
              disabled={isSaving}
              rows={14}
              spellCheck={false}
              className="w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2.5 text-xs text-slate-200 font-mono leading-relaxed placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-y disabled:opacity-50"
              placeholder="<!DOCTYPE html>…"
            />
          </div>

          {/* Error */}
          {isError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-300">
              <AlertCircle size={13} className="shrink-0 mt-0.5" />{state.errorMsg}
            </div>
          )}

          {/* ── Confirmación previa ── */}
          {state.confirmPending ? (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-4 space-y-3">
              <div className="flex items-start gap-2">
                <ShieldAlert size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-200">¿Confirmas los cambios en esta plantilla?</p>
                  <p className="text-xs text-amber-400 mt-0.5">
                    Modificar el asunto o el cuerpo HTML afectará a todos los emails que se envíen
                    a partir de ahora usando la plantilla <code className="text-amber-300">{state.key}</code>.
                    Esta acción no se puede deshacer.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={onCancelSave}
                  disabled={isSaving}
                  className="rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={onConfirmSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-500 disabled:opacity-50 transition-colors"
                >
                  {isSaving
                    ? <><Loader2 size={13} className="animate-spin" /> Guardando…</>
                    : <><Check size={13} /> Sí, guardar cambios</>}
                </button>
              </div>
            </div>
          ) : (
            /* Botón guardar normal */
            <div className="flex justify-end">
              <button
                onClick={onRequestSave}
                disabled={isSaving}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all disabled:opacity-60 ${
                  isSaved  ? 'bg-emerald-600 text-white'
                  : isError ? 'bg-red-600 text-white'
                  : 'bg-brand-600 text-white hover:bg-brand-700'
                }`}
              >
                {isSaving ? <><Loader2 size={14} className="animate-spin" /> Guardando…</>
                 : isSaved  ? <><Check size={14} /> Guardado</>
                 : <><Save size={14} /> Guardar cambios</>}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
