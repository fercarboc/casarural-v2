# Agente de Despliegue de Dominios en Vercel via API

## Objetivo

Cuando un administrador de una propiedad añade un dominio personalizado en la sección **Configuración → Dominio personalizado** de StayNexApp, ese dominio debe quedar registrado automáticamente en el proyecto Vercel de la plataforma, para que el sistema multi-tenant lo resuelva correctamente.

Hoy, el flujo es semi-manual: el admin añade el dominio en `custom_domains` (Supabase) y lo activa, pero alguien tiene que ir a Vercel a registrarlo a mano. Este agente elimina ese paso.

---

## Flujo completo

```
Admin en ConfigPage
        │
        ▼
handleAddDomain()  →  Edge Function: admin-manage-domains (action: 'add')
        │                        │
        │               INSERT en custom_domains
        │                        │
        │               ← NUEVO → llama a Vercel API para añadir dominio al proyecto
        │                        │
        ▼                        ▼
handleToggleActive()  →  Edge Function: admin-manage-domains (action: 'set_active')
        │                        │
        │               UPDATE custom_domains SET verified = true
        │                        │
        │               ← NUEVO → podría re-confirmar en Vercel si fuera necesario
        ▼
resolve-tenant recibe la petición HTTP con Host: midominio.com
        │
        ▼
SELECT property_id FROM custom_domains WHERE domain = 'midominio.com' AND verified = true
```

---

## Vercel API: endpoints necesarios

### 1. Añadir dominio al proyecto

```
POST https://api.vercel.com/v10/projects/{projectId}/domains
Authorization: Bearer {VERCEL_API_TOKEN}
Content-Type: application/json

{
  "name": "midominio.com"
}
```

**Respuesta 200 (dominio añadido o ya existía):**
```json
{
  "name": "midominio.com",
  "apexName": "midominio.com",
  "projectId": "prj_xxxxx",
  "verified": false,
  "verification": [
    {
      "type": "TXT",
      "domain": "_vercel.midominio.com",
      "value": "vc-domain-verify=midominio.com,xxxxxxxxxxxx",
      "reason": "pending_owner_verification"
    }
  ]
}
```

> Si `verified: false`, Vercel devuelve los registros DNS que el cliente debe crear.  
> Si `verified: true`, el dominio ya está resuelto.

### 2. Consultar estado de verificación de un dominio

```
GET https://api.vercel.com/v10/projects/{projectId}/domains/{domain}
Authorization: Bearer {VERCEL_API_TOKEN}
```

**Respuesta:**
```json
{
  "name": "midominio.com",
  "verified": true,
  "cnames": ["cname.vercel-dns.com"]
}
```

### 3. Eliminar dominio del proyecto

```
DELETE https://api.vercel.com/v10/projects/{projectId}/domains/{domain}
Authorization: Bearer {VERCEL_API_TOKEN}
```

**Respuesta 200:**
```json
{ "name": "midominio.com" }
```

---

## Variables de entorno necesarias en Supabase Secrets

| Variable             | Descripción                                                    |
|----------------------|----------------------------------------------------------------|
| `VERCEL_API_TOKEN`   | Token de API de Vercel (Settings → Tokens). Scope: full        |
| `VERCEL_PROJECT_ID`  | ID del proyecto Vercel (prj_xxxxxxxx). Ver en Project Settings |

Para obtenerlos:
- **Token**: Vercel Dashboard → Account Settings → Tokens → Create
- **Project ID**: Vercel Dashboard → Tu proyecto → Settings → General → Project ID

---

## Integración en `admin-manage-domains` Edge Function

El agente **no es un servicio externo separado** — se integra directamente dentro del Edge Function existente, en las acciones `add` y `remove`.

### Acción `add` (añadir dominio)

```typescript
// Tras el INSERT en custom_domains...
if (inserted) {
  try {
    const vercelToken     = Deno.env.get('VERCEL_API_TOKEN')
    const vercelProjectId = Deno.env.get('VERCEL_PROJECT_ID')

    if (vercelToken && vercelProjectId) {
      const vercelRes = await fetch(
        `https://api.vercel.com/v10/projects/${vercelProjectId}/domains`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${vercelToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: domain }),
        }
      )

      const vercelData = await vercelRes.json()

      if (!vercelRes.ok && vercelData?.error?.code !== 'domain_already_added') {
        // No bloqueamos el flujo, pero lo registramos
        console.error('Vercel domain add failed:', vercelData)
        return json({
          ok: true,
          domain: inserted,
          vercel_warning: `Dominio añadido en BD pero Vercel devolvió error: ${vercelData?.error?.message ?? 'desconocido'}`,
          vercel_records: null,
        })
      }

      // Devolvemos los registros DNS que el cliente debe crear (si los hay)
      const records = vercelData?.verification ?? []
      return json({ ok: true, domain: inserted, vercel_records: records })
    }
  } catch (vercelErr) {
    console.error('Vercel API error:', vercelErr)
    // El dominio queda en BD; la UI puede advertir pero no fallar
  }

  return json({ ok: true, domain: inserted })
}
```

### Acción `remove` (eliminar dominio)

```typescript
// Antes del DELETE en custom_domains, recuperar el domain name
const { data: domainRow } = await adminClient
  .from('custom_domains')
  .select('domain')
  .eq('id', domainId)
  .eq('property_id', propertyId)
  .single()

// Borrar en Supabase
await adminClient.from('custom_domains').delete()
  .eq('id', domainId).eq('property_id', propertyId)

// Después, borrar en Vercel (best-effort)
if (domainRow?.domain) {
  const vercelToken     = Deno.env.get('VERCEL_API_TOKEN')
  const vercelProjectId = Deno.env.get('VERCEL_PROJECT_ID')

  if (vercelToken && vercelProjectId) {
    await fetch(
      `https://api.vercel.com/v10/projects/${vercelProjectId}/domains/${domainRow.domain}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${vercelToken}` },
      }
    ).catch(err => console.error('Vercel domain delete failed:', err))
  }
}

return json({ ok: true })
```

---

## Instrucciones DNS que el cliente debe seguir

Cuando el dominio se añade, Vercel puede devolver dos escenarios:

### Escenario A — Dominio principal (apex domain: `miempresa.com`)

El cliente crea en su DNS:
```
Tipo: A
Nombre: @  (o miempresa.com)
Valor: 76.76.21.21
```

### Escenario B — Subdominio (`reservas.miempresa.com`)

El cliente crea en su DNS:
```
Tipo: CNAME
Nombre: reservas
Valor: cname.vercel-dns.com
```

### Escenario C — Verificación de propiedad (si Vercel lo exige)

```
Tipo: TXT
Nombre: _vercel
Valor: vc-domain-verify=xxxxxxxxxxxxx
```

> La UI de ConfigPage ya muestra estas instrucciones de forma estática.  
> Con la integración del agente, se podrían mostrar los registros exactos devueltos por Vercel en `vercel_records`.

---

## Actualización de la UI (ConfigPage)

Con la integración completa, `handleAddDomain` puede leer `vercel_records` de la respuesta y mostrárselos al admin:

```typescript
async function handleAddDomain() {
  const result = await addDomain(propertyId, domainInput)
  // result ahora incluye vercel_records?: Array<{ type, domain, value }>
  if (result.vercel_records?.length) {
    // Mostrar los registros DNS exactos al usuario
    setDnsRecords(result.vercel_records)
  }
}
```

---

## Estado de verificación

Vercel verifica el dominio de forma automática (normalmente en minutos) una vez que el cliente ha creado los registros DNS. No hace falta un webhook: basta con consultar el estado bajo demanda.

Para comprobar si ya está verificado (opcional, botón "Verificar" en la UI):

```typescript
// Edge Function: action: 'check_vercel'
const vercelRes = await fetch(
  `https://api.vercel.com/v10/projects/${vercelProjectId}/domains/${domain}`,
  { headers: { Authorization: `Bearer ${vercelToken}` } }
)
const data = await vercelRes.json()
return json({ ok: true, verified: data.verified === true })
```

Si `verified: true`, la plataforma puede actualizar `custom_domains.verified = true` automáticamente.

---

## Resumen del estado actual vs objetivo

| Paso                              | Hoy             | Con el agente        |
|-----------------------------------|-----------------|----------------------|
| Admin añade dominio en ConfigPage | ✅ Funciona      | ✅ Funciona           |
| Dominio se guarda en Supabase     | ✅ Funciona      | ✅ Funciona           |
| Dominio se registra en Vercel     | ❌ Manual        | ✅ Automático (API)   |
| DNS records mostrados al admin    | ⚠️ Genéricos    | ✅ Exactos de Vercel  |
| Admin activa dominio              | ✅ Funciona      | ✅ Funciona           |
| `resolve-tenant` lo resuelve      | ✅ Funciona      | ✅ Funciona           |
| Dominio eliminado de Vercel       | ❌ Manual        | ✅ Automático (API)   |

---

## Plan de implementación

1. **Añadir secrets en Supabase**: `VERCEL_API_TOKEN` y `VERCEL_PROJECT_ID`
2. **Modificar `admin-manage-domains`**: integrar las llamadas a Vercel API en `add` y `remove`
3. **Actualizar `domains.service.ts`**: que `addDomain` devuelva `vercel_records`
4. **Actualizar `ConfigPage.tsx`**: mostrar los registros DNS exactos devueltos por Vercel
5. **(Opcional)** Añadir acción `check_vercel` + botón "Comprobar verificación" en la UI
