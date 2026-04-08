import type { EmailAttachmentInfo } from '../types.ts';
import { escapeHtml } from '../utils.ts';

export function renderAttachmentBlock(attachments?: EmailAttachmentInfo[]) {
  if (!attachments?.length) return '';

  const rows = attachments
    .map((file) => {
      const link = file.url
        ? `<a href="${file.url}" style="color:#d4a373;text-decoration:none;">Descargar</a>`
        : 'Adjunto incluido en el email';

      return `
        <tr>
          <td style="padding:10px 0;color:#e5e7eb;font-size:14px;">
            ${escapeHtml(file.name)}
          </td>
          <td style="padding:10px 0;text-align:right;font-size:13px;">
            ${link}
          </td>
        </tr>
      `;
    })
    .join('');

  return `
    <div style="margin-top:20px;border:1px dashed #334155;border-radius:14px;padding:16px;background:#0f172a;">
      <div style="margin-bottom:10px;font-size:13px;font-weight:700;color:#f8fafc;">Archivos adjuntos</div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        ${rows}
      </table>
    </div>
  `;
}