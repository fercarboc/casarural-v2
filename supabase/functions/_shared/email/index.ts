import type {
  BaseEmailTemplateInput,
  BuiltEmail,
  EmailTemplateKey,
} from './types.ts';
import { buildConsultaAckEmail } from './templates/consulta-ack.ts';
import { buildConsultaReplyEmail } from './templates/consulta-reply.ts';
import { buildConsultaDocumentsEmail } from './templates/consulta-documents.ts';
import { buildConsultaManagedEmail } from './templates/consulta-managed.ts';

export * from './types.ts';
export * from './theme.ts';

export function buildEmail(
  key: EmailTemplateKey,
  input: BaseEmailTemplateInput
): BuiltEmail {
  switch (key) {
    case 'consulta_ack':
      return buildConsultaAckEmail(input);
    case 'consulta_reply':
      return buildConsultaReplyEmail(input);
    case 'consulta_documents':
      return buildConsultaDocumentsEmail(input);
    case 'consulta_managed':
      return buildConsultaManagedEmail(input);
    default:
      return buildConsultaReplyEmail(input);
  }
}