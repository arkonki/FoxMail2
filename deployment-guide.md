# 🚀 Production Deployment Guide

## Prerequisites

- Linux server (Ubuntu 20.04+ recommended)
- Node.js 18+ installed
- Domain name configured (e.g., webmail.veebimajutus.ee)
- SSL certificate (Let's Encrypt recommended)
- Root or sudo access

## Deployment Architecture

**Frontend**: Static files served by Apache
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

# Install Apache
sudo apt install -y apache2

# Enable required Apache modules
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod rewrite
sudo a2enmod ssl
sudo a2enmod headers

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

### Step 5: Apache Configuration

Create Apache virtual host configuration:

```bash
sudo nano /etc/apache2/sites-available/webmail.conf
```

```apache
# Redirect HTTP to HTTPS
<VirtualHost *:80>
    ServerName webmail.veebimajutus.ee
    
    RewriteEngine On
    RewriteRule ^(.*)$ https://%{HTTP_HOST}$1 [R=301,L]
</VirtualHost>

# HTTPS Server
<VirtualHost *:443>
    ServerName webmail.veebimajutus.ee
    
    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/webmail.veebimajutus.ee/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/webmail.veebimajutus.ee/privkey.pem
    SSLProtocol all -SSLv2 -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite HIGH:!aNULL:!MD5
    
    # Security Headers
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"
    
    # Document Root (Frontend static files)
    DocumentRoot /var/www/webmail/dist
    
    <Directory /var/www/webmail/dist>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        
        # SPA routing - fallback to index.html
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
    
    # Backend API Proxy
    ProxyPreserveHost On
    ProxyTimeout 60
    
    <Location /api>
        ProxyPass http://localhost:3001/api
        ProxyPassReverse http://localhost:3001/api
        
        # WebSocket support (if needed)
        RewriteEngine On
        RewriteCond %{HTTP:Upgrade} =websocket [NC]
        RewriteRule /api/(.*) ws://localhost:3001/api/$1 [P,L]
    </Location>
    
    # Static assets caching
    <FilesMatch "\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$">
        Header set Cache-Control "public, max-age=31536000, immutable"
    </FilesMatch>
    
    # Logging
    ErrorLog ${APACHE_LOG_DIR}/webmail-error.log
    CustomLog ${APACHE_LOG_DIR}/webmail-access.log combined
</VirtualHost>
```

Enable the site:

```bash
# Disable default site (optional)
sudo a2dissite 000-default.conf

# Enable webmail site
sudo a2ensite webmail.conf

# Test configuration
sudo apache2ctl configtest

# Restart Apache
sudo systemctl restart apache2
```

### Step 6: SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-apache

# Get certificate
sudo certbot --apache -d webmail.veebimajutus.ee

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

### Step 8: Set Permissions

```bash
# Ensure Apache can read the files
sudo chown -R www-data:www-data /var/www/webmail/dist/
sudo chmod -R 755 /var/www/webmail/dist/
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

# Set permissions
sudo chown -R www-data:www-data /var/www/webmail/dist/
sudo chmod -R 755 /var/www/webmail/dist/

# Restart backend
pm2 restart webmail-backend

# No need to restart Apache - static files updated automatically
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

### Check Apache Status
```bash
# Check Apache status
sudo systemctl status apache2

# View Apache access logs
sudo tail -f /var/log/apache2/webmail-access.log

# View Apache error logs
sudo tail -f /var/log/apache2/webmail-error.log
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

### Apache errors
```bash
# Check Apache error log
sudo tail -f /var/log/apache2/webmail-error.log

# Test configuration
sudo apache2ctl configtest

# Restart Apache
sudo systemctl restart apache2
```

### Frontend not loading
```bash
# Check if files exist
ls -la /var/www/webmail/dist/

# Check Apache is serving files
curl -I http://localhost/

# Check file permissions
sudo chown -R www-data:www-data /var/www/webmail/dist/
sudo chmod -R 755 /var/www/webmail/dist/
```

### API calls failing
```bash
# Check backend is running
pm2 status

# Check backend logs
pm2 logs webmail-backend

# Test API directly
curl http://localhost:3001/api/health

# Check Apache proxy
sudo tail -f /var/log/apache2/webmail-error.log

# Verify proxy modules are enabled
sudo apache2ctl -M | grep proxy
```

### SPA routing not working
```bash
# Verify .htaccess or rewrite rules
# Check Apache error log for rewrite issues
sudo tail -f /var/log/apache2/webmail-error.log

# Ensure mod_rewrite is enabled
sudo a2enmod rewrite
sudo systemctl restart apache2
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

# Set permissions
echo "🔐 Setting permissions..."
sudo chown -R www-data:www-data /var/www/webmail/dist/
sudo chmod -R 755 /var/www/webmail/dist/

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
- ✅ Frontend: Static files served by Apache from `/var/www/webmail/dist/`
- ✅ Backend: Node.js API managed by PM2 on port 3001
- ✅ Apache: Proxies `/api` requests to backend, serves static files for everything else

Test all features:
- [ ] Login works
- [ ] Emails load
- [ ] Sending works
- [ ] All folders accessible
- [ ] Mobile responsive
- [ ] SSL certificate valid
