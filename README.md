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

2. Set up environment variables in `.env`:
   ```env
   PORT=5001
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_token
   OWNER_PHONE=your_phone_number
   BUSINESS_WHATSAPP=your_twilio_number
   ```

3. Set up Google Calendar:
   - Create a service account in Google Cloud Console
   - Download the credentials and save as `google-calendar-service-account.json`
   - Share your calendar with the service account email

4. Start the server:
   ```bash
   node index.js
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
