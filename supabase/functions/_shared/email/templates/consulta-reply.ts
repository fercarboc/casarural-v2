import type { BaseEmailTemplateInput, BuiltEmail } from '../types.ts';
import { renderEmailLayout } from '../layout.ts';
import { renderPlainText } from '../plainText.ts';

export function buildConsultaReplyEmail(
  input: BaseEmailTemplateInput
): BuiltEmail {
  return {
    subject: input.subject,
    html: renderEmailLayout({
      ...input,
      badge: input.badge ?? 'Respuesta',
    }),
    text: renderPlainText(input),
  };
}