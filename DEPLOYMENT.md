# Deployment Guide

Complete guide for deploying the AI Booking Agent to production.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Deployment Methods](#deployment-methods)
  - [Docker Deployment (Recommended)](#docker-deployment-recommended)
  - [Traditional Node.js Deployment](#traditional-nodejs-deployment)
  - [Cloud Platform Deployment](#cloud-platform-deployment)
- [Post-Deployment](#post-deployment)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Services

1. **Twilio Account** (WhatsApp Business API)
   - Sign up: https://www.twilio.com/console
   - Enable WhatsApp sandbox or get approved WhatsApp Business number
   - Note your Account SID and Auth Token

2. **Google Cloud Account** (Calendar API)
   - Create project: https://console.cloud.google.com
   - Enable Google Calendar API
   - Create service account and download JSON key
   - Share your Google Calendar with the service account email

3. **Google AI Studio** (Gemini API)
   - Get API key: https://aistudio.google.com/app/apikey

### System Requirements

- **Node.js**: v18 or v20 (LTS)
- **npm**: v9 or higher
- **Docker**: v24+ (for container deployment)
- **Docker Compose**: v2.0+ (optional, for easier management)
- **Memory**: Minimum 512MB RAM
- **Storage**: 1GB available space
- **Network**: Public IP or tunnel service (ngrok) for webhooks

---

## Environment Setup

### 1. Clone the Repository

```bash
git clone https://github.com/DevEnjoysMath/ai-agent-for-SMEs.git
cd ai-agent-for-SMEs
```

### 2. Create Environment File

```bash
cp .env.example .env
```

### 3. Configure Environment Variables

Edit `.env` with your credentials:

```bash
# Server Configuration
PORT=5001
NODE_ENV=production

# Security (keep false in production)
SKIP_TWILIO_VALIDATION=false

# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+14155238886  # Your Twilio WhatsApp number

# Business Information
BUSINESS_NAME=Your Business Name
SERVICE_AREA=Your City - Home Service
BUSINESS_PHONE=+353 85 808 8578
BUSINESS_HOURS=Mon–Sun: 9am–10pm
OWNER_NAME=Owner Name
OWNER_PHONE=+353858088571  # Owner's WhatsApp number for confirmations
WHATSAPP_NUMBER=+14155238886  # Same as TWILIO_PHONE_NUMBER

# Google Calendar Configuration
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_CALENDAR_ID=your-email@gmail.com
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}  # Entire JSON as string

# Google Gemini AI
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Important Notes:**
- Replace ALL placeholder values with your actual credentials
- Keep the `GOOGLE_SERVICE_ACCOUNT_KEY` as a single-line JSON string
- NEVER commit the `.env` file to version control
- Use strong, unique credentials (don't reuse from examples)

---

## Deployment Methods

### Docker Deployment (Recommended)

Best for: Production environments, cloud deployments, easy scaling

#### Build and Run with Docker Compose

```bash
# 1. Build the image
docker-compose build

# 2. Start the service
docker-compose up -d

# 3. Check status
docker-compose ps
docker-compose logs -f

# 4. Test health
curl http://localhost:5001/health
```

#### Manual Docker Commands

```bash
# Build image
docker build -t ai-booking-agent:latest .

# Run container
docker run -d \
  --name ai-booking-agent \
  -p 5001:5001 \
  --env-file .env \
  -v $(pwd)/bookings:/app/bookings \
  -v $(pwd)/confirm:/app/confirm \
  -v $(pwd)/states:/app/states \
  --restart unless-stopped \
  ai-booking-agent:latest

# View logs
docker logs -f ai-booking-agent

# Stop container
docker stop ai-booking-agent

# Remove container
docker rm ai-booking-agent
```

#### Docker Management Commands

```bash
# Update and restart
docker-compose pull
docker-compose up -d

# View resource usage
docker stats ai-booking-agent

# Execute command in container
docker exec -it ai-booking-agent sh

# Backup data
docker run --rm \
  -v ai-agent-for-smes_bookings:/backup \
  -v $(pwd):/output \
  alpine tar czf /output/bookings-backup.tar.gz /backup
```

---

### Traditional Node.js Deployment

Best for: Development, small-scale deployments, VPS hosting

#### Installation

```bash
# 1. Install dependencies
npm install --production

# 2. Test the application
npm start

# 3. Application should start on http://localhost:5001
```

#### Using PM2 (Process Manager)

PM2 keeps your app running, restarts on crashes, and provides monitoring.

```bash
# Install PM2 globally
npm install -g pm2

# Start application
pm2 start index.js --name ai-booking-agent

# Configure auto-restart on server reboot
pm2 startup
pm2 save

# Monitor
pm2 monit

# View logs
pm2 logs ai-booking-agent

# Restart application
pm2 restart ai-booking-agent

# Stop application
pm2 stop ai-booking-agent

# Remove from PM2
pm2 delete ai-booking-agent
```

#### Using systemd (Linux Service)

Create `/etc/systemd/system/ai-booking-agent.service`:

```ini
[Unit]
Description=AI Booking Agent
After=network.target

[Service]
Type=simple
User=nodejs
WorkingDirectory=/opt/ai-booking-agent
ExecStart=/usr/bin/node index.js
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=ai-booking-agent
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Commands:

```bash
# Reload systemd
sudo systemctl daemon-reload

# Start service
sudo systemctl start ai-booking-agent

# Enable auto-start on boot
sudo systemctl enable ai-booking-agent

# Check status
sudo systemctl status ai-booking-agent

# View logs
sudo journalctl -u ai-booking-agent -f
```

---

### Cloud Platform Deployment

#### Option 1: Heroku

```bash
# Install Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# Login
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set TWILIO_ACCOUNT_SID=ACxxxx
heroku config:set TWILIO_AUTH_TOKEN=xxxx
# ... set all other env vars from .env

# Deploy
git push heroku main

# Open app
heroku open

# View logs
heroku logs --tail
```

#### Option 2: DigitalOcean App Platform

1. Connect your GitHub repository
2. Configure environment variables in the App Platform UI
3. Set build command: `npm install`
4. Set run command: `npm start`
5. Deploy

#### Option 3: AWS (EC2 + Docker)

```bash
# SSH into EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Clone repository
git clone https://github.com/your-username/ai-agent-for-SMEs.git
cd ai-agent-for-SMEs

# Configure .env
nano .env  # Add your credentials

# Run with Docker Compose
docker-compose up -d

# Configure security group to allow port 5001
# Or use nginx reverse proxy on port 80/443
```

#### Option 4: Railway

1. Go to https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Add environment variables
5. Railway will auto-detect Dockerfile and deploy

#### Option 5: Google Cloud Run

```bash
# Install Google Cloud SDK
# https://cloud.google.com/sdk/docs/install

# Login and set project
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Build and deploy
gcloud run deploy ai-booking-agent \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 5001

# Set environment variables
gcloud run services update ai-booking-agent \
  --update-env-vars "NODE_ENV=production,TWILIO_ACCOUNT_SID=ACxxxx,..."
```

---

## Post-Deployment

### 1. Configure Twilio Webhooks

Set your webhook URL in Twilio Console:

**WhatsApp Sandbox:**
1. Go to: https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox
2. Set "WHEN A MESSAGE COMES IN" to: `https://your-domain.com/whatsapp`
3. Method: `POST`

**Production WhatsApp Number:**
1. Go to: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
2. Configure webhook URL for your approved number

### 2. Set Up Ngrok (Development/Testing)

If you don't have a public domain yet:

```bash
# Install ngrok
# https://ngrok.com/download

# Start ngrok tunnel
ngrok http 5001

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Use this as your webhook URL in Twilio
```

### 3. Test the Deployment

```bash
# Test health endpoint
curl https://your-domain.com/health

# Test status endpoint
curl https://your-domain.com/status

# Send test WhatsApp message to your Twilio number
# You should receive a response from the bot
```

### 4. Verify Services

- ✅ Application starts without errors
- ✅ Health check responds (GET /health)
- ✅ Status check shows all services configured (GET /status)
- ✅ Twilio webhooks receive messages
- ✅ Google Calendar integration works
- ✅ Booking flow completes successfully
- ✅ Owner receives confirmation requests

---

## Monitoring & Maintenance

### Health Checks

Use these endpoints for monitoring:

```bash
# Basic health (200 OK if running)
curl https://your-domain.com/health

# Detailed status (shows all services)
curl https://your-domain.com/status

# Readiness check (503 if not ready)
curl https://your-domain.com/ready
```

### Uptime Monitoring Services

Set up external monitoring:

- **UptimeRobot** (Free): https://uptimerobot.com
  - Monitor: `https://your-domain.com/health`
  - Interval: 5 minutes
  - Alert via email/SMS if down

- **Pingdom**: https://www.pingdom.com
- **StatusCake**: https://www.statuscake.com
- **Better Uptime**: https://betteruptime.com

### Log Management

#### Docker Logs

```bash
# View logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Specific service
docker-compose logs -f ai-booking-agent

# Save logs to file
docker-compose logs --no-color > logs.txt
```

#### PM2 Logs

```bash
# View logs
pm2 logs ai-booking-agent

# Clear logs
pm2 flush

# Configure log rotation (pm2 install pm2-logrotate)
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Backup Strategy

#### Automated Backup Script

Create `backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/backups/ai-booking-agent"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup booking data
tar -czf $BACKUP_DIR/bookings_$DATE.tar.gz \
  bookings/ confirm/ states/

# Keep only last 7 days
find $BACKUP_DIR -name "bookings_*.tar.gz" -mtime +7 -delete

echo "Backup completed: bookings_$DATE.tar.gz"
```

Schedule with cron:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /opt/ai-booking-agent/backup.sh >> /var/log/backup.log 2>&1
```

### Performance Monitoring

Monitor these metrics:

- **Response Time**: Should be < 1000ms for most endpoints
- **Memory Usage**: Should stay under 512MB
- **CPU Usage**: Peaks during AI requests (normal)
- **Disk Usage**: Monitor bookings/ directory size
- **Webhook Success Rate**: Should be > 95%

### Security Updates

```bash
# Check for vulnerabilities
npm audit

# Update dependencies (test first!)
npm update
npm audit fix

# Rebuild Docker image
docker-compose build --no-cache
docker-compose up -d
```

---

## Troubleshooting

### Common Issues

#### 1. Application Won't Start

**Error**: `Missing required environment variables`

**Solution**:
```bash
# Check .env file exists
ls -la .env

# Verify all required variables are set
cat .env | grep -E "(TWILIO_|OWNER_PHONE|WHATSAPP_NUMBER)"

# If missing, copy from example and configure
cp .env.example .env
nano .env
```

#### 2. Webhook Validation Fails

**Error**: `403 Forbidden - Invalid signature`

**Solution**:
```bash
# 1. Verify webhook URL matches exactly what Twilio sends to
#    (including https://, port, path)

# 2. Check if using ngrok - URL changes on restart
#    Update Twilio webhook URL with new ngrok URL

# 3. For local development, temporarily disable validation
echo "SKIP_TWILIO_VALIDATION=true" >> .env
# IMPORTANT: Set to false for production!
```

#### 3. Google Calendar Not Working

**Error**: `Calendar not initialized` or `401 Unauthorized`

**Solution**:
```bash
# 1. Verify service account key is valid JSON
echo $GOOGLE_SERVICE_ACCOUNT_KEY | jq .

# 2. Check service account has calendar access
#    - Open Google Calendar
#    - Settings → Shared Calendars
#    - Share with service account email
#    - Grant "Make changes to events" permission

# 3. Verify Calendar API is enabled
#    https://console.cloud.google.com/apis/library/calendar-json.googleapis.com
```

#### 4. Port Already in Use

**Error**: `EADDRINUSE: address already in use :::5001`

**Solution**:
```bash
# Find process using port 5001
lsof -i :5001
# or
netstat -tulpn | grep :5001

# Kill the process
kill -9 <PID>

# Or change port in .env
echo "PORT=5002" >> .env
```

#### 5. Docker Container Exits Immediately

**Solution**:
```bash
# Check logs
docker-compose logs

# Run interactively to see errors
docker-compose run --rm ai-booking-agent sh

# Check environment variables
docker-compose config

# Rebuild without cache
docker-compose build --no-cache
```

### Debug Mode

Enable detailed logging:

```bash
# Set debug environment variable
export DEBUG=*
npm start

# Or for Docker
docker run -e DEBUG=* -e NODE_ENV=development ...
```

### Getting Help

If issues persist:

1. **Check Logs**: Application logs contain detailed error messages
2. **Test Endpoints**: Use curl to test each endpoint individually
3. **Verify Configuration**: Double-check all environment variables
4. **Review SECURITY.md**: Ensure credentials are properly rotated
5. **GitHub Issues**: Open an issue with logs and configuration (remove secrets!)

---

## Performance Optimization

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Enable webhook signature validation
- [ ] Configure proper logging (not console.log in production)
- [ ] Set up log rotation
- [ ] Configure automated backups
- [ ] Set up uptime monitoring
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall rules
- [ ] Set up rate limiting (already included)
- [ ] Optimize Docker image size
- [ ] Configure resource limits
- [ ] Set up crash recovery (PM2/Docker restart policy)
- [ ] Monitor memory/CPU usage
- [ ] Regular security updates

### Scaling Considerations

For high traffic:

1. **Horizontal Scaling**: Deploy multiple instances behind load balancer
2. **Database**: Migrate from file storage to PostgreSQL/MongoDB
3. **Caching**: Add Redis for session management
4. **Queue**: Add job queue (Bull/BullMQ) for async processing
5. **CDN**: Serve static files through CDN
6. **Database Connection Pooling**: Optimize database connections

---

## Support & Resources

- **Documentation**: [README.md](README.md)
- **Security**: [SECURITY.md](SECURITY.md)
- **Repository**: https://github.com/DevEnjoysMath/ai-agent-for-SMEs
- **Issues**: https://github.com/DevEnjoysMath/ai-agent-for-SMEs/issues

---

**Last Updated**: January 2026
**Version**: 1.0.0
