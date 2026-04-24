# Guía de Usuario — StayNex App

> Versión 1.0 · Abril 2026  
> Plataforma de gestión integral de alojamientos rurales · clientes.staynexapp.com

---

## Índice

1. [¿Qué es StayNex?](#1-qué-es-staynex)
2. [Primer acceso y configuración inicial](#2-primer-acceso-y-configuración-inicial)
3. [Panel de Control (Dashboard)](#3-panel-de-control-dashboard)
4. [Calendario](#4-calendario)
5. [Reservas](#5-reservas)
6. [Clientes y Consultas](#6-clientes-y-consultas)
7. [Ingresos](#7-ingresos)
8. [Facturas](#8-facturas)
9. [Limpieza](#9-limpieza)
10. [Contratos de Alquiler (Media/Larga Estancia)](#10-contratos-de-alquiler-medialarga-estancia)
11. [Portal Público y Motor de Reservas](#11-portal-público-y-motor-de-reservas)
12. [Configuración del Alojamiento](#12-configuración-del-alojamiento)
13. [Sincronización iCal (Booking, Airbnb…)](#13-sincronización-ical-booking-airbnb)
14. [Gestión de Unidades (Alojamientos)](#14-gestión-de-unidades-alojamientos)
15. [Super Admin (gestión de múltiples propiedades)](#15-super-admin)

---

## 1. ¿Qué es StayNex?

StayNex es una plataforma de gestión completa para alojamientos rurales, casas y apartamentos. Incluye:

- **Motor de reservas online** visible para tus clientes (web pública).
- **Panel de administración** para gestionar reservas, clientes, pagos, facturas, limpiezas y contratos de larga estancia.
- **Sincronización** con Booking.com, Airbnb y Escapada Rural para evitar doble-reserva.
- **Facturación** con cumplimiento fiscal español (VeriFactu / AEAT).
- **Módulo de alquiler** para contratos de media y larga estancia con gestión de fianzas y pagos mensuales.
- **Módulo de limpieza** para organizar y asignar las tareas de limpieza.

### Acceso al panel de administración

URL: `clientes.staynexapp.com/admin`

Para acceder necesitas el **email** y **contraseña** que te fue proporcionado al crear tu cuenta. Si es tu primer acceso verás el Asistente de Configuración Inicial.

---

## 2. Primer acceso y configuración inicial

La primera vez que entras a la aplicación se inicia un **asistente (wizard) de 5 pasos**:

| Paso | Qué se pide |
|------|-------------|
| 1 | **Contraseña** — define tu contraseña segura |
| 2 | **Datos básicos** — nombre de empresa, email y teléfono de contacto |
| 3 | **Ubicación** — localidad y provincia de tu alojamiento |
| 4 | **Nombre del sitio** — título público que verán tus clientes |
| 5 | **Dominio personalizado** *(opcional)* — puedes añadirlo después |

Una vez completado el asistente llegas al Dashboard y puedes empezar a usar la app.

> **Tip:** Puedes completar o editar todos estos datos más adelante en **Configuración**.

---

## 3. Panel de Control (Dashboard)

**Acceso:** menú lateral → *Dashboard*

El Dashboard es la pantalla principal. Te ofrece una visión rápida del estado de tu negocio.

### ¿Qué ves en el Dashboard?

#### Indicadores de hoy
- **En casa ahora** — huéspedes que están alojados en este momento.
- **Check-ins hoy** — llegadas previstas para hoy.
- **Check-outs hoy** — salidas previstas para hoy.
- **Pagos pendientes** — reservas que aún no han completado el pago.
- **Consultas nuevas** — solicitudes de información sin responder.

#### KPIs del mes seleccionado
- **Reservas** — número de reservas del mes.
- **Ingresos** — total de ingresos confirmados del mes.
- **Ingresos anuales** — acumulado del año hasta el mes seleccionado.
- **Ocupación %** — porcentaje de días ocupados respecto al total disponible (calculado por unidad).
- **Cancelaciones** — reservas canceladas en el mes.

#### Próximas llegadas
Tabla con los check-ins de los próximos 14 días: nombre del huésped, fechas, número de personas, estado de la reserva y origen (web directa, Booking, Airbnb…).

#### Actividad reciente
Últimas 5 reservas creadas o modificadas.

### Navegar entre meses
Usa las flechas `‹` y `›` junto al mes para ver estadísticas de otros meses. El botón **Este mes** vuelve al mes actual.

### Actualizar datos
Pulsa el botón **Actualizar** (icono de refresh) para recargar todos los datos.

---

## 4. Calendario

**Acceso:** menú lateral → *Calendario*

El Calendario muestra en una cuadrícula visual todas las ocupaciones de tus alojamientos.

### Vistas disponibles

#### Vista global (todos los alojamientos)
Muestra una fila por cada unidad/alojamiento. Cada celda representa un día y los bloques de color representan reservas o bloqueos. Puedes ver de un vistazo qué días están libres u ocupados en todas tus unidades.

**Colores:**
- 🟢 **Verde** — Reservas de corta estancia (web directa, Booking, Airbnb, Escapada Rural).
- 🟠 **Naranja** — Media/Larga estancia (contrato de alquiler).
- ⬜ **Gris** — Bloqueo manual o por avería.
- 🟡 **Amarillo** — Reserva pendiente de pago.

Al pasar el ratón sobre cualquier bloque aparece un **tooltip** con el nombre del huésped, número de reserva y fecha.

#### Vista individual (un alojamiento)
Haz clic en el nombre de una unidad para ver su calendario mensual individual con más detalle.

### Acciones desde el Calendario

#### Crear una reserva manual
1. Haz clic en cualquier día libre de una unidad.
2. Selecciona **Nueva reserva**.
3. Completa los datos del huésped y las fechas.

#### Crear un bloqueo
1. Haz clic en un día libre.
2. Selecciona **Nuevo bloqueo**.
3. Elige las fechas de inicio y fin e indica el motivo (avería, limpieza, uso propio…).

#### Navegar entre meses
Usa las flechas `‹` `›` junto al mes para desplazarte.

---

## 5. Reservas

**Acceso:** menú lateral → *Reservas*

### Listado de reservas

La pantalla tiene tres pestañas:

| Pestaña | Contenido |
|---------|-----------|
| **En casa** | Huéspedes actualmente alojados |
| **Próximas** | Reservas futuras confirmadas o pendientes de pago |
| **Historial** | Todas las reservas pasadas y canceladas |

Para cada reserva se muestra: nombre del cliente, fechas, unidad, número de huéspedes, importe total, estado de la reserva y estado del pago.

**Filtros y búsqueda:** escribe en el campo de búsqueda para filtrar por nombre, email o número de reserva.

### Detalle de una reserva

Haz clic en cualquier fila para abrir el detalle completo.

#### Información disponible:
- **Datos del huésped** — nombre, apellidos, email, teléfono, DNI/pasaporte.
- **Datos de la reserva** — fechas de entrada y salida, número de noches, unidad, número de ocupantes.
- **Desglose de precios** — alojamiento, gastos de limpieza, extras, descuentos aplicados, total.
- **Estado de pago** — sin pagar, señal abonada, pagada completa, reembolsada.
- **Historial de pagos** — cada pago recibido (fecha, importe, método).
- **Notas internas** — visible solo para el administrador.
- **Documentación** — datos de huéspedes adicionales (para registro en Policía/Guardia Civil si aplica).

#### Acciones desde el detalle:

**Gestión de pagos:**
- **Solicitar pago por Stripe** — envía un email al cliente con link de pago. Puedes elegir cobrar la señal o el total pendiente.
- **Registrar pago manual** — anota un pago recibido por transferencia bancaria o efectivo: indica importe, método y fecha.
- **Ver link de acceso del cliente** — URL única para que el cliente consulte su reserva sin necesidad de cuenta.

**Cambio de estado:**
- Confirmar reserva (PENDING → CONFIRMED).
- Cancelar reserva.
- Marcar como no-show.

**Facturación:**
- **Emitir factura** — genera la factura en PDF con todos los datos. Ver sección [Facturas](#8-facturas).
- **Emitir rectificativa** — si necesitas corregir una factura ya emitida.

### Crear una reserva manual

1. Pulsa el botón **+ Nueva reserva** (esquina superior derecha).
2. Selecciona las fechas de entrada y salida en el calendario.
3. Elige la unidad/alojamiento.
4. Indica el número de huéspedes y menores.
5. Revisa el precio calculado automáticamente.
6. Introduce los datos del cliente (nombre, email, teléfono).
7. Pulsa **Crear reserva**.

La reserva queda en estado *Pendiente de pago* hasta que registres el cobro.

### Crear una pre-reserva (desde consulta)

Desde la sección de Clientes, cuando un cliente pide información, puedes convertir esa consulta en una pre-reserva:

1. Abre la consulta del cliente.
2. Pulsa **Crear pre-reserva**.
3. Rellena los datos y pulsa **Enviar presupuesto por email**.
4. El cliente recibe un email con el resumen y un botón **"Reservar ahora"** que le lleva directamente al motor de reservas con las fechas y huéspedes ya preseleccionados.

---

## 6. Clientes y Consultas

**Acceso:** menú lateral → *Clientes*

Aquí se recogen todas las consultas que llegan a través del formulario de contacto de tu web.

### Estados de las consultas

| Estado | Significado |
|--------|-------------|
| **Pendiente** | Consulta nueva sin responder |
| **Respondida** | Ya enviaste respuesta al cliente |
| **Archivada** | Consulta cerrada / sin interés |

### Responder una consulta

1. Haz clic en la consulta.
2. Pulsa **Responder**.
3. Escribe tu mensaje (puedes usar las plantillas predefinidas).
4. Pulsa **Enviar** — el cliente recibe la respuesta por email.

### Convertir una consulta en reserva

Si el cliente quiere reservar tras tu respuesta:

1. Abre la consulta.
2. Pulsa **Crear pre-reserva**.
3. Indica fechas, unidad, número de personas y tarifa.
4. Pulsa **Enviar presupuesto** — el cliente recibe el enlace de reserva con los datos prellenados.

---

## 7. Ingresos

**Acceso:** menú lateral → *Ingresos*

Pantalla de análisis económico de tu negocio.

### ¿Qué muestra?

- **Resumen del período** — total facturado, pagado, pendiente y comisiones Stripe estimadas.
- **Listado de reservas** del período con su importe y estado de pago.
- **Filtros** por origen de la reserva (web directa, Booking, Airbnb…).

### Cambiar el período
Usa el selector de mes/año en la parte superior para analizar períodos anteriores.

### Ingresos previstos (contratos de alquiler)

Si tienes contratos de media/larga estancia activos, puedes ver los ingresos mensuales que debes cobrar:

1. Pulsa el botón **Ingresos previstos** (icono de calendario con reloj).
2. Se abre el modal con la proyección de cobros mensualidad a mensualidad.
3. Las mensualidades ya registradas aparecen en verde; las pendientes de crear, en gris.
4. Para registrar un recibo pendiente pulsa **Crear recibo** — queda registrado en el sistema.

> Utilidad: saber de un vistazo qué mensualidades del alquiler ya están registradas y cuáles faltan por girar.

### Exportar datos
Pulsa **Descargar PDF** para exportar el listado del período seleccionado.

---

## 8. Facturas

**Acceso:** menú lateral → *Facturas*

Gestión completa de la facturación con cumplimiento de la normativa española (VeriFactu).

### Listado de facturas

Cada factura muestra: número, fecha, nombre del cliente, importe total, estado y estado AEAT.

**Estados de factura:**

| Estado | Significado |
|--------|-------------|
| **Emitida** | Factura generada en PDF |
| **Enviada** | Enviada al cliente por email |
| **Anulada** | Cancelada con nota de crédito / rectificativa |
| **Rectificada** | Sustituida por otra factura corregida |

**Estados AEAT:**

| Estado | Significado |
|--------|-------------|
| **Pendiente** | No enviada a AEAT |
| **Preparada** | Lista para enviar |
| **Enviada** | Confirmada en AEAT |
| **Error** | Error en el envío |
| **No aplica** | No sujeta a VeriFactu |

### Emitir una factura

**Desde el detalle de una reserva:**

1. Ve al detalle de la reserva.
2. Pulsa **Emitir factura**.
3. Revisa los datos: concepto, base imponible, IVA (10% o 21% según el caso), total.
4. Verifica los datos del cliente (nombre, NIF/DNI, dirección de facturación).
5. Pulsa **Generar factura**.

La factura queda registrada, se genera el PDF y puedes:
- **Descargar** el PDF.
- **Enviar por email** al cliente.
- **Imprimir** directamente.

> **Importante:** Las facturas quedan **bloqueadas** (VeriFactu) una vez emitidas. No pueden editarse. Si hay un error, debes emitir una **factura rectificativa**.

### Emitir una factura rectificativa

Si necesitas corregir una factura ya emitida:

1. Abre la factura original en el listado.
2. Pulsa **Emitir rectificativa**.
3. Indica el motivo de la corrección.
4. La nueva factura queda vinculada a la original y la marca como *Rectificada*.

### Enviar factura a AEAT

1. En el listado, busca la factura con estado *Preparada*.
2. Pulsa el icono AEAT o el botón correspondiente.
3. Confirma el envío.

---

## 9. Limpieza

**Acceso:** menú lateral → *Limpieza*

Módulo para gestionar y hacer seguimiento de todas las tareas de limpieza.

### Panel principal

#### KPIs en tiempo real
- **Hoy** — número de limpiezas programadas para hoy (con indicador de urgentes).
- **Pendientes** — tareas sin asignar.
- **Completadas** — tareas finalizadas esta semana.
- **Próximos 7 días** — total de limpiezas programadas.

#### Alerta de limpieza urgente
Si en una misma unidad hay un **check-out y un check-in el mismo día**, aparece un aviso rojo destacado con las unidades afectadas. Estas tareas se marcan automáticamente como **Urgente**.

#### Jobs de hoy
Lista de todas las limpiezas programadas para hoy con su estado, prioridad y persona asignada.

#### Próximos 7 días
Tabla con las limpiezas previstas para los próximos días: fecha, unidad, tipo, asignado y estado.

### Estados de una tarea de limpieza

| Estado | Significado | Siguiente estado |
|--------|-------------|-----------------|
| **Pendiente** | Sin iniciar | Iniciar |
| **Asignado** | Asignada a alguien | Iniciar |
| **En curso** | En proceso | Completar |
| **Completado** | Finalizada | — |
| **Cancelado** | Anulada | — |
| **Sin acceso** | No se pudo acceder | Reprogramar |

Para cambiar el estado de una tarea pulsa el botón de acción rápida que aparece a la derecha de cada tarea (por ejemplo, "Iniciar" o "Completar").

### Crear una tarea de limpieza manualmente

1. Pulsa el botón **+ Nueva tarea** en la cabecera.
2. Selecciona la **unidad** donde se realizará la limpieza.
3. Elige la **fecha** y la **hora de inicio** (por defecto 12:00).
4. Selecciona el **tipo**: Corta estancia o Media/Larga estancia.
5. Elige la **prioridad**: Baja, Media, Alta o Urgente.

> Si hay un check-out y un check-in el mismo día en esa unidad, el sistema lo detecta automáticamente, activa una **alerta parpadeante** y establece la prioridad a **Urgente**.

6. **Asignación** (opcional):
   - *Sin asignar* — queda pendiente.
   - *Personal propio* — selecciona al empleado de tu lista.
   - *Empresa de limpieza* — selecciona la empresa contratada.
7. Añade **notas internas** si es necesario.
8. Pulsa **Crear tarea** (o **Crear tarea urgente** si es mismo día).

### Gestionar personal y empresas de limpieza

Para dar de alta o editar el personal de limpieza ve a **Configuración → Limpieza**.

#### Personal propio
- Pulsa **+ Añadir persona**.
- Rellena nombre, teléfono y email.
- Pulsa **Guardar**.

#### Empresas de limpieza
- Pulsa **+ Añadir empresa**.
- Rellena nombre de empresa, persona de contacto, teléfono, email y notas.
- Pulsa **Guardar**.

Puedes editar o desactivar cualquier entrada en cualquier momento.

### Programaciones automáticas (Schedules)

Si tienes contratos de larga estancia activos, el sistema puede generar automáticamente las tareas de limpieza periódicas según la frecuencia configurada en el contrato.

- Pulsa **Generar jobs** para crear las tareas del próximo período.
- En la sección *Programaciones activas* ves las reglas en vigor: unidad, frecuencia (semanal/quincenal/mensual), fecha inicio y fin.

---

## 10. Contratos de Alquiler (Media/Larga Estancia)

**Acceso:** menú lateral → *Contratos*

Módulo para gestionar alquileres de media y larga estancia con todo el ciclo de vida del contrato.

### ¿Qué es un contrato de larga estancia?

Un contrato de alquiler (a diferencia de una reserva turística) implica:
- Duración de semanas o meses.
- Fianza de garantía.
- Pagos mensuales recurrentes.
- Documentación del inquilino.
- Posible renovación.

### Estados del contrato

| Estado | Significado |
|--------|-------------|
| **Solicitud** | El inquilino ha enviado su solicitud desde la web |
| **En revisión** | Estás revisando la documentación |
| **Aprobado** | Contrato aprobado, pendiente de firma/inicio |
| **Activo** | Contrato en vigor |
| **Renovado** | Renovado por otro período |
| **Finalizado** | Contrato terminado |
| **Cancelado** | Contrato anulado |

### Crear un contrato

1. Pulsa **+ Nuevo contrato** en el listado.
2. Rellena los datos del inquilino: nombre, apellidos, email, teléfono, DNI.
3. Selecciona la **unidad** y las **fechas** (inicio y duración en meses).
4. Introduce el **importe mensual** y la **fianza** (suele ser 1-2 mensualidades).
5. Pulsa **Crear contrato**.

El contrato queda en estado *Solicitud* o *Aprobado* según el flujo elegido.

### Documentación del inquilino

En el detalle del contrato, sección **Documentos**:

- Sube los documentos requeridos: DNI/NIE, nómina, contrato laboral, declaración de renta, otros.
- Cada documento tiene un estado: *Pendiente*, *Validado* o *Rechazado*.
- Pulsa sobre el documento para validarlo o rechazarlo con un comentario.

### Fianza

En la sección **Fianza** del contrato:

| Estado fianza | Significado |
|--------------|-------------|
| **Activa** | Fianza en poder del propietario |
| **Pdte. devolución** | Contrato finalizado, pendiente de devolver |
| **Devuelta** | Fianza devuelta íntegramente |
| **Devuelta parcial** | Devuelta con descuento por daños u otros conceptos |

Para registrar la devolución de fianza cambia el estado e indica el importe y motivo.

### Pagos mensuales

En la sección **Pagos** del contrato verás la lista de mensualidades:

- **Pendiente** — aún no cobrada.
- **Pagada** — cobrada y registrada.
- **Vencida** — pasada la fecha sin cobrar.

Para registrar el pago de una mensualidad:

1. Haz clic en la mensualidad correspondiente.
2. Indica el método de pago (transferencia, efectivo…) y la fecha de cobro.
3. Pulsa **Registrar pago**.

### Ingresos previstos desde contratos activos

Desde la pantalla de **Ingresos** puedes ver el calendario de mensualidades previstas de todos los contratos activos. Ver sección [Ingresos previstos](#ingresos-previstos-contratos-de-alquiler).

### Incidencias y reparaciones

En el detalle del contrato, sección **Incidencias**:

- Registra cualquier problema notificado por el inquilino.
- Indica fecha, descripción, estado (Abierta / En gestión / Resuelta).
- Añade notas del técnico o reparación realizada.

### Renovar un contrato

Cuando se acerque la fecha de fin:

1. Abre el detalle del contrato.
2. Pulsa **Renovar contrato**.
3. Indica la nueva fecha de fin y el nuevo importe mensual (si cambia).
4. El estado pasa a *Renovado* y se genera la nueva serie de mensualidades.

---

## 11. Portal Público y Motor de Reservas

El portal público es la web que ven tus clientes para informarse y hacer reservas online.

### Páginas disponibles para tus clientes

| Página | URL | Descripción |
|--------|-----|-------------|
| Inicio | `/` | Presentación y acceso rápido |
| Alojamientos | `/alojamientos` | Listado de todas las unidades disponibles |
| Galería | `/galeria` | Fotos de todos los alojamientos |
| Servicios | `/servicios` | Amenities y servicios del complejo |
| Actividades | `/actividades` | Qué hacer en la zona |
| Dónde estamos | `/donde-estamos` | Mapa y cómo llegar |
| Contacto | `/contacto` | Formulario de contacto |

### Flujo de reserva online (motor de reservas)

Tus clientes pueden reservar directamente desde tu web:

**Paso 1 — Búsqueda** (`/reservar`)
- Seleccionan las fechas de entrada y salida.
- Indican el número de huéspedes.
- El sistema muestra los alojamientos disponibles con precios en tiempo real.

> Si el cliente accede desde un enlace de pre-reserva (que tú le envías), las fechas y número de personas llegan ya prellenadas.

**Paso 2 — Selección**
- Ven las unidades disponibles con fotos, características y precio total del período.
- Eligen el alojamiento que prefieren.
- Seleccionan la tarifa: *Flexible* (cancelación gratuita) o *No reembolsable* (precio más bajo).

**Paso 3 — Checkout**
- Rellenan sus datos: nombre, email, teléfono, DNI.
- Ven el desglose de precios final.
- Pagan con tarjeta (Stripe): pueden abonar solo la señal o el importe completo según tu configuración.
- Aceptan los términos y condiciones.
- Tras el pago, reciben confirmación por email.

### Acceso del cliente a su reserva

Cada cliente tiene una **URL única** para consultar su reserva sin necesidad de cuenta ni contraseña:

- El sistema la genera automáticamente.
- Puedes copiarla desde el detalle de la reserva y enviársela.
- El cliente puede ver los datos de su reserva, descargar la confirmación y pagar si queda saldo pendiente.

### Formulario de solicitud de alquiler de larga estancia

Si tienes unidades en modo *Larga estancia*, los clientes interesados pueden enviar una solicitud desde `/solicitar/:unidad`:

1. Datos personales (nombre, email, teléfono, DNI).
2. Condiciones deseadas (fecha inicio, duración, ocupantes, mascotas, situación laboral).
3. Envío — tú recibes la solicitud en el panel de *Contratos* con estado *Solicitud*.

---

## 12. Configuración del Alojamiento

**Acceso:** menú lateral → *Configuración*

### Pestaña: General

Datos básicos de tu alojamiento:
- Dirección completa (calle, localidad, provincia, país).
- Coordenadas GPS (se usan en el mapa del portal web).
- Teléfono de contacto.
- Email de contacto.
- Nombre legal de la empresa.

Pulsa **Guardar cambios** cuando termines.

### Pestaña: Marca

Personalización visual de tu portal:
- **Logo** — sube la imagen de tu logo (PNG/SVG recomendado).
- **Nombre del sitio** — aparece en el título de la web.
- **Tagline** — frase descriptiva corta.

Pulsa **Guardar cambios**.

### Pestaña: Normas

Políticas que verán los clientes al reservar:
- Reglas de la casa.
- Política de cancelación.
- Horarios de check-in y check-out.
- Número máximo/mínimo de huéspedes.
- Depósito requerido.
- Qué documentación debe aportar el cliente.

### Pestaña: Legal

Textos legales obligatorios del portal web:
- Razón social y NIF (imprescindible para facturas).
- Aviso legal.
- Política de privacidad.
- Términos y condiciones.
- Información RGPD.

> **Importante:** El NIF y la razón social se usan en todas las facturas emitidas. Asegúrate de que son correctos.

### Pestaña: Dominio y Email

- **Dominio personalizado** — si tienes tu propio dominio (ej. `tuapartamento.com`) puedes vincularlo aquí.
- **Configuración SMTP** — para enviar emails desde tu propio dominio en lugar del dominio de StayNex.

### Pestaña: Plantillas Email

Personaliza los emails automáticos que reciben tus clientes:
- Confirmación de reserva.
- Recordatorio de check-in.
- Solicitud de pago.
- Cancelación.
- Respuesta a consultas.

Cada plantilla admite **variables dinámicas** como `{{nombre_cliente}}`, `{{fecha_entrada}}`, `{{codigo_reserva}}`, etc.

Pulsa **Guardar** en cada plantilla para aplicar los cambios.

### Pestaña: WhatsApp

Si utilizas WhatsApp Business:
- Configura el token de API y el número de teléfono.
- Activa las notificaciones automáticas (nueva reserva, recordatorio check-in, etc.).
- Gestiona las plantillas de mensajes WhatsApp.

### Pestaña: Pagos

Configuración de Stripe (pasarela de pago):

1. Introduce tu **clave pública** y **clave secreta** de Stripe.
2. Elige la modalidad de pago:
   - **Solo señal** — el cliente paga un porcentaje al reservar y el resto antes del check-in.
   - **Pago completo** — el cliente paga el total al reservar.
3. Si usas señal, configura el **porcentaje** (habitualmente 30-50%).

> Para obtener tus claves Stripe accede a [dashboard.stripe.com](https://dashboard.stripe.com) → Desarrolladores → Claves de API.

### Pestaña: Seguridad

- **Cambiar contraseña** — introduce la contraseña actual y la nueva.
- Gestión de sesiones activas (cerrar otras sesiones si es necesario).

### Pestaña: Limpieza

Gestión del personal y empresas de limpieza. Ver sección [Módulo de Limpieza](#9-limpieza).

---

## 13. Sincronización iCal (Booking, Airbnb…)

**Acceso:** menú lateral → *iCal Sync*

La sincronización iCal permite importar los bloqueos de otras plataformas (Booking.com, Airbnb, Escapada Rural…) para evitar doble-reserva.

### Añadir un feed iCal

1. Accede a la plataforma de origen (Booking.com, Airbnb…) y copia la **URL del calendario iCal** de tu alojamiento.
2. En StayNex, pulsa **+ Añadir feed**.
3. Pega la URL del iCal.
4. Selecciona la **unidad** a la que corresponde.
5. Pon un nombre descriptivo (ej. "Booking.com – Casa del Río").
6. Pulsa **Guardar**.

### Sincronización manual

- Pulsa **Sincronizar todos** para actualizar todos los feeds de una vez.
- O pulsa el icono de refresh individual para actualizar solo uno.

### Estado de los feeds

Cada feed muestra cuándo fue la última sincronización y si hubo algún error. Si ves un feed en rojo, revisa que la URL sigue siendo válida en la plataforma de origen.

### Cómo se ven los bloqueos importados

Los bloqueos importados por iCal aparecen en el Calendario con el **nombre de la plataforma** (ej. "Bloqueo Booking", "Bloqueo Airbnb") y en **color verde**. Al pasar el ratón aparece el tooltip con el origen.

---

## 14. Gestión de Unidades (Alojamientos)

**Acceso:** menú lateral → *Unidades* (dentro de Configuración)

Aquí gestionas cada alojamiento: precios, fotos, descripciones y disponibilidad.

### Listado de unidades

Verás todas tus unidades con su nombre, tipo, capacidad y si están activas o no.

### Crear una nueva unidad

1. Pulsa **+ Nueva unidad**.
2. Rellena los datos básicos:
   - **Nombre** — nombre visible para los clientes.
   - **Tipo** — Casa Rural, Apartamento o Habitación.
   - **Modo operación** — *Corta estancia* (turístico) o *Larga estancia* (alquiler).
   - **Capacidad** — número base y máximo de personas.
   - **Habitaciones y baños**.
3. Pulsa **Guardar**.

### Configurar precios

En el detalle de la unidad, sección **Precios**:

- **Precio por noche** (temporada base).
- **Precio extra por huésped adicional** — se suma si hay más personas que la capacidad base.
- **Gastos de limpieza** — importe fijo que se añade a cada reserva.
- **Mínimo de noches** — mínimo de noches para poder reservar.

#### Temporadas especiales (precio alto)

Si en temporadas concretas tienes un precio diferente:

1. En la sección **Períodos especiales** pulsa **+ Añadir período**.
2. Indica las fechas de inicio y fin del período especial.
3. Introduce el precio por noche para ese período.
4. Pulsa **Guardar**.

Los períodos especiales tienen prioridad sobre el precio base.

### Editar descripciones

En la sección **Descripción**:

- **Descripción corta** — aparece en el listado de alojamientos.
- **Descripción larga** — aparece en el detalle de la unidad.
- **Extras y amenities** — lista de servicios incluidos (WiFi, parking, cocina equipada, etc.).

### Gestionar fotos

En la sección **Fotos**:

1. Pulsa **+ Subir fotos** y selecciona las imágenes (JPG o PNG).
2. Arrastra y suelta para cambiar el orden.
3. Haz clic en la estrella ⭐ de una foto para establecerla como **foto de portada** (la primera que ven los clientes).
4. Pulsa la **X** para eliminar una foto.

### Activar o desactivar una unidad

Si una unidad no está disponible para reservas (obras, reforma…), puedes desactivarla:

- En el listado de unidades, usa el **toggle** junto al nombre para desactivar/activar.
- Una unidad desactivada no aparece en el motor de reservas público.

---

## 15. Super Admin

> Solo accesible para usuarios con rol **Super Admin**.

**Acceso:** menú lateral → *Propiedades* (visible solo para Super Admin)

El Super Admin gestiona varias propiedades desde una única cuenta.

### Gestión de propiedades

- Ver todas las propiedades registradas en la plataforma.
- Crear nuevas propiedades para nuevos clientes.
- Activar o desactivar propiedades.
- Acceder al panel de cualquier propiedad directamente.

### Cambiar de propiedad activa

En la barra superior o en el menú, el Super Admin puede cambiar la propiedad activa. Todos los datos que ve y gestiona corresponden a la propiedad seleccionada.

### Gestión de usuarios administradores

Por propiedad puedes:
- Ver los usuarios con acceso.
- **Invitar nuevo usuario** — introduce el email, se envía un enlace de invitación.
- Cambiar el rol (Admin / Super Admin).
- Eliminar el acceso de un usuario.

---

## Preguntas frecuentes

Las preguntas están agrupadas por módulo para facilitar su consulta.

---

### ACCESO Y CUENTA

#### ¿Cómo accedo al panel de administración?
Entra en `clientes.staynexapp.com/admin` e introduce tu email y contraseña. Si es tu primer acceso verás el asistente de configuración inicial.

#### ¿Cómo recupero mi contraseña si la he olvidado?
En la pantalla de login pulsa **¿Olvidaste tu contraseña?** → introduce tu email → recibirás un enlace para restablecerla.

#### ¿Cómo cambio mi contraseña?
Ve a **Configuración → Seguridad** → introduce tu contraseña actual y la nueva → pulsa **Guardar**.

#### ¿Cómo invito a otro administrador para que acceda a la app?
Ve a **Configuración → Seguridad** (o desde el panel Super Admin si aplica) → pulsa **Invitar usuario** → introduce el email de la persona → se le enviará un enlace de activación. La persona deberá aceptar la invitación desde ese email y crear su contraseña.

#### ¿Qué diferencia hay entre el rol Admin y Super Admin?
- **Admin**: gestiona una sola propiedad. Ve y administra únicamente los datos de su alojamiento.
- **Super Admin**: tiene acceso a todas las propiedades registradas en la plataforma. Puede cambiar entre propiedades y gestionar usuarios de cada una.

#### ¿Cómo cierro sesión?
Pulsa tu nombre o avatar en la esquina superior del menú lateral y selecciona **Cerrar sesión**.

---

### DASHBOARD

#### ¿Qué significa el porcentaje de ocupación del Dashboard?
Es el promedio de días ocupados sobre el total de días disponibles, calculado **por unidad**. Si tienes dos unidades y una está al 100% pero la otra tiene días libres, la media será inferior al 100%. Así el dato es representativo del conjunto.

#### ¿Cómo veo quién está alojado ahora mismo?
En el **Dashboard**, sección *En casa ahora*, aparecen todos los huéspedes con reservas activas en este momento (check-in pasado y check-out futuro).

#### ¿Cómo veo los check-ins de hoy?
En el **Dashboard**, tarjeta *Check-ins hoy*. También puedes ir a **Reservas → Próximas** y filtrar por la fecha de hoy.

#### ¿Cómo veo los check-outs de hoy?
En el **Dashboard**, tarjeta *Check-outs hoy*.

#### ¿Cómo veo las próximas llegadas?
En el **Dashboard**, sección *Próximas llegadas*, aparecen los check-ins de los próximos 14 días ordenados por fecha.

#### ¿Cómo veo los ingresos del mes anterior?
En el **Dashboard**, usa las flechas `‹` `›` junto al mes para navegar a meses anteriores. Los KPIs se actualizan para el mes seleccionado.

#### ¿Cómo actualizo los datos del Dashboard?
Pulsa el botón **Actualizar** (icono de refresh) en la cabecera del Dashboard.

#### ¿Qué son las "consultas nuevas" en el Dashboard?
Son los mensajes enviados por clientes desde el formulario de contacto de tu web que aún no han sido respondidos. Haz clic en ese indicador para ir directamente a la sección de Clientes.

---

### CALENDARIO

#### ¿Qué significan los colores del calendario?
- 🟢 **Verde**: reservas de corta estancia (web directa, Booking, Airbnb, Escapada Rural).
- 🟠 **Naranja**: media/larga estancia (contrato de alquiler activo).
- ⬜ **Gris**: bloqueo manual o por avería.
- 🟡 **Amarillo/Ámbar**: reserva pendiente de pago.

#### ¿Cómo sé de quién es una reserva en el calendario?
Pasa el ratón por encima del bloque de color y aparece un tooltip con el nombre del huésped, el número de reserva y las fechas. En los bloques de iCal indica la plataforma de origen (Booking, Airbnb…).

#### ¿Cómo veo el calendario de una sola unidad?
En la vista global haz clic en el **nombre de la unidad** (columna izquierda) para abrir su calendario mensual individual.

#### ¿Cómo creo un bloqueo de días?
Ve a **Calendario** → haz clic en un día libre de la unidad → selecciona **Nuevo bloqueo** → elige las fechas de inicio y fin → escribe el motivo (uso propio, reparación, avería…) → pulsa **Crear bloqueo**.

#### ¿Cómo elimino un bloqueo?
Haz clic sobre el bloqueo gris en el calendario → en el desplegable o modal que aparece pulsa **Eliminar bloqueo** → confirma.

#### ¿Cómo navego al mes siguiente o anterior en el calendario?
Usa las flechas `‹` (mes anterior) y `›` (mes siguiente) situadas junto al nombre del mes en la cabecera del calendario.

#### ¿Por qué un bloqueo pone "Bloqueo Booking" o "Bloqueo Airbnb"?
Esos bloqueos vienen importados automáticamente desde la sincronización iCal con esas plataformas. No los creaste tú manualmente; los importó el sistema al sincronizar el feed de esa plataforma.

#### ¿Cómo veo si un bloqueo naranja corresponde a un contrato de alquiler concreto?
Al pasar el ratón sobre el bloque naranja en el calendario aparece el nombre del inquilino y el número de contrato en el tooltip.

---

### RESERVAS — GENERAL

#### ¿Cómo veo el detalle de una reserva?
Ve a **Reservas** en el menú lateral → haz clic en la fila de la reserva que quieres consultar.

#### ¿Cómo busco una reserva concreta?
En la pantalla **Reservas**, usa la caja de búsqueda para filtrar por nombre del cliente, email o número de reserva.

#### ¿Cómo veo las reservas pasadas?
Ve a **Reservas → pestaña Historial**. Allí aparecen todas las reservas finalizadas y canceladas.

#### ¿Qué significa cada estado de reserva?
- **Pendiente de pago**: la reserva existe pero el cliente aún no ha completado el pago.
- **Confirmada**: pagada y confirmada.
- **Cancelada**: anulada (por el cliente o por el administrador).
- **Expirada**: la reserva caducó sin completarse.
- **No-show**: el huésped no se presentó en la fecha de entrada.

#### ¿Cómo creo una reserva manualmente desde el panel?
Ve a **Reservas** → pulsa **+ Nueva reserva** → selecciona fechas, unidad y número de personas → introduce los datos del cliente → pulsa **Crear reserva**. La reserva quedará en estado *Pendiente de pago* hasta que registres el cobro.

#### ¿Cómo cancelo una reserva?
Abre el **detalle de la reserva** → busca el botón **Cancelar reserva** → confirma la acción. Si el cliente tiene derecho a reembolso, regístralo como pago negativo o gestiona la devolución desde Stripe.

#### ¿Cómo confirmo una reserva que está pendiente de pago?
Si recibes el pago por transferencia o efectivo, ve al **detalle de la reserva** → pulsa **Registrar pago manual** → indica el importe y el método → guarda. La reserva pasará automáticamente a *Confirmada* cuando el importe cubra el total o la señal configurada.  
Si quieres confirmarla sin esperar el pago, también puedes cambiar el estado directamente usando el selector de estado de la reserva.

#### ¿Cómo marco a un cliente como no-show?
Abre el **detalle de la reserva** → cambia el estado a **No-show** usando el selector de estado.

#### ¿Cómo añado notas internas a una reserva?
En el **detalle de la reserva**, busca la sección **Notas internas** → escribe tu nota → guarda. Las notas son solo visibles para el administrador, el cliente nunca las ve.

#### ¿Cómo copio el link de acceso del cliente a su reserva?
En el **detalle de la reserva** hay un botón o campo con la URL única del cliente. Copia ese enlace y envíaselo por cualquier canal (email, WhatsApp). El cliente podrá ver su reserva sin necesidad de crear cuenta.

#### ¿Cómo creo una pre-reserva con presupuesto para un cliente?
Ve a **Clientes** → abre la consulta del cliente interesado → pulsa **Crear pre-reserva** → rellena fechas, unidad, personas y tarifa → pulsa **Enviar presupuesto por email**. El cliente recibirá el presupuesto con un botón para confirmar la reserva directamente en el motor de reservas con los datos ya prellenados.

#### ¿Puedo registrar los datos del DNI de todos los huéspedes?
Sí. En el detalle de la reserva, sección **Huéspedes adicionales**, puedes registrar nombre, DNI/pasaporte, nacionalidad, fecha de nacimiento y sexo de cada ocupante (necesario para el parte de viajeros de la Guardia Civil o Policía Nacional).

---

### RESERVAS — PAGOS

#### ¿Cómo registro un pago recibido por transferencia bancaria?
Ve al **detalle de la reserva** → pulsa **Registrar pago manual** → selecciona el método *Transferencia bancaria* → indica el importe y la fecha en que lo recibiste → pulsa **Guardar**.

#### ¿Cómo registro un pago recibido en efectivo?
Ve al **detalle de la reserva** → pulsa **Registrar pago manual** → selecciona el método *Efectivo* → indica el importe y la fecha → pulsa **Guardar**.

#### ¿Cómo envío un link de pago por Stripe al cliente?
Ve al **detalle de la reserva** → pulsa **Solicitar pago** → elige si cobras solo la señal o el total pendiente → pulsa **Enviar por email**. El cliente recibe un email con el enlace de pago seguro de Stripe.

#### ¿Puedo enviar el link de pago solo por la señal?
Sí. Al pulsar **Solicitar pago** puedes elegir entre cobrar la señal (porcentaje configurado) o el total pendiente.

#### ¿Qué significa el estado de pago de una reserva?
- **Sin pagar**: no se ha registrado ningún cobro.
- **Señal abonada / Parcial**: se ha cobrado parte del importe (la señal o un pago parcial).
- **Pagada**: el importe total está cubierto.
- **Reembolsada**: se ha procesado una devolución.

#### ¿Cómo veo el historial de pagos de una reserva?
En el **detalle de la reserva**, sección *Historial de pagos*, aparecen todos los cobros realizados con su fecha, importe y método.

#### ¿Cuánto cobra Stripe de comisión?
Stripe cobra aproximadamente un 1,5% + 0,25 € por transacción (tarifa Europa estándar). En la pantalla de **Ingresos** puedes ver la estimación de comisiones del período.

#### ¿Cómo configuro el porcentaje de señal que paga el cliente al reservar?
Ve a **Configuración → Pagos** → ajusta el campo *Porcentaje de señal* (por ejemplo, 30% o 50%) → pulsa **Guardar cambios**.

#### ¿Cómo hago que el cliente pague el 100% al reservar?
Ve a **Configuración → Pagos** → selecciona la modalidad *Pago completo* → pulsa **Guardar cambios**. A partir de ese momento el motor de reservas exigirá el importe total en el momento de la reserva.

#### ¿Cómo configuro Stripe por primera vez?
Ve a **Configuración → Pagos** → introduce tu **clave pública** (`pk_live_…`) y tu **clave secreta** (`sk_live_…`) de Stripe → pulsa **Guardar cambios**. Puedes obtener las claves en [dashboard.stripe.com](https://dashboard.stripe.com) → Desarrolladores → Claves de API.

---

### FACTURAS

#### ¿Cómo emito una factura?
Ve al **detalle de la reserva** → pulsa **Emitir factura** → revisa el concepto, base imponible, IVA y datos del cliente → pulsa **Generar factura**. La factura quedará registrada y disponible en la sección **Facturas**.

#### ¿Cómo descargo el PDF de una factura?
Ve a **Facturas** en el menú lateral → busca la factura → pulsa el icono de descarga (PDF).

#### ¿Cómo envío una factura por email al cliente?
Ve a **Facturas** → abre la factura → pulsa **Enviar por email**. El cliente recibirá el PDF adjunto.

#### ¿Puedo editar una factura una vez emitida?
No. Por cumplimiento de la normativa VeriFactu, las facturas quedan **bloqueadas** en el momento de su emisión y no pueden modificarse. Si hay un error debes emitir una **factura rectificativa**.

#### ¿Qué es una factura rectificativa y cuándo la necesito?
Una factura rectificativa corrige una factura ya emitida. La necesitas cuando el importe es incorrecto, los datos del cliente tienen errores (nombre, NIF, dirección) o hay algún error en el concepto. La rectificativa anula la original y genera una nueva.

#### ¿Cómo emito una factura rectificativa?
Ve a **Facturas** → abre la factura original → pulsa **Emitir rectificativa** → indica el motivo de la corrección → pulsa **Generar rectificativa**. La nueva factura quedará vinculada a la original.

#### ¿Qué es VeriFactu?
VeriFactu es el sistema de facturación verificable exigido por la Agencia Tributaria española. Garantiza la integridad de las facturas mediante un código hash y su envío a la AEAT. Todas las facturas emitidas en StayNex cumplen automáticamente con este estándar.

#### ¿Cómo envío las facturas a la AEAT?
Ve a **Facturas** → busca las facturas con estado AEAT *Preparada* → pulsa el botón de envío a AEAT → confirma. El estado pasará a *Enviada* si el envío es correcto.

#### ¿Qué IVA aplica a los alojamientos rurales?
En España, el alojamiento turístico tributa al **10% de IVA** (tipo reducido). Si tienes dudas sobre tu caso concreto consulta con tu asesor fiscal.

#### ¿Dónde configuro los datos fiscales que aparecen en las facturas?
Ve a **Configuración → Legal** → rellena la **razón social** y el **NIF/CIF** → pulsa **Guardar cambios**. Esos datos se usarán en todas las facturas futuras.

#### ¿Puedo emitir facturas de contratos de alquiler (mensualidades)?
Sí. Desde el detalle del contrato, al registrar un pago de mensualidad, puedes emitir la factura correspondiente con los datos del inquilino.

#### ¿Qué hago si una factura tiene el estado AEAT "Error"?
Revisa que tus datos fiscales en **Configuración → Legal** son correctos (NIF, razón social) y que la factura tiene todos los campos necesarios. Corrige los datos e intenta el envío de nuevo. Si el error persiste, contacta con soporte.

---

### LIMPIEZA

#### ¿Cómo creo una tarea de limpieza?
Ve a **Limpieza** → pulsa **+ Nueva tarea** → selecciona la unidad, la fecha, la hora de inicio y el tipo (corta o larga estancia) → asigna prioridad y personal → pulsa **Crear tarea**.

#### ¿Cómo añado una limpieza a un contrato de alquiler?
Ve a **Limpieza** → pulsa **+ Nueva tarea** → selecciona la unidad del contrato, la fecha y hora → en *Tipo* elige *Media/Larga estancia* → asigna al personal o empresa → pulsa **Crear tarea**. Alternativamente usa **Generar jobs** para crear todas las limpiezas periódicas automáticamente según la programación del contrato.

#### ¿Cómo asigno una tarea de limpieza a una persona concreta?
Al crear la tarea (o editándola) → en el campo *Asignar a* selecciona *Personal propio* y elige el nombre de la lista. Si la persona no aparece, primero debes darla de alta en **Configuración → Limpieza**.

#### ¿Cómo asigno una tarea a una empresa de limpieza externa?
Al crear la tarea → en *Asignar a* selecciona *Empresa de limpieza* → elige la empresa de la lista. Si no aparece, ve primero a **Configuración → Limpieza → Empresas** y añádela.

#### ¿Cómo cambio el estado de una tarea de limpieza?
En la lista de tareas (en el panel de Limpieza) aparece a la derecha de cada tarea un botón de acción rápida: **Iniciar**, **Completar** o **Reprogramar**. Pulsa el botón correspondiente para avanzar al siguiente estado.

#### ¿Qué significa que una limpieza sea "Urgente"?
Significa que hay un check-out y un check-in el mismo día en esa unidad. La limpieza debe completarse entre la salida de un huésped y la llegada del siguiente. El sistema lo detecta automáticamente y lo marca como Urgente con alerta roja.

#### ¿Qué hago cuando aparece una alerta roja de limpieza urgente?
Esa alerta indica que hay una unidad con salida y entrada el mismo día. Debes asegurarte de que la limpieza esté asignada y se complete antes de la hora de check-in prevista. La hora de llegada del siguiente huésped aparece en el detalle de la alerta.

#### ¿Cómo añado personal de limpieza propio?
Ve a **Configuración → Limpieza → Personal propio** → pulsa **+ Añadir persona** → rellena nombre, teléfono y email → pulsa **Guardar**.

#### ¿Cómo añado una empresa de limpieza externa?
Ve a **Configuración → Limpieza → Empresas de limpieza** → pulsa **+ Añadir empresa** → rellena nombre, persona de contacto, teléfono, email y notas → pulsa **Guardar**.

#### ¿Cómo edito o desactivo a un empleado de limpieza?
Ve a **Configuración → Limpieza** → en la lista busca a la persona → pulsa el icono de edición (lápiz) para modificar sus datos o el icono de desactivar para que no aparezca en las asignaciones sin eliminarla del historial.

#### ¿Qué son las "programaciones activas" en Limpieza?
Son reglas de limpieza periódica vinculadas a contratos de larga estancia. Indican qué unidad debe limpiarse, con qué frecuencia (semanal, quincenal, mensual), en qué días y entre qué fechas. Cuando pulsas **Generar jobs** el sistema crea automáticamente las tareas de limpieza según esas reglas.

#### ¿Por qué no se generan limpiezas automáticamente con "Generar jobs"?
Los jobs automáticos solo se generan para contratos en estado **Aprobado, Activo o Renovado**. Si el contrato está en *Solicitud* o *En revisión*, no se generarán. Verifica el estado del contrato en la sección **Contratos**.

#### ¿Cómo veo las limpiezas de la semana?
En el panel de **Limpieza**, sección *Próximos 7 días*, aparece la tabla con todas las tareas programadas para los próximos días con su fecha, unidad y estado.

---

### CONTRATOS DE ALQUILER

#### ¿Cómo creo un nuevo contrato de alquiler?
Ve a **Contratos** → pulsa **+ Nuevo contrato** → rellena los datos del inquilino (nombre, email, teléfono, DNI), selecciona la unidad, las fechas y el importe mensual → introduce el importe de la fianza → pulsa **Crear contrato**.

#### ¿Cuál es el ciclo de vida de un contrato?
Solicitud → En revisión → Aprobado → Activo → (opcionalmente Renovado) → Finalizado. En cualquier momento se puede pasar a Cancelado.

#### ¿Cómo cambio el estado de un contrato?
En el **detalle del contrato** hay un selector o botones de acción para cambiar el estado. Por ejemplo, pasar de *Aprobado* a *Activo* cuando el inquilino entra a vivir.

#### ¿Cómo registro el pago de una mensualidad?
Ve a **Contratos** → abre el contrato → sección **Pagos** → haz clic en la mensualidad pendiente → indica el método de pago y la fecha → pulsa **Registrar pago**.

#### ¿Cómo veo qué mensualidades están pendientes de cobro?
En el **detalle del contrato**, sección *Pagos*, las mensualidades aparecen con colores: pendiente (sin cobrar), pagada (cobrada), vencida (fecha pasada sin cobrar). También puedes verlo en **Ingresos → Ingresos previstos**.

#### ¿Qué hago cuando vence una mensualidad sin pagar?
El sistema la marca automáticamente como *Vencida*. Contacta con el inquilino para gestionar el cobro y cuando lo recibas regístralo como pago manual indicando la fecha real de cobro.

#### ¿Cómo gestiono la fianza de un contrato?
En el **detalle del contrato**, sección **Fianza**, puedes ver el importe y estado actual. Cuando finalice el contrato y quieras devolver la fianza, cambia el estado a *Pdte. devolución* y cuando la transacción se complete a *Devuelta* (o *Devuelta parcial* si hay descuentos por daños, con indicación del motivo).

#### ¿Cómo subo los documentos del inquilino?
En el **detalle del contrato**, sección **Documentos** → pulsa **+ Subir documento** → selecciona el tipo (DNI, nómina, contrato laboral, renta…) → carga el archivo. El documento quedará con estado *Pendiente*.

#### ¿Cómo valido la documentación del inquilino?
En el **detalle del contrato**, sección *Documentos* → haz clic sobre el documento → pulsa **Validar** (o **Rechazar** si no es correcto, añadiendo un motivo). El estado del documento cambiará a *Validado* o *Rechazado*.

#### ¿Qué documentos debo pedir al inquilino?
Normalmente: DNI o NIE, últimas nóminas (3 meses), contrato de trabajo o justificante de ingresos, última declaración de la renta (si aplica). Puedes subir cualquier otro documento relevante en la categoría *Otros*.

#### ¿Cómo renuevo un contrato que está a punto de finalizar?
Abre el **detalle del contrato** → pulsa **Renovar contrato** → indica la nueva fecha de fin y el nuevo importe mensual si ha cambiado → pulsa **Confirmar renovación**. El estado pasa a *Renovado* y se genera la nueva serie de mensualidades.

#### ¿Cómo registro una incidencia o avería en una unidad alquilada?
En el **detalle del contrato**, sección **Incidencias** → pulsa **+ Nueva incidencia** → describe el problema, la fecha y el estado inicial (Abierta) → guarda. Cuando se resuelva actualiza el estado a *Resuelta* con las notas de la reparación.

#### ¿Cómo cancelo un contrato?
En el **detalle del contrato** cambia el estado a **Cancelado**. Recuerda gestionar antes la devolución de la fianza si corresponde y registrar los pagos pendientes que ya hayas cobrado.

#### ¿Cómo veo los contratos que vencen próximamente?
En la pantalla **Contratos**, el listado muestra la fecha de fin de cada contrato. Ordena por fecha de fin o usa los filtros para ver solo los contratos activos cuya fecha se acerque.

---

### CLIENTES Y CONSULTAS

#### ¿Cómo veo las consultas que han enviado mis clientes?
Ve a **Clientes** en el menú lateral. Aparece el listado de todas las consultas recibidas ordenadas por fecha.

#### ¿Cómo respondo a una consulta?
Haz clic en la consulta → pulsa **Responder** → escribe tu mensaje (o elige una plantilla) → pulsa **Enviar**. El cliente recibirá tu respuesta por email y la consulta pasará a estado *Respondida*.

#### ¿Cómo archivo una consulta que ya no tiene interés?
Abre la consulta → pulsa **Archivar**. La consulta no se elimina, simplemente se mueve a la pestaña *Archivadas* para no saturar la bandeja de entrada.

#### ¿Cómo convierto una consulta en reserva?
Abre la consulta → pulsa **Crear pre-reserva** → rellena los datos: fechas, unidad, número de personas y tarifa → pulsa **Enviar presupuesto**. El cliente recibe un email con los detalles y un botón para confirmar la reserva directamente.

#### ¿Qué diferencia hay entre una consulta y una reserva?
Una **consulta** es un mensaje de un cliente que pide información sin compromiso. Una **reserva** implica fechas concretas, pago (parcial o total) y alojamiento asignado. Puedes convertir una consulta en reserva cuando el cliente confirme su interés.

#### ¿Puedo ver el historial de comunicaciones con un cliente?
Sí. Dentro de cada consulta aparece el **timeline de comunicaciones**: todos los mensajes enviados y recibidos con ese cliente, ordenados cronológicamente.

---

### INGRESOS

#### ¿Cómo veo los ingresos del mes actual?
Ve a **Ingresos** en el menú lateral. Por defecto muestra el mes actual. El resumen superior indica el total facturado, pagado, pendiente y las comisiones estimadas de Stripe.

#### ¿Cómo veo los ingresos de un mes anterior?
En la pantalla de **Ingresos** usa el selector de mes/año en la parte superior para elegir el período que quieres consultar.

#### ¿Cómo veo los ingresos anuales?
En el **Dashboard**, el KPI *Ingresos anuales* muestra el acumulado desde enero hasta el mes seleccionado. En la pantalla de Ingresos también puedes navegar mes a mes y sumarlos.

#### ¿Cómo veo los ingresos previstos de mis contratos de alquiler?
Ve a **Ingresos** → pulsa el botón **Ingresos previstos** → se abre una pantalla con la proyección de mensualidades de todos los contratos activos: verás en verde las ya registradas y en gris las pendientes de crear. Pulsa **Crear recibo** para registrar una mensualidad pendiente.

#### ¿Cómo sé cuánto me ha cobrado Stripe?
En la pantalla de **Ingresos** aparece la estimación de comisiones de Stripe del período. Para ver el detalle exacto entra en tu cuenta de [dashboard.stripe.com](https://dashboard.stripe.com).

#### ¿Cómo filtro los ingresos por plataforma (Booking, Airbnb, web directa)?
En la pantalla de **Ingresos** usa los filtros disponibles para seleccionar el origen de la reserva (web directa, Booking, Airbnb, Escapada Rural…).

#### ¿Cómo exporto los datos de ingresos?
En la pantalla de **Ingresos** pulsa el botón **Descargar PDF** para exportar el listado del período seleccionado.

---

### UNIDADES (ALOJAMIENTOS)

#### ¿Cómo añado un nuevo alojamiento?
Ve a **Unidades** (en el menú lateral, dentro de Configuración) → pulsa **+ Nueva unidad** → rellena nombre, tipo (Casa Rural, Apartamento o Habitación), modo de operación, capacidad, habitaciones y baños → pulsa **Guardar**.

#### ¿Cómo cambio el precio por noche de un alojamiento?
Ve a **Unidades** → abre la unidad → sección **Precios** → modifica el campo *Precio por noche* → pulsa **Guardar cambios**.

#### ¿Cómo pongo un precio diferente en temporada alta?
Ve a **Unidades** → abre la unidad → sección **Períodos especiales** → pulsa **+ Añadir período** → indica las fechas de inicio y fin del período especial y el precio por noche para esas fechas → pulsa **Guardar**. Este precio tendrá prioridad sobre el precio base en esas fechas.

#### ¿Cómo configuro los gastos de limpieza que se añaden a cada reserva?
Ve a **Unidades** → abre la unidad → sección **Precios** → campo *Gastos de limpieza* → introduce el importe fijo → pulsa **Guardar**.

#### ¿Cómo establezco un mínimo de noches para reservar?
Ve a **Unidades** → abre la unidad → sección **Precios** → campo *Mínimo de noches* → introduce el número → pulsa **Guardar**.

#### ¿Cómo añado fotos a un alojamiento?
Ve a **Unidades** → abre la unidad → sección **Fotos** → pulsa **+ Subir fotos** → selecciona las imágenes desde tu ordenador → espera a que se suban. Puedes arrastrar las fotos para cambiar su orden.

#### ¿Cómo cambio la foto de portada de un alojamiento?
En la sección **Fotos** de la unidad, haz clic en el icono de estrella (⭐) de la foto que quieres como portada. Esa foto será la primera que vean los clientes en el listado de alojamientos.

#### ¿Cómo elimino una foto?
En la sección **Fotos** de la unidad, haz clic en la **X** que aparece sobre la foto que quieres eliminar.

#### ¿Cómo desactivo un alojamiento temporalmente?
Ve a **Unidades** → en el listado busca la unidad → usa el **toggle** (interruptor) junto a su nombre para desactivarla. Una unidad desactivada no aparece en el motor de reservas público ni puede recibir nuevas reservas.

#### ¿Qué diferencia hay entre modo "Corta estancia" y "Larga estancia"?
- **Corta estancia**: la unidad aparece en el motor de reservas online para reservas turísticas de días o semanas.
- **Larga estancia**: la unidad está orientada a contratos de alquiler de meses. Aparece en el formulario de solicitud de alquiler de la web pública, no en el motor de reservas turísticas.

#### ¿Cómo edito la descripción de un alojamiento?
Ve a **Unidades** → abre la unidad → sección **Descripción** → edita la descripción corta (para el listado) y la descripción larga (para el detalle) → pulsa **Guardar**.

#### ¿Cómo añado amenities o servicios de una unidad?
Ve a **Unidades** → abre la unidad → sección **Extras y amenities** → escribe o selecciona los servicios disponibles (WiFi, parking, piscina, cocina equipada, etc.) → pulsa **Guardar**.

---

### CONFIGURACIÓN

#### ¿Cómo actualizo la dirección y datos de contacto del alojamiento?
Ve a **Configuración → General** → modifica los campos de dirección, teléfono y email → pulsa **Guardar cambios**.

#### ¿Cómo subo o cambio el logo de mi alojamiento?
Ve a **Configuración → Marca** → en el campo *Logo* pulsa para seleccionar la imagen (PNG o SVG recomendado) → pulsa **Guardar cambios**.

#### ¿Cómo cambio el nombre público de mi web?
Ve a **Configuración → Marca** → modifica el campo *Nombre del sitio* → pulsa **Guardar cambios**.

#### ¿Cómo actualizo la política de cancelación?
Ve a **Configuración → Normas** → edita el texto de la política de cancelación → pulsa **Guardar cambios**. Este texto aparecerá en el motor de reservas para que los clientes lo lean antes de pagar.

#### ¿Cómo configuro los horarios de check-in y check-out?
Ve a **Configuración → Normas** → modifica los campos de hora de check-in y check-out → pulsa **Guardar cambios**.

#### ¿Cómo edito los textos de los emails automáticos?
Ve a **Configuración → Plantillas Email** → selecciona el tipo de email que quieres editar (confirmación, recordatorio, solicitud de pago…) → modifica el texto usando las variables dinámicas disponibles (por ejemplo `{{nombre_cliente}}`) → pulsa **Guardar**.

#### ¿Qué variables puedo usar en los emails automáticos?
Las principales variables disponibles son: `{{nombre_cliente}}`, `{{apellidos_cliente}}`, `{{fecha_entrada}}`, `{{fecha_salida}}`, `{{num_noches}}`, `{{num_huespedes}}`, `{{importe_total}}`, `{{codigo_reserva}}`, `{{nombre_alojamiento}}`, `{{link_reserva}}`. El editor de plantillas muestra las disponibles.

#### ¿Cómo vinculo mi dominio personalizado?
Ve a **Configuración → Dominio y Email** → introduce tu dominio (ej. `tucasarural.com`) → sigue las instrucciones para configurar los registros DNS en tu proveedor de dominio. Una vez verificado el dominio, tu web pública y el panel estarán disponibles en ese dominio.

#### ¿Cómo configuro WhatsApp Business?
Ve a **Configuración → WhatsApp** → introduce el token de API y el número de teléfono de tu cuenta WhatsApp Business → activa las notificaciones que quieras recibir/enviar → pulsa **Guardar**.

#### ¿Dónde configuro los datos fiscales para las facturas?
Ve a **Configuración → Legal** → rellena la **razón social** y el **NIF/CIF** de tu empresa → pulsa **Guardar cambios**. Estos datos aparecerán en todas las facturas emitidas.

---

### SINCRONIZACIÓN ICAL (BOOKING, AIRBNB…)

#### ¿Cómo conecto Booking.com para evitar doble-reservas?
1. Entra en tu cuenta de Booking.com → busca la opción de exportar calendario iCal de tu propiedad → copia la URL.
2. En StayNex ve a **iCal Sync** → pulsa **+ Añadir feed** → pega la URL → selecciona la unidad → ponle nombre → pulsa **Guardar**.

#### ¿Cómo conecto Airbnb para evitar doble-reservas?
1. Entra en tu cuenta de Airbnb → ve a la gestión de tu anuncio → busca la opción *Sincronizar calendarios* o *Exportar calendario* → copia la URL iCal.
2. En StayNex ve a **iCal Sync** → pulsa **+ Añadir feed** → pega la URL → selecciona la unidad → ponle nombre → pulsa **Guardar**.

#### ¿Qué es una URL iCal?
Es un enlace especial que genera Booking, Airbnb u otras plataformas para exportar tu calendario de disponibilidad en formato estándar. Es la forma en que StayNex lee los bloqueos de esas plataformas.

#### ¿Cómo sincronizo manualmente los feeds iCal?
Ve a **iCal Sync** → pulsa **Sincronizar todos** para actualizar todos los feeds, o pulsa el icono de refresh individual junto a un feed concreto.

#### ¿Con qué frecuencia se sincronizan los feeds automáticamente?
El sistema sincroniza periódicamente de forma automática. Si necesitas que los cambios se reflejen de inmediato puedes forzar la sincronización manual en cualquier momento.

#### ¿Por qué un feed iCal aparece en rojo o con error?
Puede que la URL del calendario haya caducado o cambiado en la plataforma de origen. Entra en Booking o Airbnb, genera una nueva URL iCal y actualiza el feed en StayNex con la nueva dirección.

#### ¿Cómo elimino un feed iCal que ya no necesito?
Ve a **iCal Sync** → junto al feed que quieres eliminar pulsa el icono de papelera → confirma la eliminación. Los bloqueos ya importados permanecen en el calendario hasta que se eliminen manualmente.

#### ¿Cómo reconozco en el calendario los bloqueos importados de Booking o Airbnb?
Aparecen en **color verde** con la etiqueta *Bloqueo Booking* o *Bloqueo Airbnb*. Al pasar el ratón sobre el bloque aparece el tooltip con el origen.

---

### PORTAL PÚBLICO Y MOTOR DE RESERVAS

#### ¿Cómo reserva un cliente desde mi web?
El cliente accede a tu web pública → va a la sección *Reservar* → introduce fechas y número de personas → el sistema muestra los alojamientos disponibles con precio → el cliente elige uno y paga con tarjeta a través de Stripe en 3 pasos.

#### ¿El cliente necesita crear una cuenta para reservar?
No. El proceso de reserva es completamente anónimo, solo necesita su nombre, email y tarjeta de pago. Tras la reserva recibe un link único para consultar su reserva en cualquier momento.

#### ¿Cómo ve un cliente su reserva después de hacerla?
Recibe un email de confirmación con un enlace directo a su reserva. Ese enlace es único para él y no requiere contraseña. Puedes también copiar ese enlace desde el panel (detalle de la reserva → campo *Link del cliente*) y enviárselo por WhatsApp u otro canal.

#### ¿Qué pasa cuando un cliente paga en el motor de reservas?
Stripe procesa el pago de forma segura. El dinero se ingresa en tu cuenta de Stripe. En StayNex la reserva pasa automáticamente a estado *Confirmada* y tanto tú como el cliente recibís un email de confirmación.

#### ¿Cómo envío a un cliente un enlace directo a las fechas que me ha pedido?
Cuando un cliente te pregunta por disponibilidad para fechas concretas, crea una **pre-reserva** desde la consulta (sección *Clientes*) y envía el presupuesto. El enlace que recibe el cliente abre el motor de reservas con esas fechas y el número de personas ya rellenados.

#### ¿Los clientes pueden cancelar su reserva desde la web?
Depende de la tarifa elegida. Si reservaron con tarifa *Flexible*, el cliente puede solicitar la cancelación. Si eligieron tarifa *No reembolsable*, no tienen derecho a devolución según la política configurada.

#### ¿Cómo aparece mi alojamiento en la web pública?
El portal web muestra las unidades con foto de portada, descripción corta, capacidad y precio desde. Para mejorar la presentación edita las descripciones y sube fotos de calidad en la sección **Unidades**.

---

*Guía de usuario StayNex v1.0 — Para soporte técnico contacta con el equipo en soporte@staynexapp.com*
