import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '../../services/supabase'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface AdminTenantConfig {
  property_id:     string
  nombre:          string
  logo_url:        string | null
  rol:             string
  onboarding_done: boolean
}

interface AdminTenantCtx extends AdminTenantConfig {
  /** Llama a esto tras completar el wizard para refrescar el contexto */
  refreshTenant: () => void
}

// ─── Contexto ─────────────────────────────────────────────────────────────────

const AdminTenantContext = createContext<AdminTenantCtx | null>(null)

// ─── Hook público ─────────────────────────────────────────────────────────────

export function useAdminTenant(): AdminTenantCtx {
  const ctx = useContext(AdminTenantContext)
  if (!ctx) throw new Error('useAdminTenant debe usarse dentro de <AdminTenantProvider>')
  return ctx
}

// ─── Pantallas de carga / error ───────────────────────────────────────────────

function AdminNoProperty() {
  const { signOut } = useAuth()
  return (
    <div style={{
      display:         'flex',
      flexDirection:   'column',
      alignItems:      'center',
      justifyContent:  'center',
      height:          '100vh',
      backgroundColor: '#0f172a',
      color:           '#e2e8f0',
      fontFamily:      'sans-serif',
      gap:             16,
      padding:         24,
      textAlign:       'center',
    }}>
      <div style={{ fontSize: 40 }}>⚠️</div>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Cuenta no vinculada</h2>
      <p style={{ margin: 0, color: '#94a3b8', maxWidth: 360, lineHeight: 1.6 }}>
        Este usuario no está asociado a ninguna propiedad. Contacta con el administrador para
        que te añada como usuario desde el panel.
      </p>
      <button
        onClick={() => signOut()}
        style={{
          marginTop: 8, padding: '8px 20px', borderRadius: 6,
          border: 'none', background: '#334155', color: '#e2e8f0',
          cursor: 'pointer', fontSize: 14,
        }}
      >
        Cerrar sesión
      </button>
    </div>
  )
}

function AdminLoadingSpinner() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', backgroundColor: '#0f172a',
    }}>
      <div style={{
        width: 28, height: 28, border: '3px solid #334155',
        borderTopColor: '#94a3b8', borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ─── Provider ─────────────────────────────────────────────────────────────────

interface AdminTenantProviderProps { children: ReactNode }

export function AdminTenantProvider({ children }: AdminTenantProviderProps) {
  const { user } = useAuth()
  const [config,  setConfig]  = useState<AdminTenantConfig | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) { setConfig(null); setLoading(false); return }

    try {
      // ── Query base (siempre disponible) ───────────────────────────────────
      const { data, error } = await supabase
        .from('property_users')
        .select(`
          property_id,
          rol,
          properties (
            id,
            nombre,
            logo_url
          )
        `)
        .eq('user_id', user.id)
        .maybeSingle()

      if (error || !data) {
        console.error('[AdminTenantContext] No se encontró property para el usuario:', error?.message)
        setConfig(null)
        return
      }

      const prop = data.properties as {
        id: string; nombre: string; logo_url: string | null
      } | null

      // ── Leer onboarding_done en query separada (columna puede no existir aún) ──
      let onboardingDone = true
      try {
        const { data: propData } = await supabase
          .from('properties')
          .select('onboarding_done')
          .eq('id', data.property_id)
          .maybeSingle()
        if (propData && typeof propData.onboarding_done === 'boolean') {
          onboardingDone = propData.onboarding_done
        }
      } catch {
        // Columna no existe todavía → dejamos true para no bloquear
      }

      setConfig({
        property_id:     data.property_id,
        nombre:          prop?.nombre   ?? 'Mi empresa',
        logo_url:        prop?.logo_url ?? null,
        rol:             data.rol       ?? 'ADMIN',
        onboarding_done: onboardingDone,
      })
    } catch (err) {
      console.error('[AdminTenantContext] Error cargando property:', err)
      setConfig(null)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => { load() }, [load])

  if (loading) return <AdminLoadingSpinner />
  if (!config)  return <AdminNoProperty />

  const ctx: AdminTenantCtx = { ...config, refreshTenant: load }

  return (
    <AdminTenantContext.Provider value={ctx}>
      {children}
    </AdminTenantContext.Provider>
  )
}
