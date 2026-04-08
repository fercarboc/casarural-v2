import type { BaseEmailTemplateInput } from './types.ts';
import { escapeHtml } from './utils.ts';
import { renderHeader } from './blocks/header.ts';
import { renderFooter } from './blocks/footer.ts';
import { renderBadge } from './blocks/badge.ts';
import { renderSection } from './blocks/section.ts';
import { renderMessageBlock } from './blocks/messageBlock.ts';
import { renderSummaryCard } from './blocks/summaryCard.ts';
import { renderAttachmentBlock } from './blocks/attachmentBlock.ts';
import { renderActionButton } from './blocks/actionButton.ts';

export function renderEmailLayout(input: BaseEmailTemplateInput): string {
  const {
    branding,
    previewText,
    title,
    subtitle,
    intro,
    badge,
    messageHtml,
    summaryItems,
    attachments,
    actionLabel,
    actionUrl,
    footerNote,
  } = input;

  const hero = `
    ${renderBadge(badge)}
    <div style="font-size:28px;line-height:36px;font-weight:800;color:${branding.textColor};margin-bottom:10px;">
      ${escapeHtml(title)}
    </div>
    ${
      subtitle
        ? `<div style="font-size:15px;line-height:24px;color:${branding.mutedColor};">${escapeHtml(subtitle)}</div>`
        : ''
    }
    ${
      intro
        ? `<div style="margin-top:16px;font-size:15px;line-height:26px;color:${branding.textColor};">${escapeHtml(intro)}</div>`
        : ''
    }
    ${renderMessageBlock(messageHtml)}
    ${renderSummaryCard(summaryItems)}
    ${renderAttachmentBlock(attachments)}
    ${renderActionButton(actionLabel, actionUrl)}
  `;

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(input.subject)}</title>
      </head>
      <body style="margin:0;padding:0;background:${branding.backgroundColor};font-family:Arial,Helvetica,sans-serif;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
          ${escapeHtml(previewText || title)}
        </div>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${branding.backgroundColor};">
          <tr>
            <td align="center" style="padding:24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:680px;background:${branding.panelColor};border:1px solid ${branding.borderColor};border-radius:24px;overflow:hidden;">
                ${renderHeader(branding)}
                ${renderSection(hero)}
                ${renderFooter(branding, footerNote)}
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}