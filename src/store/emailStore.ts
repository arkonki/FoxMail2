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
  setCurrentFolder: (folder: string) => void;
  setLoading: (loading: boolean) => void;
  setSearchFilters: (filters: SearchFilters) => void;
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
  setCurrentFolder: (folder) => set({ currentFolder: folder }),
  setLoading: (loading) => set({ isLoading: loading }),
  setSearchFilters: (filters) => set({ searchFilters: filters }),
}));
