require('dotenv').config();
const twilio = require('twilio');
const { google } = require('googleapis');
const fs = require('fs').promises;

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Initialize Google Calendar
const calendar = google.calendar('v3');

async function testWhatsApp() {
  try {
    console.log('📱 Testing WhatsApp integration...');
    
    const message = `🔔 Test Message
This is a test message from your booking system.
If you receive this, your WhatsApp integration is working!`;

    const result = await twilioClient.messages.create({
      body: message,
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${process.env.BUSINESS_WHATSAPP_NUMBER}`
    });

    console.log('✅ WhatsApp test message sent successfully!');
    console.log('Message SID:', result.sid);
    return true;
  } catch (error) {
    console.error('❌ WhatsApp test failed:', error);
    return false;
  }
}

async function testGoogleCalendar() {
  try {
    const credentials = JSON.parse(await fs.readFile('google-calendar-service-account.json', 'utf8'));
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/calendar']
    });

    const authClient = await auth.getClient();

    // Test calendar access
    const response = await calendar.events.list({
      auth: authClient,
      calendarId: 'devdeepak157@gmail.com',
      timeMin: (new Date()).toISOString(),
      maxResults: 1,
      singleEvents: true,
      orderBy: 'startTime',
    });

    console.log('✅ Google Calendar Integration Test: Success');
    console.log('Next event:', response.data.items[0]?.summary || 'No upcoming events');
  } catch (error) {
    console.error('❌ Google Calendar Integration Test: Failed');
    console.error(error);
  }
}

async function testTwilio() {
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const message = await client.messages.create({
      body: 'Test message from Beauty Parlour Booking System',
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${process.env.BUSINESS_WHATSAPP_NUMBER}`
    });
    
    console.log('✅ Twilio Integration Test: Success');
    console.log('Message SID:', message.sid);
  } catch (error) {
    console.error('❌ Twilio Integration Test: Failed');
    console.error(error);
  }
}

async function runTests() {
  console.log('🚀 Starting integration tests...\n');

  // Test WhatsApp
  const whatsappResult = await testWhatsApp();
  console.log('\n');

  // Test Google Calendar
  const calendarResult = await testGoogleCalendar();
  console.log('\n');

  // Test Twilio
  const twilioResult = await testTwilio();
  console.log('\n');

  // Summary
  console.log('📊 Test Results:');
  console.log('WhatsApp Integration:', whatsappResult ? '✅ PASSED' : '❌ FAILED');
  console.log('Google Calendar Integration:', calendarResult ? '✅ PASSED' : '❌ FAILED');
  console.log('Twilio Integration:', twilioResult ? '✅ PASSED' : '❌ FAILED');
}

runTests().catch(console.error); 