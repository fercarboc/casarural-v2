/**
 * FacturaPDF — Utilidades de generación y descarga de facturas en PDF.
 * Usa jspdf + html2canvas: renderiza HTML oculto → captura → PDF A4.
 */
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { FacturaDetalle } from '../../services/invoice.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d?: string): string {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function fmtEur(n: number): string {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function line(color = '#e4e4e7'): string {
  return `<hr style="border:none;border-top:1px solid ${color};margin:12px 0;">`;
}

// ─── Generador de HTML ────────────────────────────────────────────────────────

function generarHTMLFactura(f: FacturaDetalle): string {
  const clienteNombre = f.nombre;
  const reservaCodigo = f.reserva_codigo ?? '';
  const entrada       = fmtDate(f.reserva_fecha_entrada);
  const salida        = fmtDate(f.reserva_fecha_salida);
  const noches        = f.reserva_noches ?? 0;
  const huespedes     = f.reserva_num_huespedes ?? 0;

  return `
<div style="
  font-family: Arial, Helvetica, sans-serif;
  font-size: 13px;
  color: #111;
  background: #fff;
  padding: 48px 56px;
  width: 794px;
  box-sizing: border-box;
  line-height: 1.5;
">
  <!-- Cabecera -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;">
    <div>
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;color:#111;letter-spacing:-0.5px;">
        La Rasilla
      </div>
      <div style="font-size:11px;color:#666;margin-top:4px;line-height:1.7;">
        Casa Rural · Valles Pasiegos<br>
        Castillo Pedroso, 39699 Corvera de Toranzo, Cantabria<br>
        contacto@casarurallarasilla.com · +34 690 288 707
      </div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:22px;font-weight:700;color:#111;letter-spacing:2px;text-transform:uppercase;">Factura</div>
      <div style="font-size:16px;font-weight:700;color:#333;margin-top:6px;">${f.numero}</div>
      <div style="font-size:11px;color:#666;margin-top:4px;">
        Fecha: ${fmtDate(f.fecha_emision)}<br>
        ${reservaCodigo ? `Reserva: ${reservaCodigo}` : ''}
      </div>
    </div>
  </div>

  ${line('#111')}

  <!-- Datos del cliente -->
  <div style="margin:20px 0 24px;">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:8px;">
      Facturar a
    </div>
    <div style="font-size:14px;font-weight:700;color:#111;">${clienteNombre}</div>
    ${f.nif        ? `<div style="font-size:12px;color:#555;margin-top:2px;">NIF/DNI: ${f.nif}</div>` : ''}
    ${f.direccion  ? `<div style="font-size:12px;color:#555;margin-top:2px;">${f.direccion}</div>` : ''}
    ${f.reserva_email ? `<div style="font-size:12px;color:#555;margin-top:2px;">${f.reserva_email}</div>` : ''}
  </div>

  ${line()}

  <!-- Concepto / estancia -->
  <div style="margin:20px 0 24px;">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:8px;">
      Concepto
    </div>
    <div style="font-size:13px;font-weight:600;color:#111;">${f.concepto}</div>
    ${f.reserva_fecha_entrada ? `
    <div style="font-size:12px;color:#555;margin-top:4px;">
      Del ${entrada} al ${salida}
      ${noches ? ` · ${noches} noche${noches !== 1 ? 's' : ''}` : ''}
      ${huespedes ? ` · ${huespedes} huésped${huespedes !== 1 ? 'es' : ''}` : ''}
    </div>` : ''}
  </div>

  ${line()}

  <!-- Totales -->
  <div style="margin:20px 0 24px;">
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="padding:6px 0;font-size:13px;color:#555;">Base imponible (sin IVA)</td>
        <td style="padding:6px 0;font-size:13px;text-align:right;color:#333;font-weight:500;">
          ${fmtEur(f.base_imponible)}
        </td>
      </tr>
      <tr>
        <td style="padding:6px 0;font-size:13px;color:#555;">IVA ${f.iva_porcentaje}%</td>
        <td style="padding:6px 0;font-size:13px;text-align:right;color:#333;font-weight:500;">
          ${fmtEur(f.iva_importe)}
        </td>
      </tr>
      <tr>
        <td colspan="2" style="padding:2px 0;">
          <hr style="border:none;border-top:2px solid #111;margin:4px 0;">
        </td>
      </tr>
      <tr style="background:#111;">
        <td style="padding:12px 14px;font-size:15px;font-weight:700;color:#fff;">TOTAL</td>
        <td style="padding:12px 14px;font-size:15px;font-weight:700;text-align:right;color:#fff;">
          ${fmtEur(f.total)}
        </td>
      </tr>
    </table>
  </div>

  ${line()}

  <!-- Pie -->
  <div style="margin-top:20px;font-size:11px;color:#888;line-height:1.6;">
    <strong>Forma de pago:</strong> Tarjeta bancaria (Stripe)
    ${f.reserva_estado_pago === 'PAID' ? ' · <strong>Estado:</strong> Pagado' : ''}
    ${f.reserva_estado_pago === 'PARTIAL' ? ' · <strong>Estado:</strong> Señal pagada' : ''}
  </div>
</div>
  `;
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Genera y descarga automáticamente el PDF de la factura.
 * Nombre del archivo: `{numero}-LaRasilla.pdf`
 */
export async function descargarFacturaPDF(factura: FacturaDetalle): Promise<void> {
  // 1. Crear contenedor oculto fuera del viewport
  const el = document.createElement('div');
  el.style.position = 'fixed';
  el.style.left = '-9999px';
  el.style.top  = '0';
  el.style.width = '794px';
  el.style.background = '#fff';
  el.innerHTML = generarHTMLFactura(factura);
  document.body.appendChild(el);

  try {
    // 2. Capturar con html2canvas a doble resolución
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    // 3. Crear PDF A4
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const imgData  = canvas.toDataURL('image/png');
    const pdfW     = pdf.internal.pageSize.getWidth();   // 210 mm
    const pdfH     = (canvas.height * pdfW) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfW, Math.min(pdfH, 297));
    pdf.save(`${factura.numero}-LaRasilla.pdf`);
  } finally {
    document.body.removeChild(el);
  }
}

/**
 * Abre el diálogo de impresión del navegador con el layout de la factura.
 */
export function imprimirFactura(factura: FacturaDetalle): void {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;

  win.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Factura ${factura.numero} — La Rasilla</title>
      <style>
        @page { margin: 1.5cm 2cm; size: A4; }
        body { margin: 0; padding: 0; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style>
    </head>
    <body>
      ${generarHTMLFactura(factura)}
      <script>
        window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; }
      </script>
    </body>
    </html>
  `);
  win.document.close();
}
