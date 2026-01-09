# 🎬 Demo Quick Start Guide

**This is your cheat sheet for recording the perfect demo!**

---

## ⚡ Pre-Recording Checklist

```bash
# 1. Clear old data
rm -rf bookings/*.json confirm/*.json states/*.json

# 2. Restart server
npm start

# 3. Start ngrok (in new terminal)
ngrok http 5001

# 4. Update Twilio webhook with new ngrok URL
# https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox

# 5. Test health
curl http://localhost:5001/health
```

---

## 📱 Demo Flow (5 minutes)

### Customer Phone (WhatsApp)

Message to: **+1 415 523 8886**

```
1. "Hi"
   → Bot greets and shows menu

2. "I want eyebrow threading"
   → Bot confirms service

3. "Tomorrow at 2pm"
   → Bot asks for name

4. "John Smith"
   → Bot asks for address

5. "123 Main Street, Dublin"
   → Bot shows summary

6. "Yes, confirm"
   → Booking created!
```

### Owner Phone

```
1. Receive booking notification
2. Reply: "CONFIRM"
3. Customer gets confirmation
```

### Browser

1. Open https://calendar.google.com
2. Show new event created

---

## 🎥 Recording Script

### Part 1: Intro (30s)
```
"AI-powered WhatsApp booking agent for small businesses.
Built with Node.js, Gemini AI, Twilio, and Google Calendar.
Let's see it in action..."
```

### Part 2: Customer Books (2min)
- Show WhatsApp conversation
- Highlight AI understanding natural language
- Show booking confirmation

### Part 3: Owner Approves (1min)
- Show owner notification
- Confirm booking
- Customer notification

### Part 4: Calendar Sync (30s)
- Open Google Calendar
- Show event created
- Highlight details

### Part 5: Tech Overview (1min)
- Show code structure
- Run: `curl http://localhost:5001/status | jq`
- Highlight Docker, security features

### Part 6: Wrap (30s)
```
"Production-ready, secure, scalable.
Perfect for salons, consultants, any appointment business.
Thanks for watching!"
```

---

## 📸 Screenshots Needed

1. ✅ WhatsApp greeting
2. ✅ Service selection
3. ✅ Booking summary
4. ✅ Owner notification
5. ✅ Calendar event
6. ✅ Status endpoint JSON
7. ✅ Docker files
8. ✅ Project structure

---

## 🔧 Quick Fixes

**Bot not responding?**
```bash
# Check ngrok is running
# Update Twilio webhook URL
# Check server logs
```

**Wrong number?**
```bash
# Customer: +1 415 523 8886
# Owner: [Your .env OWNER_PHONE]
```

**Restart everything:**
```bash
# Ctrl+C to stop server
npm start
# Ctrl+C to stop ngrok, then: ngrok http 5001
```

---

## 📦 After Recording

```bash
# 1. Commit demo guide
git add API_SETUP_GUIDE.md DEMO_QUICK_START.md
git commit -m "Add comprehensive API setup and demo guides"
git push

# 2. Upload screenshots to /docs/screenshots/
# 3. Update README.md with screenshots
# 4. Upload video to YouTube
# 5. Share on LinkedIn
```

---

## 🎯 Key Points to Mention

✅ **Natural language** - AI understands conversational booking
✅ **Real-time** - Instant WhatsApp notifications
✅ **Automated** - Calendar sync without manual entry
✅ **Secure** - Webhook validation, environment variables
✅ **Production-ready** - Docker, health checks, monitoring
✅ **Scalable** - Cloud-ready architecture

---

**You've got this! 🚀**

Full guide: `API_SETUP_GUIDE.md`
