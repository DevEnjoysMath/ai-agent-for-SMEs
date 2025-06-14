require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require('fs/promises');
const twilio = require('twilio');
const path = require('path');
const { google } = require('googleapis');
const fetch = require('node-fetch');
const fsSync = require('fs');
const { MessagingResponse } = require('twilio').twiml;

const app = express();
const port = process.env.PORT || 5001;

// Service definitions with proper mapping
const SERVICES = {
  'EYEBROW': { name: 'Eyebrow Threading', price: '€10', duration: 15 },
  'FACE': { name: 'Full Face Threading', price: '€25', duration: 30 },
  'BASIC_FACIAL': { name: 'Facial (Basic)', price: '€40', duration: 45 },
  'LUXURY_FACIAL': { name: 'Facial (Luxury)', price: '€60', duration: 60 },
  'WAXING': { name: 'Full Body Waxing', price: '€70', duration: 90 },
  'HENNA': { name: 'Henna Design', price: '€20–€50', duration: 45 }
};

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Load business info
let businessInfo;
try {
  businessInfo = JSON.parse(fsSync.readFileSync('businessInfo.json', 'utf8'));
  console.log("✅ Server configuration loaded");
} catch (error) {
  console.error("❌ Error loading business info:", error);
  process.exit(1);
}

// Initialize Twilio
if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
  console.warn("⚠️ Missing Twilio credentials in .env file - WhatsApp notifications will be skipped");
}

console.log("✅ Server configuration loaded");
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN ? 
  twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN) : null;

// Initialize Google Calendar
let calendar;
const SERVICE_ACCOUNT_EMAIL = 'ai-agent@gen-lang-client-0979601949.iam.gserviceaccount.com';
const OWNER_CALENDAR_ID = 'devdeepak157@gmail.com';

try {
  const auth = new google.auth.GoogleAuth({
    keyFile: 'google-calendar-service-account.json',
    scopes: ['https://www.googleapis.com/auth/calendar']
  });
  calendar = google.calendar({ version: 'v3', auth });
  console.log('✅ Google Calendar initialized');
} catch (error) {
  console.warn('⚠️ Google Calendar initialization failed:', error.message);
  calendar = null;
}

// Create necessary directories
async function ensureDirectoriesExist() {
  const dirs = ['bookings', 'states'];
  for (const dir of dirs) {
    await fs.mkdir(path.join(__dirname, dir), { recursive: true }).catch(() => {});
  }
}

// Initialize directories on startup
ensureDirectoriesExist().catch(console.error);

// File paths
const STATE_FILE = path.join(__dirname, 'booking_state.json');
const BOOKINGS_DIR = path.join(__dirname, 'bookings');

// State management functions
async function getBookingState() {
  try {
    const data = await fs.readFile(STATE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    console.error('Error reading booking state:', error);
    return null;
  }
}

async function saveBookingState(state) {
  try {
    if (state) {
      await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
    } else {
      await fs.unlink(STATE_FILE).catch(() => {}); // Ignore if file doesn't exist
    }
  } catch (error) {
    console.error('Error saving booking state:', error);
  }
}

async function savePendingBooking(booking) {
  try {
    const filename = `${Date.now()}_${booking.name.replace(/[^a-z0-9]/gi, '_')}.json`;
    const filepath = path.join(BOOKINGS_DIR, filename);
    await fs.writeFile(filepath, JSON.stringify(booking, null, 2));
    return filepath;
  } catch (error) {
    console.error('Error saving pending booking:', error);
    throw error;
  }
}

// Validate booking details
function validateBooking(booking) {
  const errors = [];
  
  if (!booking.name) {
    errors.push("Name is required");
  }
  
  if (!booking.services || booking.services.length === 0) {
    errors.push("Please select at least one service");
  }
  
  if (!booking.date) {
    errors.push("Booking date is required");
  }
  
  if (!booking.time) {
    errors.push("Booking time is required");
  }
  
  if (!booking.address) {
    errors.push("Address is required");
  }
  
  return errors;
}

// Process booking confirmation
async function processBooking(booking) {
  try {
    // Validate booking
    const errors = validateBooking(booking);
    if (errors.length > 0) {
      return {
        success: false,
        message: 'I noticed some issues with your booking:\n' + errors.join('\n') + '\nCould you please provide the correct information?'
      };
    }
    
    // Calculate total cost and travel charge
    const travelCharge = calculateTravelCharge(booking.address);
    const servicesTotal = booking.services.reduce((total, service) => {
      const serviceInfo = Object.values(SERVICES).find(s => s.name === service);
      if (serviceInfo) {
        const price = parseInt(serviceInfo.price.replace('€', ''));
        return total + (isNaN(price) ? 0 : price);
      }
      return total;
    }, 0);
    
    // Format date nicely
    const bookingDate = new Date(booking.date);
    const formattedDate = bookingDate.toLocaleDateString('en-IE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    
    // Save booking
    const bookingToSave = {
      ...booking,
      date: formattedDate,
      totalCost: servicesTotal + travelCharge
    };
    
    const bookingFile = await savePendingBooking(bookingToSave);
    console.log('✅ Booking saved:', bookingFile);

    // Send WhatsApp notifications
    const notificationSent = await sendWhatsAppNotifications(bookingToSave);
    if (!notificationSent) {
      console.warn('⚠️ WhatsApp notification could not be sent');
    }
    
    // Create calendar event
    const calendarLink = await createCalendarEvent(bookingToSave);
    
    return {
      success: true,
      message: `Thank you for your booking! I've sent the details to the salon owner for confirmation.\n\n` +
        `Your booking details:\n` +
        `• Name: ${booking.name}\n` +
        `• Services: ${booking.services.join(', ')}\n` +
        `• Date: ${formattedDate}\n` +
        `• Time: ${booking.time}\n` +
        `• Address: ${booking.address}\n\n` +
        `Services Total: €${servicesTotal}\n` +
        `Travel Charge: €${travelCharge}\n` +
        `Total Cost: €${servicesTotal + travelCharge}\n\n` +
        `You'll receive a WhatsApp message once the owner confirms your booking.`
    };
  } catch (error) {
    console.error('Error processing booking:', error);
    return {
      success: false,
      message: 'Failed to process booking. Please try again or contact us directly.'
    };
  }
}

// WhatsApp Notification
async function sendWhatsAppNotifications(data, retries = 3) {
  if (!twilioClient) {
    console.log('⚠️ Skipping WhatsApp notification - no Twilio credentials');
    return false;
  }

  const ownerMessage = `📅 *New Booking*
${data.services.join(', ')} for ${data.name}
📆 ${data.date} at ${data.time}
📍 ${data.address}

Reply with:
CONFIRM to accept
REJECT to decline`;

  const customerMessage = `🌟 *Booking Confirmation*
Thank you for booking with ${businessInfo.name}!

Your appointment details:
• Services: ${data.services.join(', ')}
• Date: ${data.date}
• Time: ${data.time}
• Address: ${data.address}

We'll confirm your booking shortly.
For any changes, please call us at ${businessInfo.owner.phone}`;

  try {
    console.log('\n📱 Sending WhatsApp notifications...');
    
    // Send to owner
    const ownerResult = await twilioClient.messages.create({
      body: ownerMessage,
      from: `whatsapp:${businessInfo.whatsapp}`,
      to: `whatsapp:${businessInfo.owner.phone}`
    });
    console.log("✅ Owner WhatsApp sent:", ownerResult.sid);
    
    return true;
  } catch (err) {
    console.error('❌ WhatsApp error:', err.message);
    return false;
  }
}

// System Instruction Text
function createSystemInstructionText(info) {
  const date = new Date().toLocaleDateString('en-IE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const time = new Date().toLocaleTimeString('en-IE', {
    hour: '2-digit', minute: '2-digit'
  });

  const services = Object.values(SERVICES)
    .map(s => `${s.name} (${s.price})`)
    .join('\n• ');

  return `
You are Puja, a friendly, helpful, and professional virtual assistant for a beauty salon that offers home service appointments in Dublin.

Your personality:
- Warm, empathetic, and conversational like a real human.
- Professional and confident in beauty services.
- Friendly, yet smart and clear.

Your job:
1. Greet and engage naturally with users, like a real person would.
2. Help users book an appointment for one or more beauty services.
3. Answer any questions about services, prices, payment, availability, or general beauty-related topics.
4. Recognize if a user just wants to talk or ask a question unrelated to bookings, and handle it with charm.
5. Collect key information to complete a booking:
  • Name
  • Service(s)
  • Date
  • Time
  • Address

Context:
• Business Name: Puja's Beauty Parlour
• Services:
• ${services}
• Operating Hours: 9 AM to 8 PM, 7 days a week
• Service Area: Dublin and surrounding areas (travel charges apply)

Important Notes:
• All services are provided at your home
• Travel charge (€5-€10) applies based on distance
• Multiple services can be booked together
• Advance booking recommended
• Payment accepted: Cash, card, or online transfer

Common Questions:
Q: How long does each service take?
A: Service durations vary:
• Eyebrow Threading: 15 minutes
• Full Face Threading: 30 minutes
• Basic Facial: 45 minutes
• Luxury Facial: 60 minutes
• Full Body Waxing: 90 minutes
• Henna Design: 45-60 minutes

Q: Do you provide home service?
A: Yes, all our services are provided at your home for your convenience.

Q: How much is the travel charge?
A: Travel charges range from €5-€10 depending on your location in Dublin.

Q: Can I book multiple services?
A: Yes! You can combine any services in one booking.

Tone guide:
- Use natural human language
- Make users feel welcomed and heard
- Avoid sounding robotic or scripted
- Use casual yet polite phrases like "Sure!", "Of course!", "No problem at all", "Let me help you with that"

Remember to:
- Handle spelling mistakes gracefully
- Understand casual Irish-English
- Be flexible with booking changes
- Keep responses clear and friendly
- Guide the conversation smoothly
- Help users feel confident about their booking

Today's Date: ${date}
Current Time: ${time}
Location: Dublin

If you're unsure about something, politely ask for clarification rather than making assumptions.

Always aim to sound like a real, helpful person. Keep replies warm and informative, but concise.`.trim();
}

// Process user message
async function processMessage(message) {
  try {
    let booking = await getBookingState() || {
      name: '',
      services: [],
      date: '',
      time: '',
      address: ''
    };

    const normalizedMsg = message.toLowerCase().trim();

    // Always check for services first in any message
    let servicesFound = [];
    
    // Check for services in the message
    if (normalizedMsg.includes('and') || normalizedMsg.includes(',')) {
      // Split message into potential service parts
      const parts = normalizedMsg.split(/(?:,|\sand\s)/);
      for (const part of parts) {
        const service = extractService(part);
        if (service && !booking.services.includes(service)) {
          servicesFound.push(service);
        }
      }
    } else {
      const service = extractService(message);
      if (service && !booking.services.includes(service)) {
        servicesFound.push(service);
      }
    }

    // If we found services, add them and acknowledge
    if (servicesFound.length > 0) {
      booking.services.push(...servicesFound);
      await saveBookingState(booking);
      
      if (servicesFound.length === 1) {
        return `I've added ${servicesFound[0]} to your booking. What's your name?`;
      } else {
        return `I've added ${servicesFound.join(' and ')} to your booking. What's your name?`;
      }
    }

    // If it's just a greeting and no services mentioned, respond appropriately
    if (isGreeting(message) && !normalizedMsg.includes('book') && !normalizedMsg.includes('want')) {
      if (booking.services.length === 0) {
        return `Hey! I can help you book any of these services:\n${Object.values(SERVICES).map(s => `• ${s.name} (${s.price})`).join('\n')}\nWhich service would you like?`;
      } else {
        return getRandomGreeting();
      }
    }

    // Update booking with any new information
    const updatedBooking = extractAndUpdateDetails(message, booking);
    
    // If nothing changed, check for confirmation or commands
    if (JSON.stringify(updatedBooking) === JSON.stringify(booking)) {
      if (isConfirmation(message)) {
        const result = await processBooking(booking);
        return result.message;
      }
      
      if (isCommand(message)) {
        return handleCommand(message, booking);
      }
    }

    // Save updated booking state
    await saveBookingState(updatedBooking);
    
    // Get missing fields
    const missingFields = getMissingFields(updatedBooking);
    
    // If booking is complete, show summary
    if (missingFields.length === 0) {
      return getBookingSummary(updatedBooking);
    }
    
    // Get next prompt
    return getNextPrompt(updatedBooking, missingFields);
  } catch (error) {
    console.error('Error processing message:', error);
    return "I apologize, but I encountered an error. Could you please try again?";
  }
}

// Check if message is a greeting
function isGreeting(message) {
  const greetings = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'];
  const normalizedMsg = message.toLowerCase().trim();
  return greetings.some(greeting => normalizedMsg === greeting || normalizedMsg.startsWith(greeting + ' '));
}

// Get random greeting
function getRandomGreeting() {
  const greetings = [
    "Hello! How can I help you today?",
    "Hi there! How may I assist you?",
    "Welcome! What can I do for you today?"
  ];
  return greetings[Math.floor(Math.random() * greetings.length)];
}

// Get next prompt based on missing fields
function getNextPrompt(booking, missingFields) {
  if (!missingFields || missingFields.length === 0) {
    return null;
  }

  const prompts = {
    name: [
      "What's your name?",
      "Who should I put the booking under?"
    ],
    services: [
      `Which service would you like to book?\n${Object.values(SERVICES).map(s => `• ${s.name} (${s.price})`).join('\n')}\n\nYou can book multiple services together!`
    ],
    date: [
      "When would you like to schedule your appointment? You can say 'tomorrow', 'next Monday', or give me a specific date."
    ],
    time: [
      "What time would you like your appointment? We're open 9 AM to 8 PM."
    ],
    address: [
      "What's your address?"
    ]
  };

  const field = missingFields[0];
  const promptList = prompts[field] || [`Please provide your ${field}.`];
  return promptList[Math.floor(Math.random() * promptList.length)];
}

// Extract service from message
function extractService(message) {
  const normalizedMsg = message.toLowerCase().trim();
  
  // Direct service mappings
  const serviceMap = {
    'eyebrow': 'Eyebrow Threading',
    'eyebrows': 'Eyebrow Threading',
    'threading eyebrow': 'Eyebrow Threading',
    'face': 'Full Face Threading',
    'full face': 'Full Face Threading',
    'facial basic': 'Facial (Basic)',
    'basic facial': 'Facial (Basic)',
    'facial luxury': 'Facial (Luxury)',
    'luxury facial': 'Facial (Luxury)',
    'waxing': 'Full Body Waxing',
    'full body': 'Full Body Waxing',
    'full body waxing': 'Full Body Waxing',
    'henna': 'Henna Design',
    'henna design': 'Henna Design'
  };

  // Check for booking intent phrases
  const bookingPhrases = ['book', 'want', 'like', 'need', 'looking for', 'interested in'];
  let messageToCheck = normalizedMsg;
  
  // Remove booking phrases to clean up the message
  for (const phrase of bookingPhrases) {
    messageToCheck = messageToCheck.replace(phrase, '');
  }
  messageToCheck = messageToCheck.trim();

  // Check direct mappings first
  for (const [key, value] of Object.entries(serviceMap)) {
    if (messageToCheck.includes(key)) {
      return value;
    }
  }

  // If no direct match, check for partial matches in service names
  for (const service of Object.values(SERVICES)) {
    if (messageToCheck.includes(service.name.toLowerCase())) {
      return service.name;
    }
  }

  return null;
}

// Extract and update booking details
function extractAndUpdateDetails(message, currentBooking) {
  const booking = { ...currentBooking };
  const normalizedMessage = message.toLowerCase().trim();
  
  // Initialize services array if not exists
  if (!booking.services) {
    booking.services = [];
  }
  
  // Extract service(s)
  if (normalizedMessage.includes('and') || normalizedMessage.includes(',')) {
    // Split message into potential service parts
    const parts = normalizedMessage.split(/(?:,|\sand\s)/);
    for (const part of parts) {
      const service = extractService(part);
      if (service && !booking.services.includes(service)) {
        booking.services.push(service);
      }
    }
    if (booking.services.length > currentBooking.services.length) {
      return booking;
    }
  } else {
    const service = extractService(message);
    if (service && !booking.services.includes(service)) {
      booking.services.push(service);
      return booking;
    }
  }
  
  // Extract name if not set
  if (!booking.name && !isGreeting(message) && !normalizedMessage.includes('book')) {
    const serviceNames = Object.values(SERVICES).map(s => s.name.toLowerCase());
    if (!serviceNames.some(s => normalizedMessage.includes(s.toLowerCase()))) {
      const words = message.trim().split(/\s+/);
      if (words.length >= 1 && words.length <= 3 && !words.some(w => /[\d@#$%^&*(),.?":{}|<>]/.test(w))) {
        booking.name = message.trim()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        return booking;
      }
    }
  }
  
  // Extract date and time
  if (!booking.date || !booking.time) {
    const dateTimeInfo = extractDateTime(message);
    if (dateTimeInfo.date) booking.date = dateTimeInfo.date;
    if (dateTimeInfo.time) booking.time = dateTimeInfo.time;
    if (dateTimeInfo.date || dateTimeInfo.time) return booking;
  }
  
  // Extract address if not set
  if (!booking.address && !message.match(/^\+?\d+$/)) {
    const addressIndicators = [
      /\d+\s+[A-Za-z\s,]+(?:road|street|avenue|lane|place|way|drive|close|court|park|square|hill|gardens|grove|terrace)/i,
      /[A-Za-z\s]+(?:road|street|avenue|lane|place|way|drive|close|court|park|square|hill|gardens|grove|terrace)\s*,/i,
      /dublin\s*\d{1,2}/i,
      /d\d{1,2}\s+[A-Za-z0-9\s,]+/i,
      /\d+\s+[A-Za-z\s,]+/  // More general pattern for house/apt numbers
    ];

    for (const pattern of addressIndicators) {
      const match = message.match(pattern);
      if (match) {
        let address = message.slice(match.index);
        address = address.replace(/[.,;]$/, '').trim();
        address = address.split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        booking.address = address;
        return booking;
      }
    }
    
    // If no specific pattern matches but it's not a service or command
    if (!extractService(message) && !isCommand(message) && message.length > 5) {
      booking.address = message.trim();
      return booking;
    }
  }
  
  return booking;
}

// Calculate travel charge based on address
function calculateTravelCharge(address) {
  // This is a placeholder function - you can implement proper distance-based calculation
  return 5; // Default €5 travel charge
}

// Extract date and time from message
function extractDateTime(message) {
  const result = { date: null, time: null };
  const msg = message.toLowerCase();
  
  // Handle date
  if (msg.includes('tomorrow')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    result.date = tomorrow.toLocaleDateString('en-IE', { 
      weekday: 'long', 
      year: 'numeric',  // Add year to the date
      day: 'numeric', 
      month: 'long'
    });
  } else if (msg.includes('next')) {
    const dayMatch = msg.match(/next\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/);
    if (dayMatch) {
      const today = new Date();
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDay = days.indexOf(dayMatch[1]);
      let daysToAdd = targetDay - today.getDay();
      if (daysToAdd <= 0) daysToAdd += 7;
      const date = new Date();
      date.setDate(date.getDate() + daysToAdd);
      result.date = date.toLocaleDateString('en-IE', { 
        weekday: 'long',
        year: 'numeric',  // Add year to the date
        day: 'numeric', 
        month: 'long'
      });
    }
  } else {
    // Try to parse date formats
    const datePatterns = [
      // DD/MM/YYYY or DD-MM-YYYY
      /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/,
      // Month DD
      /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:\s*,?\s*(\d{4}))?/i,
      // DD Month
      /(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)(?:\s*,?\s*(\d{4}))?/i
    ];

    for (const pattern of datePatterns) {
      const match = msg.match(pattern);
      if (match) {
        const date = new Date();
        if (match[1] && match[2]) {
          if (isNaN(match[1])) {
            // Month DD format
            const months = ['january', 'february', 'march', 'april', 'may', 'june', 
                          'july', 'august', 'september', 'october', 'november', 'december'];
            const monthIndex = months.indexOf(match[1].toLowerCase());
            if (monthIndex !== -1) {
              date.setMonth(monthIndex);
              date.setDate(parseInt(match[2]));
              if (match[3]) date.setFullYear(parseInt(match[3]));
            }
          } else {
            // DD/MM or DD Month format
            const day = parseInt(match[1]);
            if (isNaN(match[2])) {
              // DD Month format
              const months = ['january', 'february', 'march', 'april', 'may', 'june', 
                            'july', 'august', 'september', 'october', 'november', 'december'];
              const monthIndex = months.indexOf(match[2].toLowerCase());
              if (monthIndex !== -1) {
                date.setMonth(monthIndex);
                date.setDate(day);
                if (match[3]) date.setFullYear(parseInt(match[3]));
              }
            } else {
              // DD/MM format
              date.setDate(day);
              date.setMonth(parseInt(match[2]) - 1);
              if (match[3]) {
                let year = parseInt(match[3]);
                if (year < 100) year += 2000;
                date.setFullYear(year);
              }
            }
          }
          result.date = date.toLocaleDateString('en-IE', { 
            weekday: 'long',
            year: 'numeric',  // Add year to the date
            day: 'numeric', 
            month: 'long'
          });
        }
        break;
      }
    }
  }

  // Handle time
  const timePatterns = [
    // HH:MM am/pm or HH am/pm
    /(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i,
    // 24-hour format
    /(\d{1,2})(?::(\d{2}))?(?!\s*[ap]m)/i
  ];

  for (const pattern of timePatterns) {
    const match = msg.match(pattern);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = match[2] ? match[2] : '00';
      const meridian = match[3] ? match[3].toLowerCase() : null;

      // Convert to 12-hour format
      if (!meridian) {
        // 24-hour format
        if (hours >= 0 && hours <= 23) {
          const meridian = hours >= 12 ? 'pm' : 'am';
          hours = hours % 12 || 12;
          result.time = `${hours}:${minutes}${meridian}`;
        }
      } else {
        // 12-hour format
        if (hours >= 1 && hours <= 12) {
          result.time = `${hours}:${minutes}${meridian}`;
        }
      }
      break;
    }
  }

  return result;
}

// Enhanced confirmation detection
function isConfirmation(message) {
  const confirmations = [
    'yes', 'yeah', 'yep', 'yup', 'sure', 'okay', 'ok', 'alright',
    'confirm', 'confirmed', 'that\'s correct', 'that is correct', 'correct',
    'sounds good', 'looks good', 'perfect', 'great', 'wonderful',
    'that works', 'works for me', 'good with me', 'fine by me',
    'please proceed', 'go ahead', 'book it', 'let\'s do it',
    'that\'s fine', 'all set', 'absolutely'
  ];
  const msg = message.trim().toLowerCase();
  return confirmations.some(conf => 
    msg === conf || 
    msg.includes(conf) ||
    msg.match(new RegExp(`\\b${conf}\\b`))
  );
}

// Get missing fields
function getMissingFields(data) {
  const missing = [];
  if (!data.name) missing.push('name');
  if (!data.services || data.services.length === 0) missing.push('services');
  if (!data.date) missing.push('date');
  if (!data.time) missing.push('time');
  if (!data.address) missing.push('address');
  return missing;
}

// Check if booking is complete
function isBookingComplete(data) {
  return data.name && data.services && data.date && data.time && data.address;
}

// Handle general questions
function handleGeneralQuestion(message) {
  const msg = message.toLowerCase();
  
  // Service-related questions
  if (msg.includes('what') && (msg.includes('service') || msg.includes('offer') || msg.includes('treatment'))) {
    const serviceList = Object.values(SERVICES)
      .map(s => `• ${s.name} (${s.price})`)
      .join('\n');
    return `We offer the following beauty services:\n${serviceList}\n\nWhich service would you like to book?`;
  }

  // Price-related questions
  if (msg.includes('how much') || msg.includes('price') || msg.includes('cost')) {
    const service = extractService(message);
    if (service) {
      const serviceInfo = Object.values(SERVICES).find(s => s.name === service);
      if (serviceInfo) {
        return `The ${service} costs ${serviceInfo.price}. Would you like to book this service?`;
      }
    }
    const serviceList = Object.values(SERVICES)
      .map(s => `• ${s.name} (${s.price})`)
      .join('\n');
    return `Here are our services and prices:\n${serviceList}\n\nWhich service interests you?`;
  }

  // Duration questions
  if (msg.includes('how long') || msg.includes('duration') || msg.includes('take')) {
    const service = extractService(message);
    if (service) {
      const durations = {
        'Eyebrow Threading': '15 minutes',
        'Full Face Threading': '30 minutes',
        'Facial (Basic)': '45 minutes',
        'Facial (Luxury)': '60 minutes',
        'Full Body Waxing': '90 minutes',
        'Henna Design': '45 minutes'
      };
      const duration = durations[service] || '30-60 minutes';
      return `The ${service} typically takes ${duration}. Would you like to book an appointment?`;
    }
    return "The duration varies depending on the service. Could you let me know which service you're interested in?";
  }

  // Location/area questions
  if (msg.includes('where') || msg.includes('location') || msg.includes('area') || msg.includes('come to')) {
    return "We provide home beauty services throughout Dublin. We'll come to your location for the treatment. Would you like to book an appointment?";
  }

  // Availability questions
  if (msg.includes('when') || msg.includes('available') || msg.includes('next')) {
    return "We're open from 9 AM to 8 PM, Monday to Saturday. When would you like to schedule your appointment?";
  }

  // Payment questions
  if (msg.includes('pay') || msg.includes('payment') || msg.includes('cash') || msg.includes('card')) {
    return "We accept both cash and card payments. Payment is collected after the service is completed. Would you like to make a booking?";
  }

  // Booking process questions
  if (msg.includes('how') && msg.includes('book')) {
    return "Booking is simple! Just let me know:\n1. Your name\n2. The services you want\n3. Preferred date and time\n4. Your address\n5. Contact number\n\nWould you like to start booking now?";
  }

  // Cancellation/changes questions
  if (msg.includes('cancel') || msg.includes('change') || msg.includes('reschedule')) {
    return "You can cancel or reschedule your appointment up to 24 hours before the scheduled time. Just let us know and we'll help you with that. Would you like to make a booking?";
  }

  return null;
}

// Handle small talk
function handleSmallTalk(message) {
  const msg = message.toLowerCase();
  
  // Thank you responses
  if (msg.includes('thank') || msg.includes('thanks') || msg.includes('thx')) {
    const responses = [
      "You're welcome! Is there anything else I can help you with?",
      "My pleasure! Let me know if you need anything else.",
      "You're most welcome! Don't hesitate to ask if you have any questions.",
      "Glad I could help! Feel free to ask about our other services."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Goodbye responses
  if (msg.includes('bye') || msg.includes('goodbye') || msg.includes('see you') || msg.includes('cya')) {
    const responses = [
      "Goodbye! Looking forward to seeing you at your appointment!",
      "Take care! We'll see you soon!",
      "Have a great day! Don't hesitate to reach out if you need anything.",
      "Bye for now! Feel free to contact us if you have any questions."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // How are you responses
  if (msg.includes('how are you') || msg.includes('how\'s it going') || msg.includes('how are things')) {
    const responses = [
      "I'm doing great, thank you for asking! How can I assist you today?",
      "I'm very well, thanks! What can I help you with?",
      "All good here! How may I help you today?",
      "Wonderful, thank you! What brings you to our beauty service today?"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  return null;
}

// Enhanced chat endpoint
app.post("/chat", async (req, res) => {
  try {
    const { userMessage } = req.body;
    
    // Reset command
    if (userMessage.toLowerCase() === 'reset') {
      console.log('🔄 Resetting conversation state...');
      await saveBookingState(null);
      res.json({ 
        reply: "Conversation reset. How can I help you today?",
        conversationHistory: []
      });
      return;
    }

    // Handle greeting for new conversation
    if (isGreeting(userMessage)) {
      // Clear any existing booking state for new conversations
      await saveBookingState(null);
      const responses = [
        "Hello! Welcome to Puja's Beauty Parlour. How can I assist you today?",
        "Hi there! Thanks for reaching out. What can I help you with?",
        "Welcome! How may I help you today?",
        "Hello! What brings you to our beauty service today?"
      ];
      res.json({
        reply: responses[Math.floor(Math.random() * responses.length)],
        conversationHistory: []
      });
      return;
    }

    // Load current booking state
    let booking = await getBookingState() || {
      name: '',
      services: [],
      date: '',
      time: '',
      address: ''
    };

    // Check for general questions first
    const questionResponse = handleGeneralQuestion(userMessage);
    if (questionResponse) {
      res.json({
        reply: questionResponse,
        conversationHistory: []
      });
      return;
    }

    // Check for small talk
    const smallTalkResponse = handleSmallTalk(userMessage);
    if (smallTalkResponse) {
      res.json({
        reply: smallTalkResponse,
        conversationHistory: []
      });
      return;
    }

    // Handle initial booking request
    if (userMessage.toLowerCase().includes('book')) {
      // Clear any existing booking state when starting a new booking
      await saveBookingState(null);
      const responses = [
        `I'll help you book an appointment. First, let me know which service you'd like:\n\n${Object.values(SERVICES).map(s => `• ${s.name} (${s.price})`).join('\n')}\n\nWhich service interests you?`,
        `I'll assist you with the booking. Here are our services:\n\n${Object.values(SERVICES).map(s => `• ${s.name} (${s.price})`).join('\n')}\n\nWhich one would you like to book?`,
        `Let's get your appointment scheduled. These are our services:\n\n${Object.values(SERVICES).map(s => `• ${s.name} (${s.price})`).join('\n')}\n\nWhich service would you prefer?`
      ];
      res.json({
        reply: responses[Math.floor(Math.random() * responses.length)],
        conversationHistory: []
      });
      return;
    }

    // Extract and update booking details
    const updatedBooking = extractAndUpdateDetails(userMessage, booking);
    const changes = Object.entries(updatedBooking).filter(([key, value]) => value !== booking[key]);
    
    // Save the updated booking state
    await saveBookingState(updatedBooking);
    
    // Check if this is a confirmation
    if (isConfirmation(userMessage) && isBookingComplete(updatedBooking)) {
      const result = await processBooking(updatedBooking);
      if (result.success) {
        await saveBookingState(null); // Clear the state after successful booking
      }
      res.json({
        reply: result.message,
        conversationHistory: []
      });
      return;
    }

    // Get missing fields
    const missingFields = getMissingFields(updatedBooking);
    
    // If booking is complete, ask for confirmation
    if (missingFields.length === 0) {
      const responses = [
        `Perfect! Here's your booking summary:\n\n` +
        `• Name: ${updatedBooking.name}\n` +
        `• Services: ${updatedBooking.services.join(', ')}\n` +
        `• Date: ${updatedBooking.date}\n` +
        `• Time: ${updatedBooking.time}\n` +
        `• Address: ${updatedBooking.address}\n\n` +
        `Is this correct? Please say 'yes' to confirm.`,
        
        `Great! I've got all your details:\n\n` +
        `• Name: ${updatedBooking.name}\n` +
        `• Services: ${updatedBooking.services.join(', ')}\n` +
        `• Date: ${updatedBooking.date}\n` +
        `• Time: ${updatedBooking.time}\n` +
        `• Address: ${updatedBooking.address}\n\n` +
        `Would you like me to go ahead and book this for you?`
      ];
      res.json({
        reply: responses[Math.floor(Math.random() * responses.length)],
        conversationHistory: []
      });
      return;
    }

    // If something was updated, acknowledge it and ask for the next field
    if (changes.length > 0) {
      let acknowledgment = '';
      const [field, value] = changes[0];
      
      if (field === 'name') {
        acknowledgment = `Hi ${value}! `;
      } else if (field === 'services') {
        const service = Object.values(SERVICES).find(s => s.name === value[value.length - 1]);
        if (service) {
          acknowledgment = `Great choice! ${service.name} costs ${service.price}. `;
        }
      } else if (field === 'date') {
        acknowledgment = `Perfect! I've noted down ${value}. `;
      } else if (field === 'time') {
        acknowledgment = `Got it, ${value} works. `;
      } else if (field === 'address') {
        acknowledgment = `Thanks for providing your address. `;
      }

      const nextPrompt = getNextPrompt(updatedBooking, missingFields);
      res.json({
        reply: acknowledgment + nextPrompt,
        conversationHistory: []
      });
      return;
    }

    // If no changes were detected, guide the user
    const nextPrompt = getNextPrompt(updatedBooking, missingFields);
    if (nextPrompt) {
      res.json({
        reply: nextPrompt,
        conversationHistory: []
      });
      return;
    }

    // Fallback response
    res.json({
      reply: "I'm not sure what you mean. Could you please rephrase that? Or if you'd like to start over, just say 'reset'.",
      conversationHistory: []
    });

  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Something went wrong. Please try again or contact us directly.'
    });
  }
});

// Helper function to clean and format a name
function cleanName(name) {
  return name
    .replace(/\b(my name is|i am|i'm|this is|name|hi|hello|hey)\b/gi, '')
    .replace(/[^\w\s]/g, '')
    .split(' ')
    .filter(word => {
      const lword = word.toLowerCase();
      // Filter out service-related words
      return !Object.values(SERVICES).some(service => 
        service.name.toLowerCase().includes(lword) || 
        lword.includes(service.name.toLowerCase())
      );
    })
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();
}

// Extract name from a message
function extractName(message) {
  if (message.length > 40) return null; // Name shouldn't be too long
  return cleanName(message);
}

// Create Google Calendar event
async function createCalendarEvent(booking) {
  try {
    if (!calendar) {
      console.error('❌ Google Calendar not initialized');
      return null;
    }

    // Parse the date and time
    const bookingDate = new Date(booking.date);
    const [hours, minutes] = booking.time.toLowerCase()
      .replace('am', '')
      .replace('pm', '')
      .split(':')
      .map(num => parseInt(num.trim()));
    
    // Adjust hours for PM
    const isPM = booking.time.toLowerCase().includes('pm');
    const adjustedHours = isPM && hours !== 12 ? hours + 12 : hours;
    
    // Set the correct hours and minutes
    bookingDate.setHours(adjustedHours, minutes || 0, 0);
    
    // Create end time based on service duration
    const serviceDuration = booking.services.reduce((total, service) => {
      const serviceInfo = Object.values(SERVICES).find(s => s.name === service);
      return total + (serviceInfo ? serviceInfo.duration : 60);
    }, 0);
    const endDate = new Date(bookingDate.getTime() + serviceDuration * 60 * 1000);
    
    const event = {
      summary: `${booking.services.join(', ')} - ${booking.name}`,
      description: `Beauty service appointment for ${booking.name}\n` +
                  `Services: ${booking.services.join(', ')}\n` +
                  `Address: ${booking.address}`,
      start: {
        dateTime: bookingDate.toISOString(),
        timeZone: 'Europe/Dublin'
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: 'Europe/Dublin'
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 60 },
          { method: 'popup', minutes: 30 }
        ]
      }
    };

    const response = await calendar.events.insert({
      calendarId: OWNER_CALENDAR_ID,
      resource: event,
    });

    console.log('✅ Calendar event created:', response.data.htmlLink);
    return response.data.htmlLink;
  } catch (error) {
    console.error('❌ Error creating calendar event:', error.message);
    return null;
  }
}

// Helper function to parse time string
function parseTimeString(timeStr) {
  // Remove any spaces and convert to lowercase
  timeStr = timeStr.toLowerCase().replace(/\s/g, '');
  
  // Initialize variables
  let hours = 0;
  let minutes = 0;
  
  // Check for different time formats
  if (timeStr.includes(':')) {
    // Format: "6:00pm" or "18:00"
    const [h, m] = timeStr.split(':');
    hours = parseInt(h);
    minutes = parseInt(m);
  } else {
    // Format: "6pm" or "18"
    hours = parseInt(timeStr);
    minutes = 0;
  }
  
  // Handle AM/PM
  if (timeStr.includes('pm') && hours < 12) {
    hours += 12;
  } else if (timeStr.includes('am') && hours === 12) {
    hours = 0;
  }
  
  return { hours, minutes };
}

// Validate time format and business hours
function validateTime(timeStr) {
  try {
    const { hours, minutes } = parseTimeString(timeStr);
    
    // Validate hours (9 AM to 8 PM)
    if (hours < 9 || hours > 20) {
      return false;
    }
    
    // Validate minutes
    if (minutes < 0 || minutes > 59) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

// Handle owner confirmation
app.post("/confirm", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "message is required" });
    }

    // Extract the action from the message
    const action = message.trim().toUpperCase();
    if (!['CONFIRM', 'REJECT'].includes(action)) {
      return res.status(400).json({ error: "Invalid action. Please reply with CONFIRM or REJECT" });
    }

    // Get the latest booking
    const bookingsDir = path.join(__dirname, 'bookings');
    const files = await fs.readdir(bookingsDir);
    if (!files.length) {
      return res.status(404).json({ error: "No pending bookings found" });
    }

    // Sort files by creation time (newest first)
    const sortedFiles = await Promise.all(
      files.map(async (file) => {
        const stats = await fs.stat(path.join(bookingsDir, file));
        return { file, ctime: stats.ctime };
      })
    );
    sortedFiles.sort((a, b) => b.ctime - a.ctime);

    // Get the latest booking
    const latestBookingFile = path.join(bookingsDir, sortedFiles[0].file);
    const booking = JSON.parse(await fs.readFile(latestBookingFile, 'utf8'));

    // Send confirmation/rejection to customer
    if (twilioClient) {
      const customerMessage = action === 'CONFIRM' ?
        `✅ Your booking has been confirmed!\n\n` +
        `Services: ${booking.services.join(', ')}\n` +
        `Date: ${booking.date}\n` +
        `Time: ${booking.time}\n` +
        `• Phone: ${booking.phone}\n\n` +
        `We look forward to seeing you!` :
        `❌ Unfortunately, we cannot accommodate your booking at the requested time.\n\n` +
        `Please book for a different time or contact us at ${businessInfo.owner.phone} for assistance.`;

      await twilioClient.messages.create({
        body: customerMessage,
        from: `whatsapp:${businessInfo.whatsapp}`,
        to: `whatsapp:${booking.phone}`
      });
    }

    // Move booking to confirmed/rejected folder
    const targetDir = path.join(__dirname, action.toLowerCase());
    await fs.mkdir(targetDir, { recursive: true });
    await fs.rename(latestBookingFile, path.join(targetDir, sortedFiles[0].file));

    res.json({
      success: true,
      message: `Booking ${action.toLowerCase()}ed and customer notified`
    });
  } catch (error) {
    console.error('Error in confirmation endpoint:', error);
    res.status(500).json({ error: "Failed to process confirmation" });
  }
});

// Twilio webhook for handling owner's responses
app.post("/webhook", async (req, res) => {
  try {
    const { Body: message, From: from } = req.body;
    console.log('📱 Received webhook:', { message, from });
    
    // Only process messages from the owner
    if (from !== `whatsapp:${businessInfo.owner.phone}`) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const action = message.trim().toUpperCase();
    
    if (!['CONFIRM', 'REJECT'].includes(action)) {
      // Send help message
      if (twilioClient) {
        const twiml = new MessagingResponse();
        twiml.message("Please reply with:\nCONFIRM to accept the booking\nREJECT to decline the booking");
        res.type('text/xml').send(twiml.toString());
      }
      return;
    }

    // Get the latest booking
    const bookingsDir = path.join(__dirname, 'bookings');
    const files = await fs.readdir(bookingsDir);
    if (!files.length) {
      const twiml = new MessagingResponse();
      twiml.message('No pending bookings found.');
      return res.type('text/xml').send(twiml.toString());
    }

    // Sort files by creation time (newest first)
    const sortedFiles = await Promise.all(
      files.map(async (file) => {
        const stats = await fs.stat(path.join(bookingsDir, file));
        return { file, ctime: stats.ctime };
      })
    );
    sortedFiles.sort((a, b) => b.ctime - a.ctime);

    // Get the latest booking
    const latestBookingFile = path.join(bookingsDir, sortedFiles[0].file);
    const booking = JSON.parse(await fs.readFile(latestBookingFile, 'utf8'));

    // Move booking to confirmed/rejected folder
    const targetDir = path.join(__dirname, action.toLowerCase());
    await fs.mkdir(targetDir, { recursive: true });
    await fs.rename(latestBookingFile, path.join(targetDir, sortedFiles[0].file));

    // Send response to owner
    const twiml = new MessagingResponse();
    twiml.message(action === 'CONFIRM' ? 
      '✅ Booking confirmed successfully.' :
      '❌ Booking rejected successfully.'
    );
    res.type('text/xml').send(twiml.toString());

  } catch (error) {
    console.error('Error in webhook:', error);
    const twiml = new MessagingResponse();
    twiml.message('❌ Error processing your request. Please try again.');
    res.type('text/xml').send(twiml.toString());
  }
});

// WhatsApp webhook endpoint
app.post('/demo-reply', express.json(), async (req, res) => {
  try {
    const { Body, From } = req.body;
    console.log('📱 Received WhatsApp message:', { Body, From });

    // Check if this is an owner confirmation
    if (From === process.env.OWNER_PHONE) {
      const response = await handleOwnerConfirmation(Body);
      return res.send(response);
    }

    // For all other messages, send a default response
    const twiml = new MessagingResponse();
    twiml.message('Thank you for your message. Please use our booking system to schedule appointments.');
    res.type('text/xml').send(twiml.toString());
  } catch (error) {
    console.error('❌ WhatsApp webhook error:', error);
    res.status(500).send('Error processing WhatsApp message');
  }
});

// Handle owner confirmation response
async function handleOwnerConfirmation(message) {
  try {
    const normalizedMsg = message.toLowerCase().trim();
    const bookingId = await getCurrentPendingBookingId();
    
    if (!bookingId) {
      return new MessagingResponse().message('No pending bookings found.').toString();
    }

    const booking = await loadBooking(bookingId);
    if (!booking) {
      return new MessagingResponse().message('Booking not found.').toString();
    }

    const twiml = new MessagingResponse();

    if (normalizedMsg === 'confirm' || normalizedMsg === 'yes' || normalizedMsg === 'approved') {
      // Mark booking as confirmed
      booking.status = 'confirmed';
      await saveBooking(bookingId, booking);

      // Send confirmation to customer
      const customerMsg = `🎉 Great news! Your appointment has been confirmed:\n\n` +
        `📅 Services: ${booking.services.join(', ')}\n` +
        `📆 Date: ${booking.date}\n` +
        `⏰ Time: ${booking.time}\n` +
        `📍 Address: ${booking.address}\n` +
        `• Phone: ${booking.phone}\n\n` +
        `We look forward to seeing you! If you need to reschedule, please contact us at least 24 hours in advance.\n\n` +
        `💝 Puja's Beauty Parlour`;

      await sendWhatsAppMessage(booking.phone, customerMsg);
      
      // Response to owner
      twiml.message('✅ Booking confirmed and customer has been notified.');
    } else if (normalizedMsg === 'reject' || normalizedMsg === 'no' || normalizedMsg === 'cancel') {
      // Mark booking as rejected
      booking.status = 'rejected';
      await saveBooking(bookingId, booking);

      // Send rejection to customer
      const customerMsg = `We apologize, but we are unable to accommodate your appointment request for:\n\n` +
        `📅 Services: ${booking.services.join(', ')}\n` +
        `📆 Date: ${booking.date}\n` +
        `⏰ Time: ${booking.time}\n` +
        `• Phone: ${booking.phone}\n\n` +
        `Please try booking for a different time or contact us directly for assistance.\n\n` +
        `💝 Puja's Beauty Parlour`;

      await sendWhatsAppMessage(booking.phone, customerMsg);
      
      // Response to owner
      twiml.message('❌ Booking rejected and customer has been notified.');
    } else {
      twiml.message('Please reply with "confirm" or "reject" to handle the booking.');
    }

    return twiml.toString();
  } catch (error) {
    console.error('❌ Error handling owner confirmation:', error);
    return new MessagingResponse()
      .message('Error processing confirmation. Please try again.')
      .toString();
  }
}

// Helper function to send WhatsApp message
async function sendWhatsAppMessage(to, body) {
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({
      body: body,
      from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
      to: `whatsapp:${to}`
    });
    console.log('✅ WhatsApp message sent successfully');
    return true;
  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error);
    return false;
  }
}

// Graceful shutdown handler
function handleShutdown() {
  console.log('\n🛑 Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('⚠️ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', handleShutdown);
process.on('SIGINT', handleShutdown);

// Start server with port retry logic
function startServer() {
  const server = app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️ Port ${port} is in use, trying ${port + 1}...`);
      server.close();
      app.listen(port + 1, () => {
        console.log(`🚀 Server running on port ${port + 1}`);
      });
    } else {
      console.error('❌ Server error:', err);
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down gracefully...');
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });

  return server;
}

// Initialize server
console.log('\n🔄 Starting server...');
const server = startServer();

// Export for testing
module.exports = {
  app,
  extractService,
  extractAndUpdateDetails,
  isConfirmation,
  isGreeting,
  normalizeHistory,
  getNextPrompt,
  handleGeneralQuestion,
  handleSmallTalk,
  validateBooking,
  processBooking
};

function normalizeHistory(history = []) {
  return history.map(msg => ({
    role: msg.role || 'user',
    parts: [{ text: msg.parts?.[0]?.text || msg.text || '' }]
  }));
}
