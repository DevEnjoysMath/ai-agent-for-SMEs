# 🚀 Complete API Setup Guide for Live Demo

**Time Required:** 30-45 minutes
**Cost:** FREE (all services have free tiers)
**Goal:** Get a fully working WhatsApp booking system for demo recording

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Google Gemini AI (5 minutes)](#step-1-google-gemini-ai)
3. [Step 2: Twilio WhatsApp (15 minutes)](#step-2-twilio-whatsapp)
4. [Step 3: Google Calendar API (15 minutes)](#step-3-google-calendar-api)
5. [Step 4: Configure .env File](#step-4-configure-env-file)
6. [Step 5: Test the Application](#step-5-test-the-application)
7. [Step 6: Record Your Demo](#step-6-record-your-demo)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, you'll need:

- ✅ Google Account (Gmail)
- ✅ Phone number for WhatsApp testing
- ✅ Credit/Debit card (for verification only - **NO charges on free tier**)
- ✅ This project cloned and npm installed

---

## Step 1: Google Gemini AI

**Time:** 5 minutes
**Cost:** FREE (up to 60 requests per minute)

### 1.1 Get Your API Key

1. **Visit Google AI Studio:**
   ```
   https://aistudio.google.com/app/apikey
   ```

2. **Sign in** with your Google account

3. **Click "Create API Key"**
   - Select "Create API key in new project" (or choose existing project)
   - Click "Create API key"

4. **Copy the API key**
   - It looks like: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`
   - Save it somewhere safe (we'll use it later)

5. **Important:** Keep this tab open or save the key - you can't see it again!

### 1.2 Verify It Works

Test your key:
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_API_KEY_HERE" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

You should see a JSON response with AI-generated text.

✅ **Done!** Save your API key for Step 4.

---

## Step 2: Twilio WhatsApp

**Time:** 15 minutes
**Cost:** FREE trial ($15.50 credit, no charge)
**Limitation:** Can send to 1-2 verified numbers only (perfect for demo!)

### 2.1 Create Twilio Account

1. **Visit Twilio:**
   ```
   https://www.twilio.com/try-twilio
   ```

2. **Sign up** with:
   - Email address
   - Password
   - Phone number (for verification)

3. **Verify your phone** via SMS code

4. **Skip the onboarding questions** (or answer them)
   - "What are you building?" → Skip or select "Chatbots/Virtual Agents"
   - Choose your preferred language: JavaScript/Node.js

### 2.2 Get Your Credentials

1. **Go to Dashboard:**
   ```
   https://console.twilio.com/
   ```

2. **Find your credentials** (on the main dashboard):
   ```
   Account SID:  ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   Auth Token:   xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

   Click the "eye" icon to reveal Auth Token.

3. **Copy both values** - save them for Step 4

### 2.3 Set Up WhatsApp Sandbox

**Important:** Twilio's WhatsApp sandbox lets you test without business verification!

1. **Go to WhatsApp Sandbox:**
   ```
   https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
   ```

2. **Join the Sandbox:**
   - You'll see a number like: `+1 415 523 8886`
   - You'll see a code like: `join <code-word>`

3. **On your phone:**
   - Open WhatsApp
   - Create a new message to: **+1 415 523 8886**
   - Send the message: **join <code-word>** (e.g., `join shadow-morning`)
   - You should receive a confirmation!

4. **Copy the Twilio WhatsApp number:**
   ```
   Twilio Number: +14155238886
   ```

### 2.4 Configure Webhook (We'll do this after testing)

We'll set this up in Step 5 after getting the app running.

✅ **Done!** Save these for Step 4:
- Account SID
- Auth Token
- Twilio WhatsApp Number (+14155238886)

---

## Step 3: Google Calendar API

**Time:** 15 minutes
**Cost:** FREE (unlimited for Calendar API)

### 3.1 Create Google Cloud Project

1. **Go to Google Cloud Console:**
   ```
   https://console.cloud.google.com/
   ```

2. **Create a new project:**
   - Click the project dropdown (top left)
   - Click "New Project"
   - Name: `ai-booking-agent` (or any name)
   - Click "Create"
   - Wait 10-20 seconds for it to be created

3. **Select your new project** from the dropdown

### 3.2 Enable Calendar API

1. **Go to APIs & Services:**
   ```
   https://console.cloud.google.com/apis/library
   ```

2. **Search for "Google Calendar API"**

3. **Click on it** → **Click "Enable"**

4. **Wait for it to enable** (takes 5-10 seconds)

### 3.3 Create Service Account

1. **Go to Credentials:**
   ```
   https://console.cloud.google.com/apis/credentials
   ```

2. **Click "Create Credentials"** → **"Service Account"**

3. **Fill in details:**
   - Service account name: `booking-agent`
   - Service account ID: (auto-filled)
   - Description: `AI Booking Agent Calendar Access`
   - Click "Create and Continue"

4. **Grant permissions:**
   - Role: Select "Editor" (for testing - use more restrictive in production)
   - Click "Continue"
   - Click "Done"

### 3.4 Create Service Account Key

1. **Find your service account** in the list

2. **Click on it** to open details

3. **Go to "Keys" tab**

4. **Click "Add Key"** → **"Create new key"**

5. **Choose "JSON"** → **Click "Create"**

6. **A JSON file downloads** - DON'T LOSE THIS!
   - It's named something like: `ai-booking-agent-xxxxxx.json`
   - This file contains your private key

### 3.5 Share Your Calendar

1. **Open Google Calendar:**
   ```
   https://calendar.google.com/
   ```

2. **Go to Settings:**
   - Click the gear icon (top right)
   - Click "Settings"

3. **Select your calendar** (usually your email)

4. **Scroll to "Share with specific people"**

5. **Click "Add people"**

6. **Add the service account email:**
   - Open the JSON file you downloaded
   - Find the `"client_email"` field
   - It looks like: `booking-agent@ai-booking-agent-xxxxxx.iam.gserviceaccount.com`
   - Copy and paste it

7. **Set permissions:**
   - Choose "Make changes to events"
   - Click "Send"

8. **Copy your Calendar ID:**
   - In Settings, scroll to "Integrate calendar"
   - Copy the "Calendar ID" (usually your email address)

✅ **Done!** You now have:
- Service account JSON file
- Service account email (from JSON)
- Your Calendar ID

---

## Step 4: Configure .env File

Now let's put all the credentials together!

### 4.1 Prepare Service Account Key

1. **Open the downloaded JSON file** in a text editor

2. **Copy the ENTIRE content** (it's a single line of JSON)

3. **Remove ALL line breaks** - it must be ONE continuous line

4. **The JSON should look like:**
   ```json
   {"type":"service_account","project_id":"ai-booking-agent-123456","private_key_id":"abc123...","private_key":"-----BEGIN PRIVATE KEY-----\nXXXXX\n-----END PRIVATE KEY-----\n","client_email":"booking-agent@ai-booking-agent-123456.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/booking-agent%40ai-booking-agent-123456.iam.gserviceaccount.com"}
   ```

### 4.2 Update .env File

1. **Open `.env` file** in your project

2. **Fill in ALL values:**

```env
# Server Configuration
PORT=5001
NODE_ENV=development

# Security Configuration (Development only)
SKIP_TWILIO_VALIDATION=false

# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx    # From Twilio Dashboard
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx       # From Twilio Dashboard
TWILIO_PHONE_NUMBER=+14155238886                         # Twilio WhatsApp Number

# Business Information
BUSINESS_NAME=Puja's Beauty Parlour
SERVICE_AREA=Dublin – Home Service Only
BUSINESS_PHONE=+353 85 808 8578
BUSINESS_HOURS=Mon–Sun: 9am–10pm
OWNER_NAME=Puja
OWNER_PHONE=+353858088571                                # YOUR WhatsApp number for confirmations
OWNER_WHATSAPP_NUMBER=+353858088571                      # Same as above
WHATSAPP_NUMBER=+14155238886                             # Twilio WhatsApp Number

# Google Gemini AI
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX  # From Google AI Studio

# Google Calendar Configuration
GOOGLE_SERVICE_ACCOUNT_EMAIL=booking-agent@ai-booking-agent-123456.iam.gserviceaccount.com
GOOGLE_CALENDAR_ID=your-email@gmail.com                  # Your Google Calendar email
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...} # ENTIRE JSON on ONE line
```

### 4.3 Important Notes

- ✅ **OWNER_PHONE**: Use YOUR actual WhatsApp number (must be verified in Twilio sandbox)
- ✅ **GOOGLE_SERVICE_ACCOUNT_KEY**: Must be ONE continuous line, no breaks
- ✅ **All values must NOT have quotes** - just the raw values

### 4.4 Verify Your .env

Run this to check for common mistakes:

```bash
# Check if .env exists and has content
cat .env | grep -v "^#" | grep -v "^$"

# Verify Twilio SID starts with AC
grep "TWILIO_ACCOUNT_SID=AC" .env

# Verify Gemini key starts with AIza
grep "GEMINI_API_KEY=AIza" .env
```

✅ **Done!** Your .env is configured!

---

## Step 5: Test the Application

### 5.1 Start the Server

```bash
# Make sure you're in the project directory
cd /path/to/ai-agent-for-SMEs

# Install dependencies (if not done)
npm install

# Start the server
npm start
```

You should see:
```
✅ Twilio client initialized
✅ Server configuration loaded
✅ Google Calendar initialized
🚀 Server running on port 5001
```

If you see errors, check [Troubleshooting](#troubleshooting).

### 5.2 Test Health Endpoints

In a new terminal:

```bash
# Test health
curl http://localhost:5001/health

# Test status (shows all services)
curl http://localhost:5001/status
```

You should see all services as "configured".

### 5.3 Set Up ngrok (For WhatsApp Webhooks)

Twilio needs a public URL to send messages to your app.

1. **Install ngrok:**
   ```bash
   # macOS
   brew install ngrok

   # Or download from: https://ngrok.com/download
   ```

2. **Start ngrok:**
   ```bash
   ngrok http 5001
   ```

3. **Copy the HTTPS URL:**
   ```
   Forwarding   https://abc123.ngrok.io -> http://localhost:5001
              ^^^^^^^^^^^^^^^^^^^^^^^^
              Copy this URL!
   ```

### 5.4 Configure Twilio Webhook

1. **Go to Twilio WhatsApp Sandbox:**
   ```
   https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox
   ```

2. **Set the webhook URL:**
   - Find "WHEN A MESSAGE COMES IN"
   - Paste: `https://abc123.ngrok.io/whatsapp`
   - Method: POST
   - Click "Save"

### 5.5 Test End-to-End!

**On your phone (WhatsApp):**

1. Send a message to the Twilio number: `+1 415 523 8886`
2. Message: `Hello`

**You should receive:**
- A greeting from the bot
- Menu of services

**Continue the conversation:**
- "I want eyebrow threading"
- "Tomorrow at 2pm"
- Provide your name and address
- Confirm the booking

**On the owner phone** (your number in OWNER_PHONE):
- You'll receive a booking confirmation request
- Reply: `CONFIRM`

**Check Google Calendar:**
- Open https://calendar.google.com
- You should see the new booking event! 🎉

✅ **SUCCESS!** Your system is fully working!

---

## Step 6: Record Your Demo

Now that everything works, let's record an amazing demo!

### 6.1 Preparation

**Clean Up:**
```bash
# Clear old bookings
rm -rf bookings/*.json confirm/*.json states/*.json

# Restart the server
npm start
```

**Prepare 2 Phones/Devices:**
- Phone 1: Customer (can be emulator or second phone)
- Phone 2: Owner (your main phone with OWNER_PHONE number)

**Set Up Recording:**
- Screen recording software ready
- Phone screen recording enabled
- Good lighting if showing your face
- Quiet environment

### 6.2 Demo Script (5-7 minutes)

**Part 1: Introduction (30 seconds)**
```
"This is an AI-powered WhatsApp booking system for small businesses.
Built with Node.js, Express, Google Gemini AI, Twilio, and Google Calendar.
Let me show you how it works..."
```

**Part 2: Customer Booking (2 minutes)**

Show Phone 1 screen recording:

1. Open WhatsApp
2. Message Twilio number: `Hi`
3. Bot responds with greeting and menu
4. Reply: `I want to book eyebrow threading`
5. Bot confirms service and asks for date
6. Reply: `Tomorrow at 2pm`
7. Bot asks for name
8. Reply: `John Smith`
9. Bot asks for address
10. Reply: `123 Main Street, Dublin`
11. Bot shows summary
12. Reply: `Yes, confirm`
13. Bot confirms and says owner will be notified

**Part 3: Owner Confirmation (1 minute)**

Show Phone 2 screen:

1. Receive booking request notification
2. Show the booking details
3. Reply: `CONFIRM`
4. Receive confirmation success

**Part 4: Calendar Integration (30 seconds)**

Show browser:

1. Open Google Calendar
2. Show the newly created event
3. Highlight details (time, service, customer info)

**Part 5: Technical Overview (1-2 minutes)**

Show VS Code or terminal:

1. Show the code structure
2. Show the `.env` configuration
3. Show the health endpoints:
   ```bash
   curl http://localhost:5001/status | jq
   ```
4. Highlight security features (webhook validation, env variables)

**Part 6: Wrap-up (30 seconds)**
```
"This system demonstrates:
- Real-time WhatsApp integration
- AI-powered conversation handling
- Google Calendar API integration
- Production-ready deployment with Docker
- Complete security best practices

Perfect for beauty salons, consultants, or any appointment-based business.
Thanks for watching!"
```

### 6.3 Recording Tips

**Video Settings:**
- Resolution: 1920x1080 minimum
- Frame rate: 30 FPS minimum
- Format: MP4

**Phone Recording:**
- Use built-in screen recording
- Enable "Show touches" in developer options
- Keep WhatsApp in light mode (better visibility)

**Editing:**
- Use OBS, Camtasia, or iMovie
- Add smooth transitions between sections
- Add text overlays for key points
- Background music (subtle, no copyright)
- Speed up waiting periods (2x-4x)

### 6.4 Screenshots to Capture

1. **WhatsApp Conversation:**
   - Initial greeting
   - Service selection
   - Date/time booking
   - Summary confirmation

2. **Owner Notification:**
   - Booking request received
   - Confirmation sent

3. **Google Calendar:**
   - Event created
   - Event details view

4. **Status Dashboard:**
   ```bash
   curl http://localhost:5001/status | jq
   ```

5. **Code/Architecture:**
   - Project structure in VS Code
   - Docker files
   - Key code sections

### 6.5 Upload Checklist

**YouTube:**
- Title: "AI WhatsApp Booking Agent - Full Stack Demo (Node.js, Twilio, Google Calendar)"
- Description with timestamps
- Tags: nodejs, twilio, ai, booking-system, whatsapp
- Thumbnail with logo and tech stack icons

**GitHub:**
- Add screenshots to README.md
- Update with video link
- Create animated GIF of booking flow

**LinkedIn:**
- Post with video or screenshots
- Professional caption highlighting skills
- Relevant hashtags

---

## Troubleshooting

### Server Won't Start

**Error: "accountSid must start with AC"**
- Check TWILIO_ACCOUNT_SID in .env starts with "AC"
- Remove any quotes around the value

**Error: "Missing required environment variables"**
- Verify all required fields in .env are filled
- Check for typos in variable names

### WhatsApp Not Receiving Messages

**No response from bot:**
1. Check ngrok is still running
2. Verify webhook URL in Twilio is correct
3. Check server logs for errors
4. Verify you sent message to correct Twilio number

**"Invalid signature" error:**
- Your ngrok URL changed (restart ngrok)
- Update webhook URL in Twilio
- Or set `SKIP_TWILIO_VALIDATION=true` for testing (NOT production!)

### Google Calendar Not Working

**Error: "Calendar not initialized"**
- Check GOOGLE_SERVICE_ACCOUNT_KEY is valid JSON
- Verify it's on ONE line with no breaks
- Check you shared calendar with service account email

**No events appearing:**
- Verify you're looking at the correct calendar
- Check calendar is shared with correct permissions
- Look in server logs for Google API errors

### Gemini AI Not Responding

**Error: "API key not valid"**
- Get a fresh API key from https://aistudio.google.com/app/apikey
- Update GEMINI_API_KEY in .env
- Restart server

**Rate limit errors:**
- Free tier: 60 requests/minute
- Wait 1 minute and try again
- Consider upgrading if testing heavily

### Owner Not Receiving Notifications

**Check:**
1. OWNER_PHONE is your actual WhatsApp number
2. Your number is verified in Twilio sandbox
3. Format is correct: +[country code][number] (e.g., +353858088571)
4. No spaces or dashes in phone number

### ngrok Issues

**Tunnel expired:**
- Free ngrok tunnels expire after 2 hours
- Restart ngrok to get new URL
- Update webhook URL in Twilio

**Want permanent URL:**
- Sign up for ngrok account (free)
- Or deploy to cloud platform (Heroku, Railway, etc.)

---

## Quick Reference

### Useful Commands

```bash
# Start server
npm start

# Test health
curl http://localhost:5001/health

# View server logs
# (if running in background with PM2)
pm2 logs ai-booking-agent

# Check environment variables
cat .env | grep -v "^#" | grep "="

# Clear all bookings
rm -rf bookings/*.json confirm/*.json states/*.json

# Restart server
# Ctrl+C to stop, then npm start
```

### Useful Links

```
Twilio Console:       https://console.twilio.com/
Twilio WhatsApp:      https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
Google AI Studio:     https://aistudio.google.com/app/apikey
Google Cloud:         https://console.cloud.google.com/
Google Calendar:      https://calendar.google.com/
ngrok Dashboard:      https://dashboard.ngrok.com/
```

### Test Phone Numbers

```
Twilio Sandbox:       +1 415 523 8886
Join Code:            join <your-code-word>
Owner Phone:          [Your WhatsApp number in .env]
```

---

## Next Steps After Recording

1. ✅ Upload video to YouTube
2. ✅ Add screenshots to GitHub README
3. ✅ Update repository description
4. ✅ Share on LinkedIn
5. ✅ Add to portfolio website
6. ✅ Consider deploying to production (Railway, Heroku)

---

## Need Help?

- 📖 Full documentation: `README.md`
- 🔒 Security guide: `SECURITY.md`
- 🚀 Deployment guide: `DEPLOYMENT.md`
- 🎬 Demo checklist: `DEMO_CHECKLIST.md`
- 🐛 Issues: https://github.com/DevEnjoysMath/ai-agent-for-SMEs/issues

---

**Good luck with your demo! 🎉**

You've got this! Follow the steps carefully, and you'll have an amazing portfolio piece.

---

**Last Updated:** January 2026
