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
  { value: 'BOOKING',       label: 'Booking.com',     color: 'bg-blue-100 text-blue-700',    hint: 'Extranet → Propiedad → Calendario → Exportar calendario (iCal)' },
  { value: 'AIRBNB',        label: 'Airbnb',          color: 'bg-red-100 text-red-700',      hint: 'Calendario → Disponibilidad → Exportar calendario' },
  { value: 'ESCAPADARURAL', label: 'Escapada Rural',  color: 'bg-green-100 text-green-700',  hint: 'Panel propietario → Calendario → Enlace iCal' },
  { value: 'OTRO',          label: 'Otro',            color: 'bg-slate-100 text-slate-600',    hint: 'Cualquier fuente compatible con formato iCal/ICS' },
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

  const activeFeeds   = feeds.filter(f => f.activo)
  const inactiveFeeds = feeds.filter(f => !f.activo)

  if (loading) return (
    <div className="flex h-[60vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
    </div>
  )

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sincronización iCal</h1>
          <p className="text-sm text-slate-500 mt-1">
            Importa reservas de Booking.com, Airbnb y Escapada Rural como bloqueos en tu calendario.
            <strong className="text-slate-700"> Los bloqueos importados nunca se borran automáticamente.</strong>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncAll}
            disabled={syncingAll || activeFeeds.length === 0}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-40 shadow-sm"
          >
            <RefreshCw size={14} className={syncingAll ? 'animate-spin' : ''} />
            Sincronizar todos
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-all shadow-sm"
          >
            <Plus size={14} /> Añadir feed
          </button>
        </div>
      </div>

      {/* Resultado sync */}
      {syncResult && (
        <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium border ${
          syncResult.startsWith('✓')
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-amber-50 border-amber-200 text-amber-700'
        }`}>
          {syncResult.startsWith('✓') ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {syncResult}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">

          {/* Feeds activos */}
          {activeFeeds.length === 0 && !showAddForm && (
            <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center space-y-3">
              <Calendar size={40} className="mx-auto text-slate-300" />
              <p className="font-semibold text-slate-600">Sin feeds configurados</p>
              <p className="text-sm text-slate-400">Añade los calendarios de Booking, Airbnb o Escapada Rural para sincronizar reservas.</p>
              <button onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 shadow-sm">
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
            <div>
              <button
                onClick={() => setShowInactive(!showInactive)}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-600 transition-colors"
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

function FeedCard({ feed, logs, isSyncing, onSync, onDeactivate, onDelete, inactive }: {
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
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden ${inactive ? 'opacity-50' : 'border-slate-200'}`}>
      <div className="p-5 flex items-start gap-4">
        {/* Status icon */}
        <div className={`mt-0.5 rounded-xl p-2.5 shrink-0 ${
          !feed.activo ? 'bg-slate-100 text-slate-400' :
          lastLog?.resultado === 'ERROR' ? 'bg-red-50 text-red-500' :
          lastLog?.resultado === 'OK' ? 'bg-emerald-50 text-emerald-600' :
          'bg-slate-50 text-slate-400'
        }`}>
          {!feed.activo ? <EyeOff size={20} /> :
           lastLog?.resultado === 'ERROR' ? <AlertCircle size={20} /> :
           lastLog?.resultado === 'OK' ? <CheckCircle2 size={20} /> :
           <Clock size={20} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-slate-900">{feed.nombre ?? feed.plataforma}</h3>
            {plat && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${plat.color}`}>
                {plat.label}
              </span>
            )}
            {!feed.activo && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-400">Inactivo</span>}
          </div>
          <p className="text-xs text-slate-400 font-mono truncate mb-2">{feed.url}</p>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            {feed.ultima_sync ? (
              <span className="flex items-center gap-1">
                <Clock size={11} />
                Última sync: {format(parseISO(feed.ultima_sync), "d MMM HH:mm", { locale: es })}
              </span>
            ) : (
              <span className="flex items-center gap-1"><Clock size={11} /> Nunca sincronizado</span>
            )}
            {lastLog?.bloqueos_importados !== undefined && lastLog.bloqueos_importados > 0 && (
              <span className="text-emerald-600 font-medium">
                {lastLog.bloqueos_importados} bloqueo{lastLog.bloqueos_importados > 1 ? 's' : ''} importados
              </span>
            )}
            {lastLog?.resultado === 'ERROR' && (
              <span className="text-red-500 truncate max-w-[180px]">{lastLog.mensaje}</span>
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
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all disabled:opacity-40"
            >
              <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
            </button>
          )}
          <a href={feed.url} target="_blank" rel="noopener noreferrer"
            title="Abrir URL del feed"
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all">
            <ExternalLink size={16} />
          </a>
          <button onClick={() => setShowLogs(!showLogs)} title="Ver logs"
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all">
            {showLogs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {feed.activo ? (
            <button onClick={onDeactivate} title="Desactivar feed"
              className="p-2 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-all">
              <EyeOff size={16} />
            </button>
          ) : (
            <button onClick={onDelete} title="Eliminar feed"
              className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Logs expandibles */}
      {showLogs && (
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 space-y-1.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Últimos registros</p>
          {logs.length === 0 ? (
            <p className="text-xs text-slate-400">Sin registros de sincronización</p>
          ) : logs.slice(0, 5).map(log => (
            <div key={log.id} className="flex items-start gap-2 text-xs">
              {log.resultado === 'OK'
                ? <CheckCircle2 size={12} className="text-emerald-500 shrink-0 mt-0.5" />
                : <AlertCircle size={12} className="text-red-400 shrink-0 mt-0.5" />
              }
              <span className="text-slate-400">{format(parseISO(log.created_at), "d MMM HH:mm", { locale: es })}</span>
              <span className={`flex-1 ${log.resultado === 'OK' ? 'text-slate-600' : 'text-red-500'}`}>
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

function AddFeedForm({ unidades, onSaved, onCancel }: { unidades: import('../../services/config.service').Unidad[]; onSaved: () => void; onCancel: () => void }) {
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

  // Sincronizar unidad_id cuando llegan las unidades
  useEffect(() => {
    if (unidades.length > 0 && !form.unidad_id) {
      setForm(p => ({ ...p, unidad_id: unidades[0].id }))
    }
  }, [unidades])

  const handleSave = async () => {
    if (!form.nombre.trim() || !form.url.trim()) { setError('Nombre y URL son obligatorios'); return }
    if (!form.url.startsWith('http')) { setError('La URL debe comenzar por http:// o https://'); return }
    if (!form.unidad_id) { setError('Selecciona una unidad'); return }
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
    <div className="rounded-xl border border-slate-300 bg-white p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Añadir nuevo feed iCal</h3>
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
          <X size={15} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Plataforma</label>
          <select
            value={form.plataforma}
            onChange={e => {
              const p = PLATAFORMAS.find(x => x.value === e.target.value)
              set('plataforma', e.target.value)
              if (p && !form.nombre) set('nombre', p.label)
            }}
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
          >
            {PLATAFORMAS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nombre del feed</label>
          <input
            type="text"
            value={form.nombre}
            onChange={e => set('nombre', e.target.value)}
            placeholder="Ej: Booking.com principal"
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
          />
        </div>
      </div>

      {unidades.length > 1 && (
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Unidad</label>
          <select
            value={form.unidad_id}
            onChange={e => set('unidad_id', e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
          >
            {unidades.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </select>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1.5">URL del calendario iCal</label>
        <input
          type="url"
          value={form.url}
          onChange={e => set('url', e.target.value)}
          placeholder="https://ical.booking.com/v1/export?t=..."
          className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
        />
        {plat && (
          <p className="mt-1.5 text-xs text-slate-400 flex items-start gap-1.5">
            <Info size={12} className="shrink-0 mt-0.5 text-blue-400" />
            <strong className="text-slate-600">{plat.label}:</strong> {plat.hint}
          </p>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">Cancelar</button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 shadow-sm"
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
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
        <Shield size={16} className="text-slate-400" /> Política de seguridad
      </h3>
      <div className="space-y-3 text-xs text-slate-500 leading-relaxed">
        <p>Los bloqueos importados desde plataformas externas <strong className="text-slate-700">nunca se eliminan automáticamente</strong>, incluso si desactivas el feed.</p>
        <p>Esto garantiza que no se liberen accidentalmente fechas ya reservadas en Booking o Airbnb.</p>
        <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-amber-700">
          <p className="font-semibold mb-1">Durante desarrollo</p>
          <p>Puedes añadir los feeds reales de tus cuentas. La sincronización importa bloqueos pero no crea reservas completas hasta que esté activa la Edge Function.</p>
        </div>
      </div>
    </div>
  )
}

function LogsPanel({ logs, feeds }: { logs: SyncLog[]; feeds: ICalFeed[] }) {
  if (logs.length === 0) return null
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Actividad reciente</h3>
      <div className="space-y-2">
        {logs.map(log => {
          const feed = feeds.find(f => f.id === log.feed_id)
          return (
            <div key={log.id} className="flex items-start gap-2 text-xs">
              {log.resultado === 'OK'
                ? <CheckCircle2 size={12} className="text-emerald-500 shrink-0 mt-0.5" />
                : <AlertCircle size={12} className="text-red-400 shrink-0 mt-0.5" />
              }
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-700 truncate">{feed?.nombre ?? 'Feed eliminado'}</p>
                <p className="text-slate-400">
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
