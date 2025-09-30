import Imap from 'imap';
import { simpleParser } from 'mailparser';
import { EventEmitter } from 'events';

export class ImapService extends EventEmitter {
  constructor() {
    super();
    this.imap = null;
    this.connected = false;
  }

  connect(config) {
    return new Promise((resolve, reject) => {
      console.log('🔐 ImapService.connect() called with:', {
        user: config.email,
        host: 'mail.veebimajutus.ee',
        port: 993,
        hasPassword: !!config.password
      });

      this.imap = new Imap({
        user: config.email,
        password: config.password,
        host: 'mail.veebimajutus.ee',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 10000,
        connTimeout: 10000,
      });

      let resolved = false;

      this.imap.once('ready', () => {
        if (resolved) return;
        resolved = true;
        this.connected = true;
        console.log('✅ IMAP ready event - Authentication SUCCESSFUL for:', config.email);
        resolve();
      });

      this.imap.once('error', (err) => {
        if (resolved) return;
        resolved = true;
        console.error('❌ IMAP error event:', {
          message: err.message,
          code: err.code,
          source: err.source,
          textCode: err.textCode
        });
        
        // Check for authentication failure
        if (err.textCode === 'AUTHENTICATIONFAILED' || 
            err.message?.includes('Invalid credentials') ||
            err.message?.includes('authentication failed')) {
          reject(new Error('Invalid credentials'));
        } else {
          reject(err);
        }
      });

      this.imap.once('end', () => {
        this.connected = false;
        console.log('📪 IMAP end event - Connection closed');
      });

      console.log('🔌 Calling imap.connect()...');
      try {
        this.imap.connect();
      } catch (err) {
        console.error('❌ Exception during imap.connect():', err);
        if (!resolved) {
          resolved = true;
          reject(err);
        }
      }
    });
  }

  disconnect() {
    if (this.imap && this.connected) {
      console.log('📪 Disconnecting IMAP...');
      this.imap.end();
    }
  }

  async getFolders() {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        return reject(new Error('Not connected to IMAP server'));
      }

      this.imap.getBoxes((err, boxes) => {
        if (err) return reject(err);

        const folders = [];
        const processBox = (box, path = '') => {
          const fullPath = path ? `${path}/${box.attribs[0]}` : box.attribs[0];
          
          let specialUse;
          const name = box.attribs[0].toLowerCase();
          if (name === 'inbox') specialUse = 'inbox';
          else if (name.includes('sent')) specialUse = 'sent';
          else if (name.includes('draft')) specialUse = 'drafts';
          else if (name.includes('trash') || name.includes('deleted')) specialUse = 'trash';
          else if (name.includes('junk') || name.includes('spam')) specialUse = 'junk';

          folders.push({
            name: box.attribs[0],
            path: fullPath,
            specialUse,
            unreadCount: 0,
          });

          if (box.children) {
            Object.keys(box.children).forEach(childName => {
              processBox(box.children[childName], fullPath);
            });
          }
        };

        Object.keys(boxes).forEach(boxName => {
          processBox(boxes[boxName]);
        });

        resolve(folders);
      });
    });
  }

  async getEmails(folderPath, limit = 50) {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        return reject(new Error('Not connected to IMAP server'));
      }

      this.imap.openBox(folderPath, false, (err, box) => {
        if (err) return reject(err);

        if (box.messages.total === 0) {
          return resolve([]);
        }

        const start = Math.max(1, box.messages.total - limit + 1);
        const end = box.messages.total;
        const range = `${start}:${end}`;

        const fetch = this.imap.seq.fetch(range, {
          bodies: '',
          struct: true,
        });

        const emails = [];

        fetch.on('message', (msg, seqno) => {
          let buffer = '';
          let attributes = null;

          msg.on('body', (stream) => {
            stream.on('data', (chunk) => {
              buffer += chunk.toString('utf8');
            });
          });

          msg.once('attributes', (attrs) => {
            attributes = attrs;
          });

          msg.once('end', async () => {
            try {
              const parsed = await simpleParser(buffer);
              
              const email = {
                id: attributes.uid.toString(),
                from: parsed.from?.value || [],
                to: parsed.to?.value || [],
                cc: parsed.cc?.value || [],
                bcc: parsed.bcc?.value || [],
                subject: parsed.subject || '(No Subject)',
                body: {
                  text: parsed.text || '',
                  html: parsed.html || parsed.textAsHtml || '',
                },
                date: parsed.date?.toISOString() || new Date().toISOString(),
                isRead: attributes.flags.includes('\\Seen'),
                isStarred: attributes.flags.includes('\\Flagged'),
                folder: folderPath,
                attachments: (parsed.attachments || []).map(att => ({
                  filename: att.filename,
                  contentType: att.contentType,
                  size: att.size,
                })),
                preview: (parsed.text || '').substring(0, 150).replace(/\s+/g, ' ').trim(),
              };

              emails.push(email);
            } catch (parseErr) {
              console.error('❌ Parse error:', parseErr);
            }
          });
        });

        fetch.once('error', reject);

        fetch.once('end', () => {
          resolve(emails.reverse());
        });
      });
    });
  }

  async markAsRead(folder, uid) {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        return reject(new Error('Not connected to IMAP server'));
      }

      this.imap.openBox(folder, false, (err) => {
        if (err) return reject(err);

        this.imap.addFlags(uid, ['\\Seen'], (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    });
  }

  async toggleStar(folder, uid, isStarred) {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        return reject(new Error('Not connected to IMAP server'));
      }

      this.imap.openBox(folder, false, (err) => {
        if (err) return reject(err);

        const action = isStarred ? 'delFlags' : 'addFlags';
        this.imap[action](uid, ['\\Flagged'], (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    });
  }

  async deleteEmail(folder, uid) {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        return reject(new Error('Not connected to IMAP server'));
      }

      this.imap.openBox(folder, false, (err) => {
        if (err) return reject(err);

        this.imap.move(uid, 'Trash', (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    });
  }

  async moveEmail(fromFolder, uid, toFolder) {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        return reject(new Error('Not connected to IMAP server'));
      }

      this.imap.openBox(fromFolder, false, (err) => {
        if (err) return reject(err);

        this.imap.move(uid, toFolder, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    });
  }
}
