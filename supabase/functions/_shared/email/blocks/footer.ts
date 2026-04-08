import type { EmailBranding } from '../types.ts';
import { escapeHtml } from '../utils.ts';

export function renderFooter(branding: EmailBranding, footerNote?: string) {
  const website = branding.websiteUrl
    ? `<a href="${branding.websiteUrl}" style="color:${branding.accentColor};text-decoration:none;">${escapeHtml(branding.websiteUrl)}</a>`
    : '';

  const support = branding.supportEmail
    ? `<a href="mailto:${branding.supportEmail}" style="color:${branding.accentColor};text-decoration:none;">${escapeHtml(branding.supportEmail)}</a>`
    : '';

  return `
    <tr>
      <td style="padding:24px 32px 32px 32px;border-top:1px solid ${branding.borderColor};">
        <div style="font-size:12px;line-height:20px;color:${branding.mutedColor};text-align:center;">
          ${escapeHtml(footerNote || 'Comunicación generada por el sistema.')}
          <br />
          ${support}${support && website ? ' · ' : ''}${website}
        </div>
      </td>
    </tr>
  `;
}