# La Rasilla — Especificación Funcional V2
## Módulo: Gestor de Imágenes desde el Panel Admin

**Proyecto:** Casa Rural La Rasilla  
**URL producción:** https://www.casarurallarasilla.com  
**Supabase proyecto:** kbdhzhixjztfvpibnmuf  
**Fecha de análisis:** 28 de marzo de 2026  
**Estado:** Pendiente — planificado para Versión 2

---

## 1. Descripción general

Se propone añadir al panel de administración un módulo de gestión de imágenes que permita al administrador cambiar las imágenes de la web pública sin necesidad de tocar código, sin hacer un nuevo despliegue en Vercel y sin intervención técnica.

El administrador podrá seleccionar la página, ver las imágenes configurables de esa página, marcar la imagen que quiere cambiar y subir una nueva versión. El cambio se reflejará de forma inmediata en la web.

---

## 2. Problema que resuelve

Actualmente las imágenes de la web están almacenadas en el repositorio del proyecto (carpeta `/public/` o `src/assets/`). Para cambiar una imagen hay que:

1. Editar el repositorio localmente
2. Hacer commit y push a Git
3. Esperar el redeploy en Vercel

Esto hace que la gestión de contenido visual dependa de conocimientos técnicos y sea lenta. Con este módulo, el cambio de imágenes pasa a ser una operación de negocio, no una operación técnica.

---

## 3. Enfoque técnico elegido

**Supabase Storage como repositorio de imágenes.**

Las imágenes se almacenan en un bucket de Supabase Storage con URL pública fija. El frontend carga las imágenes directamente desde esas URLs. Cuando el admin sube una imagen nueva con el mismo nombre (operación upsert), la URL no cambia y la web se actualiza automáticamente sin necesidad de deploy.

Este enfoque descarta el uso de imágenes estáticas en el repositorio para todos los slots configurables.

---

## 4. Páginas con imágenes configurables — confirmadas

Se han confirmado las siguientes **7 páginas** de la web pública como candidatas a tener imágenes gestionables desde el admin:

| # | Página | Ruta | Componente |
|---|---|---|---|
| 1 | Home | `/` | `HomePage.tsx` |
| 2 | La Casa | `/la-casa` | `LaCasaPage.tsx` |
| 3 | Galería | `/galeria` | `GaleriaPage.tsx` |
| 4 | Servicios | `/servicios` | `ServiciosPage.tsx` |
| 5 | Actividades | `/actividades` | `ActividadesPage.tsx` |
| 6 | Contacto | `/contacto` | `ContactoPage.tsx` |
| 7 | Dónde Estamos | `/donde-estamos` | `DondeEstamosPage.tsx` |

### Páginas sin imágenes configurables

Las siguientes páginas **no forman parte de este módulo**:

| Página | Motivo |
|---|---|
| `/reservar` | Solo UI funcional (calendario, formularios) |
| `/reserva/confirmada` | Pantalla de estado, sin imágenes |
| `/reserva/:token` | Vista de reserva del huésped, sin imágenes |
| `/reserva/cancelar` | Formulario funcional, sin imágenes |
| Páginas legales (`/aviso-legal`, `/privacidad`, `/cookies`, `/rgpd`, `/condiciones`, `/cancelaciones`) | Solo texto legal |

---

## 5. Inventario de imágenes por página

> 📋 **Pendiente de completar página a página cuando se acometa la implementación.**
>
> El inventario detallado de cada página — slots exactos, nombres de archivo, formatos y dimensiones — se realizará en el momento de implementar, revisando el código fuente real de cada componente y las imágenes actuales en `/public/` o `src/assets/`.
>
> Se abordará página a página en este orden recomendado, de mayor a menor densidad de imágenes:
> 1. Galería — mayor número de slots individuales
> 2. Home — mayor impacto visual y tráfico
> 3. La Casa — imágenes de presentación principales
> 4. Servicios — banner + posibles bloques individuales
> 5. Actividades — hero + imágenes por actividad
> 6. Dónde Estamos — hero + fotos de la zona
> 7. Contacto — hero y posible imagen de apoyo

---

## 6. Estructura del bucket de Supabase Storage

**Nombre del bucket:** `media-larasilla`  
**Visibilidad:** Público (lectura sin autenticación)  
**Escritura:** Solo usuarios autenticados (admin)

La estructura de carpetas dentro del bucket seguirá una carpeta por página, con un archivo por slot de imagen. Los nombres exactos de los archivos se definirán durante el inventario de cada página.

```
media-larasilla/
├── home/
├── la-casa/
├── galeria/
├── servicios/
├── actividades/
├── contacto/
└── donde-estamos/
```

---

## 7. Nueva tabla en base de datos: `imagenes_web`

Actúa como catálogo de slots configurables. No almacena las imágenes, sino los metadatos de cada slot: página, nombre del archivo en Storage, etiqueta legible para el admin, formato permitido y dimensiones recomendadas.

```sql
CREATE TABLE imagenes_web (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pagina               TEXT NOT NULL,
  slot                 TEXT NOT NULL,
  etiqueta             TEXT NOT NULL,
  descripcion          TEXT,
  storage_path         TEXT NOT NULL,
  formatos_permitidos  TEXT[] NOT NULL DEFAULT ARRAY['jpg', 'jpeg'],
  ancho_recomendado    INTEGER,
  alto_recomendado     INTEGER,
  version              INTEGER NOT NULL DEFAULT 1,
  actualizado_en       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (pagina, slot)
);
```

El campo `version` se incrementa en cada sustitución de imagen y se usa para cache-busting en el frontend.

---

## 8. Cambio en el frontend público

Las imágenes configurables dejan de referenciarse como rutas locales y pasan a cargarse desde Supabase Storage.

**Antes (V1):**
```tsx
<img src="/images/hero.jpg" alt="La Rasilla" />
```

**Después (V2):**
```tsx
import { getMediaUrl } from '@/lib/media'

<img src={getMediaUrl('home/hero-principal.jpg', version)} alt="La Rasilla" />
```

Helper a crear en `src/lib/media.ts`:
```ts
const BUCKET_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/media-larasilla`

export function getMediaUrl(path: string, version?: number): string {
  const base = `${BUCKET_URL}/${path}`
  return version ? `${base}?v=${version}` : base
}
```

---

## 9. Nueva página en el admin: `/admin/imagenes`

Nueva entrada en el menú lateral del panel de administración, al nivel de Configuración.

### Flujo UX

1. Pantalla con pestañas, una por cada una de las 7 páginas confirmadas
2. Al seleccionar una pestaña → grid de tarjetas, una por slot
3. Cada tarjeta muestra:
   - Preview actual de la imagen (cargada desde Supabase Storage)
   - Nombre legible del slot
   - Descripción de uso
   - Formato permitido y dimensiones recomendadas
   - Fecha de última actualización
   - Botón "Cambiar imagen"
4. Al pulsar "Cambiar imagen" → modal con drag & drop, preview y validación
5. La subida hace upsert en Supabase Storage → la URL no cambia → el cambio es inmediato en la web

### Validaciones en el modal de subida

| Validación | Comportamiento |
|---|---|
| Formato incorrecto | Error antes de subir: "Esta imagen debe ser JPG o JPEG" |
| Archivo mayor de 5 MB | Aviso con el límite recomendado |
| Dimensiones muy pequeñas | Aviso no bloqueante con las dimensiones recomendadas |
| Error de subida | Mensaje de error con opción de reintentar |

---

## 10. Políticas RLS del bucket

```sql
-- Lectura pública (la web puede cargar las imágenes sin autenticación)
CREATE POLICY "Imágenes públicas — lectura"
ON storage.objects FOR SELECT
USING (bucket_id = 'media-larasilla');

-- Escritura solo para admin autenticado
CREATE POLICY "Imágenes — solo admin puede escribir"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media-larasilla');

CREATE POLICY "Imágenes — solo admin puede actualizar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'media-larasilla');
```

---

## 11. Resolución de caché

Cuando se sobreescribe una imagen en Supabase Storage con el mismo nombre, la URL no cambia. El campo `version` en `imagenes_web` actúa como cache-buster: al incrementarse con cada sustitución, el frontend añade `?v=N` a la URL. El navegador interpreta esto como una URL diferente y descarga la imagen nueva, ignorando la caché anterior.

---

## 12. Límites del módulo

### Lo que este módulo NO hace
- No redimensiona imágenes automáticamente (Supabase Storage no incluye transformación de imágenes en plan gratuito)
- No gestiona iconos, logos ni SVGs (permanecen en el código)
- No permite añadir nuevos slots desde el admin (el catálogo lo define el desarrollador en la tabla)
- No incluye editor de imágenes

### Lo que sí hace
- Permite cambiar cualquier imagen catalogada sin tocar código ni hacer deploy
- El cambio es inmediato en la web pública
- Valida el formato antes de subir
- Informa de dimensiones recomendadas
- Registra fecha de última actualización por slot

---

## 13. Plan de implementación

### Paso 1 — Base de datos y Storage
- Crear bucket `media-larasilla` en Supabase con visibilidad pública
- Configurar políticas RLS del bucket
- Crear tabla `imagenes_web` (estructura, sin datos aún)

### Paso 2 — Inventario página a página
- Revisar el código fuente de cada uno de los 7 componentes
- Anotar todos los slots: nombre de archivo actual, formato, dimensiones
- Completar la tabla `imagenes_web` con los datos reales
- Definir la estructura final de carpetas del bucket

### Paso 3 — Migración de imágenes existentes
- Subir las imágenes actuales del repositorio al bucket, respetando la estructura de carpetas acordada
- Verificar que todas las URLs públicas son accesibles

### Paso 4 — Frontend público
- Crear helper `src/lib/media.ts`
- Reemplazar todas las referencias a imágenes estáticas configurables en los 7 componentes
- Las imágenes no configurables (iconos, logos, decorativos) permanecen en el repositorio

### Paso 5 — Panel admin
- Crear `src/admin/pages/ImagenesPage.tsx`
- Añadir entrada "Imágenes" en el sidebar de `AdminLayout.tsx`
- Crear componente `ImageSlotCard.tsx` para cada slot
- Crear modal `ImageUploadModal.tsx` con drag & drop, preview y validación
- Conectar con Supabase Storage SDK (upsert con `cacheControl` y `upsert: true`)

### Paso 6 — Cache-busting y pruebas
- Implementar lectura del campo `version` desde `imagenes_web`
- Aplicar `?v=N` en todas las URLs generadas por `getMediaUrl()`
- Verificar sustitución en todos los slots de las 7 páginas
- Verificar que el cambio se refleja sin deploy
- Verificar que la caché del navegador no sirve imágenes antiguas

---

## 14. Estimación de esfuerzo

| Tarea | Estimación |
|---|---|
| Crear bucket y políticas RLS | 1 hora |
| Crear tabla `imagenes_web` | 1 hora |
| Inventario página a página (7 páginas) | 2–3 horas |
| Migrar imágenes del repo a Storage | 2–3 horas |
| Helper `getMediaUrl` y actualización del frontend (7 componentes) | 3–5 horas |
| Página admin + componentes (card, modal, validación) | 4–6 horas |
| Cache-busting y pruebas completas | 1–2 horas |
| **Total estimado** | **14–21 horas** |

---

*Documento generado el 28/03/2026.*  
*Inventario de slots por página: pendiente de completar en el momento de implementación, abordando cada página individualmente.*
