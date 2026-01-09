# 🤖 AI Booking Agent for SMEs

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-ready-blue.svg)](Dockerfile)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Security](https://img.shields.io/badge/security-audited-success.svg)](SECURITY.md)

> **An intelligent WhatsApp-based booking system powered by Google Gemini AI, designed for small businesses to automate appointment scheduling, customer communication, and calendar management.**

Perfect for beauty salons, spas, home service providers, consultants, and any business that takes appointments.

---

## 📋 Table of Contents

- [Features](#-features)
- [Demo & Screenshots](#-demo--screenshots)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [Deployment](#-deployment)
- [Architecture](#-architecture)
- [API Endpoints](#-api-endpoints)
- [Security](#-security)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

### Core Functionality
- 🤖 **Natural Language Processing** - Powered by Google Gemini AI for conversational booking
- 📱 **WhatsApp Integration** - Customers book via WhatsApp, no app download required
- 📅 **Google Calendar Sync** - Automatic calendar event creation and management
- ✅ **Owner Confirmation** - Manual approval workflow for booking control
- 🔔 **Real-time Notifications** - Instant WhatsApp alerts for customers and owners
- 🏠 **Home Service Support** - Perfect for mobile businesses

### Business Features
- 🕒 **Business Hours Validation** - Prevents bookings outside operating hours
- 📍 **Service Area Validation** - Configurable geographic restrictions
- 💼 **Multi-Service Support** - Handle multiple service types with different pricing
- 📊 **Booking Management** - Track pending, confirmed, and rejected bookings
- 🔄 **Conversation State** - Maintains context throughout booking flow

### Technical Features
- 🐳 **Docker Ready** - Containerized for easy deployment
- 🔒 **Security First** - Webhook validation, environment-based secrets, no hardcoded credentials
- 📈 **Health Monitoring** - Built-in health check and status endpoints
- 🚀 **Production Ready** - Error handling, retry mechanisms, graceful shutdown
- 📝 **Comprehensive Logging** - Detailed logs for debugging and monitoring
- 🔄 **Auto Port Resolution** - Handles port conflicts automatically

---

## 📸 Demo & Screenshots

### Live Demo

> **Note**: For a live demo, please refer to the video/screenshots below showing the booking flow.

### Screenshots

**Customer Booking Flow**
```
[Screenshot 1: Customer initiates conversation]
[Screenshot 2: Service selection]
[Screenshot 3: Date/time selection]
[Screenshot 4: Booking confirmation]
```

**Owner Confirmation Flow**
```
[Screenshot 5: Owner receives booking request]
[Screenshot 6: Owner confirms booking]
[Screenshot 7: Customer receives confirmation]
```

**Admin Dashboard**
```
[Screenshot 8: Health status endpoint]
[Screenshot 9: System status overview]
```

> 💡 **For Portfolio**: Add actual screenshots after deployment. Take screenshots of:
> - WhatsApp conversation flow (customer side)
> - WhatsApp notifications (owner side)
> - Google Calendar integration
> - Health/Status API responses
> - Docker deployment

---

## 🛠 Tech Stack

### Backend
- **Runtime**: Node.js 20.x
- **Framework**: Express.js
- **Language**: JavaScript (ES6+)

### Integrations
- **AI**: Google Gemini (Generative AI)
- **Messaging**: Twilio (WhatsApp Business API)
- **Calendar**: Google Calendar API
- **Storage**: File-based (upgradeable to database)

### DevOps
- **Container**: Docker & Docker Compose
- **Process Manager**: PM2 (optional)
- **Deployment**: Cloud-agnostic (Heroku, Railway, AWS, GCP, DigitalOcean)

### Development
- **Environment**: dotenv
- **HTTP Client**: axios, node-fetch
- **Authentication**: Google OAuth 2.0
- **Validation**: Twilio webhook signatures

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ or Docker
- Twilio account (free tier available)
- Google Cloud account (free tier available)
- Google Gemini API key (free tier available)

### 1-Minute Setup

```bash
# Clone the repository
git clone https://github.com/DevEnjoysMath/ai-agent-for-SMEs.git
cd ai-agent-for-SMEs

# Run automated setup
chmod +x setup.sh
./setup.sh

# Or manual setup
cp .env.example .env
# Edit .env with your credentials
npm install
npm start
```

### Quick Test

```bash
# Check health
curl http://localhost:5001/health

# Check status
curl http://localhost:5001/status

# Send WhatsApp message to your Twilio number to test!
```

---

## 📦 Installation

### Option 1: Automated Setup (Recommended)

```bash
./setup.sh
```

The setup script will:
- ✅ Check system requirements
- ✅ Create necessary directories
- ✅ Configure environment variables
- ✅ Install dependencies
- ✅ Run security audit
- ✅ Offer deployment options

### Option 2: Manual Setup

```bash
# 1. Install dependencies
npm install

# 2. Create directories
mkdir -p bookings confirm states logs

# 3. Configure environment
cp .env.example .env
nano .env  # Add your credentials

# 4. Start application
npm start
```

### Option 3: Docker

```bash
# Build and run
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## ⚙️ Configuration

### Environment Variables

Create `.env` file with the following:

```env
# Server Configuration
PORT=5001
NODE_ENV=production

# Security (NEVER set to true in production!)
SKIP_TWILIO_VALIDATION=false

# Twilio Configuration (WhatsApp)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+14155238886

# Business Information
BUSINESS_NAME=Your Business Name
SERVICE_AREA=Your City - Home Service
BUSINESS_PHONE=+1234567890
BUSINESS_HOURS=Mon–Sun: 9am–10pm
OWNER_NAME=Owner Name
OWNER_PHONE=+1234567890
WHATSAPP_NUMBER=+14155238886

# Google Calendar
GOOGLE_SERVICE_ACCOUNT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_CALENDAR_ID=your-email@gmail.com
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# Google Gemini AI
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### Getting API Credentials

#### 1. Twilio (WhatsApp)
1. Sign up: https://www.twilio.com/console
2. Navigate to WhatsApp → Senders
3. Get Account SID and Auth Token
4. Configure WhatsApp Sandbox or get approved number

#### 2. Google Calendar
1. Go to: https://console.cloud.google.com
2. Create new project
3. Enable Google Calendar API
4. Create Service Account → Download JSON key
5. Copy JSON content to `GOOGLE_SERVICE_ACCOUNT_KEY`
6. Share your Google Calendar with service account email

#### 3. Google Gemini
1. Visit: https://aistudio.google.com/app/apikey
2. Create API key
3. Copy to `GEMINI_API_KEY`

---

## 💬 Usage

### Customer Booking Flow

1. **Initiate Conversation**
   - Customer sends WhatsApp message to your Twilio number
   - Bot greets and offers service options

2. **Service Selection**
   - Customer selects desired service
   - Bot provides pricing and duration

3. **Schedule Appointment**
   - Customer provides preferred date/time
   - Bot validates business hours and availability

4. **Provide Details**
   - Customer enters name and address
   - Bot confirms all information

5. **Confirmation**
   - Customer confirms booking
   - Bot creates calendar event
   - Owner receives confirmation request

6. **Owner Approval**
   - Owner replies "CONFIRM" or "REJECT"
   - Customer receives final confirmation

### Owner Commands

Via WhatsApp:
- `CONFIRM` - Approve pending booking
- `REJECT` - Decline pending booking

---

## 🚀 Deployment

### Quick Deploy Options

#### Heroku
```bash
heroku create your-app-name
heroku config:set NODE_ENV=production [... other env vars]
git push heroku main
```

#### Railway
1. Connect GitHub repository
2. Add environment variables
3. Deploy automatically

#### Docker (Any VPS)
```bash
docker-compose up -d
```

### Production Checklist

- [ ] All environment variables configured
- [ ] Twilio webhooks set to production URL
- [ ] Google Calendar shared with service account
- [ ] HTTPS enabled (use nginx or cloud platform)
- [ ] Webhook signature validation enabled
- [ ] Health monitoring configured
- [ ] Backups automated
- [ ] Logs configured and rotating

**Full deployment guide**: [DEPLOYMENT.md](DEPLOYMENT.md)

---

## 🏗 Architecture

### System Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  Customer   │ ◄─────► │   Twilio     │ ◄─────► │   Express   │
│  (WhatsApp) │         │  (WhatsApp)  │         │   Server    │
└─────────────┘         └──────────────┘         └──────┬──────┘
                                                         │
                                     ┌───────────────────┼───────────────────┐
                                     │                   │                   │
                                     ▼                   ▼                   ▼
                              ┌──────────┐       ┌─────────────┐    ┌──────────┐
                              │  Gemini  │       │   Google    │    │   File   │
                              │    AI    │       │  Calendar   │    │  Storage │
                              └──────────┘       └─────────────┘    └──────────┘
```

### Booking Flow

```
Customer → WhatsApp Message
    ↓
Twilio Webhook
    ↓
Express Server (Signature Validation)
    ↓
Gemini AI (Intent Recognition)
    ↓
State Management (Conversation Context)
    ↓
Validation (Business Hours, Service Area)
    ↓
Booking Created (File Storage)
    ↓
Google Calendar Event Created
    ↓
Owner Notification (WhatsApp)
    ↓
Owner Confirmation/Rejection
    ↓
Customer Final Notification
```

### Data Flow

- **Conversation State**: Stored in `states/` directory (JSON files)
- **Pending Bookings**: Stored in `bookings/` directory
- **Confirmed Bookings**: Moved to `confirm/` directory
- **Rejected Bookings**: Moved to `rejected/` directory

---

## 🔌 API Endpoints

### Health & Monitoring

#### `GET /health`
Basic health check for load balancers.

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-09T12:00:00.000Z",
  "uptime": 3600.5
}
```

#### `GET /status`
Detailed system status.

**Response**:
```json
{
  "status": "operational",
  "timestamp": "2026-01-09T12:00:00.000Z",
  "uptime": 3600.5,
  "environment": "production",
  "version": "1.0.0",
  "services": {
    "twilio": { "status": "configured" },
    "googleCalendar": { "status": "configured" },
    "geminiAI": { "status": "configured" }
  },
  "system": {
    "nodeVersion": "v20.11.0",
    "platform": "linux",
    "memory": {
      "total": "256 MB",
      "used": "128 MB",
      "percentage": "50%"
    }
  }
}
```

#### `GET /ready`
Kubernetes-style readiness probe.

**Response**:
```json
{
  "ready": true,
  "timestamp": "2026-01-09T12:00:00.000Z"
}
```

### Application Endpoints

#### `POST /chat`
Web-based chat interface (for testing).

#### `POST /whatsapp` (Protected)
Twilio WhatsApp webhook endpoint.
- **Authentication**: Twilio signature validation
- **Method**: POST
- **Content-Type**: application/x-www-form-urlencoded

#### `POST /webhook` (Protected)
Owner confirmation webhook.
- **Authentication**: Twilio signature validation
- **Method**: POST

#### `POST /confirm`
Manual confirmation endpoint (for testing).

---

## 🔒 Security

### Implemented Security Features

✅ **Environment-based Secrets** - All credentials in `.env`
✅ **Twilio Webhook Validation** - Signature verification on all webhooks
✅ **No Hardcoded Credentials** - Fails fast if env vars missing
✅ **CORS Configuration** - Configurable origin restrictions
✅ **Input Sanitization** - Validation on all user inputs
✅ **Rate Limiting** - Protection against API abuse
✅ **Secure Error Handling** - No sensitive data in error messages
✅ **Non-root Docker User** - Container runs as unprivileged user
✅ **Health Check Endpoints** - For monitoring and alerting

### Security Best Practices

- 🔐 Rotate API keys regularly
- 🔒 Enable HTTPS in production
- 📝 Review logs for suspicious activity
- 🔄 Keep dependencies updated (`npm audit`)
- 🚫 Never commit `.env` file
- 📋 Follow principle of least privilege
- 🛡️ Use WAF/DDoS protection in production

**Full security documentation**: [SECURITY.md](SECURITY.md)

---

## 📊 Monitoring

### Built-in Monitoring

- Health check endpoint (`/health`)
- Detailed status endpoint (`/status`)
- Readiness probe (`/ready`)
- Comprehensive logging

### Recommended Monitoring Tools

- **Uptime**: UptimeRobot, Pingdom, StatusCake
- **Logs**: ELK Stack, Splunk, Papertrail
- **APM**: New Relic, Datadog, AppDynamics
- **Errors**: Sentry, Rollbar

---

## 🧪 Testing

### Manual Testing

```bash
# Test conversation flows
node test-conversation-flows.js

# Test webhooks
node test-whatsapp-simple.js

# Test owner response
node test-owner-response.js
```

### Automated Testing (Coming Soon)

- Unit tests with Jest
- Integration tests with Supertest
- E2E tests with Playwright

---

## 📈 Roadmap

### Version 1.0 (Current)
- ✅ WhatsApp integration
- ✅ Google Calendar sync
- ✅ AI-powered conversations
- ✅ Owner confirmation workflow
- ✅ Docker deployment
- ✅ Health monitoring

### Version 2.0 (Planned)
- 🔄 Database integration (PostgreSQL/MongoDB)
- 📊 Analytics dashboard
- 💳 Payment integration (Stripe)
- 🔔 SMS notifications
- 📱 Mobile admin app
- 🌍 Multi-language support

### Version 3.0 (Future)
- 👥 Staff management
- 📍 Multi-location support
- 🗓️ Advanced scheduling (recurring appointments)
- 🎫 Loyalty program
- 📧 Email marketing integration
- 🤖 Advanced AI features (recommendations, upselling)

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and development process.

---

## 📝 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**DevEnjoysMath**

- GitHub: [@DevEnjoysMath](https://github.com/DevEnjoysMath)
- Repository: [ai-agent-for-SMEs](https://github.com/DevEnjoysMath/ai-agent-for-SMEs)

---

## 🙏 Acknowledgments

- [Twilio](https://www.twilio.com/) for WhatsApp Business API
- [Google Cloud](https://cloud.google.com/) for Calendar and Gemini AI
- [Express.js](https://expressjs.com/) for the web framework
- [Docker](https://www.docker.com/) for containerization
- All contributors and testers

---

## 📞 Support

- **Documentation**: [README.md](README.md) (this file)
- **Deployment Guide**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Security**: [SECURITY.md](SECURITY.md)
- **Issues**: [GitHub Issues](https://github.com/DevEnjoysMath/ai-agent-for-SMEs/issues)

---

## ⭐ Star History

If this project helped you, please consider giving it a ⭐️!

---

**Built with ❤️ for small businesses everywhere**
