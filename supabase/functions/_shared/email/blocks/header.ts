import type { EmailBranding } from '../types.ts';
import { escapeHtml } from '../utils.ts';

export function renderHeader(branding: EmailBranding) {
  const logo = branding.logoUrl
    ? `<img src="${branding.logoUrl}" alt="${escapeHtml(branding.brandName)}" style="display:block;max-height:44px;margin:0 auto 12px auto;" />`
    : '';

  return `
    <tr>
      <td style="padding:32px 32px 20px 32px;text-align:center;">
        ${logo}
        <div style="font-size:22px;line-height:30px;font-weight:700;color:${branding.textColor};">
          ${escapeHtml(branding.brandName)}
        </div>
      </td>
    </tr>
  `;
}