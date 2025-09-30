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
echo -e "${YELLOW}🛑 Stopping existing process...${NC}"
pm2 stop webmail-backend 2>/dev/null || true

# Start with PM2
echo -e "${YELLOW}▶️  Starting backend with PM2...${NC}"
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script (first time only)
if ! pm2 startup | grep -q "already"; then
    echo -e "${YELLOW}⚙️  Setting up PM2 startup...${NC}"
    pm2 startup
fi

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "📊 Check status: pm2 status"
echo "📝 View logs: pm2 logs webmail-backend"
echo "🔄 Restart: pm2 restart webmail-backend"
