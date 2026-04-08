import type { BaseEmailTemplateInput } from './types.ts';
import { stripHtml } from './utils.ts';

export function renderPlainText(input: BaseEmailTemplateInput): string {
  const lines: string[] = [];

  lines.push(input.title);

  if (input.subtitle) lines.push(input.subtitle);
  if (input.intro) lines.push('', input.intro);

  if (input.messageHtml) {
    lines.push('', stripHtml(input.messageHtml));
  }

  if (input.summaryItems?.length) {
    lines.push('', 'Resumen:');
    for (const item of input.summaryItems) {
      lines.push(`- ${item.label}: ${item.value}`);
    }
  }

  if (input.attachments?.length) {
    lines.push('', 'Adjuntos:');
    for (const file of input.attachments) {
      lines.push(`- ${file.name}${file.url ? ` (${file.url})` : ''}`);
    }
  }

  if (input.actionLabel && input.actionUrl) {
    lines.push('', `${input.actionLabel}: ${input.actionUrl}`);
  }

  if (input.footerNote) {
    lines.push('', input.footerNote);
  }

  return lines.join('\n').trim();
}