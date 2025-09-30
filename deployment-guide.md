# 🚀 Production Deployment Guide

## Prerequisites

- Linux server (Ubuntu 20.04+ recommended)
- Node.js 18+ installed
- Domain name configured (e.g., webmail.veebimajutus.ee)
- SSL certificate (Let's Encrypt recommended)
- Root or sudo access

## Deployment Options

### Option 1: VPS/Cloud Server (Recommended)
Best for: Full control, scalability, production use

### Option 2: Shared Hosting with Node.js Support
Best for: Budget-friendly, managed environment

---

## 🔧 Option 1: VPS Deployment (nginx + PM2)

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install nginx
sudo apt install -y nginx

# Install PM2 (process manager)
sudo npm install -g pm2

# Install git (if needed)
sudo apt install -y git
```

### Step 2: Clone and Setup Application

```bash
# Create app directory
sudo mkdir -p /var/www/webmail
sudo chown -R $USER:$USER /var/www/webmail
cd /var/www/webmail

# Clone your repository (or upload files)
# git clone <your-repo-url> .
# OR upload files via SCP/SFTP

# Install dependencies
npm run install:all

# Build frontend
npm run build
```

### Step 3: Environment Configuration

Create production environment file:

```bash
# Create .env file
nano .env
```

Add the following:

```env
# Server Configuration
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Email Server
IMAP_HOST=mail.veebimajutus.ee
IMAP_PORT=993
SMTP_HOST=mail.veebimajutus.ee
SMTP_PORT=465

# Security
SESSION_SECRET=your-super-secret-key-change-this
CORS_ORIGIN=https://webmail.veebimajutus.ee

# Logging
LOG_LEVEL=info
```

### Step 4: PM2 Configuration

Create PM2 ecosystem file:

```bash
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'webmail-backend',
    cwd: '/var/www/webmail/server',
    script: 'index.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: '/var/log/webmail/error.log',
    out_file: '/var/log/webmail/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '500M',
    watch: false
  }]
};
```

Create log directory:

```bash
sudo mkdir -p /var/log/webmail
sudo chown -R $USER:$USER /var/log/webmail
```

Start the application:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Step 5: nginx Configuration

Create nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/webmail
```

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name webmail.veebimajutus.ee;
    
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name webmail.veebimajutus.ee;

    # SSL Configuration (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/webmail.veebimajutus.ee/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/webmail.veebimajutus.ee/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Root directory (built frontend)
    root /var/www/webmail/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Frontend (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts for email operations
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/webmail /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 6: SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d webmail.veebimajutus.ee

# Auto-renewal is configured automatically
# Test renewal:
sudo certbot renew --dry-run
```

### Step 7: Firewall Configuration

```bash
# Allow HTTP, HTTPS, and SSH
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 🔧 Option 2: Shared Hosting Deployment

### Requirements
- Node.js support (check with hosting provider)
- SSH access
- Domain/subdomain configured

### Steps

1. **Build locally:**
```bash
npm run build
```

2. **Upload files via FTP/SFTP:**
   - Upload `dist/` folder contents to public_html
   - Upload `server/` folder
   - Upload `package.json` files

3. **Install dependencies on server:**
```bash
cd ~/server
npm install --production
```

4. **Configure .htaccess (if Apache):**
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # API proxy
  RewriteRule ^api/(.*)$ http://localhost:3001/api/$1 [P,L]
  
  # SPA routing
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

5. **Start backend (using hosting's Node.js manager or PM2)**

---

## 📋 Production Checklist

### Security
- [ ] SSL certificate installed and working
- [ ] Environment variables configured
- [ ] CORS configured for production domain
- [ ] Security headers enabled
- [ ] Firewall configured
- [ ] Rate limiting enabled (optional)
- [ ] Session secrets changed from defaults

### Performance
- [ ] Frontend built and optimized
- [ ] Gzip compression enabled
- [ ] Static assets cached
- [ ] PM2 cluster mode enabled
- [ ] Database connections pooled (if applicable)

### Monitoring
- [ ] PM2 monitoring enabled
- [ ] Log rotation configured
- [ ] Error tracking setup (optional: Sentry)
- [ ] Uptime monitoring (optional: UptimeRobot)

### Backup
- [ ] Automated backups configured
- [ ] Backup restoration tested

---

## 🔍 Troubleshooting

### Backend won't start
```bash
# Check PM2 logs
pm2 logs webmail-backend

# Check if port is in use
sudo lsof -i :3001

# Restart backend
pm2 restart webmail-backend
```

### nginx errors
```bash
# Check nginx error log
sudo tail -f /var/log/nginx/error.log

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### SSL issues
```bash
# Check certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew
```

### Connection issues
```bash
# Test IMAP connection
telnet mail.veebimajutus.ee 993

# Test SMTP connection
telnet mail.veebimajutus.ee 465

# Check firewall
sudo ufw status
```

---

## 🔄 Deployment Updates

### Update application:

```bash
cd /var/www/webmail

# Pull latest changes
git pull

# Install dependencies
npm run install:all

# Build frontend
npm run build

# Restart backend
pm2 restart webmail-backend

# Reload nginx (if config changed)
sudo systemctl reload nginx
```

---

## 📊 Monitoring

### PM2 Monitoring
```bash
# View status
pm2 status

# View logs
pm2 logs

# Monitor resources
pm2 monit
```

### System Resources
```bash
# Check disk space
df -h

# Check memory
free -h

# Check CPU
top
```

---

## 🎯 Performance Optimization

### 1. Enable HTTP/2
Already configured in nginx config above

### 2. Enable Brotli Compression (optional)
```bash
sudo apt install -y nginx-module-brotli
```

### 3. CDN Integration (optional)
- Use Cloudflare for static assets
- Configure in DNS settings

### 4. Database Optimization (future)
- Use connection pooling
- Enable query caching
- Regular maintenance

---

## 🔐 Security Hardening

### 1. Fail2ban (prevent brute force)
```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
```

### 2. Regular Updates
```bash
# Create update script
nano ~/update-system.sh
```

```bash
#!/bin/bash
sudo apt update
sudo apt upgrade -y
sudo apt autoremove -y
pm2 update
```

```bash
chmod +x ~/update-system.sh
```

### 3. Backup Script
```bash
nano ~/backup-webmail.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/webmail"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup application
tar -czf $BACKUP_DIR/webmail_$DATE.tar.gz /var/www/webmail

# Keep only last 7 days
find $BACKUP_DIR -name "webmail_*.tar.gz" -mtime +7 -delete
```

```bash
chmod +x ~/backup-webmail.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /home/username/backup-webmail.sh
```

---

## 📞 Support

For issues:
1. Check logs: `pm2 logs` and `/var/log/nginx/error.log`
2. Verify configuration: `sudo nginx -t`
3. Check service status: `pm2 status`
4. Review this guide's troubleshooting section

---

## 🎉 Success!

Your webmail application should now be running at:
**https://webmail.veebimajutus.ee**

Test all features:
- [ ] Login works
- [ ] Emails load
- [ ] Sending works
- [ ] All folders accessible
- [ ] Mobile responsive
- [ ] SSL certificate valid
