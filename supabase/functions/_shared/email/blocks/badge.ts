import { escapeHtml } from '../utils.ts';

export function renderBadge(label?: string) {
  if (!label) return '';

  return `
    <div style="display:inline-block;margin-bottom:14px;padding:6px 12px;border-radius:999px;background:#1e293b;color:#d4a373;font-size:12px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;">
      ${escapeHtml(label)}
    </div>
  `;
}