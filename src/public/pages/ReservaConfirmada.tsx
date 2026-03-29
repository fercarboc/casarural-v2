// src/public/pages/ReservaConfirmada.tsx
// Página que se muestra tras el pago exitoso en Stripe
// Lee el session_id de la URL, busca la reserva en Supabase y muestra el resumen

import React, { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { supabase, isMockMode } from '../../integrations/supabase/client'
// Nota: la reserva se carga vía Edge Function, sin query directa a la DB

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Reserva {
  id: string
  codigo: string
  nombre: string
  apellidos: string
  email: string
  telefono: string
  fecha_entrada: string
  fecha_salida: string
  num_huespedes: number
  noches: number
  temporada: 'ALTA' | 'BASE'
  tarifa: 'FLEXIBLE' | 'NO_REEMBOLSABLE'
  precio_noche: number
  importe_alojamiento: number
  importe_extra: number
  importe_limpieza: number
  descuento: number
  total: number
  importe_senal: number | null
  importe_pagado: number
  estado: string
  estado_pago: string
  stripe_session_id: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatEur(amount: number) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

function calcNights(entrada: string, salida: string) {
  return Math.round(
    (new Date(salida).getTime() - new Date(entrada).getTime()) / (1000 * 60 * 60 * 24)
  )
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function ReservaConfirmada() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')

  const [reserva, setReserva] = useState<Reserva | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) {
      setError('No se encontró el identificador de sesión.')
      setLoading(false)
      return
    }

    if (isMockMode) {
      setError('La conexión con el servidor no está configurada. Contacta con el alojamiento.')
      setLoading(false)
      return
    }

    // Stripe redirige al cliente al mismo tiempo que dispara el webhook.
    // El webhook puede tardar unos segundos en escribir stripe_session_id en la DB.
    // Reintentamos hasta 6 veces (cada 2 s = 12 s máximo) antes de mostrar error.
    async function fetchReservaConRetry() {
      const MAX = 6
      for (let intento = 1; intento <= MAX; intento++) {
        try {
          const { data, error: fnError } = await supabase.functions.invoke(
            'get-reservation',
            { body: { sessionId } }
          )

          if (fnError) {
            // 404 = webhook aún no ha procesado, reintentar
            const status = (fnError as any)?.context?.status ?? 0
            if (status === 404 && intento < MAX) {
              await new Promise(r => setTimeout(r, 2000))
              continue
            }
            console.error('[ReservaConfirmada] Error función:', fnError)
            setError('Error al cargar la reserva. Por favor recarga la página.')
            setLoading(false)
            return
          }

          if (data?.reserva) {
            setReserva(data.reserva)
            setLoading(false)
            return
          }

          // Sin datos y sin error explícito — reintentar si quedan intentos
          if (intento < MAX) {
            await new Promise(r => setTimeout(r, 2000))
          }

        } catch (e: any) {
          console.error('[ReservaConfirmada] Error inesperado:', e)
          setError('Error al conectar con el servidor. Por favor recarga la página.')
          setLoading(false)
          return
        }
      }

      // Agotados los reintentos
      setError('Tu pago ha sido procesado correctamente. Si esta página no carga, revisa el email de confirmación que te hemos enviado.')
      setLoading(false)
    }

    fetchReservaConRetry()
  }, [sessionId])

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={styles.fullPage}>
        <div style={styles.loadingSpinner} />
        <p style={styles.loadingText}>Cargando tu reserva…</p>
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error || !reserva) {
    return (
      <div style={styles.fullPage}>
        <div style={styles.errorIcon}>!</div>
        <h2 style={styles.errorTitle}>Reserva no encontrada</h2>
        <p style={styles.errorSubtitle}>{error ?? 'Enlace caducado o incorrecto.'}</p>
        <Link to="/" style={styles.backLink}>← Volver al inicio</Link>
      </div>
    )
  }

  const noches = calcNights(reserva.fecha_entrada, reserva.fecha_salida)
  const isFlexible = reserva.tarifa === 'FLEXIBLE'
  const restoPendiente = isFlexible && reserva.importe_senal
    ? reserva.total - reserva.importe_senal
    : 0

  // ── Página de confirmación ─────────────────────────────────────────────────
  return (
    <>
      {/* Fuentes */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Jost:wght@300;400;500&display=swap');

        :root {
          --verde:    #2D4A3E;
          --crema:    #F5F0E8;
          --dorado:   #C4A882;
          --texto:    #1C2B25;
          --suave:    #8B9E98;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { transform: scale(0.8); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .confirmed-page * { box-sizing: border-box; margin: 0; padding: 0; }
        .confirmed-page { font-family: 'Jost', sans-serif; background: var(--crema); min-height: 100vh; }

        .check-circle {
          animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        .card-1 { animation: fadeUp 0.5s 0.1s both; }
        .card-2 { animation: fadeUp 0.5s 0.2s both; }
        .card-3 { animation: fadeUp 0.5s 0.3s both; }
        .card-4 { animation: fadeUp 0.5s 0.4s both; }

        .btn-home:hover {
          background: var(--verde) !important;
          color: var(--crema) !important;
        }
        .btn-print:hover {
          background: var(--dorado) !important;
          color: white !important;
        }

        @media print {
          .no-print { display: none !important; }
          .confirmed-page { background: white; }
        }
      `}</style>

      <div className="confirmed-page">

        {/* ── Header minimalista ── */}
        <header style={styles.header}>
          <Link to="/" style={styles.logo}>La Rasilla</Link>
        </header>

        <main style={styles.main}>

          {/* ── Icono de éxito + título ── */}
          <div style={styles.heroSection} className="card-1">
            <div className="check-circle" style={styles.checkCircle}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 style={styles.title}>¡Reserva confirmada!</h1>
            <p style={styles.subtitle}>
              Hemos recibido tu pago. Te hemos enviado un email de confirmación a{' '}
              <strong style={{ color: 'var(--verde)' }}>{reserva.email}</strong>
            </p>
            <div style={styles.codigoBadge}>
              <span style={styles.codigoLabel}>Código de reserva</span>
              <span style={styles.codigoValue}>{reserva.codigo}</span>
            </div>
          </div>

          <div style={styles.grid}>

            {/* ── Fechas y detalle de estancia ── */}
            <section style={styles.card} className="card-2">
              <h2 style={styles.cardTitle}>Tu estancia</h2>

              <div style={styles.fechasRow}>
                <div style={styles.fechaBlock}>
                  <span style={styles.fechaLabel}>Llegada</span>
                  <span style={styles.fechaDia}>
                    {new Date(reserva.fecha_entrada).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).toUpperCase()}
                  </span>
                  <span style={styles.fechaDetalle}>{formatDate(reserva.fecha_entrada)}</span>
                  <span style={styles.horario}>Check-in: 16:00 h</span>
                </div>

                <div style={styles.nochesConnector}>
                  <div style={styles.nochesLine} />
                  <div style={styles.nochesBadge}>
                    {noches} {noches === 1 ? 'noche' : 'noches'}
                  </div>
                  <div style={styles.nochesLine} />
                </div>

                <div style={{ ...styles.fechaBlock, textAlign: 'right' as const }}>
                  <span style={styles.fechaLabel}>Salida</span>
                  <span style={styles.fechaDia}>
                    {new Date(reserva.fecha_salida).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).toUpperCase()}
                  </span>
                  <span style={styles.fechaDetalle}>{formatDate(reserva.fecha_salida)}</span>
                  <span style={styles.horario}>Check-out: 12:00 h</span>
                </div>
              </div>

              <div style={styles.divider} />

              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Huéspedes</span>
                <span style={styles.infoValue}>{reserva.num_huespedes} personas</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Temporada</span>
                <span style={styles.infoValue}>
                  {reserva.temporada === 'ALTA' ? '🌿 Temporada Alta' : '🍂 Temporada Base'}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Tarifa</span>
                <span style={{
                  ...styles.infoValue,
                  color: isFlexible ? '#2D7D5A' : '#8B4513',
                  fontWeight: 500,
                }}>
                  {isFlexible ? '✓ Flexible' : '⚡ No reembolsable'}
                </span>
              </div>
            </section>

            {/* ── Desglose económico ── */}
            <section style={styles.card} className="card-3">
              <h2 style={styles.cardTitle}>Resumen de pago</h2>

              <div style={styles.precioRow}>
                <span style={styles.precioLabel}>
                  Alojamiento ({noches} noche{noches > 1 ? 's' : ''} × {formatEur(reserva.precio_noche)})
                </span>
                <span style={styles.precioValue}>{formatEur(reserva.importe_alojamiento)}</span>
              </div>

              {reserva.importe_extra > 0 && (
                <div style={styles.precioRow}>
                  <span style={styles.precioLabel}>Suplemento huésped extra</span>
                  <span style={styles.precioValue}>{formatEur(reserva.importe_extra)}</span>
                </div>
              )}

              <div style={styles.precioRow}>
                <span style={styles.precioLabel}>Tarifa de limpieza</span>
                <span style={styles.precioValue}>{formatEur(reserva.importe_limpieza)}</span>
              </div>

              {reserva.descuento > 0 && (
                <div style={styles.precioRow}>
                  <span style={{ ...styles.precioLabel, color: '#2D7D5A' }}>
                    Descuento no reembolsable (−10%)
                  </span>
                  <span style={{ ...styles.precioValue, color: '#2D7D5A' }}>
                    −{formatEur(reserva.descuento)}
                  </span>
                </div>
              )}

              <div style={styles.totalRow}>
                <span style={styles.totalLabel}>Total reserva</span>
                <span style={styles.totalValue}>{formatEur(reserva.total)}</span>
              </div>

              <div style={styles.divider} />

              {/* Estado de pago */}
              {isFlexible && reserva.importe_senal ? (
                <>
                  <div style={styles.pagoEstadoRow}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={styles.dotPagado} />
                      <span style={styles.pagoLabel}>Señal pagada ahora</span>
                    </div>
                    <span style={{ ...styles.pagoImporte, color: '#2D7D5A' }}>
                      {formatEur(reserva.importe_senal)}
                    </span>
                  </div>
                  <div style={styles.pagoEstadoRow}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={styles.dotPendiente} />
                      <span style={styles.pagoLabel}>Resto pendiente</span>
                    </div>
                    <span style={{ ...styles.pagoImporte, color: 'var(--dorado)' }}>
                      {formatEur(restoPendiente)}
                    </span>
                  </div>
                  <p style={styles.aviso}>
                    El resto se abonará 30 días antes de tu llegada. Recibirás un email con las instrucciones.
                  </p>
                </>
              ) : (
                <div style={styles.pagoEstadoRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={styles.dotPagado} />
                    <span style={styles.pagoLabel}>Pago total completado</span>
                  </div>
                  <span style={{ ...styles.pagoImporte, color: '#2D7D5A' }}>
                    {formatEur(reserva.total)}
                  </span>
                </div>
              )}
            </section>

            {/* ── Datos del titular ── */}
            <section style={styles.card} className="card-3">
              <h2 style={styles.cardTitle}>Titular de la reserva</h2>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Nombre</span>
                <span style={styles.infoValue}>{reserva.nombre} {reserva.apellidos}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Email</span>
                <span style={styles.infoValue}>{reserva.email}</span>
              </div>
              {reserva.telefono && (
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Teléfono</span>
                  <span style={styles.infoValue}>{reserva.telefono}</span>
                </div>
              )}
            </section>

            {/* ── Información útil ── */}
            <section style={{ ...styles.card, background: 'var(--verde)', color: 'var(--crema)' }} className="card-4">
              <h2 style={{ ...styles.cardTitle, color: 'var(--dorado)' }}>Información de llegada</h2>

              <div style={styles.infoRow}>
                <span style={{ ...styles.infoLabel, color: 'rgba(245,240,232,0.6)' }}>Dirección</span>
                <span style={{ ...styles.infoValue, color: 'var(--crema)' }}>
                  C/ Las Varas, s/n · 39699 · Castillo Pedroso · Cantabria
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={{ ...styles.infoLabel, color: 'rgba(245,240,232,0.6)' }}>Check-in</span>
                <span style={{ ...styles.infoValue, color: 'var(--crema)' }}>A partir de las 16:00 h</span>
              </div>
              <div style={styles.infoRow}>
                <span style={{ ...styles.infoLabel, color: 'rgba(245,240,232,0.6)' }}>Check-out</span>
                <span style={{ ...styles.infoValue, color: 'var(--crema)' }}>Antes de las 12:00 h</span>
              </div>

              <div style={styles.divider2} />

              <p style={{ fontSize: 13, color: 'rgba(245,240,232,0.7)', lineHeight: 1.7 }}>
                Estaremos esperándote a tu llegada para entregarte las llaves en persona. Unos días antes nos pondremos
                en contacto contigo para saber desde dónde viajas e indicarte el mejor acceso al pueblo.
                Para cualquier duda, escríbenos a{' '}
                <a href="mailto:contacto@casarurallarasilla.com" style={{ color: 'var(--dorado)' }}>
                  contacto@casarurallarasilla.com
                </a>
              </p>

              <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
                <a
                  href="https://wa.me/34690288707"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.contactBtn}
                >
                  WhatsApp
                </a>
                <a href="tel:+34690288707" style={styles.contactBtn}>
                  Llamar
                </a>
              </div>
            </section>

          </div>

          {/* ── Acciones ── */}
          <div style={styles.actions} className="card-4 no-print">
            <Link to="/" className="btn-home" style={styles.btnHome}>
              Volver al inicio
            </Link>
            <button
              onClick={() => window.print()}
              className="btn-print"
              style={styles.btnPrint}
            >
              Imprimir / Guardar PDF
            </button>
          </div>

        </main>
      </div>
    </>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  fullPage: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    fontFamily: "'Jost', sans-serif",
    background: '#F5F0E8',
    color: '#1C2B25',
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: '3px solid #C4A882',
    borderTopColor: '#2D4A3E',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    color: '#8B9E98',
    fontSize: 15,
    fontFamily: "'Jost', sans-serif",
  },
  errorIcon: {
    width: 60,
    height: 60,
    borderRadius: '50%',
    background: '#FFE4E4',
    color: '#CC3333',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28,
    fontWeight: 700,
    lineHeight: 1,
  },
  errorTitle: {
    fontSize: 24,
    fontFamily: "'Cormorant Garamond', serif",
    color: '#1C2B25',
  },
  errorSubtitle: {
    color: '#8B9E98',
    fontSize: 15,
  },
  backLink: {
    color: '#2D4A3E',
    fontSize: 14,
    textDecoration: 'none',
    borderBottom: '1px solid #2D4A3E',
  },
  header: {
    padding: '24px 48px',
    borderBottom: '1px solid rgba(45,74,62,0.1)',
    display: 'flex',
    alignItems: 'center',
  },
  logo: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 22,
    fontWeight: 600,
    color: '#2D4A3E',
    textDecoration: 'none',
    letterSpacing: '0.02em',
  },
  main: {
    maxWidth: 900,
    margin: '0 auto',
    padding: '48px 24px 80px',
  },
  heroSection: {
    textAlign: 'center',
    marginBottom: 48,
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #2D4A3E, #3D6B5A)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
    boxShadow: '0 8px 32px rgba(45,74,62,0.25)',
  },
  title: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 42,
    fontWeight: 600,
    color: '#1C2B25',
    marginBottom: 12,
    lineHeight: 1.15,
  },
  subtitle: {
    fontSize: 15,
    color: '#8B9E98',
    lineHeight: 1.7,
    maxWidth: 480,
    margin: '0 auto 24px',
  },
  codigoBadge: {
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    background: 'white',
    border: '1px solid rgba(45,74,62,0.12)',
    borderRadius: 12,
    padding: '12px 32px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  },
  codigoLabel: {
    fontSize: 10,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#8B9E98',
  },
  codigoValue: {
    fontFamily: "'Jost', sans-serif",
    fontSize: 22,
    fontWeight: 500,
    color: '#2D4A3E',
    letterSpacing: '0.08em',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
    gap: 20,
    marginBottom: 32,
  },
  card: {
    background: 'white',
    borderRadius: 16,
    padding: '28px 32px',
    boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
    border: '1px solid rgba(45,74,62,0.08)',
  },
  cardTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 20,
    fontWeight: 600,
    color: '#1C2B25',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottom: '1px solid rgba(45,74,62,0.08)',
  },
  fechasRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  fechaBlock: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  fechaLabel: {
    fontSize: 10,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#8B9E98',
    marginBottom: 4,
  },
  fechaDia: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 26,
    fontWeight: 600,
    color: '#2D4A3E',
    lineHeight: 1,
  },
  fechaDetalle: {
    fontSize: 12,
    color: '#8B9E98',
    lineHeight: 1.4,
    marginTop: 2,
  },
  horario: {
    fontSize: 11,
    color: '#C4A882',
    fontWeight: 500,
    marginTop: 4,
  },
  nochesConnector: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  nochesLine: {
    width: 1,
    height: 20,
    background: 'rgba(45,74,62,0.15)',
  },
  nochesBadge: {
    background: '#F5F0E8',
    border: '1px solid rgba(196,168,130,0.4)',
    borderRadius: 20,
    padding: '4px 12px',
    fontSize: 11,
    fontWeight: 500,
    color: '#2D4A3E',
    whiteSpace: 'nowrap',
  },
  divider: {
    height: 1,
    background: 'rgba(45,74,62,0.08)',
    margin: '16px 0',
  },
  divider2: {
    height: 1,
    background: 'rgba(245,240,232,0.15)',
    margin: '16px 0',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '7px 0',
    gap: 16,
  },
  infoLabel: {
    fontSize: 12,
    color: '#8B9E98',
    flexShrink: 0,
  },
  infoValue: {
    fontSize: 13,
    color: '#1C2B25',
    fontWeight: 400,
    textAlign: 'right',
  },
  precioRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '6px 0',
    gap: 16,
  },
  precioLabel: {
    fontSize: 13,
    color: '#8B9E98',
    lineHeight: 1.4,
  },
  precioValue: {
    fontSize: 13,
    color: '#1C2B25',
    fontWeight: 400,
    flexShrink: 0,
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0 8px',
    borderTop: '1px solid rgba(45,74,62,0.08)',
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1C2B25',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 600,
    fontFamily: "'Cormorant Garamond', serif",
    color: '#2D4A3E',
  },
  pagoEstadoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0',
  },
  pagoLabel: {
    fontSize: 13,
    color: '#1C2B25',
  },
  pagoImporte: {
    fontSize: 15,
    fontWeight: 600,
  },
  dotPagado: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#2D7D5A',
    flexShrink: 0,
  },
  dotPendiente: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#C4A882',
    flexShrink: 0,
  },
  aviso: {
    fontSize: 12,
    color: '#8B9E98',
    lineHeight: 1.6,
    marginTop: 12,
    padding: '10px 14px',
    background: '#F9F6F0',
    borderRadius: 8,
    borderLeft: '2px solid #C4A882',
  },
  contactBtn: {
    padding: '8px 20px',
    borderRadius: 8,
    border: '1px solid rgba(245,240,232,0.3)',
    color: 'var(--crema)',
    fontSize: 13,
    fontWeight: 500,
    textDecoration: 'none',
    transition: 'background 0.2s',
    fontFamily: "'Jost', sans-serif",
  },
  actions: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
    marginTop: 8,
  },
  btnHome: {
    padding: '12px 32px',
    borderRadius: 10,
    border: '2px solid #2D4A3E',
    color: '#2D4A3E',
    fontSize: 14,
    fontWeight: 500,
    textDecoration: 'none',
    fontFamily: "'Jost', sans-serif",
    transition: 'all 0.2s',
    background: 'transparent',
  },
  btnPrint: {
    padding: '12px 32px',
    borderRadius: 10,
    border: '2px solid #C4A882',
    color: '#C4A882',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: "'Jost', sans-serif",
    transition: 'all 0.2s',
    background: 'transparent',
  },
}