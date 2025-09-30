import axios from 'axios';
import { Email, EmailAccount, EmailFolder } from '../types/email';

class EmailService {
  private connected = false;
  private account: EmailAccount | null = null;

  async connect(account: EmailAccount): Promise<void> {
    console.log('🔌 EmailService.connect() called with:', account.email);
    
    try {
      const response = await axios.post('/api/connect', {
        email: account.email,
        password: account.password,
      });

      if (response.data.success) {
        this.connected = true;
        this.account = account;
        console.log('✅ EmailService connection successful, connected =', this.connected);
      } else {
        throw new Error(response.data.error || 'Connection failed');
      }
    } catch (error) {
      console.error('❌ EmailService connection failed:', error);
      this.connected = false;
      this.account = null;
      throw error;
    }
  }

  isConnected(): boolean {
    console.log('🔍 EmailService.isConnected() called, returning:', this.connected);
    return this.connected;
  }

  async disconnect(): Promise<void> {
    console.log('🔌 EmailService.disconnect() called');
    
    try {
      await axios.post('/api/disconnect');
      this.connected = false;
      this.account = null;
      console.log('✅ EmailService disconnected');
    } catch (error) {
      console.error('❌ EmailService disconnect failed:', error);
      // Still mark as disconnected locally
      this.connected = false;
      this.account = null;
    }
  }

  async getFolders(): Promise<EmailFolder[]> {
    console.log('📁 EmailService.getFolders() called, connected:', this.connected);
    
    if (!this.connected) {
      throw new Error('Not connected to email server');
    }

    try {
      const response = await axios.get('/api/folders');
      console.log('✅ Folders received:', response.data.folders?.length || 0);
      return response.data.folders || [];
    } catch (error) {
      console.error('❌ Failed to get folders:', error);
      throw error;
    }
  }

  async getEmails(folder: string, limit: number = 50): Promise<Email[]> {
    console.log('📧 EmailService.getEmails() called, folder:', folder, 'limit:', limit, 'connected:', this.connected);
    
    if (!this.connected) {
      throw new Error('Not connected to email server');
    }

    try {
      const response = await axios.get('/api/emails', {
        params: { folder, limit },
      });
      console.log('✅ Emails received:', response.data.emails?.length || 0);
      return response.data.emails || [];
    } catch (error) {
      console.error('❌ Failed to get emails:', error);
      throw error;
    }
  }

  async getEmailBody(folder: string, uid: number): Promise<string> {
    console.log('📄 EmailService.getEmailBody() called, folder:', folder, 'uid:', uid, 'connected:', this.connected);
    
    if (!this.connected) {
      throw new Error('Not connected to email server');
    }

    try {
      const response = await axios.get('/api/email-body', {
        params: { folder, uid },
      });
      console.log('✅ Email body received');
      return response.data.body || '';
    } catch (error) {
      console.error('❌ Failed to get email body:', error);
      throw error;
    }
  }

  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    console.log('📤 EmailService.sendEmail() called, to:', to, 'connected:', this.connected);
    
    if (!this.connected) {
      throw new Error('Not connected to email server');
    }

    try {
      await axios.post('/api/send', {
        to,
        subject,
        body,
      });
      console.log('✅ Email sent successfully');
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      throw error;
    }
  }

  async deleteEmail(folder: string, uid: number): Promise<void> {
    console.log('🗑️ EmailService.deleteEmail() called, folder:', folder, 'uid:', uid, 'connected:', this.connected);
    
    if (!this.connected) {
      throw new Error('Not connected to email server');
    }

    try {
      await axios.delete('/api/email', {
        params: { folder, uid },
      });
      console.log('✅ Email deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete email:', error);
      throw error;
    }
  }

  async markAsRead(folder: string, uid: number): Promise<void> {
    console.log('✉️ EmailService.markAsRead() called, folder:', folder, 'uid:', uid, 'connected:', this.connected);
    
    if (!this.connected) {
      throw new Error('Not connected to email server');
    }

    try {
      await axios.post('/api/mark-read', {
        folder,
        uid,
      });
      console.log('✅ Email marked as read');
    } catch (error) {
      console.error('❌ Failed to mark email as read:', error);
      throw error;
    }
  }

  async toggleStar(folder: string, uid: number, starred: boolean): Promise<void> {
    console.log('⭐ EmailService.toggleStar() called, folder:', folder, 'uid:', uid, 'starred:', starred, 'connected:', this.connected);
    
    if (!this.connected) {
      throw new Error('Not connected to email server');
    }

    try {
      await axios.post('/api/toggle-star', {
        folder,
        uid,
        starred,
      });
      console.log('✅ Email star toggled');
    } catch (error) {
      console.error('❌ Failed to toggle star:', error);
      throw error;
    }
  }
}

export const emailService = new EmailService();
