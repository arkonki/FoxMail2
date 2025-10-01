import axios from 'axios';
import { Email, EmailAccount, EmailFolder } from '../types/email';

class EmailService {
  private sessionId: string | null = null;
  private connected = false;

  // CRITICAL: Use /ws path which is already proxied in Apache
  private getApiUrl(endpoint: string): string {
    const apiUrl = `/ws${endpoint}`;
    console.log('🌐 API URL:', apiUrl);
    return apiUrl;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async connect(account: EmailAccount): Promise<void> {
    console.log('🔌 EmailService.connect() called with:', account.email);
    
    try {
      // Generate new session ID
      this.sessionId = this.generateSessionId();
      console.log('🆔 Generated session ID:', this.sessionId);

      const url = this.getApiUrl('/imap/connect');
      console.log('📡 Making POST request to:', url);
      
      const response = await axios.post(url, {
        email: account.email,
        password: account.password,
        sessionId: this.sessionId,
      });

      console.log('📡 Response received:', response.data);

      if (response.data.success) {
        this.connected = true;
        console.log('✅ EmailService connection successful, connected =', this.connected);
      } else {
        this.connected = false;
        throw new Error(response.data.error || 'Connection failed');
      }
    } catch (error) {
      console.error('❌ EmailService connection failed:', error);
      
      // Log detailed error information
      if (axios.isAxiosError(error)) {
        console.error('❌ Axios Error Details:', {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
        });
      }
      
      this.connected = false;
      this.sessionId = null;
      
      // Re-throw with user-friendly message
      if (axios.isAxiosError(error)) {
        if (error.code === 'ERR_NETWORK') {
          throw new Error('Cannot connect to email server - network error. Check if backend is running.');
        }
        if (error.response?.status === 401) {
          throw new Error('Invalid email or password');
        }
        if (error.response?.data?.error) {
          throw new Error(error.response.data.error);
        }
      }
      throw new Error('Failed to connect to email server');
    }
  }

  isConnected(): boolean {
    console.log('🔍 EmailService.isConnected() called, returning:', this.connected);
    return this.connected;
  }

  async disconnect(): Promise<void> {
    console.log('🔌 EmailService.disconnect() called');
    
    if (!this.sessionId) {
      console.log('⚠️ No session to disconnect');
      return;
    }

    try {
      await axios.post(this.getApiUrl('/imap/disconnect'), {
        sessionId: this.sessionId,
      });
      this.connected = false;
      this.sessionId = null;
      console.log('✅ EmailService disconnected');
    } catch (error) {
      console.error('❌ EmailService disconnect failed:', error);
      // Still mark as disconnected locally
      this.connected = false;
      this.sessionId = null;
    }
  }

  async getFolders(): Promise<EmailFolder[]> {
    console.log('📁 EmailService.getFolders() called, connected:', this.connected);
    
    if (!this.connected || !this.sessionId) {
      throw new Error('Not connected to email server');
    }

    try {
      const response = await axios.post(this.getApiUrl('/imap/folders'), {
        sessionId: this.sessionId,
      });
      console.log('✅ Folders received:', response.data.folders?.length || 0);
      return response.data.folders || [];
    } catch (error) {
      console.error('❌ Failed to get folders:', error);
      throw error;
    }
  }

  async getEmails(folder: string, limit: number = 50): Promise<Email[]> {
    console.log('📧 EmailService.getEmails() called, folder:', folder, 'limit:', limit, 'connected:', this.connected);
    
    if (!this.connected || !this.sessionId) {
      throw new Error('Not connected to email server');
    }

    try {
      const response = await axios.post(this.getApiUrl('/imap/emails'), {
        sessionId: this.sessionId,
        folder,
        limit,
      });
      console.log('✅ Emails received:', response.data.emails?.length || 0);
      return response.data.emails || [];
    } catch (error) {
      console.error('❌ Failed to get emails:', error);
      throw error;
    }
  }

  async markAsRead(folder: string, uid: string): Promise<void> {
    console.log('✉️ EmailService.markAsRead() called, folder:', folder, 'uid:', uid, 'connected:', this.connected);
    
    if (!this.connected || !this.sessionId) {
      throw new Error('Not connected to email server');
    }

    try {
      await axios.post(this.getApiUrl('/imap/mark-read'), {
        sessionId: this.sessionId,
        folder,
        uid,
      });
      console.log('✅ Email marked as read');
    } catch (error) {
      console.error('❌ Failed to mark email as read:', error);
      throw error;
    }
  }

  async toggleStar(folder: string, uid: string, isStarred: boolean): Promise<void> {
    console.log('⭐ EmailService.toggleStar() called, folder:', folder, 'uid:', uid, 'starred:', isStarred, 'connected:', this.connected);
    
    if (!this.connected || !this.sessionId) {
      throw new Error('Not connected to email server');
    }

    try {
      await axios.post(this.getApiUrl('/imap/toggle-star'), {
        sessionId: this.sessionId,
        folder,
        uid,
        isStarred,
      });
      console.log('✅ Email star toggled');
    } catch (error) {
      console.error('❌ Failed to toggle star:', error);
      throw error;
    }
  }

  async deleteEmail(folder: string, uid: string): Promise<void> {
    console.log('🗑️ EmailService.deleteEmail() called, folder:', folder, 'uid:', uid, 'connected:', this.connected);
    
    if (!this.connected || !this.sessionId) {
      throw new Error('Not connected to email server');
    }

    try {
      await axios.post(this.getApiUrl('/imap/delete'), {
        sessionId: this.sessionId,
        folder,
        uid,
      });
      console.log('✅ Email deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete email:', error);
      throw error;
    }
  }

  async moveEmail(fromFolder: string, uid: string, toFolder: string): Promise<void> {
    console.log('📁 EmailService.moveEmail() called, from:', fromFolder, 'uid:', uid, 'to:', toFolder, 'connected:', this.connected);
    
    if (!this.connected || !this.sessionId) {
      throw new Error('Not connected to email server');
    }

    try {
      await axios.post(this.getApiUrl('/imap/move'), {
        sessionId: this.sessionId,
        fromFolder,
        uid,
        toFolder,
      });
      console.log('✅ Email moved successfully');
    } catch (error) {
      console.error('❌ Failed to move email:', error);
      throw error;
    }
  }

  async sendEmail(emailData: { to: string; subject: string; body: string }): Promise<void> {
    console.log('📤 EmailService.sendEmail() called, to:', emailData.to, 'connected:', this.connected);
    
    if (!this.connected || !this.sessionId) {
      throw new Error('Not connected to email server');
    }

    try {
      await axios.post(this.getApiUrl('/smtp/send'), {
        sessionId: this.sessionId,
        emailData,
      });
      console.log('✅ Email sent successfully');
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      throw error;
    }
  }
}

export const emailService = new EmailService();
