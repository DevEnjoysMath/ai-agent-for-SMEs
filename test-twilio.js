require('dotenv').config();
const twilio = require('twilio');

// Print environment variables (without sensitive data)
console.log('Environment check:');
console.log('TWILIO_WHATSAPP_NUMBER:', process.env.TWILIO_WHATSAPP_NUMBER ? '✓ Set' : '✗ Missing');
console.log('BUSINESS_WHATSAPP_NUMBER:', process.env.BUSINESS_WHATSAPP_NUMBER ? '✓ Set' : '✗ Missing');
console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? '✓ Set' : '✗ Missing');
console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? '✓ Set' : '✗ Missing');

async function testWhatsApp() {
    try {
        console.log('\n📱 Testing WhatsApp integration...');
        
        const twilioClient = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );

        console.log('Sending test message:');
        console.log('From:', process.env.TWILIO_WHATSAPP_NUMBER);
        console.log('To:', process.env.BUSINESS_WHATSAPP_NUMBER);
        
        const result = await twilioClient.messages.create({
            body: '🔔 Test Message: If you receive this, your WhatsApp integration is working!',
            from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
            to: `whatsapp:${process.env.BUSINESS_WHATSAPP_NUMBER}`
        });

        console.log('\n✅ Success!');
        console.log('Message SID:', result.sid);
        console.log('Status:', result.status);
    } catch (error) {
        console.error('\n❌ Error sending WhatsApp message:');
        console.error('Code:', error.code);
        console.error('Message:', error.message);
        console.error('Status:', error.status);
        if (error.moreInfo) console.error('More info:', error.moreInfo);
    }
}

testWhatsApp(); 