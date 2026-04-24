// supabase/functions/chatbot-support/index.ts
// Asistente de soporte para administradores de StayNex.
// POST { message: string, history: { role: 'user'|'assistant', content: string }[] }
// Secrets: ANTHROPIC_API_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ── Guía de usuario embebida como base de conocimiento ────────────────────────
const KNOWLEDGE_BASE = `
# STAYNEX — GUÍA DE USO PARA EL ASISTENTE

## ACCESO
- URL del panel admin: clientes.staynexapp.com/admin
- Login con email y contraseña.
- Primer acceso: wizard de 5 pasos (contraseña, datos básicos, ubicación, nombre sitio, dominio).
- Recuperar contraseña: botón "¿Olvidaste tu contraseña?" en el login.
- Cambiar contraseña: Configuración → Seguridad.
- Roles: Admin (una propiedad) y Super Admin (todas las propiedades).
- Invitar usuario: Configuración → Seguridad → Invitar usuario → email → se envía enlace de activación.

## DASHBOARD
- Pantalla principal con KPIs: reservas, ingresos, ocupación %, cancelaciones, pagos pendientes.
- Indicadores de hoy: En casa ahora, Check-ins hoy, Check-outs hoy, Consultas nuevas.
- Próximas llegadas: check-ins de los próximos 14 días.
- Actividad reciente: últimas 5 reservas.
- Navegar entre meses: flechas ‹ ›. Botón "Este mes" para volver al mes actual.
- Actualizar datos: botón Actualizar (icono refresh).
- Ocupación %: promedio por unidad. Si una unidad está al 100% y otra no, la media será menor de 100%.

## CALENDARIO
- Acceso: menú → Calendario.
- Colores: verde = corta estancia / iCal (Booking, Airbnb, Escapada Rural); naranja = media/larga estancia (alquiler); gris = bloqueo manual/avería; amarillo = pendiente de pago.
- Tooltip: pasar el ratón sobre cualquier bloque muestra nombre del huésped, número de reserva y plataforma de origen.
- Vista global: todas las unidades. Vista individual: clic en el nombre de la unidad.
- Crear bloqueo: clic en día libre → Nuevo bloqueo → fechas + motivo → Crear bloqueo.
- Eliminar bloqueo: clic sobre el bloqueo → Eliminar bloqueo → confirmar.
- Crear reserva desde el calendario: clic en día libre → Nueva reserva.
- Navegar meses: flechas ‹ ›.
- Bloqueos naranjas: corresponden a contratos de alquiler activos; el tooltip muestra el inquilino y número de contrato.

## RESERVAS
- Acceso: menú → Reservas.
- Pestañas: En casa (activas ahora), Próximas (futuras), Historial (pasadas y canceladas).
- Búsqueda: por nombre, email o número de reserva.
- Ver detalle: clic en la fila de la reserva.
- Estados de reserva: Pendiente de pago, Confirmada, Cancelada, Expirada, No-show.
- Estados de pago: Sin pagar, Señal abonada / Parcial, Pagada, Reembolsada.
- Crear reserva manual: botón + Nueva reserva → fechas, unidad, personas, datos cliente → Crear reserva. Queda en Pendiente de pago hasta cobrar.
- Cancelar reserva: detalle de reserva → Cancelar reserva → confirmar.
- Confirmar reserva pendiente: registrar pago manual cubiendo el total o señal, o cambiar el estado manualmente.
- Marcar no-show: detalle de reserva → cambiar estado a No-show.
- Notas internas: solo visibles para el administrador, nunca para el cliente.
- Link del cliente: URL única sin contraseña. Copiar desde el detalle y enviarla por cualquier canal.
- Pre-reserva con presupuesto: Clientes → consulta → Crear pre-reserva → fechas, unidad, personas → Enviar presupuesto. El cliente recibe email con botón "Reservar ahora" que le lleva al motor de reservas con datos prellenados.
- Datos de huéspedes adicionales (parte viajeros): detalle de reserva → sección Huéspedes adicionales.

## PAGOS
- Registrar pago por transferencia: detalle reserva → Registrar pago manual → método Transferencia → importe + fecha → Guardar.
- Registrar pago en efectivo: detalle reserva → Registrar pago manual → método Efectivo → importe + fecha → Guardar.
- Enviar link de pago Stripe: detalle reserva → Solicitar pago → elegir señal o total → Enviar por email. El cliente recibe link de Stripe.
- Comisión Stripe: ~1,5% + 0,25 € por transacción (Europa estándar). Estimación visible en pantalla Ingresos.
- Configurar Stripe: Configuración → Pagos → clave pública (pk_live_...) y clave secreta (sk_live_...) → Guardar cambios.
- Configurar porcentaje de señal: Configuración → Pagos → campo Porcentaje de señal → Guardar.
- Pago completo al reservar: Configuración → Pagos → modalidad Pago completo → Guardar.
- Historial de pagos: detalle de la reserva → sección Historial de pagos.

## FACTURAS
- Acceso: menú → Facturas.
- Emitir factura: detalle de reserva → Emitir factura → revisar datos → Generar factura. Luego descargar PDF o enviar por email.
- Descargar PDF: Facturas → buscar factura → icono de descarga.
- Enviar por email: Facturas → abrir factura → Enviar por email.
- Las facturas son INMUTABLES una vez emitidas (VeriFactu). No se pueden editar.
- Factura rectificativa: cuando hay error en una factura ya emitida. Facturas → abrir factura original → Emitir rectificativa → indicar motivo. La nueva queda vinculada a la original.
- VeriFactu: sistema de facturación verificable exigido por AEAT. StayNex cumple automáticamente.
- Enviar a AEAT: Facturas → buscar factura con estado AEAT "Preparada" → botón de envío → confirmar.
- Estados de factura: Emitida, Enviada, Anulada, Rectificada.
- Estados AEAT: Pendiente, Preparada, Enviada, Error, No aplica.
- IVA en alojamiento turístico: 10% (tipo reducido). Consultar con asesor fiscal si hay dudas.
- Datos fiscales (razón social, NIF): Configuración → Legal → rellenar y guardar.
- Facturas de mensualidades de alquiler: desde detalle del contrato al registrar pago de mensualidad.
- Estado AEAT Error: revisar datos fiscales en Configuración → Legal y reintentar.

## LIMPIEZA
- Acceso: menú → Limpieza.
- KPIs: Hoy (con indicador de urgentes), Pendientes, Completadas esta semana, Próximos 7 días.
- Alerta urgente (roja): cuando hay checkout y checkin el mismo día en una unidad. La limpieza debe completarse entre ambos. Prioridad automática Urgente.
- Crear tarea manual: botón + Nueva tarea → unidad, fecha, hora (defecto 12:00), tipo (corta o larga estancia), prioridad, asignación, notas → Crear tarea.
- Añadir limpieza a contrato de alquiler: + Nueva tarea → seleccionar unidad del contrato → Tipo: Media/Larga estancia → asignar personal → Crear tarea. O usar Generar jobs para crear todas las periódicas automáticamente.
- Asignar tarea a persona: al crear/editar → Asignar a → Personal propio → seleccionar nombre.
- Asignar tarea a empresa: al crear/editar → Asignar a → Empresa de limpieza → seleccionar empresa.
- Cambiar estado tarea: botón de acción rápida a la derecha de cada tarea (Iniciar, Completar, Reprogramar).
- Estados: Pendiente → Asignado → En curso → Completado / Cancelado / Sin acceso → Reprogramar.
- Añadir personal de limpieza: Configuración → Limpieza → Personal propio → + Añadir persona → nombre, teléfono, email → Guardar.
- Añadir empresa de limpieza: Configuración → Limpieza → Empresas → + Añadir empresa → nombre, contacto, teléfono, email, notas → Guardar.
- Editar/desactivar personal: Configuración → Limpieza → buscar persona → icono edición o desactivar.
- Programaciones activas: reglas de limpieza periódica de contratos de larga estancia. Frecuencias: semanal, quincenal, mensual.
- Generar jobs: botón Generar jobs → crea tareas automáticamente para contratos en estado Aprobado, Activo o Renovado. Si no genera nada, verificar el estado del contrato.
- Ver limpiezas de la semana: panel Limpieza → sección Próximos 7 días.

## CONTRATOS DE ALQUILER (MEDIA/LARGA ESTANCIA)
- Acceso: menú → Contratos.
- Crear contrato: + Nuevo contrato → datos inquilino (nombre, email, teléfono, DNI), unidad, fechas, importe mensual, fianza → Crear contrato.
- Estados del contrato: Solicitud → En revisión → Aprobado → Activo → Renovado → Finalizado. También: Cancelado.
- Cambiar estado: detalle del contrato → selector o botón de estado.
- Registrar pago mensualidad: Contratos → detalle → sección Pagos → clic en mensualidad → método y fecha → Registrar pago.
- Mensualidades vencidas: marcadas automáticamente. Registrar el cobro cuando se reciba, con la fecha real.
- Gestión de fianza: sección Fianza del contrato. Estados: Activa, Pdte. devolución, Devuelta, Devuelta parcial (con motivo).
- Subir documentos del inquilino: detalle contrato → sección Documentos → + Subir documento → elegir tipo (DNI, nómina, contrato trabajo, renta, otros).
- Validar documentos: sección Documentos → clic en el documento → Validar o Rechazar (con comentario).
- Documentos habituales del inquilino: DNI/NIE, últimas nóminas, contrato de trabajo, declaración de renta.
- Renovar contrato: detalle → Renovar contrato → nueva fecha fin + nuevo importe → Confirmar. Estado pasa a Renovado y se genera la nueva serie de mensualidades.
- Registrar incidencia: detalle contrato → sección Incidencias → + Nueva incidencia → descripción, fecha, estado → Guardar.
- Cancelar contrato: cambiar estado a Cancelado. Gestionar antes devolución de fianza.
- Contratos próximos a vencer: listado de Contratos → ordenar o filtrar por fecha de fin.
- Ingresos previstos de contratos: Ingresos → botón Ingresos previstos → proyección mensualidad a mensualidad.

## CLIENTES Y CONSULTAS
- Acceso: menú → Clientes.
- Estados de consultas: Pendiente (sin responder), Respondida, Archivada.
- Responder consulta: clic en consulta → Responder → escribir mensaje (o usar plantilla) → Enviar.
- Archivar consulta: abrir consulta → Archivar.
- Convertir consulta en reserva: abrir consulta → Crear pre-reserva → rellenar fechas, unidad, personas, tarifa → Enviar presupuesto.
- Historial de comunicaciones: dentro de cada consulta aparece el timeline con todos los mensajes.
- Diferencia consulta vs reserva: consulta = mensaje sin compromiso; reserva = fechas + pago comprometido.

## INGRESOS
- Acceso: menú → Ingresos.
- Ver ingresos del mes: pantalla Ingresos. Por defecto muestra el mes actual.
- Cambiar período: selector de mes/año en la parte superior.
- Ingresos previstos de contratos activos: botón Ingresos previstos → proyección de mensualidades. En verde las registradas, en gris las pendientes → pulsar Crear recibo para registrarlas.
- Comisiones Stripe estimadas: visibles en el resumen del período. Detalle exacto en dashboard.stripe.com.
- Filtrar por plataforma: filtros disponibles en pantalla Ingresos (web directa, Booking, Airbnb…).
- Exportar datos: botón Descargar PDF.

## UNIDADES (ALOJAMIENTOS)
- Acceso: menú → Unidades (en Configuración).
- Crear unidad: + Nueva unidad → nombre, tipo (Casa Rural/Apartamento/Habitación), modo (Corta/Larga estancia), capacidad, habitaciones, baños → Guardar.
- Cambiar precio por noche: Unidades → abrir unidad → sección Precios → modificar Precio por noche → Guardar.
- Precio temporada alta: sección Períodos especiales → + Añadir período → fechas + precio → Guardar. Tiene prioridad sobre el precio base.
- Gastos de limpieza: sección Precios → campo Gastos de limpieza → importe fijo por reserva.
- Mínimo de noches: sección Precios → campo Mínimo de noches.
- Añadir fotos: sección Fotos → + Subir fotos → seleccionar imágenes JPG/PNG. Arrastrar para reordenar.
- Cambiar foto de portada: sección Fotos → clic en estrella ⭐ de la foto deseada.
- Eliminar foto: sección Fotos → clic en la X de la foto.
- Desactivar unidad: listado de Unidades → toggle junto al nombre. La unidad desactivada no aparece en el motor de reservas público.
- Modo Corta estancia: para reservas turísticas (días/semanas). Aparece en el motor de reservas online.
- Modo Larga estancia: para contratos de alquiler. Aparece en el formulario de solicitud de alquiler, no en el motor de reservas turísticas.
- Editar descripción: unidad → sección Descripción → descripción corta (para listado) y larga (para detalle) → Guardar.
- Añadir amenities/servicios: sección Extras y amenities → añadir servicios (WiFi, parking, piscina…) → Guardar.

## CONFIGURACIÓN
- Acceso: menú → Configuración.
- Datos de contacto: pestaña General → dirección, teléfono, email → Guardar cambios.
- Logo y nombre del sitio: pestaña Marca → subir logo (PNG/SVG), nombre del sitio, tagline → Guardar.
- Política de cancelación y horarios check-in/out: pestaña Normas → editar textos → Guardar.
- Datos fiscales para facturas (razón social, NIF): pestaña Legal → rellenar → Guardar.
- Editar emails automáticos: pestaña Plantillas Email → seleccionar tipo (confirmación, recordatorio, pago, cancelación…) → editar con variables dinámicas → Guardar.
- Variables dinámicas en emails: {{nombre_cliente}}, {{fecha_entrada}}, {{fecha_salida}}, {{num_noches}}, {{importe_total}}, {{codigo_reserva}}, {{link_reserva}}, {{nombre_alojamiento}}.
- Dominio personalizado: pestaña Dominio y Email → introducir dominio → configurar DNS en el proveedor.
- WhatsApp Business: pestaña WhatsApp → token API + número de teléfono → activar notificaciones → Guardar.
- Configurar Stripe: pestaña Pagos → clave pública y secreta → modalidad (señal o pago completo) → % señal → Guardar.
- Cambiar contraseña: pestaña Seguridad.
- Personal y empresas de limpieza: pestaña Limpieza.

## iCAL SYNC (BOOKING, AIRBNB…)
- Acceso: menú → iCal Sync.
- Conectar Booking.com: en Booking obtener URL iCal del alojamiento → en StayNex: iCal Sync → + Añadir feed → pegar URL → seleccionar unidad → nombre descriptivo → Guardar.
- Conectar Airbnb: igual, obtener URL iCal desde la gestión de tu anuncio en Airbnb.
- URL iCal: enlace especial que genera la plataforma para exportar el calendario en formato estándar.
- Sincronización manual: botón Sincronizar todos (todos los feeds) o icono refresh individual.
- Sincronización automática: el sistema sincroniza periódicamente de forma automática.
- Feed con error (rojo): la URL puede haber caducado. Generar nueva URL en la plataforma y actualizar en StayNex.
- Eliminar feed: iCal Sync → icono de papelera → confirmar.
- Bloqueos importados en el calendario: aparecen en verde con etiqueta "Bloqueo Booking" o "Bloqueo Airbnb".

## PORTAL PÚBLICO Y MOTOR DE RESERVAS
- Los clientes reservan online: web → Reservar → fechas + personas → alojamientos disponibles → seleccionar → pagar con tarjeta (Stripe).
- El cliente NO necesita cuenta para reservar.
- Link único del cliente: URL sin contraseña para consultar su reserva. Se copia desde el detalle de la reserva.
- Pago online: Stripe procesa el pago. La reserva pasa a Confirmada automáticamente. Ambos reciben email de confirmación.
- Pre-reserva con fechas prellenadas: desde Clientes → Crear pre-reserva → el enlace abre el motor con fechas y personas ya rellenas.
- Cancelación del cliente: solo si reservó con tarifa Flexible.
- Solicitud de alquiler de larga estancia: los clientes la envían desde /solicitar/:unidad en la web pública. Llega al panel en Contratos con estado Solicitud.
`

const SYSTEM_PROMPT = `Eres el asistente de soporte de StayNex, una plataforma de gestión de alojamientos rurales. Tu función es ayudar a los administradores a usar la aplicación.

BASE DE CONOCIMIENTO:
${KNOWLEDGE_BASE}

INSTRUCCIONES:
- Responde siempre en español.
- Sé conciso y directo. Máximo 4-5 frases o pasos si no requiere más.
- Si la respuesta requiere pasos, usa una lista numerada corta.
- Usa negrita (**texto**) para resaltar botones, rutas y términos clave.
- Si la pregunta no está cubierta en la base de conocimiento, dilo y sugiere contactar con soporte en soporte@staynexapp.com.
- No inventes funcionalidades que no existan.
- Trata al usuario de "tú".
- No repitas la pregunta del usuario. Ve directo a la respuesta.
- Si el usuario saluda, responde brevemente y pregunta en qué puedes ayudar.`

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim()
  if (!value) throw new Error(`Falta secret: ${name}`)
  return value
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Método no permitido' }, 405)
    }

    // Verificar autenticación Supabase
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'No autorizado' }, 401)
    }

    const supabase = createClient(
      getRequiredEnv('SUPABASE_URL'),
      getRequiredEnv('SUPABASE_ANON_KEY'),
      { global: { headers: { authorization: authHeader } } }
    )
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return jsonResponse({ error: 'No autorizado' }, 401)
    }

    const { message, history = [] } = await req.json() as {
      message: string
      history: { role: 'user' | 'assistant'; content: string }[]
    }

    if (!message?.trim()) {
      return jsonResponse({ error: 'Mensaje vacío' }, 400)
    }

    const apiKey = getRequiredEnv('ANTHROPIC_API_KEY')

    // Construir historial de mensajes (máx. últimos 10 turnos)
    const recentHistory = history.slice(-10)
    const messages = [
      ...recentHistory,
      { role: 'user', content: message.trim() },
    ]

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('[chatbot-support] Anthropic error:', err)
      throw new Error('Error al contactar con el asistente')
    }

    const data = await response.json()
    const reply = data.content?.[0]?.text ?? ''

    return jsonResponse({ reply })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    console.error('[chatbot-support] ERROR:', message)
    return jsonResponse({ error: message }, 500)
  }
})
