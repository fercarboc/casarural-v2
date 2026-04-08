import type { EmailSummaryItem } from '../types.ts';
import { escapeHtml } from '../utils.ts';

export function renderSummaryCard(items?: EmailSummaryItem[]) {
  if (!items?.length) return '';

  const rows = items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 0;color:#94a3b8;font-size:13px;">${escapeHtml(item.label)}</td>
          <td style="padding:10px 0;color:#f8fafc;font-size:13px;font-weight:600;text-align:right;">${escapeHtml(item.value)}</td>
        </tr>
      `
    )
    .join('');

  return `
    <div style="margin-top:20px;border:1px solid #243041;border-radius:14px;background:#111827;padding:16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        ${rows}
      </table>
    </div>
  `;
}