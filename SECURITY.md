# Security Policy

## 🚨 CRITICAL: Credential Rotation Required

**If you forked this repository before January 2026, ALL API credentials were exposed in git history and MUST be rotated immediately.**

### Exposed Credentials (Now Removed)

The following sensitive data was previously committed to git history and has been removed:

1. **Twilio Credentials** (`.env` file)
   - Account SID
   - Auth Token
   - WhatsApp phone numbers

2. **Google Gemini API Key** (`.env` file)
   - API key for AI service

3. **Google Service Account** (`google-calendar-service-account.json`)
   - Full service account private key
   - Calendar access credentials

### Immediate Actions Required

⚠️ **Before deploying this application:**

1. **Rotate ALL API keys:**
   ```bash
   # Twilio: https://console.twilio.com
   # - Reset Auth Token

   # Google Gemini: https://aistudio.google.com/app/apikey
   # - Delete old API key
   # - Create new API key

   # Google Service Account: https://console.cloud.google.com
   # - Delete old service account
   # - Create new service account
   # - Download new credentials JSON
   ```

2. **Set up new environment variables:**
   ```bash
   cp .env.example .env
   # Add your NEW credentials to .env
   ```

3. **Never commit credentials:**
   - Always use `.env` for secrets
   - Double-check `.gitignore` includes `.env`
   - Verify no credentials in code with: `git log -p | grep -i "api.*key\|token\|password"`

### Customer Data Protection

This application stores customer PII (Personally Identifiable Information):
- Customer names, phone numbers, addresses
- Booking details and preferences

**Data Storage:**
- Stored in local JSON files (`/bookings/`, `/confirm/`)
- NOT stored in git repository (excluded via `.gitignore`)
- No encryption at rest (recommended for production)

**GDPR Compliance Recommendations:**
1. Implement data retention policy (auto-delete old bookings)
2. Add customer consent mechanism
3. Provide data export/deletion capabilities
4. Use encrypted database for production
5. Add privacy policy documentation

## Security Features

### Implemented

✅ **Environment Variables** - All secrets in `.env` file
✅ **Webhook Signature Validation** - Twilio requests are verified
✅ **CORS Configuration** - Limited to necessary origins
✅ **Input Sanitization** - User inputs are validated
✅ **Rate Limiting** - Prevents API abuse
✅ **Error Handling** - No sensitive data in error messages

### Recommended for Production

⚠️ **Authentication** - Add API key or OAuth for admin endpoints
⚠️ **HTTPS Only** - Force SSL/TLS in production
⚠️ **Database Encryption** - Encrypt customer data at rest
⚠️ **Audit Logging** - Log all booking actions
⚠️ **Backup Strategy** - Regular encrypted backups
⚠️ **WAF/DDoS Protection** - Use Cloudflare or similar
⚠️ **Dependency Scanning** - Regular `npm audit` checks
⚠️ **Secret Management** - Use AWS Secrets Manager, HashiCorp Vault, etc.

## Reporting a Vulnerability

If you discover a security vulnerability:

1. **DO NOT** open a public issue
2. Email the repository owner directly
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

Expected response time: 48 hours

## Security Best Practices for Deployment

### 1. Environment Configuration

```bash
# Production .env should have:
NODE_ENV=production
PORT=5001

# Strong, unique credentials (NEVER reuse from this repo)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Validate environment variables on startup
```

### 2. Webhook Security

```javascript
// Twilio signature validation is ENABLED by default
// Verify it's working:
curl -X POST https://your-domain.com/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
# Should return 403 Forbidden (signature invalid)
```

### 3. Rate Limiting

The application includes rate limiting:
- 100 requests per 15 minutes per IP
- Prevents brute force attacks
- Configurable in `index.js`

### 4. HTTPS Configuration

For production, use reverse proxy (nginx/Apache):

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 5. Docker Security

When using Docker:

```dockerfile
# Run as non-root user
USER node

# Use specific base image versions
FROM node:20-alpine

# Scan for vulnerabilities
# docker scan ai-booking-agent
```

### 6. Monitoring & Alerts

Set up monitoring for:
- Failed authentication attempts
- Unusual booking patterns
- API error rates
- Webhook failures
- Disk space (for JSON file storage)

Recommended tools:
- Application: PM2, New Relic, Datadog
- Infrastructure: Prometheus, Grafana
- Logs: ELK Stack, Splunk

## Security Checklist for Production

Before going live, verify:

- [ ] All credentials rotated and never committed to git
- [ ] `.env` file is in `.gitignore` and not in repository
- [ ] Twilio webhook signature validation is enabled
- [ ] HTTPS/TLS is configured and enforced
- [ ] Rate limiting is enabled and tested
- [ ] CORS is configured for your specific domain
- [ ] Error messages don't leak sensitive information
- [ ] Dependencies are updated (`npm audit fix`)
- [ ] Customer data is backed up regularly
- [ ] Privacy policy and terms of service are in place
- [ ] GDPR compliance measures are implemented (if applicable)
- [ ] Monitoring and alerting are configured
- [ ] Incident response plan is documented
- [ ] Regular security audits are scheduled

## Dependency Security

Keep dependencies updated:

```bash
# Check for vulnerabilities
npm audit

# Fix automatically (if possible)
npm audit fix

# Update to latest secure versions
npm update

# Check for outdated packages
npm outdated
```

Set up automated dependency updates:
- Use Dependabot (GitHub)
- Use Renovate Bot
- Use Snyk or similar service

## Compliance

### GDPR (EU)
- Obtain explicit consent for data processing
- Provide data export and deletion capabilities
- Implement data retention policies
- Document data processing activities

### CCPA (California)
- Disclose data collection practices
- Provide opt-out mechanism
- Allow data deletion requests

### PCI DSS
- **Not applicable** (no payment card data is stored)

## License

This security policy is part of the ai-agent-for-SMEs project.

---

**Last Updated:** January 9, 2026
**Security Contact:** See repository owner's profile for contact information
