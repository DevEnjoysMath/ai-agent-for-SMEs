require('dotenv').config();
const fetch = require('node-fetch');

// Utility function to simulate delay between messages
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Simulate sending a message and getting response
async function simulateMessage(message) {
  console.log('\n👤 User:', message);
  
  try {
    const response = await fetch('http://localhost:5001/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userMessage: message,
        conversationHistory: []
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('🤖 Bot:', data.reply);
    return data;
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function simulateOwnerResponse(action) {
  console.log('\n👩 Owner:', action);
  
  try {
    const response = await fetch('http://localhost:5001/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: action })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ Result:', data);
    return data;
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Test different conversation flows
async function runTests() {
  try {
    const flows = [
      // Flow 1: Direct booking with clear information
      async () => {
        console.log('\n🔄 Testing Flow 1: Direct booking');
        await simulateMessage('reset');
        await delay(1000);
        await simulateMessage('I want to book a facial');
        await delay(1000);
        await simulateMessage('Sarah');
        await delay(1000);
        await simulateMessage('the basic facial please');
        await delay(1000);
        await simulateMessage('tomorrow at 2pm');
        await delay(1000);
        await simulateMessage('0871234567');
        await delay(1000);
        await simulateMessage('123 Main Street, Dublin 15');
        await delay(1000);
        await simulateMessage('yes');
      },

      // Flow 2: Price inquiry first, then booking
      async () => {
        console.log('\n🔄 Testing Flow 2: Price inquiry first');
        await simulateMessage('reset');
        await delay(1000);
        await simulateMessage('how much is eyebrow threading?');
        await delay(1000);
        await simulateMessage('ok I want to book that');
        await delay(1000);
        await simulateMessage('John');
        await delay(1000);
        await simulateMessage('next Monday at 10am');
        await delay(1000);
        await simulateMessage('085 999 8888');
        await delay(1000);
        await simulateMessage('45 Oak Avenue, Dublin 8');
        await delay(1000);
        await simulateMessage('yes please');
      },

      // Flow 3: Multiple questions and changes
      async () => {
        console.log('\n🔄 Testing Flow 3: Multiple questions');
        await simulateMessage('reset');
        await delay(1000);
        await simulateMessage('what services do you offer?');
        await delay(1000);
        await simulateMessage('how long does the luxury facial take?');
        await delay(1000);
        await simulateMessage('and what time do you close?');
        await delay(1000);
        await simulateMessage('ok I want to book the luxury facial');
        await delay(1000);
        await simulateMessage('Emma');
        await delay(1000);
        await simulateMessage('this Saturday at 4pm');
        await delay(1000);
        await simulateMessage('actually can we make it 5pm?');
        await delay(1000);
        await simulateMessage('0861112222');
        await delay(1000);
        await simulateMessage('27 Birch Lane, Dublin 6');
        await delay(1000);
        await simulateMessage('yes that sounds good');
      },

      // Flow 4: Vague requests and corrections
      async () => {
        console.log('\n🔄 Testing Flow 4: Vague requests');
        await simulateMessage('reset');
        await delay(1000);
        await simulateMessage('hi I need my eyebrows done');
        await delay(1000);
        await simulateMessage('Maria');
        await delay(1000);
        await simulateMessage('tomorrow but what time do you close?');
        await delay(1000);
        await simulateMessage('ok then 7pm tomorrow');
        await delay(1000);
        await simulateMessage('083 123 4567');
        await delay(1000);
        await simulateMessage('8 Cherry Close Dublin 15');
        await delay(1000);
        await simulateMessage('yes book it please');
      },

      // Flow 5: Natural conversation with multiple questions
      async () => {
        console.log('\n🔄 Testing Flow 5: Natural conversation');
        await simulateMessage('reset');
        await delay(1000);
        await simulateMessage('hey do you do henna?');
        await delay(1000);
        await simulateMessage('how much is it?');
        await delay(1000);
        await simulateMessage('great, can I book it for next week?');
        await delay(1000);
        await simulateMessage('Priya');
        await delay(1000);
        await simulateMessage('next Wednesday afternoon maybe 3pm?');
        await delay(1000);
        await simulateMessage('do you take card payment?');
        await delay(1000);
        await simulateMessage('perfect, my number is 089 765 4321');
        await delay(1000);
        await simulateMessage('15 River View Apartments, Dublin 4');
        await delay(1000);
        await simulateMessage('yes confirm please');
      }
    ];

    // Run each flow
    for (const flow of flows) {
      try {
        await flow();
        await delay(2000); // Pause between flows
      } catch (error) {
        console.error('❌ Flow failed:', error);
      }
    }
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Run the tests
console.log('🚀 Starting conversation flow tests...');
runTests().then(() => {
  console.log('\n✅ Tests completed');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Tests failed:', error);
  process.exit(1);
}); 