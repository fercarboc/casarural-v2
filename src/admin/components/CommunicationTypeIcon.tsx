import React from 'react';
import {
  Mail,
  Inbox,
  MessageSquareText,
  FileText,
  ClipboardCheck,
  CalendarDays,
  StickyNote,
} from 'lucide-react';
import type { CustomerCommunicationType } from '../../shared/types/customerCommunication.types';

interface Props {
  type: CustomerCommunicationType;
  className?: string;
}

export const CommunicationTypeIcon: React.FC<Props> = ({ type, className }) => {
  switch (type) {
    case 'EMAIL_OUT':
      return <Mail className={className} />;
    case 'EMAIL_IN':
      return <Inbox className={className} />;
    case 'CONSULTA':
      return <MessageSquareText className={className} />;
    case 'CONSULTA_REPLY':
      return <Mail className={className} />;
    case 'DOCUMENT_SENT':
      return <FileText className={className} />;
    case 'MANAGEMENT_CONFIRMATION':
      return <ClipboardCheck className={className} />;
    case 'RESERVATION_EVENT':
      return <CalendarDays className={className} />;
    case 'NOTE_INTERNAL':
    default:
      return <StickyNote className={className} />;
  }
};