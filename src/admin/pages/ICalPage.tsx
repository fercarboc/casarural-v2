import React, { useState, useEffect, useCallback } from 'react'
import {
  RefreshCw, Plus, Trash2, CheckCircle2, AlertCircle, ExternalLink,
  Clock, Info, Loader2, X, Shield, Calendar, ChevronDown, ChevronUp,
  Eye, EyeOff
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { icalService, ICalFeed, SyncLog } from '../../services/ical.service'
import { configService, Unidad } from '../../services/config.service'

type Plataforma = 'BOOKING' | 'AIRBNB' | 'ESCAPADARURAL' | 'OTRO'

const PLATAFORMAS: { value: Plataforma; label: string; color: string; hint: string }[] = [
  { value: 'BOOKING',       label: 'Booking.com',     color: 'bg-blue-500/10 text-blue-300 border border-blue-500/20',    hint: 'Extranet → Propiedad → Calendario → Exportar calendario (iCal)' },
  { value: 'AIRBNB',        label: 'Airbnb',          color: 'bg-red-500/10 text-red-300 border border-red-500/20',      hint: 'Calendario → Disponibilidad → Exportar calendario' },
  { value: 'ESCAPADARURAL', label: 'Escapada Rural',  color: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20',  hint: 'Panel propietario → Calendario → Enlace iCal' },
  { value: 'OTRO',          label: 'Otro',            color: 'bg-slate-500/10 text-slate-300 border border-slate-500/20',    hint: 'Cualquier fuente compatible con formato iCal/ICS' },
]

// ── Página ────────────────────────────────────────────────

export const ICalPage: React.FC = () => {
  const [feeds, setFeeds] = useState<ICalFeed[]>([])
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [unidades, setUnidades] = useState<Unidad[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [syncingAll, setSyncingAll] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [f, l, cfg] = await Promise.all([
        icalService.getFeeds(),
        icalService.getLogs(),
        configService.getConfig().catch(() => null),
      ])
      setFeeds(f)
      setLogs(l)
      if (cfg) setUnidades(cfg.unidades)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSyncAll = async () => {
    setSyncingAll(true)
    setSyncResult(null)
    const result = await icalService.syncAll()
    setSyncingAll(false)
    setSyncResult(result.errores === 0
      ? `✓ Sincronización completada — ${result.total} bloqueo${result.total !== 1 ? 's' : ''} importado${result.total !== 1 ? 's' : ''}`
      : `⚠ ${result.errores} feed${result.errores > 1 ? 's' : ''} con error`)
    setTimeout(() => setSyncResult(null), 6000)
    load()
  }

  const handleSyncOne = async (feedId: string) => {
    setSyncingId(feedId)
    const result = await icalService.syncFeed(feedId)
    setSyncingId(null)
    setSyncResult(result.error
      ? `Error al sincronizar: ${result.error}`
      : `✓ ${result.importados} bloqueo${result.importados !== 1 ? 's' : ''} importado${result.importados !== 1 ? 's' : ''}`)
    setTimeout(() => setSyncResult(null), 5000)
    load()
  }

  const handleDeactivate = async (id: string) => {
    if (!confirm('¿Desactivar este feed? Los bloqueos ya importados se conservarán.')) return
    await icalService.deleteFeed(id)
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar permanentemente este feed? Los bloqueos importados se conservarán.')) return
    await icalService.deleteFeedPermanent(id)
    load()
  }

  const activeFeeds = feeds.filter(f => f.activo)
  const inactiveFeeds = feeds.filter(f => !f.activo)

  if (loading) return (
    <div className="flex h-[60vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
    </div>
  )

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Sincronización iCal</h1>
          <p className="mt-1 text-sm text-slate-400">
            Importa reservas de Booking.com, Airbnb y Escapada Rural como bloqueos en tu calendario.
            <strong className="text-slate-200"> Los bloqueos importados nunca se borran automáticamente.</strong>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncAll}
            disabled={syncingAll || activeFeeds.length === 0}
            className="flex items-center gap-2 rounded-xl border border-cyan-800/35 bg-[#132743] px-3 py-2 text-sm font-medium text-slate-200 hover:bg-[#18304f] transition-all disabled:opacity-40 shadow-[0_8px_20px_rgba(0,0,0,0.18)]"
          >
            <RefreshCw size={14} className={syncingAll ? 'animate-spin' : ''} />
            Sincronizar todos
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-all shadow-[0_8px_20px_rgba(0,0,0,0.18)]"
          >
            <Plus size={14} /> Añadir feed
          </button>
        </div>
      </div>

      {/* Resultado sync */}
      {syncResult && (
        <div className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium border ${
          syncResult.startsWith('✓')
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
            : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
        }`}>
          {syncResult.startsWith('✓') ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {syncResult}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Feeds activos */}
          {activeFeeds.length === 0 && !showAddForm && (
            <div className="rounded-2xl border-2 border-dashed border-cyan-800/35 bg-[#0d203a] p-12 text-center space-y-3 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <Calendar size={40} className="mx-auto text-slate-500" />
              <p className="font-semibold text-slate-200">Sin feeds configurados</p>
              <p className="text-sm text-slate-400">
                Añade los calendarios de Booking, Airbnb o Escapada Rural para sincronizar reservas.
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-2 mt-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 shadow-[0_8px_20px_rgba(0,0,0,0.18)]"
              >
                <Plus size={14} /> Añadir primer feed
              </button>
            </div>
          )}

          {activeFeeds.map(feed => (
            <FeedCard
              key={feed.id}
              feed={feed}
              logs={logs.filter(l => l.feed_id === feed.id)}
              isSyncing={syncingId === feed.id}
              onSync={() => handleSyncOne(feed.id)}
              onDeactivate={() => handleDeactivate(feed.id)}
              onDelete={() => handleDelete(feed.id)}
            />
          ))}

          {/* Feeds inactivos */}
          {inactiveFeeds.length > 0 && (
            <div className="space-y-3">
              <button
                onClick={() => setShowInactive(!showInactive)}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showInactive ? <EyeOff size={14} /> : <Eye size={14} />}
                {showInactive ? 'Ocultar' : 'Ver'} {inactiveFeeds.length} feed{inactiveFeeds.length > 1 ? 's' : ''} inactivo{inactiveFeeds.length > 1 ? 's' : ''}
              </button>

              {showInactive && inactiveFeeds.map(feed => (
                <FeedCard
                  key={feed.id}
                  feed={feed}
                  logs={logs.filter(l => l.feed_id === feed.id)}
                  isSyncing={false}
                  onSync={() => handleSyncOne(feed.id)}
                  onDeactivate={() => handleDeactivate(feed.id)}
                  onDelete={() => handleDelete(feed.id)}
                  inactive
                />
              ))}
            </div>
          )}

          {/* Formulario añadir */}
          {showAddForm && (
            <AddFeedForm
              unidades={unidades}
              onSaved={() => { setShowAddForm(false); load() }}
              onCancel={() => setShowAddForm(false)}
            />
          )}
        </div>

        {/* Panel info */}
        <div className="space-y-4">
          <HowItWorks />
          <LogsPanel logs={logs.slice(0, 8)} feeds={feeds} />
        </div>
      </div>
    </div>
  )
}

// ── Tarjeta de feed ───────────────────────────────────────

function FeedCard({
  feed,
  logs,
  isSyncing,
  onSync,
  onDeactivate,
  onDelete,
  inactive
}: {
  key?: React.Key
  feed: ICalFeed
  logs: SyncLog[]
  isSyncing: boolean
  onSync: () => void
  onDeactivate: () => void
  onDelete: () => void
  inactive?: boolean
}) {
  const [showLogs, setShowLogs] = useState(false)
  const lastLog = logs[0]
  const plat = PLATAFORMAS.find(p => p.value === feed.plataforma)

  return (
    <div className={`overflow-hidden rounded-2xl border shadow-[0_10px_28px_rgba(0,0,0,0.18)] ${
      inactive
        ? 'border-cyan-900/25 bg-[#0b1a31] opacity-60'
        : 'border-cyan-800/40 bg-[#0d203a]'
    }`}>
      <div className="flex items-start gap-4 p-5">
        {/* Status icon */}
        <div className={`mt-0.5 rounded-2xl p-2.5 shrink-0 ${
          !feed.activo ? 'bg-slate-500/10 text-slate-400' :
          lastLog?.resultado === 'ERROR' ? 'bg-red-500/10 text-red-400' :
          lastLog?.resultado === 'OK' ? 'bg-emerald-500/10 text-emerald-400' :
          'bg-slate-500/10 text-slate-400'
        }`}>
          {!feed.activo ? <EyeOff size={20} /> :
           lastLog?.resultado === 'ERROR' ? <AlertCircle size={20} /> :
           lastLog?.resultado === 'OK' ? <CheckCircle2 size={20} /> :
           <Clock size={20} />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="font-bold text-white">{feed.nombre ?? feed.plataforma}</h3>
            {plat && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${plat.color}`}>
                {plat.label}
              </span>
            )}
            {!feed.activo && (
              <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] font-bold text-slate-400 border border-slate-500/20">
                Inactivo
              </span>
            )}
          </div>

          <p className="mb-2 truncate font-mono text-xs text-slate-500">{feed.url}</p>

          <div className="flex items-center gap-4 text-[11px] text-slate-400 flex-wrap">
            {feed.ultima_sync ? (
              <span className="flex items-center gap-1">
                <Clock size={11} />
                Última sync: {format(parseISO(feed.ultima_sync), "d MMM HH:mm", { locale: es })}
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Clock size={11} />
                Nunca sincronizado
              </span>
            )}

            {lastLog?.bloqueos_importados !== undefined && lastLog.bloqueos_importados > 0 && (
              <span className="font-medium text-emerald-300">
                {lastLog.bloqueos_importados} bloqueo{lastLog.bloqueos_importados > 1 ? 's' : ''} importados
              </span>
            )}

            {lastLog?.resultado === 'ERROR' && (
              <span className="max-w-[180px] truncate text-red-400">{lastLog.mensaje}</span>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-1 shrink-0">
          {feed.activo && (
            <button
              onClick={onSync}
              disabled={isSyncing}
              title="Sincronizar ahora"
              className="rounded-xl p-2 text-slate-400 transition-all hover:bg-[#18304f] hover:text-slate-100 disabled:opacity-40"
            >
              <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
            </button>
          )}

          <a
            href={feed.url}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir URL del feed"
            className="rounded-xl p-2 text-slate-400 transition-all hover:bg-[#18304f] hover:text-slate-100"
          >
            <ExternalLink size={16} />
          </a>

          <button
            onClick={() => setShowLogs(!showLogs)}
            title="Ver logs"
            className="rounded-xl p-2 text-slate-400 transition-all hover:bg-[#18304f] hover:text-slate-100"
          >
            {showLogs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {feed.activo ? (
            <button
              onClick={onDeactivate}
              title="Desactivar feed"
              className="rounded-xl p-2 text-slate-400 transition-all hover:bg-amber-500/10 hover:text-amber-400"
            >
              <EyeOff size={16} />
            </button>
          ) : (
            <button
              onClick={onDelete}
              title="Eliminar feed"
              className="rounded-xl p-2 text-slate-400 transition-all hover:bg-red-500/10 hover:text-red-400"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Logs expandibles */}
      {showLogs && (
        <div className="space-y-1.5 border-t border-cyan-800/30 bg-[#08182d] px-5 py-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Últimos registros
          </p>

          {logs.length === 0 ? (
            <p className="text-xs text-slate-500">Sin registros de sincronización</p>
          ) : logs.slice(0, 5).map(log => (
            <div key={log.id} className="flex items-start gap-2 text-xs">
              {log.resultado === 'OK'
                ? <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-emerald-400" />
                : <AlertCircle size={12} className="mt-0.5 shrink-0 text-red-400" />
              }
              <span className="text-slate-500">
                {format(parseISO(log.created_at), "d MMM HH:mm", { locale: es })}
              </span>
              <span className={`flex-1 ${log.resultado === 'OK' ? 'text-slate-300' : 'text-red-400'}`}>
                {log.resultado === 'OK'
                  ? `${log.bloqueos_importados} bloqueos importados`
                  : log.mensaje}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Formulario añadir feed ────────────────────────────────

function AddFeedForm({
  unidades,
  onSaved,
  onCancel
}: {
  unidades: import('../../services/config.service').Unidad[]
  onSaved: () => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    nombre: '',
    plataforma: 'BOOKING' as ICalFeed['plataforma'],
    url: '',
    unidad_id: unidades[0]?.id ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const plat = PLATAFORMAS.find(p => p.value === form.plataforma)

  useEffect(() => {
    if (unidades.length > 0 && !form.unidad_id) {
      setForm(p => ({ ...p, unidad_id: unidades[0].id }))
    }
  }, [unidades])

  const handleSave = async () => {
    if (!form.nombre.trim() || !form.url.trim()) {
      setError('Nombre y URL son obligatorios')
      return
    }
    if (!form.url.startsWith('http')) {
      setError('La URL debe comenzar por http:// o https://')
      return
    }
    if (!form.unidad_id) {
      setError('Selecciona una unidad')
      return
    }

    setSaving(true)
    setError('')
    try {
      await icalService.addFeed(form)
      onSaved()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 rounded-2xl border border-cyan-800/40 bg-[#0d203a] p-6 shadow-[0_10px_28px_rgba(0,0,0,0.18)]">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">Añadir nuevo feed iCal</h3>
        <button
          onClick={onCancel}
          className="rounded-xl p-1.5 text-slate-400 hover:bg-[#18304f] hover:text-slate-100"
        >
          <X size={15} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-400">Plataforma</label>
          <select
            value={form.plataforma}
            onChange={e => {
              const p = PLATAFORMAS.find(x => x.value === e.target.value)
              set('plataforma', e.target.value)
              if (p && !form.nombre) set('nombre', p.label)
            }}
            className="w-full rounded-xl border border-cyan-800/35 bg-[#132743] px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
          >
            {PLATAFORMAS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-400">Nombre del feed</label>
          <input
            type="text"
            value={form.nombre}
            onChange={e => set('nombre', e.target.value)}
            placeholder="Ej: Booking.com principal"
            className="w-full rounded-xl border border-cyan-800/35 bg-[#132743] px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
          />
        </div>
      </div>

      {unidades.length > 1 && (
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-400">Unidad</label>
          <select
            value={form.unidad_id}
            onChange={e => set('unidad_id', e.target.value)}
            className="w-full rounded-xl border border-cyan-800/35 bg-[#132743] px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
          >
            {unidades.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </select>
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-slate-400">URL del calendario iCal</label>
        <input
          type="url"
          value={form.url}
          onChange={e => set('url', e.target.value)}
          placeholder="https://ical.booking.com/v1/export?t=..."
          className="w-full rounded-xl border border-cyan-800/35 bg-[#132743] px-3 py-2.5 font-mono text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
        />
        {plat && (
          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-400">
            <Info size={12} className="mt-0.5 shrink-0 text-blue-400" />
            <strong className="text-slate-200">{plat.label}:</strong> {plat.hint}
          </p>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-50 shadow-[0_8px_20px_rgba(0,0,0,0.18)]"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Añadir y sincronizar
        </button>
      </div>
    </div>
  )
}

// ── Panel info ────────────────────────────────────────────

function HowItWorks() {
  return (
    <div className="space-y-4 rounded-2xl border border-cyan-800/40 bg-[#0d203a] p-5 shadow-[0_10px_28px_rgba(0,0,0,0.18)]">
      <h3 className="flex items-center gap-2 text-sm font-bold text-slate-100">
        <Shield size={16} className="text-slate-400" /> Política de seguridad
      </h3>

      <div className="space-y-3 text-xs leading-relaxed text-slate-400">
        <p>
          Los bloqueos importados desde plataformas externas <strong className="text-slate-200">nunca se eliminan automáticamente</strong>,
          incluso si desactivas el feed.
        </p>
        <p>
          Esto garantiza que no se liberen accidentalmente fechas ya reservadas en Booking o Airbnb.
        </p>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-300">
          <p className="mb-1 font-semibold">Durante desarrollo</p>
          <p>
            Puedes añadir los feeds reales de tus cuentas. La sincronización importa bloqueos
            pero no crea reservas completas hasta que esté activa la Edge Function.
          </p>
        </div>
      </div>
    </div>
  )
}

function LogsPanel({ logs, feeds }: { logs: SyncLog[]; feeds: ICalFeed[] }) {
  if (logs.length === 0) return null

  return (
    <div className="rounded-2xl border border-cyan-800/40 bg-[#0d203a] p-5 shadow-[0_10px_28px_rgba(0,0,0,0.18)]">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
        Actividad reciente
      </h3>

      <div className="space-y-2">
        {logs.map(log => {
          const feed = feeds.find(f => f.id === log.feed_id)
          return (
            <div key={log.id} className="flex items-start gap-2 rounded-xl bg-[#132743] p-2.5 text-xs border border-cyan-800/25">
              {log.resultado === 'OK'
                ? <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-emerald-400" />
                : <AlertCircle size={12} className="mt-0.5 shrink-0 text-red-400" />
              }

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-200">{feed?.nombre ?? 'Feed eliminado'}</p>
                <p className="text-slate-500">
                  {format(parseISO(log.created_at), "d MMM HH:mm", { locale: es })}
                  {log.resultado === 'OK' && ` · ${log.bloqueos_importados} importados`}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}