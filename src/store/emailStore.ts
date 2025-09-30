import { create } from 'zustand';
import { Email, EmailFolder } from '../types/email';

interface SearchFilters {
  query: string;
  hasAttachments?: boolean;
  isStarred?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

interface EmailState {
  emails: Email[];
  folders: EmailFolder[];
  selectedEmail: Email | null;
  currentFolder: string;
  isLoading: boolean;
  searchFilters: SearchFilters;
  setEmails: (emails: Email[]) => void;
  setFolders: (folders: EmailFolder[]) => void;
  selectEmail: (email: Email | null) => void;
  setSelectedEmail: (email: Email | null) => void;
  setCurrentFolder: (folder: string) => void;
  setLoading: (loading: boolean) => void;
  setSearchFilters: (filters: SearchFilters) => void;
  markAsRead: (emailId: string) => void;
  toggleStar: (emailId: string) => void;
  deleteEmail: (emailId: string) => void;
  archiveEmail: (emailId: string) => void;
  moveEmail: (emailId: string, folder: string) => void;
}

export const useEmailStore = create<EmailState>((set) => ({
  emails: [],
  folders: [],
  selectedEmail: null,
  currentFolder: 'INBOX',
  isLoading: false,
  searchFilters: {
    query: '',
  },
  setEmails: (emails) => set({ emails }),
  setFolders: (folders) => set({ folders }),
  selectEmail: (email) => set({ selectedEmail: email }),
  setSelectedEmail: (email) => set({ selectedEmail: email }),
  setCurrentFolder: (folder) => set({ currentFolder: folder }),
  setLoading: (loading) => set({ isLoading: loading }),
  setSearchFilters: (filters) => set({ searchFilters: filters }),
  markAsRead: (emailId) => set((state) => ({
    emails: state.emails.map(email =>
      email.id === emailId ? { ...email, isRead: true } : email
    ),
    selectedEmail: state.selectedEmail?.id === emailId
      ? { ...state.selectedEmail, isRead: true }
      : state.selectedEmail
  })),
  toggleStar: (emailId) => set((state) => ({
    emails: state.emails.map(email =>
      email.id === emailId ? { ...email, isStarred: !email.isStarred } : email
    ),
    selectedEmail: state.selectedEmail?.id === emailId
      ? { ...state.selectedEmail, isStarred: !state.selectedEmail.isStarred }
      : state.selectedEmail
  })),
  deleteEmail: (emailId) => set((state) => ({
    emails: state.emails.filter(email => email.id !== emailId),
    selectedEmail: state.selectedEmail?.id === emailId ? null : state.selectedEmail
  })),
  archiveEmail: (emailId) => set((state) => ({
    emails: state.emails.map(email =>
      email.id === emailId ? { ...email, folder: 'ARCHIVE' } : email
    )
  })),
  moveEmail: (emailId, folder) => set((state) => ({
    emails: state.emails.map(email =>
      email.id === emailId ? { ...email, folder } : email
    )
  })),
}));
