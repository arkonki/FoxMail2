export interface EmailAddress {
  name?: string;
  address: string;
}

export interface EmailAttachment {
  filename: string;
  contentType: string;
  size: number;
  content?: string;
}

export interface Email {
  id: string;
  from: EmailAddress[];
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  body: {
    text: string;
    html: string;
  };
  date: string;
  isRead: boolean;
  isStarred: boolean;
  folder: string;
  attachments: EmailAttachment[];
  isDraft?: boolean;
  draftSavedAt?: string;
  preview?: string;
  html?: string;
  text?: string;
}

export interface EmailFolder {
  id: string;
  name: string;
  path: string;
  specialUse?: string;
  unreadCount: number;
}

export interface EmailAccount {
  email: string;
  password: string;
  name?: string;
}

export interface Draft {
  id: string;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  attachments: File[];
  savedAt: string;
}

export interface SearchFilters {
  query: string;
  folder?: string;
  hasAttachments?: boolean;
  isStarred?: boolean;
  dateFrom?: string;
  dateTo?: string;
}
