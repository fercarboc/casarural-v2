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

Las imágenes se almacenan en un bucket de Supabase Storage con URL pública fija. El frontend carga las imágenes directamente desde esas URLs. Cuando el admin sube una imagen nueva con el mismo nombre (operación upsert), la URL no cambia y la web se actualiza automáticamente.

Este enfoque descarta el uso de imágenes estáticas en el repositorio para todos los slots configurables.

---

## 4. Arquitectura

### 4.1 Bucket de Supabase Storage

**Nombre del bucket:** `media-larasilla`  
**Visibilidad:** Público (lectura sin autenticación)  
**Escritura:** Solo usuarios autenticados (admin)

Estructura de carpetas dentro del bucket:

```
media-larasilla/
├── home/
│   ├── hero-principal.jpg
│   ├── galeria-preview-1.jpg
│   ├── galeria-preview-2.jpg
│   └── galeria-preview-3.jpg
├── la-casa/
│   ├── fachada.jpg
│   ├── salon.jpg
│   ├── cocina.jpg
│   └── habitacion-principal.jpg
├── galeria/
│   ├── exterior-1.jpg
│   ├── exterior-2.jpg
│   ├── interior-salon.jpg
│   ├── interior-cocina.jpg
│   ├── habitacion-1.jpg
│   ├── habitacion-2.jpg
│   ├── habitacion-3.jpg
│   ├── habitacion-4.jpg
│   ├── habitacion-5.jpg
│   └── entorno-1.jpg
└── servicios/
    └── banner.jpg
```

### 4.2 Nueva tabla en base de datos: `imagenes_web`

Actúa como catálogo de slots de imagen configurables. No almacena las imágenes, sino los metadatos de cada slot.

```sql
CREATE TABLE imagenes_web (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pagina          TEXT NOT NULL,
  slot            TEXT NOT NULL,
  etiqueta        TEXT NOT NULL,
  descripcion     TEXT,
  storage_path    TEXT NOT NULL,
  formatos_permitidos TEXT[] NOT NULL DEFAULT ARRAY['jpg', 'jpeg'],
  ancho_recomendado   INTEGER,
  alto_recomendado    INTEGER,
  version         INTEGER NOT NULL DEFAULT 1,
  actualizado_en  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (pagina, slot)
);
```

El campo `version` se incrementa en cada sustitución de imagen. Se usa para el cache-busting en el frontend.

### 4.3 Cambio en el frontend público

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

El helper `getMediaUrl` construye la URL de Supabase Storage con un query param de versión para evitar caché:

```ts
// src/lib/media.ts
const BUCKET_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/media-larasilla`

export function getMediaUrl(path: string, version?: number): string {
  const base = `${BUCKET_URL}/${path}`
  return version ? `${base}?v=${version}` : base
}
```

### 4.4 Nueva página en el admin: `/admin/imagenes`

Nueva entrada en el menú lateral del panel de administración.

---

## 5. Diseño funcional del módulo admin

### 5.1 Pantalla principal `/admin/imagenes`

Vista con pestañas o cards, una por sección de la web que tiene imágenes configurables:

- **Home** — Imágenes del hero, previews de galería
- **La Casa** — Fotos de presentación
- **Galería** — Todas las imágenes del grid fotográfico
- **Servicios** — Banner o imágenes de secciones

### 5.2 Vista de una sección

Al seleccionar una sección, se muestra un grid de tarjetas. Cada tarjeta representa un slot de imagen y muestra:

- **Preview actual** de la imagen (cargada desde Supabase Storage)
- **Nombre del slot** — etiqueta legible, por ejemplo "Hero principal"
- **Descripción** — orientación de uso: "Imagen principal de la portada. Se muestra a pantalla completa."
- **Formato permitido** — por ejemplo: JPG / JPEG únicamente
- **Dimensiones recomendadas** — por ejemplo: 1920 × 1080 px
- **Fecha de última actualización**
- **Botón "Cambiar imagen"**

### 5.3 Flujo de sustitución de imagen

1. El admin pulsa "Cambiar imagen"
2. Se abre un modal con:
   - Zona de drag & drop o selector de archivo nativo
   - Recordatorio visible del formato permitido y dimensiones recomendadas
   - Preview de la imagen nueva antes de confirmar
   - Indicador del tamaño del archivo
   - Botón "Subir y reemplazar" (desactivado hasta que haya imagen válida)
   - Botón "Cancelar"
3. Al confirmar, el sistema:
   - Valida el formato (MIME type del archivo debe coincidir con `formatos_permitidos`)
   - Sube el archivo a Supabase Storage con el `storage_path` del slot (upsert — sobreescribe si ya existe)
   - Incrementa el campo `version` en la tabla `imagenes_web`
   - Actualiza `actualizado_en`
   - Cierra el modal y refresca la preview en pantalla
4. El cambio es inmediato en la web pública (sin deploy)

### 5.4 Validaciones

| Validación | Comportamiento |
|---|---|
| Formato incorrecto | Error antes de subir: "Esta imagen debe ser JPG o JPEG" |
| Archivo demasiado grande (> 5 MB) | Aviso con límite recomendado |
| Dimensiones muy pequeñas | Aviso no bloqueante: "Las dimensiones recomendadas son X×Y px. La imagen subida es más pequeña y puede verse borrosa." |
| Subida fallida (error red/Storage) | Mensaje de error con opción de reintentar |

---

## 6. Políticas RLS para el bucket

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

## 7. Resolución del problema de caché

Cuando se sobreescribe una imagen en Supabase Storage con el mismo nombre, la URL no cambia. Los navegadores y posibles capas de caché (CDN de Vercel, caché del navegador) pueden seguir sirviendo la imagen antigua.

**Solución:** El campo `version` en la tabla `imagenes_web` actúa como cache-buster. Al incrementarse con cada sustitución, el frontend añade `?v=N` a la URL. El navegador interpreta esto como una URL diferente y descarga la imagen nueva.

La versión se lee al cargar el frontend desde la tabla `imagenes_web` o se puede incluir en la tabla `configuracion` existente como objeto JSON de versiones.

---

## 8. Consideraciones de diseño

### Lo que este módulo NO hace

- No redimensiona imágenes automáticamente (Supabase Storage no tiene transformación de imágenes en plan gratuito)
- No gestiona imágenes de iconos, logos ni SVGs (estos permanecen en el código)
- No permite añadir nuevos slots de imagen desde el admin (el catálogo de slots lo define el desarrollador en la tabla)
- No incluye editor de imágenes

### Lo que sí hace

- Permite cambiar cualquier imagen catalogada sin tocar código
- El cambio es inmediato, sin deploy
- Valida el formato antes de subir
- Informa de dimensiones recomendadas
- Registra fecha de última actualización por slot

---

## 9. Plan de implementación (cuando se aborde en V2)

### Paso 1 — Base de datos y Storage
- Crear bucket `media-larasilla` en Supabase con visibilidad pública
- Configurar políticas RLS del bucket
- Crear tabla `imagenes_web` con el catálogo inicial de slots

### Paso 2 — Migración de imágenes existentes
- Subir todas las imágenes actuales del repositorio al bucket de Supabase, respetando la estructura de carpetas
- Poblar la tabla `imagenes_web` con los slots correspondientes

### Paso 3 — Frontend público
- Crear helper `src/lib/media.ts` con `getMediaUrl()`
- Reemplazar todas las referencias a imágenes estáticas configurables en los componentes públicos por llamadas a `getMediaUrl()`
- Las imágenes no configurables (iconos, logos, elementos decorativos) permanecen en el repositorio

### Paso 4 — Panel admin
- Crear página `src/admin/pages/ImagenesPage.tsx`
- Añadir entrada "Imágenes" en el sidebar de `AdminLayout.tsx`
- Crear componente `ImageSlotCard.tsx` para cada slot
- Crear modal `ImageUploadModal.tsx` con drag & drop, preview y validación
- Conectar con Supabase Storage SDK para la operación de upsert

### Paso 5 — Cache-busting
- Implementar lectura de versiones desde `imagenes_web`
- Aplicar `?v=N` en todas las URLs generadas por `getMediaUrl()`

### Paso 6 — Pruebas
- Verificar sustitución de imagen en todos los slots
- Verificar que el cambio se refleja en la web pública sin deploy
- Verificar que la validación de formato funciona correctamente
- Verificar que la caché del navegador no sirve imágenes antiguas tras la sustitución

---

## 10. Dependencias y compatibilidad

Este módulo no altera tablas existentes del proyecto. La única modificación al frontend existente es el cambio de fuente de las imágenes (de `/public/` a Supabase Storage). No afecta a la lógica de reservas, pagos, emails ni ningún otro módulo.

**Dependencias:**
- Supabase Storage (ya disponible en el proyecto)
- Supabase JS SDK, método `storage.from().upload()` con `upsert: true`
- No requiere nuevas Edge Functions
- No requiere cambios en Stripe ni en el sistema de emails

---

## 11. Estimación de esfuerzo

| Tarea | Estimación |
|---|---|
| Crear bucket y políticas RLS | 1 hora |
| Crear tabla `imagenes_web` y datos iniciales | 1 hora |
| Migrar imágenes del repo a Storage | 1-2 horas |
| Helper `getMediaUrl` y actualización del frontend público | 2-3 horas |
| Página admin + componentes (card, modal, validación) | 4-6 horas |
| Cache-busting y pruebas | 1-2 horas |
| **Total estimado** | **10-15 horas** |

---

*Documento generado el 28/03/2026. Pendiente de implementación en Versión 2.*
