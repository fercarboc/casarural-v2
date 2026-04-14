# Análisis Técnico y Funcional: Arquitectura Multi-Tenant
### Casa Rural v2 — Abril 2026

---

## Índice

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Problemas Actuales Detectados](#2-problemas-actuales-detectados)
3. [Necesidades Funcionales](#3-necesidades-funcionales)
4. [Necesidades Técnicas](#4-necesidades-técnicas)
5. [Cambios Necesarios en Backend](#5-cambios-necesarios-en-backend)
6. [Cambios Necesarios en Frontend](#6-cambios-necesarios-en-frontend)
7. [Arquitectura Recomendada](#7-arquitectura-recomendada)
8. [Modelo de Despliegue Recomendado](#8-modelo-de-despliegue-recomendado)
9. [Riesgos y Errores a Evitar](#9-riesgos-y-errores-a-evitar)
10. [Plan por Fases](#10-plan-por-fases)
11. [Onboarding de Nuevos Clientes](#11-onboarding-de-nuevos-clientes)
12. [Conclusión](#12-conclusión)

---

## 1. Resumen Ejecutivo

**Buena noticia:** La base de datos ya es prácticamente multi-tenant. Todas las tablas críticas tienen `property_id`, existe la tabla `custom_domains`, existe `property_users`, y las edge functions ya contienen código de resolución por dominio.

**Mala noticia:** El frontend está completamente hardcodeado a un único cliente. La variable `VITE_PROPERTY_SLUG="la-rasilla"` está horneada en el build, y hay referencias directas al slug en el código fuente — no solo en `.env`.

**Conclusión ejecutiva:** No hace falta rehacer la arquitectura. Lo que hay que hacer es completar lo que ya está a medias. El camino más corto al multi-tenant real es eliminar los hardcodes y activar la resolución por dominio que ya existe en backend pero que el frontend ignora por completo.

---

## 2. Problemas Actuales Detectados

### 2.1 Hardcodes críticos

| Problema | Archivo | Detalle |
|---|---|---|
| Slug hardcodeado en admin | `src/admin/pages/ConfigPage.tsx:86` | `const PROPERTY_SLUG = 'la-rasilla'` |
| Slug via env en frontend | `.env` | `VITE_PROPERTY_SLUG="la-rasilla"` baked en build |
| Email alias hardcodeado | `src/admin/pages/LoginPage.tsx:7-15` | `"admin"` → `admin@staynexapp.com` |
| Brand en login | `src/admin/pages/LoginPage.tsx:88` | `"StayNexApp Admin RuralHouse"` literal |
| Brand en layout | `src/admin/components/AdminLayout.tsx:90` | `"Admin Rural Hosue"` (typo incluido) |

### 2.2 Problemas de diseño

- **El frontend resuelve la property por slug en tiempo de build**, no en tiempo de ejecución. Si despliegas el mismo build en dos dominios distintos, ambos mostrarán "la-rasilla".

- **Las Edge Functions ya saben resolver por dominio** (leen `x-forwarded-host`), pero el frontend las llama siempre con el slug hardcodeado. Se está ignorando una capacidad ya construida.

- **Admin asume single-property**: cada página carga la property del usuario logueado... excepto `ConfigPage`, que la hardcodea directamente en el código fuente.

- **No existe TenantContext en el frontend**: ni en `public` ni en `admin` hay un contexto global que identifique qué property está activa de forma dinámica.

### 2.3 Riesgos de seguridad latentes

- El email alias `admin@staynexapp.com` es un bypass de autenticación que en multi-tenant se convierte en un vector potencial de acceso cruzado entre properties.

- Si RLS (Row Level Security) de Supabase no está correctamente configurado, un admin podría hacer queries directas y ver datos de otra property sin restricciones.

---

## 3. Necesidades Funcionales

Lo que el sistema necesita hacer y actualmente no hace:

1. **Resolución de tenant por dominio en frontend**: `www.cliente1.com` debe cargar la config del cliente 1 sin que el build sepa quién es.
2. **Admin multi-property**: un admin normal solo ve su property; un superadmin puede gestionar varias (futuro).
3. **Branding dinámico**: logo, colores, nombre, SEO, footer — todo desde base de datos, no desde env vars.
4. **Activación por dominio**: un dominio no configurado debe mostrar un 404 o página de error clara, no una app vacía o rota.
5. **Onboarding guiado**: un cliente nuevo ve empty states útiles y un checklist de activación, no una app en blanco.

---

## 4. Necesidades Técnicas

1. **Eliminar `VITE_PROPERTY_SLUG`** del frontend. El frontend no debe conocer el slug en tiempo de build.
2. **Crear un `TenantContext`** que se resuelva en runtime al arrancar la app, antes de renderizar nada.
3. **La resolución del tenant debe basarse en `window.location.hostname`**, enviado al backend para resolverlo contra `custom_domains`.
4. **Admin debe obtener la `property_id` del usuario autenticado**, no de un hardcode.
5. **Stripe, emails y otras integraciones** deben ser por-property, usando los campos que ya existen en la tabla `properties`.
6. **Verificar y activar RLS en Supabase** para todas las tablas con datos sensibles.

---

## 5. Cambios Necesarios en Backend

### 5.1 Lo que ya existe y funciona

| Elemento | Estado |
|---|---|
| `property_id` en todas las tablas | ✅ Correcto |
| Tabla `custom_domains` | ✅ Existe |
| Tabla `property_users` con roles | ✅ Existe |
| Lógica de resolución por `x-forwarded-host` en edge functions | ✅ Existe |
| Campos de branding en `properties` (logo, site_title, legal...) | ✅ Existe |
| Campos de Stripe y email por property | ✅ Existe |

### 5.2 Campos nuevos en `properties`

```sql
ALTER TABLE properties ADD COLUMN IF NOT EXISTS
  -- Branding adicional
  primary_color        VARCHAR(7),        -- "#3B6E3A"
  secondary_color      VARCHAR(7),
  favicon_url          TEXT,
  og_image_url         TEXT,

  -- Feature flags
  feature_booking      BOOLEAN DEFAULT true,
  feature_gallery      BOOLEAN DEFAULT true,
  feature_activities   BOOLEAN DEFAULT false,
  feature_services     BOOLEAN DEFAULT true,
  feature_contact      BOOLEAN DEFAULT true,

  -- Estado del tenant
  estado               VARCHAR(20) DEFAULT 'active',  -- 'active' | 'inactive' | 'setup'
  onboarding_step      INTEGER DEFAULT 0,

  -- SEO
  lang                 VARCHAR(5) DEFAULT 'es',
  robots_index         BOOLEAN DEFAULT true,

  -- Analytics
  ga_measurement_id    VARCHAR(50),
  gtm_container_id     VARCHAR(50);
```

### 5.3 Mejoras a `custom_domains`

```sql
ALTER TABLE custom_domains ADD COLUMN IF NOT EXISTS
  es_principal   BOOLEAN DEFAULT false,
  ssl_activo     BOOLEAN DEFAULT false,
  verificado     BOOLEAN DEFAULT false;
```

### 5.4 Tabla nueva: `property_settings` (opcional pero recomendada)

Para configuraciones por cliente que no justifican una columna fija en `properties`:

```sql
CREATE TABLE IF NOT EXISTS property_settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  clave       VARCHAR(100) NOT NULL,
  valor       TEXT,
  tipo        VARCHAR(20) DEFAULT 'string',  -- 'string' | 'boolean' | 'number' | 'json'
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(property_id, clave)
);
```

**Regla de decisión:**
- Si el campo es estable, universal y se consulta siempre → columna en `properties`
- Si el campo varía mucho por cliente, es opcional o experimental → `property_settings`

### 5.5 Nueva Edge Function: `resolve-tenant` (la más importante)

Esta función debe ser pública (sin JWT). Es la pieza central del sistema multi-tenant.

```typescript
// supabase/functions/resolve-tenant/index.ts
// POST { hostname: "www.cliente1.com" }
// Respuesta: { property_id, slug, nombre, branding, features, estado }

// Flujo interno:
// 1. Buscar en custom_domains WHERE domain = hostname AND verificado = true
// 2. Unir con properties para obtener config pública
// 3. Si no existe → return { error: 'TENANT_NOT_FOUND', status: 404 }
// 4. Si estado != 'active' → return { error: 'TENANT_INACTIVE', status: 403 }
// 5. Devolver solo campos públicos (sin Stripe secrets, sin service role keys)

// Fallback para desarrollo:
// Si env ENVIRONMENT = 'development', aceptar también { slug } para local
```

**Campos que devuelve (solo públicos):**

```typescript
interface TenantPublicConfig {
  property_id: string;
  slug: string;
  nombre: string;
  estado: 'active' | 'inactive' | 'setup';
  branding: {
    logo_url: string;
    logo_alt: string;
    primary_color: string;
    favicon_url?: string;
    og_image_url?: string;
  };
  seo: {
    site_title: string;
    meta_description: string;
    lang: string;
    robots_index: boolean;
  };
  features: {
    booking: boolean;
    gallery: boolean;
    activities: boolean;
    services: boolean;
    contact: boolean;
  };
  contacto: {
    email: string;
    telefono: string;
    localidad: string;
  };
}
```

### 5.6 Verificación y activación de RLS

**Este punto es crítico. Ejecutar en el SQL editor de Supabase:**

```sql
-- Verificar estado actual de RLS
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'properties', 'unidades', 'reservas',
  'reserva_unidades', 'property_users',
  'periodos_especiales', 'email_templates',
  'customer_communications', 'ical_feeds'
);
```

**Si `rowsecurity = false` en cualquiera de estas tablas, es un problema de seguridad activo.**

Ejemplo de política correcta para `reservas`:

```sql
-- Activar RLS
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;

-- Política: admin solo ve reservas de su property
CREATE POLICY "admin_ve_su_property" ON reservas
  FOR ALL USING (
    property_id IN (
      SELECT property_id FROM property_users
      WHERE user_id = auth.uid()
    )
  );
```

Aplicar el mismo patrón a `unidades`, `periodos_especiales`, `email_templates`, `ical_feeds`, `customer_communications`.

### 5.7 Revisión de queries en Edge Functions

Todas las Edge Functions deben filtrar siempre por `property_id`. Buscar y corregir cualquier query que no lo haga:

```sql
-- MAL (devuelve datos de todas las properties):
SELECT * FROM unidades WHERE activa = true;

-- BIEN (filtra por property resuelta):
SELECT * FROM unidades
WHERE property_id = $resolved_property_id
AND activa = true;
```

---

## 6. Cambios Necesarios en Frontend

### 6.1 Crear `TenantContext` — El cambio más importante

```
src/shared/context/TenantContext.tsx   ← NUEVO
src/shared/services/tenant.service.ts  ← NUEVO
src/shared/types/tenant.ts             ← NUEVO
```

**Implementación base de `TenantContext.tsx`:**

```typescript
// src/shared/context/TenantContext.tsx

interface TenantConfig {
  propertyId: string;
  slug: string;
  nombre: string;
  estado: 'active' | 'inactive' | 'setup';
  branding: {
    logoUrl: string;
    logoAlt: string;
    primaryColor: string;
    faviconUrl?: string;
    ogImageUrl?: string;
  };
  seo: {
    siteTitle: string;
    metaDescription: string;
    lang: string;
    robotsIndex: boolean;
  };
  features: {
    booking: boolean;
    gallery: boolean;
    activities: boolean;
    services: boolean;
    contact: boolean;
  };
}

type TenantError = 'NOT_FOUND' | 'INACTIVE' | 'NETWORK_ERROR';

const TenantContext = createContext<TenantConfig | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<TenantConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<TenantError | null>(null);

  useEffect(() => {
    const hostname = import.meta.env.DEV
      ? (import.meta.env.VITE_DEV_PROPERTY_SLUG ?? 'la-rasilla')
      : window.location.hostname;

    resolveTenant(hostname)
      .then(setTenant)
      .catch((err: { code: TenantError }) => setError(err.code))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SplashScreen />;
  if (error === 'NOT_FOUND') return <TenantNotFound />;
  if (error === 'INACTIVE') return <TenantInactive />;

  return (
    <TenantContext.Provider value={tenant}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = (): TenantConfig => {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant debe usarse dentro de TenantProvider');
  return ctx;
};
```

**Añadir en `main.tsx`:**

```tsx
// main.tsx — TenantProvider debe envolver toda la app
ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TenantProvider>        {/* ← NUEVO, más externo que todo */}
      <AuthProvider>
        <App />
      </AuthProvider>
    </TenantProvider>
  </StrictMode>
);
```

### 6.2 Flujo completo de resolución por dominio

```
Usuario accede a www.cliente2.com
          ↓
main.tsx → <TenantProvider> se monta
          ↓
useEffect llama a resolveTenant("www.cliente2.com")
          ↓
tenant.service.ts → POST a Edge Function resolve-tenant
          ↓
Edge Function busca en custom_domains → properties
          ↓
Devuelve TenantPublicConfig o error
          ↓
  ┌───────┴────────┐
Error               Config OK
  ↓                    ↓
TenantNotFound    TenantContext disponible
TenantInactive          ↓
                  <App> renderiza
                  Cada página usa useTenant()
                  Booking y servicios usan property_id del contexto
```

### 6.3 Crear `AdminTenantContext`

```typescript
// src/admin/context/AdminTenantContext.tsx

// Al autenticarse el usuario, cargar su property:
const { data } = await supabase
  .from('property_users')
  .select(`
    property_id,
    rol,
    properties (
      id, nombre, slug, logo_url,
      primary_color, estado
    )
  `)
  .eq('user_id', user.id)
  .single();

// Guardar en contexto: property y rol del usuario
// Usar property_id de este contexto en todas las páginas admin
// Eliminar el hardcode PROPERTY_SLUG de ConfigPage
```

### 6.4 Branding dinámico con CSS variables

```typescript
// En TenantProvider, tras resolver el tenant:
useEffect(() => {
  if (!tenant) return;
  const root = document.documentElement;

  // Aplicar colores del cliente
  root.style.setProperty('--color-primary', tenant.branding.primaryColor);

  // Favicon dinámico
  if (tenant.branding.faviconUrl) {
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (link) link.href = tenant.branding.faviconUrl;
  }

  // Lang del HTML
  document.documentElement.lang = tenant.seo.lang;

  // Title por defecto
  document.title = tenant.seo.siteTitle;
}, [tenant]);
```

### 6.5 Estructura de carpetas recomendada

La estructura actual es válida. Solo hay que añadir lo indicado:

```
src/
├── admin/
│   ├── components/
│   │   ├── AdminLayout.tsx           (refactorizar: eliminar brand hardcoded)
│   │   └── ProtectedRoute.tsx
│   ├── context/
│   │   ├── AuthContext.tsx           (ya existe)
│   │   └── AdminTenantContext.tsx    ← NUEVO
│   └── pages/
│       ├── ConfigPage.tsx            (refactorizar: eliminar PROPERTY_SLUG)
│       └── LoginPage.tsx             (refactorizar: eliminar alias email)
│
├── public/
│   ├── components/
│   └── pages/
│
└── shared/
    ├── components/
    │   ├── TenantNotFound.tsx        ← NUEVO
    │   ├── TenantInactive.tsx        ← NUEVO
    │   └── SplashScreen.tsx          ← NUEVO (o reutilizar uno existente)
    ├── context/
    │   └── TenantContext.tsx         ← NUEVO
    ├── hooks/
    │   ├── useTenant.ts              ← NUEVO (o exportado desde TenantContext)
    │   └── usePublicProperty.ts      (refactorizar para usar TenantContext)
    ├── services/
    │   ├── tenant.service.ts         ← NUEVO
    │   └── publicProperty.service.ts (adaptar: recibir property_id del contexto)
    └── types/
        └── tenant.ts                 ← NUEVO
```

### 6.6 Variables de entorno antes y después

| Variable | Antes | Después |
|---|---|---|
| `VITE_PROPERTY_SLUG` | `"la-rasilla"` | **Eliminada** |
| `VITE_DEV_PROPERTY_SLUG` | No existe | `"la-rasilla"` (solo para local) |
| `VITE_SUPABASE_URL` | Existe | Sin cambios |
| `VITE_SUPABASE_ANON_KEY` | Existe | Sin cambios |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Global | Se puede eliminar si Stripe lo carga por property |
| `VITE_APP_NAME` | `"La Rasilla V2"` | **Eliminada** (viene del tenant) |

### 6.7 Refactorizaciones concretas a hacer

**En `publicProperty.service.ts`:** Pasar `property_id` desde el TenantContext en lugar del slug hardcodeado.

**En `config.service.ts`:** Eliminar `VITE_PROPERTY_SLUG`. Recibir `property_id` como parámetro.

**En `BookingFlowContext.tsx`:** Obtener la property del `TenantContext` en lugar de llamar a la API de property al montar.

**En `ConfigPage.tsx`:** Reemplazar `const PROPERTY_SLUG = 'la-rasilla'` por `const { propertyId } = useAdminTenant()`.

**En `LoginPage.tsx`:** Eliminar el alias `"admin" → admin@staynexapp.com`. Si se necesita un usuario de demo, crearlo en BD.

**En `AdminLayout.tsx`:** Reemplazar el nombre hardcodeado por `property.nombre` del `AdminTenantContext`.

---

## 7. Arquitectura Recomendada

### 7.1 Diagrama de responsabilidades

```
╔══════════════════════════════════════════════════════════════════╗
║                        FRONTEND PUBLIC                           ║
║                                                                  ║
║  window.location.hostname                                        ║
║         ↓                                                        ║
║  TenantProvider (resolve-tenant edge fn)                         ║
║         ↓                                                        ║
║  TenantContext { property_id, branding, features, seo }         ║
║         ↓                                                        ║
║  Páginas públicas: useTenant() para todo                         ║
║  Booking: property_id del contexto en cada llamada               ║
╚══════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════╗
║                        FRONTEND ADMIN                            ║
║                                                                  ║
║  Login → JWT → auth.users                                        ║
║         ↓                                                        ║
║  property_users (user_id → property_id + rol)                    ║
║         ↓                                                        ║
║  AdminTenantContext { property_id, nombre, rol }                 ║
║         ↓                                                        ║
║  Todas las páginas admin: useAdminTenant() para property_id      ║
╚══════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════╗
║                          BACKEND                                 ║
║                                                                  ║
║  Edge Functions:                                                  ║
║    - resolve-tenant: hostname → property config pública          ║
║    - public_*: filtran por property_id resuelto por host         ║
║    - admin_*: validan JWT → property_users → filtran datos       ║
║                                                                  ║
║  Base de datos:                                                   ║
║    - RLS activo en todas las tablas sensibles                    ║
║    - Todas las queries incluyen WHERE property_id = $id          ║
╚══════════════════════════════════════════════════════════════════╝
```

### 7.2 Tablas principales y sus roles

| Tabla | Rol en multi-tenant |
|---|---|
| `properties` | Config maestra de cada cliente/tenant |
| `custom_domains` | Mapa dominio → property (resolución en runtime) |
| `property_users` | Control de acceso: qué usuarios pueden acceder a qué property |
| `property_settings` | Config extendida clave-valor por client (nueva) |
| `unidades` | Alojamientos de cada property (ya tienen `property_id`) |
| `reservas` | Reservas filtradas por property (ya tienen `property_id`) |
| `email_templates` | Plantillas de email por property |
| `periodos_especiales` | Temporadas y precios especiales por property |

### 7.3 Criterio: ¿Esto va en base de datos o en código?

| En **base de datos** | En **código** |
|---|---|
| Logo, colores, nombre del sitio | Componentes de UI reutilizables |
| Textos del footer, tagline | Lógica de negocio genérica |
| Configuración de Stripe por cliente | Validaciones de formulario |
| Plantillas de email por cliente | Reglas de routing |
| Feature flags por cliente | Estructura de páginas |
| Datos fiscales y legales | Comportamiento por defecto |
| Dominios y SSL | Formateo de fechas y monedas |
| Política de cancelación por cliente | Llamadas a APIs externas |

**Regla simple:** Si cambia por cliente o en el tiempo, va en BD. Si es lógica universal del producto, va en código.

---

## 8. Modelo de Despliegue Recomendado

### Opción A: Un deployment, múltiples dominios ✅ RECOMENDADA

Un solo build de React desplegado en Vercel. Todos los dominios de todos los clientes apuntan al mismo deployment. El frontend resuelve quién es en runtime por hostname.

**Proceso para añadir un cliente nuevo:**

```
1. Cliente configura DNS:
   CNAME www → tu-app.vercel.app

2. Tú añades el dominio en Vercel:
   Settings → Domains → Add "www.cliente2.com"
   Vercel gestiona SSL automáticamente (Let's Encrypt)

3. Tú añades en base de datos:
   INSERT INTO custom_domains (domain, property_id, verificado)
   VALUES ('www.cliente2.com', '<uuid>', true);

4. Listo.
   Sin rebuilds. Sin nuevas variables de entorno.
   Sin deploys adicionales.
```

**Ventajas:**
- Un solo `git push` actualiza todos los clientes simultáneamente
- Añadir clientes nuevos no requiere trabajo de infraestructura
- Rollbacks son consistentes para todos
- Coste técnico plano: no escala con el número de clientes

**Inconvenientes:**
- Todos los clientes reciben la misma versión al mismo tiempo (mitigable con feature flags)
- Si necesitas código distinto por cliente (no solo configuración), esta opción se complica

### Opción B: Deployment por cliente ❌ NO RECOMENDADA

**Por qué no:**
- Con 5 clientes ya es caótico: 5 repositorios, 5 builds, 5 sets de variables de entorno, 5 pipelines de CI/CD
- Un bug fix requiere 5 deploys
- Las versiones divergen con el tiempo sin quererlo
- El coste de mantenimiento escala linealmente con el número de clientes
- Es la forma segura de acabar con versiones desfasadas en producción

**Veredicto: Opción A sin dudas.** Es la arquitectura estándar de todo SaaS multi-tenant (Shopify, Vercel, Linear, Notion — todos funcionan así).

---

## 9. Riesgos y Errores a Evitar

### Riesgo 1: Hardcodes que sobreviven la migración
El mayor riesgo de toda la transición. Hacer grep completo antes de considerar la migración terminada:

```bash
grep -r "la-rasilla" src/
grep -r "PROPERTY_SLUG" src/
grep -r "staynexapp.com" src/
grep -r "La Rasilla" src/
```

Cualquier ocurrencia que quede es un bug latente.

### Riesgo 2: Queries sin filtro por property_id
Si una edge function devuelve datos sin filtrar por property, hay fuga de datos entre clientes. Revisar todas las queries en todas las edge functions. Buscar especialmente `SELECT *` sin `WHERE property_id`.

### Riesgo 3: RLS desactivado en Supabase
Si RLS no está activo en `reservas`, `unidades`, etc., cualquier admin puede ver datos de otros clientes haciendo queries directas con el SDK. Verificar y activar antes de tener dos clientes reales en producción.

### Riesgo 4: hostname `localhost` en desarrollo
En local, `window.location.hostname` es `localhost`, que no existe en `custom_domains`. Sin el fallback de desarrollo, la app no arrancaría en local. La solución:

```typescript
const hostname = import.meta.env.DEV
  ? (import.meta.env.VITE_DEV_PROPERTY_SLUG ?? 'la-rasilla')
  : window.location.hostname;
```

### Riesgo 5: Flash of wrong content (FOWC)
Si el TenantContext tarda 300-500ms en resolverse, el usuario puede ver brevemente un logo incorrecto, el nombre equivocado o una pantalla en blanco. Mitigación: mostrar un splash screen durante la resolución, nunca renderizar contenido de cliente antes de tener el tenant resuelto.

### Riesgo 6: Caché de tenant incorrecto
Si cacheas la resolución en `localStorage` sin TTL y un cliente cambia de dominio o se desactiva, el usuario seguirá viendo datos incorrectos. Usar memoria o `sessionStorage`. Si se cachea en localStorage, usar TTL de 5-10 minutos máximo.

### Riesgo 7: El alias de email `admin@staynexapp.com`
El bypass de autenticación en `LoginPage.tsx:7-15` no escala a multi-tenant. Si múltiples properties tienen un usuario con email "admin@...", el alias puede apuntar al usuario equivocado. Eliminarlo o gestionarlo por property de forma explícita.

### Riesgo 8: Stripe con la cuenta equivocada
La tabla `properties` tiene `stripe_account_id`. Si el checkout no usa la cuenta Stripe de la property resuelta, los pagos van a la cuenta equivocada. Verificar en `create-stripe-checkout` que siempre usa `property.stripe_account_id` del tenant activo, nunca un valor hardcodeado.

### Riesgo 9: Emails enviados desde el dominio equivocado
Resend usa `resend_from_email` y `resend_from_name` por property. Si la resolución falla y se usa un fallback, los emails de confirmación llegan desde el email de otro cliente. Especialmente crítico en producción: un cliente ve emails firmados con el nombre de otro.

### Riesgo 10: SEO mal indexado
Si el `<title>` y `<meta description>` se cargan del tenant pero hay un delay inicial, Google puede indexar la página con los meta por defecto. Para sitios con SEO crítico, valorar SSR o asegurar que los meta están correctos antes del primer render visible. Para el alcance actual, el splash screen mitiga el problema suficientemente.

### Riesgo 11: Frontend aparentemente multi-tenant pero monocliente en la práctica
El peor de todos porque es invisible. El código parece correcto pero en producción todos los dominios muestran los mismos datos porque alguna llamada sigue usando el slug hardcodeado. Solución: test de integración que verifica que dos hostnames distintos devuelven configs distintas.

---

## 10. Plan por Fases

### Fase 1: Auditoría del código actual (1-2 días)

- [ ] Ejecutar grep completo buscando hardcodes: `"la-rasilla"`, `PROPERTY_SLUG`, `staynexapp.com`, `"La Rasilla"`
- [ ] Listar todos los archivos afectados con sus líneas exactas
- [ ] Ejecutar SQL en Supabase para verificar estado de RLS en todas las tablas
- [ ] Revisar todas las edge functions y listar las que hacen queries sin `WHERE property_id`
- [ ] Confirmar que `custom_domains` tiene el dominio de producción actual registrado

**Criterio de paso a Fase 2:** Lista completa de todos los hardcodes y estado de RLS documentado.

---

### Fase 2: Edge Function `resolve-tenant` (1 día)

- [ ] Crear `supabase/functions/resolve-tenant/index.ts`
- [ ] Implementar resolución: `hostname` → `custom_domains` → `properties`
- [ ] Devolver solo campos públicos (sin Stripe secrets ni service role keys)
- [ ] Implementar errores: `TENANT_NOT_FOUND`, `TENANT_INACTIVE`
- [ ] Fallback de desarrollo: aceptar `slug` cuando `ENVIRONMENT = development`
- [ ] Testear con los hostnames: dominio real, dominio inexistente, `localhost`

**Criterio de paso a Fase 3:** La función devuelve la config correcta para el dominio de producción actual y errores correctos para dominios inexistentes.

---

### Fase 3: `TenantContext` en frontend (1-2 días)

- [ ] Crear `src/shared/types/tenant.ts` con las interfaces TypeScript
- [ ] Crear `src/shared/services/tenant.service.ts` con la llamada a `resolve-tenant`
- [ ] Crear `src/shared/context/TenantContext.tsx` con el Provider y el hook `useTenant()`
- [ ] Crear `src/shared/components/TenantNotFound.tsx`
- [ ] Crear `src/shared/components/TenantInactive.tsx`
- [ ] Crear o adaptar `src/shared/components/SplashScreen.tsx`
- [ ] Añadir `<TenantProvider>` en `main.tsx` como wrapper más externo
- [ ] Verificar que la app arranca correctamente en local con `VITE_DEV_PROPERTY_SLUG`

**Criterio de paso a Fase 4:** La app arranca, muestra splash durante la resolución y renderiza correctamente con el tenant resuelto.

---

### Fase 4: Eliminar hardcodes en frontend public (1-2 días)

- [ ] Refactorizar `publicProperty.service.ts`: usar `property_id` del `TenantContext`
- [ ] Refactorizar `config.service.ts`: eliminar `VITE_PROPERTY_SLUG`, recibir `property_id` como parámetro
- [ ] Refactorizar `BookingFlowContext.tsx`: obtener property del `TenantContext`
- [ ] Eliminar `VITE_PROPERTY_SLUG` del `.env` y `.env.example`
- [ ] Añadir `VITE_DEV_PROPERTY_SLUG` al `.env` y `.env.example` con documentación clara
- [ ] Eliminar `VITE_APP_NAME` del `.env` (viene del tenant)

**Criterio de paso a Fase 5:** `grep -r "la-rasilla" src/public/ src/shared/services/` devuelve cero resultados.

---

### Fase 5: Eliminar hardcodes en Admin (1 día)

- [ ] Crear `src/admin/context/AdminTenantContext.tsx`
- [ ] Al autenticar, cargar property de `property_users` para el usuario logueado
- [ ] Refactorizar `ConfigPage.tsx`: reemplazar `const PROPERTY_SLUG = 'la-rasilla'` por `useAdminTenant()`
- [ ] Eliminar alias `"admin" → admin@staynexapp.com` de `LoginPage.tsx`
- [ ] Refactorizar `AdminLayout.tsx`: cargar nombre y logo desde `AdminTenantContext`

**Criterio de paso a Fase 6:** `grep -r "la-rasilla" src/admin/` devuelve cero resultados.

---

### Fase 6: Branding dinámico (1 día)

- [ ] Añadir columnas `primary_color`, `favicon_url`, `og_image_url` a `properties` en Supabase
- [ ] Actualizar `resolve-tenant` para incluir estos campos en la respuesta
- [ ] Aplicar CSS variables en `TenantProvider` (`--color-primary`, etc.)
- [ ] Aplicar favicon dinámico en `TenantProvider`
- [ ] Aplicar `lang` en `<html>` y `site_title` en `<title>`
- [ ] Aplicar `og_image_url` en las páginas que usan Open Graph

**Criterio de paso a Fase 7:** Un segundo cliente con logo y color distintos se visualiza correctamente sin modificar código.

---

### Fase 7: Onboarding de nuevos clientes (2-3 días)

- [ ] Añadir columna `onboarding_step` a `properties`
- [ ] Crear componente `OnboardingChecklist` en admin
- [ ] Definir qué datos mínimos son obligatorios para activar el sitio
- [ ] Implementar empty states amigables en todas las páginas públicas
- [ ] Crear lógica de activación: cuando `onboarding_step` completo → `estado = 'active'`

---

### Fase 8: Despliegue multi-dominio (1 día)

- [ ] Verificar que `x-forwarded-host` llega correctamente a las edge functions desde Vercel
- [ ] Añadir dominio del primer cliente adicional en Vercel
- [ ] Registrar dominio en `custom_domains` con `verificado = true`
- [ ] Testear resolución completa end-to-end con el dominio real del segundo cliente
- [ ] Documentar el proceso de onboarding de dominio para clientes futuros

---

## 11. Onboarding de Nuevos Clientes

### Flujo recomendado

```
1. Tú (superadmin) creas la property en BD y el primer usuario admin
2. Cliente recibe email con credenciales y URL de acceso al admin
3. Cliente hace login → sistema detecta onboarding_step = 0
4. Muestra checklist de activación (no la app completa vacía)
5. Cliente completa pasos en orden
6. Al completar todos: estado = 'active' → sitio público visible
```

### Checklist de activación

```
Paso 1  □  Nombre y descripción de la propiedad
Paso 2  □  Logo y favicon subidos
Paso 3  □  Dirección y datos de contacto
Paso 4  □  Al menos una unidad/alojamiento creada
Paso 5  □  Precios base configurados
Paso 6  □  Email de notificaciones configurado
Paso 7  □  Datos fiscales y legales completados
Paso 8  □  Política de cancelación revisada
Paso 9  □  Dominio personalizado configurado (opcional)
Paso 10 □  Prueba de reserva realizada en modo test
            → Activar sitio público
```

### Datos mínimos obligatorios

Sin estos datos, la app pública falla o da mala imagen. Son el mínimo para considerar un sitio "listo":

| Campo | Tabla | Por qué es obligatorio |
|---|---|---|
| `nombre` | `properties` | Aparece en título, emails, admin |
| `logo_url` | `properties` | Header público y admin |
| `email` | `properties` | Notificaciones de reservas |
| `checkin_time` / `checkout_time` | `properties` | Confirmaciones de reserva |
| Al menos 1 unidad activa | `unidades` | Sin esto el booking no funciona |
| `precio_noche` en cada unidad | `unidades` | Sin precio no se puede calcular |

### Empty states vs. app rota

| Situación | Respuesta correcta | Respuesta incorrecta |
|---|---|---|
| Sin unidades | "Todavía no tienes alojamientos. [Crear →]" | Error 500 / lista vacía sin explicación |
| Sin reservas | "Aún no tienes reservas. Tu sitio está activo." | Tabla vacía con columnas huérfanas |
| Sin fotos | Placeholder con icono + "Subir fotos" | Imagen rota / espacio vacío |
| Dominio no configurado | Página de bienvenida + instrucciones | App cargada con datos de otro cliente |

---

## 12. Conclusión

### Lo que está bien

- La base de datos ya es multi-tenant. Todas las tablas tienen `property_id`. No hay que rehacer el schema.
- Las edge functions ya contienen lógica de resolución por dominio. No hay que inventarla.
- La separación `admin` / `public` / `shared` es correcta y escalable.
- La tabla `property_users` con roles es la base correcta para el control de acceso por tenant.

### Lo que está mal

- El frontend está atado a un único cliente por variables de entorno baked en build. Esto es el bloqueante principal.
- `ConfigPage.tsx` tiene el slug hardcodeado en el código fuente, no solo en `.env`. Es un bug de diseño, no un descuido.
- El alias de email en el login es un hack que hay que eliminar antes de añadir más clientes.
- No existe un `TenantContext` que centralice la identidad del cliente activo en el frontend.

### Lo que falta

- La edge function `resolve-tenant` que conecte hostname → property en backend.
- El `TenantContext` en frontend que resuelva el tenant al arrancar la app.
- El `AdminTenantContext` que cargue la property del usuario al autenticarse en admin.
- Verificación y activación de RLS en Supabase.
- Páginas de error para dominios no registrados o tenants inactivos.

### El camino mínimo al primer cliente adicional

Con trabajo focalizado, el tiempo mínimo para tener el sistema operativo con un segundo cliente real es:

| Tarea | Tiempo estimado |
|---|---|
| Crear edge function `resolve-tenant` | 1 día |
| Crear `TenantContext` en frontend | 1 día |
| Eliminar todos los hardcodes de slug | 1 día |
| Configurar dominio en Vercel + BD | 2 horas |
| Test end-to-end | 2 horas |
| **Total** | **~3-4 días de trabajo** |

El resto — branding dinámico, feature flags, onboarding guiado, analytics por tenant — se añade iterativamente sin bloquear el funcionamiento básico.

### El riesgo más subestimado

**RLS en Supabase.** Si las tablas críticas no tienen Row Level Security activo, dos clientes reales en producción representan un riesgo de fuga de datos entre ellos. Esto debe verificarse antes que cualquier otra cosa, antes incluso de empezar a escribir código. Es una consulta SQL de cinco minutos que puede evitar un incidente grave.

---

*Documento generado el 11 de abril de 2026 — Casa Rural v2*
