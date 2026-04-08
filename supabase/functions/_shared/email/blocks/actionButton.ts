import { escapeHtml } from '../utils.ts';

export function renderActionButton(label?: string, url?: string) {
  if (!label || !url) return '';

  return `
    <div style="margin-top:24px;text-align:center;">
      <a
        href="${url}"
        style="display:inline-block;padding:12px 20px;border-radius:12px;background:#d4a373;color:#111827;text-decoration:none;font-size:14px;font-weight:700;"
      >
        ${escapeHtml(label)}
      </a>
    </div>
  `;
}