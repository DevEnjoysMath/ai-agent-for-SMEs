const fetch = require('node-fetch');

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendMessage(message) {
  console.log('\n📱 User:', message);
  const response = await fetch('http://localhost:5001/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userMessage: message,
      conversationHistory: []
    })
  });
  const data = await response.json();
  console.log('🤖 Bot:', data.reply);
  return data;
}

async function testCompleteBookingFlow() {
  try {
    console.log('🚀 Starting complete booking test...\n');

    // Reset any existing conversation
    await sendMessage('reset');
    await delay(1000);

    // Step 1: Start booking
    await sendMessage('I want to book a facial');
    await delay(1000);

    // Step 2: Provide name
    await sendMessage('John Smith');
    await delay(1000);

    // Step 3: Confirm service
    await sendMessage('Basic Facial');
    await delay(1000);

    // Step 4: Provide date and time
    await sendMessage('tomorrow at 2pm');
    await delay(1000);

    // Step 5: Provide address
    await sendMessage('123 Test Street, Dublin 15');
    await delay(1000);

    // Step 6: Provide phone
    await sendMessage('+353871234567');
    await delay(1000);

    // Step 7: Confirm booking
    await sendMessage('yes, confirm please');
    await delay(2000);

    console.log('\n📲 Simulating owner confirmation via WhatsApp...');
    const confirmResponse = await fetch('http://localhost:5001/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'CONFIRM' })
    });
    
    const confirmResult = await confirmResponse.json();
    console.log('✅ Owner confirmation result:', confirmResult);

    console.log('\n✨ Test completed! Please check your calendar for the new booking.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testCompleteBookingFlow(); 