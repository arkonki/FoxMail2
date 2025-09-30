import express from 'express';
import cors from 'cors';
import { ImapService } from './imap.js';
import { sendEmail } from './smtp.js';

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// CORS configuration for production
const corsOptions = {
  origin: NODE_ENV === 'production' ? CORS_ORIGIN : true,
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    environment: NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Store active IMAP connections per session
const imapSessions = new Map();

// Session cleanup (every 30 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of imapSessions.entries()) {
    if (now - session.lastActivity > 30 * 60 * 1000) {
      console.log('🧹 Cleaning up inactive session:', sessionId);
      session.imapService.disconnect();
      imapSessions.delete(sessionId);
    }
  }
}, 30 * 60 * 1000);

// Middleware to update session activity
const updateActivity = (sessionId) => {
  const session = imapSessions.get(sessionId);
  if (session) {
    session.lastActivity = Date.now();
  }
};

// Connect to IMAP
app.post('/api/connect', async (req, res) => {
  try {
    console.log('🔌 Connect request received:', { email: req.body.email });
    const { email, password } = req.body;
    
    // Generate session ID
    const sessionId = `${email}_${Date.now()}`;
    
    const imapService = new ImapService();
    await imapService.connect({ email, password });
    
    imapSessions.set(sessionId, { 
      imapService, 
      account: { email, password },
      lastActivity: Date.now()
    });
    
    console.log('✅ Session created:', sessionId);
    
    res.json({ success: true, sessionId });
  } catch (error) {
    console.error('❌ IMAP connect error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Disconnect from IMAP
app.post('/api/disconnect', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = imapSessions.get(sessionId);
    
    if (session) {
      session.imapService.disconnect();
      imapSessions.delete(sessionId);
      console.log('📪 Session disconnected:', sessionId);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('❌ IMAP disconnect error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get folders
app.get('/api/folders', async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'];
    const session = imapSessions.get(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: 'Not connected' });
    }
    
    updateActivity(sessionId);
    const folders = await session.imapService.getFolders();
    console.log('✅ Folders retrieved:', folders.length);
    res.json({ folders });
  } catch (error) {
    console.error('❌ Get folders error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get emails
app.get('/api/emails', async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'];
    const { folder, limit } = req.query;
    const session = imapSessions.get(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: 'Not connected' });
    }
    
    updateActivity(sessionId);
    const emails = await session.imapService.getEmails(folder, parseInt(limit) || 50);
    console.log('✅ Emails retrieved:', emails.length);
    res.json({ emails });
  } catch (error) {
    console.error('❌ Get emails error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get email body
app.get('/api/email-body', async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'];
    const { folder, uid } = req.query;
    const session = imapSessions.get(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: 'Not connected' });
    }
    
    updateActivity(sessionId);
    const body = await session.imapService.getEmailBody(folder, parseInt(uid));
    res.json({ body });
  } catch (error) {
    console.error('❌ Get email body error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark as read
app.post('/api/mark-read', async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'];
    const { folder, uid } = req.body;
    const session = imapSessions.get(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: 'Not connected' });
    }
    
    updateActivity(sessionId);
    await session.imapService.markAsRead(folder, uid);
    console.log('✅ Marked as read:', uid);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Mark read error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Toggle star
app.post('/api/toggle-star', async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'];
    const { folder, uid, starred } = req.body;
    const session = imapSessions.get(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: 'Not connected' });
    }
    
    updateActivity(sessionId);
    await session.imapService.toggleStar(folder, uid, starred);
    console.log('✅ Toggled star:', uid);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Toggle star error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete email
app.delete('/api/email', async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'];
    const { folder, uid } = req.query;
    const session = imapSessions.get(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: 'Not connected' });
    }
    
    updateActivity(sessionId);
    await session.imapService.deleteEmail(folder, parseInt(uid));
    console.log('✅ Deleted email:', uid);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send email
app.post('/api/send', async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'];
    const { to, subject, body } = req.body;
    const session = imapSessions.get(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: 'Not connected' });
    }
    
    updateActivity(sessionId);
    await sendEmail(session.account, { to, subject, body });
    console.log('✅ Email sent to:', to);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Send email error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({ 
    error: NODE_ENV === 'production' ? 'Internal server error' : err.message 
  });
});

app.listen(PORT, () => {
  console.log(`✅ Email server running on port ${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`🔒 CORS origin: ${CORS_ORIGIN}`);
  console.log(`📧 Using maintained libraries:`);
  console.log(`   - node-imap (IMAP client)`);
  console.log(`   - nodemailer (SMTP client)`);
  console.log(`   - mailparser (MIME parsing)`);
});
