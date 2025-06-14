require('dotenv').config();
const fetch = require('node-fetch');

async function simulateCustomerMessage(message) {
  console.log('\n📱 Customer:', message);
  
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

async function simulateOwnerConfirmation() {
  console.log('\n👩 Owner: Confirming booking...');
  
  try {
    const response = await fetch('http://localhost:5001/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'CONFIRM'
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ Confirmation result:', data);
    return data;
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runBookingFlow() {
  console.log('🚀 Starting booking flow simulation...\n');
  
  try {
    // Reset any existing conversation
    await simulateCustomerMessage('reset');
    await delay(1000);
    
    // Start booking
    await simulateCustomerMessage('I want to book a facial');
    await delay(1000);
    
    // Provide name
    await simulateCustomerMessage('John Smith');
    await delay(1000);
    
    // Choose service
    await simulateCustomerMessage('I want the Basic Facial please');
    await delay(1000);
    
    // Provide date and time
    await simulateCustomerMessage('I would like it tomorrow at 2:30 PM');
    await delay(1000);
    
    // Provide address
    await simulateCustomerMessage('My address is 123 Test Street, Dublin 15');
    await delay(1000);
    
    // Provide phone
    await simulateCustomerMessage('My phone number is +353871234567');
    await delay(1000);
    
    // Review and confirm booking
    const summary = await simulateCustomerMessage('show me the summary');
    await delay(1000);
    
    // Confirm booking
    await simulateCustomerMessage('yes, that looks correct');
    await delay(2000);
    
    // Simulate owner confirmation
    await simulateOwnerConfirmation();
    
    console.log('\n✨ Booking flow completed! Check your WhatsApp and calendar for confirmation.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

runBookingFlow(); 