const { google } = require('googleapis');

async function testCalendarIntegration() {
  const OWNER_CALENDAR_ID = 'devdeepak157@gmail.com';
  
  try {
    console.log('🔍 Testing direct calendar integration...');
    
    // Initialize the calendar
    const auth = new google.auth.GoogleAuth({
      keyFile: 'google-calendar-service-account.json',
      scopes: ['https://www.googleapis.com/auth/calendar']
    });
    
    const calendar = google.calendar({ version: 'v3', auth });
    
    // Create a test event for 1 hour from now
    const startTime = new Date();
    startTime.setHours(startTime.getHours() + 1);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour later

    const event = {
      summary: 'Quick Test Appointment',
      description: 'This is a quick test event',
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'Europe/Dublin'
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'Europe/Dublin'
      }
    };

    console.log('📅 Creating test event in your calendar...');
    console.log('Event details:', event);
    
    const response = await calendar.events.insert({
      calendarId: OWNER_CALENDAR_ID,
      resource: event,
      sendNotifications: true
    });

    console.log('✅ Test event created successfully!');
    console.log('Event link:', response.data.htmlLink);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Error details:', error.response.data);
    }
  }
}

// Run the test
testCalendarIntegration(); 