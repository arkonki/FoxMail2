# 🚀 Production Deployment Guide

## Prerequisites

- Linux server (Ubuntu 20.04+ recommended)
- Node.js 18+ installed
- Domain name configured (e.g., webmail.veebimajutus.ee)
- SSL certificate (Let's Encrypt recommended)
- Root or sudo access

## Deployment Architecture

**Frontend**: Static files served by nginx
**Backend**: Node.js API server managed by PM2

---

## 🔧 Production Deployment Steps

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

### Step 4: Start Backend with PM2

```bash
# Start backend
pm2 start ecosystem.config.cjs

# Save PM2 configuration
pm2 save

# Setup PM2 startup script (first time only)
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

# No need to restart nginx - static files updated automatically
```

---

## 📊 Monitoring

### Check Backend Status
```bash
# View PM2 status
pm2 status

# View backend logs
pm2 logs webmail-backend

# Monitor resources
pm2 monit
```

### Check nginx Status
```bash
# Check nginx status
sudo systemctl status nginx

# View nginx access logs
sudo tail -f /var/log/nginx/access.log

# View nginx error logs
sudo tail -f /var/log/nginx/error.log
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

### Frontend not loading
```bash
# Check if files exist
ls -la /var/www/webmail/dist/

# Check nginx is serving files
curl -I http://localhost/

# Check file permissions
sudo chown -R www-data:www-data /var/www/webmail/dist/
```

### API calls failing
```bash
# Check backend is running
pm2 status

# Check backend logs
pm2 logs webmail-backend

# Test API directly
curl http://localhost:3001/api/health

# Check nginx proxy
sudo tail -f /var/log/nginx/error.log
```

---

## 🎯 Quick Deploy Script

Create a deployment script:

```bash
nano ~/deploy-webmail.sh
```

```bash
#!/bin/bash
set -e

echo "🚀 Deploying Webmail..."

cd /var/www/webmail

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull

# Install dependencies
echo "📦 Installing dependencies..."
npm run install:all

# Build frontend
echo "🔨 Building frontend..."
npm run build

# Restart backend
echo "🔄 Restarting backend..."
pm2 restart webmail-backend

echo "✅ Deployment complete!"
echo ""
echo "📊 Backend status:"
pm2 status webmail-backend
```

```bash
chmod +x ~/deploy-webmail.sh
```

Run deployment:
```bash
~/deploy-webmail.sh
```

---

## 🎉 Success!

Your webmail application should now be running at:
**https://webmail.veebimajutus.ee**

**Architecture:**
- ✅ Frontend: Static files served by nginx from `/var/www/webmail/dist/`
- ✅ Backend: Node.js API managed by PM2 on port 3001
- ✅ nginx: Proxies `/api` requests to backend, serves static files for everything else

Test all features:
- [ ] Login works
- [ ] Emails load
- [ ] Sending works
- [ ] All folders accessible
- [ ] Mobile responsive
- [ ] SSL certificate valid
