# Beauty Parlour Booking System

A WhatsApp-based booking system for a beauty parlour that handles customer appointments, notifications, and calendar management.

## Features

- 🤖 Natural language conversation for bookings
- 📱 WhatsApp notifications for customers and owner
- 📅 Google Calendar integration
- ✅ Owner confirmation workflow
- 🏠 Home service booking management
- 🕒 Business hours validation
- 📍 Dublin area service validation

## Services

- Basic Facial (€40)
- Luxury Facial (€60)
- Eyebrow Threading (€10)
- Full Face Threading (€25)
- Full Body Waxing (€80)
- Henna Design (€30)

## Technical Stack

- Node.js & Express
- Twilio for WhatsApp integration
- Google Calendar API
- File-based state management
- Error handling and retry mechanisms

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Fill in your actual values for all the environment variables
   ```bash
   cp .env.example .env
   ```

3. Required environment variables:
   ```env
   # Server Configuration
   PORT=5001
   
   # Twilio Configuration
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TWILIO_PHONE_NUMBER=your_twilio_phone_number
   
   # Business Information
   BUSINESS_NAME=Your Business Name
   OWNER_PHONE=your_phone_number
   WHATSAPP_NUMBER=your_twilio_whatsapp_number
   
   # Google Calendar (optional)
   GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account_email
   GOOGLE_CALENDAR_ID=your_calendar_id
   GOOGLE_SERVICE_ACCOUNT_KEY=your_service_account_json_as_string
   ```

4. Set up Google Calendar (optional):
   - Create a service account in Google Cloud Console
   - Download the credentials JSON file
   - Copy the entire JSON content as a string to `GOOGLE_SERVICE_ACCOUNT_KEY`
   - Share your calendar with the service account email

5. Start the server:
   ```bash
   npm start
   ```

## Booking Flow

1. Customer initiates conversation
2. Bot collects:
   - Customer name
   - Service selection
   - Preferred date and time
   - Address
3. Bot validates all information
4. Customer confirms booking
5. System:
   - Creates calendar event
   - Sends WhatsApp notifications
   - Saves booking details
6. Owner confirms/rejects via WhatsApp
7. Customer receives final confirmation

## Testing

Run the conversation flow tests:
```bash
node test-conversation-flows.js
```

## Error Handling

- Automatic port conflict resolution
- WhatsApp message retry mechanism
- Graceful server shutdown
- Booking validation
- Business hours enforcement
- Service area validation

## Maintenance

Booking files are stored in:
- `bookings/` - Pending bookings
- `confirmed/` - Confirmed bookings
- `rejected/` - Rejected bookings

State files in:
- `states/` - Conversation state

## Security

- Environment variables for sensitive data
- Phone number validation
- Address validation
- Business hours enforcement
- Owner-only confirmation access
- No hardcoded credentials in source code
- Sensitive files excluded from version control

## Limitations

- Twilio trial accounts limited to 9 messages/day
- Single owner confirmation flow
- File-based storage (can be upgraded to database)
- Single location support (Dublin only)

## Future Improvements

- Database integration
- Multiple location support
- Staff management
- Online payment integration
- Booking modification support
- Cancellation workflow
- Customer history tracking
- Analytics dashboard 
