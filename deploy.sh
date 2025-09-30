#!/bin/bash

# Veebimajutus Webmail Deployment Script
# Usage: ./deploy.sh

set -e

echo "🚀 Starting deployment..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
  echo "❌ Please do not run as root"
  exit 1
fi

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm run install:all

# Build frontend
echo -e "${YELLOW}🔨 Building frontend...${NC}"
npm run build

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}📦 Installing PM2...${NC}"
    sudo npm install -g pm2
fi

# Stop existing process
echo -e "${YELLOW}🛑 Stopping existing backend process...${NC}"
pm2 stop webmail-backend 2>/dev/null || true

# Start backend with PM2
echo -e "${YELLOW}▶️  Starting backend with PM2...${NC}"
pm2 start ecosystem.config.cjs

# Save PM2 configuration
pm2 save

# Setup PM2 startup script (first time only)
if ! pm2 startup | grep -q "already"; then
    echo -e "${YELLOW}⚙️  Setting up PM2 startup...${NC}"
    pm2 startup
fi

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "📊 Backend status:"
pm2 status webmail-backend
echo ""
echo "📝 View backend logs: pm2 logs webmail-backend"
echo "🔄 Restart backend: pm2 restart webmail-backend"
echo ""
echo "📁 Frontend built to: ./dist/"
echo "🌐 Make sure nginx is configured to serve from this directory"
