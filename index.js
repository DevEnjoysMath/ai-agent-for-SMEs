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

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

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

// Twilio webhook signature validation middleware
function validateTwilioRequest(req, res, next) {
  // Skip validation in development if explicitly disabled
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_TWILIO_VALIDATION === 'true') {
    console.log('⚠️ Skipping Twilio validation (development mode)');
    return next();
  }

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.error('❌ TWILIO_AUTH_TOKEN not set - cannot validate webhook');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Get the Twilio signature from the request header
  const twilioSignature = req.headers['x-twilio-signature'];
  if (!twilioSignature) {
    console.error('❌ No Twilio signature found in request');
    return res.status(403).json({ error: 'Forbidden - No signature' });
  }

  // Construct the full URL (important for signature validation)
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const url = `${protocol}://${host}${req.originalUrl}`;

  // Validate the request
  const requestIsValid = twilio.validateRequest(
    authToken,
    twilioSignature,
    url,
    req.body
  );

  if (!requestIsValid) {
    console.error('❌ Invalid Twilio signature');
    console.error('URL:', url);
    console.error('Signature:', twilioSignature);
    return res.status(403).json({ error: 'Forbidden - Invalid signature' });
  }

  console.log('✅ Twilio signature validated');
  next();
}

// Validate required environment variables
const requiredEnvVars = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'OWNER_PHONE',
  'WHATSAPP_NUMBER'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please copy .env.example to .env and fill in your credentials');
  process.exit(1);
}

// Load business info from environment variables
let businessInfo = {
  name: process.env.BUSINESS_NAME || "Beauty Parlour",
  service_area: process.env.SERVICE_AREA || "Home Service",
  phone: process.env.BUSINESS_PHONE || process.env.OWNER_PHONE,
  hours: process.env.BUSINESS_HOURS || "Mon–Sun: 9am–10pm",
  owner: {
    name: process.env.OWNER_NAME || "Owner",
    phone: process.env.OWNER_PHONE
  },
  whatsapp: process.env.WHATSAPP_NUMBER,
  services: [
    { name: "Eyebrow Threading", price: "€10" },
    { name: "Full Face Threading", price: "€25" },
    { name: "Facial (Basic)", price: "€40" },
    { name: "Facial (Luxury)", price: "€60" },
    { name: "Full Body Waxing", price: "€70" },
    { name: "Henna Design", price: "€20–€50" }
  ]
};

console.log("✅ Server configuration loaded");

// Initialize Google Calendar
let calendar;
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const OWNER_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;

try {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
      scopes: ['https://www.googleapis.com/auth/calendar']
    });
    calendar = google.calendar({ version: 'v3', auth });
    console.log('✅ Google Calendar initialized');
  } else {
    console.warn('⚠️ Google Calendar credentials not found in environment variables');
    calendar = null;
  }
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
const STATES_DIR = path.join(__dirname, 'states');
const BOOKINGS_DIR = path.join(__dirname, 'bookings');

// State management functions
async function getBookingState(userPhone) {
  try {
    const stateFile = path.join(STATES_DIR, `${userPhone}.json`);
    const data = await fs.readFile(stateFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    console.error('Error reading booking state:', error);
    return null;
  }
}

async function saveBookingState(userPhone, state) {
  try {
    const stateFile = path.join(STATES_DIR, `${userPhone}.json`);
    if (state) {
      await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
    } else {
      await fs.unlink(stateFile).catch(() => {}); // Ignore if file doesn't exist
    }
  } catch (error) {
    console.error('Error saving booking state:', error);
  }
}

async function savePendingBooking(booking) {
  try {
    const filename = `${Date.now()}_${booking.phone}_${booking.name.replace(/[^a-z0-9]/gi, '_')}.json`;
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

  // Only validate phone if provided
  if (booking.phone && !validatePhoneNumber(booking.phone)) {
    errors.push("Please provide a valid Irish phone number");
  }
  
  return errors;
}

// Validate phone number format
function validatePhoneNumber(phone) {
  // Irish phone number format: +353 XX XXX XXXX or 08X XXX XXXX
  const irishPhoneRegex = /^(?:\+353|0)8[35679]\d{7}$/;
  const cleanPhone = phone.replace(/[\s-]/g, '');
  return irishPhoneRegex.test(cleanPhone);
}

// Process booking confirmation
async function processBooking(booking, message = '') {
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
    const servicesTotal = calculateServicesTotal(booking.services);
    const travelCharge = calculateTravelCharge(booking.address);
    const totalCost = servicesTotal + travelCharge;
    
    // Format date nicely
    const formattedDate = new Date(booking.date);
    const dateString = formattedDate.toLocaleDateString('en-IE', { 
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    // Format time nicely
    const timeMatch = booking.time.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    const formattedTime = timeMatch ? 
      `${timeMatch[1].padStart(2, '0')}:${(timeMatch[2] || '00').padStart(2, '0')}${timeMatch[3].toLowerCase()}` :
      booking.time;
    
    // Save booking
    const bookingToSave = {
      ...booking,
      servicesTotal,
      travelCharge,
      totalCost,
      date: dateString,
      time: formattedTime
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
    if (calendarLink) {
      console.log('✅ Calendar event created:', calendarLink);
    }

        // If confirmation is successful, send a more final message
     if (isConfirmation(message)) {
      return {
        success: true,
        message: `Great! I've confirmed your booking and sent the details to the beautician. You'll receive a WhatsApp confirmation shortly.\n\n` +
          `📋 ━━━ Booking Confirmed ━━━\n` +
          `👤 Name: ${booking.name}\n` +
          `💅 Services: ${booking.services.join(', ')}\n` +
          `📅 Date: ${dateString}\n` +
          `⏰ Time: ${formattedTime}\n` +
          `📍 Address: ${booking.address}\n\n` +
          `💰 Services Total: €${servicesTotal}\n` +
          `🚗 Travel Charge: €${travelCharge}\n` +
          `💳 Total Cost: €${totalCost}\n\n` +
          `See you soon! If you need to make any changes, just let me know.`
      };
    }

    // Otherwise, ask for confirmation
    return {
      success: true,
      message: `Perfect! Here's your booking details:\n\n` +
        `📋 ━━━ Booking Details ━━━\n` +
        `👤 Name: ${booking.name}\n` +
        `💅 Services: ${booking.services.join(', ')}\n` +
        `📅 Date: ${dateString}\n` +
        `⏰ Time: ${formattedTime}\n` +
        `📍 Address: ${booking.address}\n\n` +
        `💰 Services Total: €${servicesTotal}\n` +
        `🚗 Travel Charge: €${travelCharge}\n` +
        `💳 Total Cost: €${totalCost}\n\n` +
        `Does all that look good to you?`,
      servicesTotal,
      travelCharge,
      totalCost
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

  // Skip if no phone number provided
  if (!data.phone) {
    console.log('⚠️ Skipping WhatsApp notification - no phone number provided');
    return false;
  }

  const ownerMessage = `🔔 *New Booking*\n
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
async function processMessage(message, booking) {
  try {
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
      
      return {
        message: servicesFound.length === 1 
          ? `I've added ${servicesFound[0]} to your booking. What's your name?`
          : `I've added ${servicesFound.join(' and ')} to your booking. What's your name?`,
        booking: booking
      };
    }

    // If it's just a greeting and no services mentioned, respond appropriately
    if (isGreeting(message) && !normalizedMsg.includes('book') && !normalizedMsg.includes('want')) {
      if (booking.services.length === 0) {
        return {
          message: `Here are our services:\n\n` +
            `💆‍♀️ Facial Treatments:\n` +
            `• Basic Facial (€40) - 45 minutes\n` +
            `• Luxury Facial (€60) - 60 minutes\n\n` +
            `🧵 Threading Services:\n` +
            `• Eyebrow Threading (€10) - 15 minutes\n` +
            `• Full Face Threading (€25) - 30 minutes\n\n` +
            `✨ Other Services:\n` +
            `• Full Body Waxing (€70) - 90 minutes\n` +
            `• Henna Design (€20–€50) - 45-60 minutes\n\n` +
            `Which service would you like to book?`,
          booking: booking
        };
      } else {
        return {
          message: getRandomGreeting(),
          booking: booking
        };
      }
    }

    // Update booking with any new information
    const updatedBooking = extractAndUpdateDetails(message, booking);
    
    // If nothing changed and it's a command, handle it
    if (JSON.stringify(updatedBooking) === JSON.stringify(booking) && isCommand(message)) {
      return {
        message: handleCommand(message, booking),
        booking: booking
      };
    }
    
    // Get missing fields
    const missingFields = getMissingFields(updatedBooking);
    
    // If booking is complete, process it
    if (missingFields.length === 0) {
      const result = await processBooking(updatedBooking, message);
      return {
        message: result.message,
        booking: updatedBooking
      };
    }
    
    // Get next prompt
    return {
      message: getNextPrompt(updatedBooking, missingFields),
      booking: updatedBooking
    };
  } catch (error) {
    console.error('Error processing message:', error);
    return {
      message: "I apologize, but I encountered an error. Could you please try again?",
      booking: booking
    };
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

  // Skip asking for name if we already have it
  if (booking.name && missingFields.includes('name')) {
    missingFields = missingFields.filter(field => field !== 'name');
    if (missingFields.length === 0) {
      return null;
    }
  }

  const prompts = {
    name: [
      "Could I get your name?",
      "What name should I put this booking under?",
      "Who am I booking this for?"
    ],
    services: [
      `What treatment would you like?\n${Object.values(SERVICES).map(s => `• ${s.name} (${s.price})`).join('\n')}\n\nYou can book multiple treatments together!`
    ],
    date: [
      "What date would you like me to come? You can say 'tomorrow', 'next Monday', or any specific date."
    ],
    time: [
      "What time works best for you? I'm available from 9am to 8pm.",
      "What time would you prefer? I'm available 9am to 8pm."
    ],
    address: [
      "What's your address?",
      "Could you share your address with me?",
      "What's your home address?"
    ],
    phone: [
      "What's your phone number? I'll use this to send you booking confirmations via WhatsApp.",
      "Could you share your phone number? This is for WhatsApp notifications.",
      "Please provide your phone number for booking confirmations."
    ]
  };

  const field = missingFields[0];
  const promptList = prompts[field] || [`Could you provide your ${field}?`];
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
    'facial': null, // Special case to handle ambiguous facial request
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
      if (value === null) {
        // Handle ambiguous facial request
        return 'AMBIGUOUS_FACIAL';
      }
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
  
  // Extract service(s) if we don't have any yet
  if (booking.services.length === 0) {
    if (normalizedMessage.includes('and') || normalizedMessage.includes(',')) {
      const parts = normalizedMessage.split(/(?:,|\sand\s)/);
      for (const part of parts) {
        const service = extractService(part);
        if (service && !booking.services.includes(service)) {
          booking.services.push(service);
        }
      }
    } else {
      const service = extractService(message);
      if (service && !booking.services.includes(service)) {
        booking.services.push(service);
      }
    }
  }
  
  // Extract name if we don't have it
  if (!booking.name && booking.services.length > 0) {
    const possibleName = extractName(message);
    if (possibleName) {
      booking.name = possibleName;
    }
  }
  
  // Extract date if we have name but no date
  if (!booking.date && booking.name) {
    const dateTimeInfo = extractDateTime(message);
    if (dateTimeInfo.date) {
      booking.date = dateTimeInfo.date;
    }
  }
  
  // Extract time if we have date but no time
  if (!booking.time && booking.date) {
    const dateTimeInfo = extractDateTime(message);
    if (dateTimeInfo.time) {
      booking.time = dateTimeInfo.time;
    }
  }
  
  // Extract address if we have time but no address
  if (!booking.address && booking.time) {
    // Don't treat time inputs as addresses
    if (!message.match(/^\d{1,2}(?::(\d{2}))?\s*(am|pm)?$/i)) {
      const possibleAddress = extractAddress(message);
      if (possibleAddress) {
        booking.address = possibleAddress;
      }
    }
  }

  // Extract phone if we have address but no phone
  if (!booking.phone && booking.address) {
    const possiblePhone = extractPhoneNumber(message);
    if (possiblePhone) {
      booking.phone = possiblePhone;
    }
  }
  
  return booking;
}

// Helper function to extract name
function extractName(message) {
  // If message is too long or contains service names, it's probably not a name
  if (message.length > 30 || Object.values(SERVICES).some(s => 
    message.toLowerCase().includes(s.name.toLowerCase())
  )) {
    return null;
  }

  // If message contains common non-name indicators, it's not a name
  const nonNameIndicators = ['book', 'want', 'need', 'looking', 'address', 'time', 'date'];
  if (nonNameIndicators.some(word => message.toLowerCase().includes(word))) {
    return null;
  }

  // Clean and format the potential name
  const cleanedName = message
    .trim()
    .replace(/[^a-zA-Z\s]/g, '') // Remove non-letter characters
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();

  return cleanedName || null;
}

// Helper function to extract address
function extractAddress(message) {
  // If message is too short or contains booking keywords, it's probably not an address
  if (message.length < 5 || 
      message.match(/^(yes|no|ok|sure|cancel|book|what|how|when)/i) ||
      message.match(/^\d{1,2}(?::\d{2})?\s*(?:am|pm)?$/i)) { // Don't treat time as address
    return null;
  }

  // Clean and format the potential address
  const cleanedAddress = message
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return cleanedAddress || null;
}

// Calculate travel charge based on address
function calculateTravelCharge(address) {
  // This is a placeholder function - you can implement proper distance-based calculation
  return 5; // Default €5 travel charge
}

// Extract date and time from message
function extractDateTime(message) {
  const result = { date: null, time: null };
  const msg = message.toLowerCase().trim();
  
  // Handle date
  if (msg.includes('tomorrow')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    result.date = tomorrow.toLocaleDateString('en-IE', { 
      weekday: 'long', 
      year: 'numeric',
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
        year: 'numeric',
        day: 'numeric', 
        month: 'long'
      });
    }
  }
  
  // Try to parse date formats
  const datePatterns = [
    // DD/MM/YYYY or DD-MM-YYYY
    /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/,
    // Month DD or DD Month (including ordinal suffixes)
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?/i,
    // DD Month (including ordinal suffixes)
    /(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)(?:\s*,?\s*(\d{4}))?/i,
    // Just the day with ordinal and month
    /(\d{1,2})(?:st|nd|rd|th)?\s*(january|february|march|april|may|june|july|august|september|october|november|december)/i
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
            // Remove any ordinal suffix
            const day = parseInt(match[2].replace(/(st|nd|rd|th)/, ''));
            date.setDate(day);
            if (match[3]) date.setFullYear(parseInt(match[3]));
          }
        } else {
          // DD/MM or DD Month format
          const day = parseInt(match[1].replace(/(st|nd|rd|th)/, ''));
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
          year: 'numeric',
          day: 'numeric', 
          month: 'long'
        });
      }
    }
  }

  // Handle time with improved parsing
  const timePatterns = [
    // Match "10 am", "10am", "10:00 am", "10:00am"
    /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i,
    // Match "10", "10:00" (24-hour format)
    /\b(\d{1,2})(?::(\d{2}))?\b(?!\s*[ap]m)/i
  ];

  for (const pattern of timePatterns) {
    const match = msg.match(pattern);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = match[2] ? parseInt(match[2]) : 0;
      const meridian = match[3] ? match[3].toLowerCase() : null;

      // Handle 12-hour format (am/pm)
      if (meridian) {
        if (meridian === 'pm' && hours < 12) hours += 12;
        if (meridian === 'am' && hours === 12) hours = 0;
      } else {
        // 24-hour format
        if (hours >= 0 && hours <= 23) {
          const meridian = hours >= 12 ? 'pm' : 'am';
          if (hours > 12) hours -= 12;
          if (hours === 0) hours = 12;
        }
      }

      // Format the time string
      const formattedHours = hours;
      const formattedMinutes = minutes.toString().padStart(2, '0');
      const period = (meridian || (hours >= 12 ? 'pm' : 'am'));
      result.time = `${formattedHours}:${formattedMinutes}${period}`;
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
    'that\'s fine', 'all set', 'absolutely', 'yes please'
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
  
  // Physical store/location questions
  if ((msg.includes('store') || msg.includes('shop') || msg.includes('salon')) && 
      (msg.includes('physical') || msg.includes('location') || msg.includes('where') || msg.includes('address'))) {
    return "I provide all services at your home - there's no physical store! I travel throughout Dublin to provide beauty services at your convenience. Travel charges range from €5-€10 depending on your location. Would you like to book a treatment?";
  }

  // Home service questions
  if ((msg.includes('home') && (msg.includes('service') || msg.includes('visit'))) || 
      msg.includes('do you come') || 
      msg.includes('provide service') ||
      (msg.includes('where') && msg.includes('service'))) {
    return "Yes! I provide all services at your home. I travel throughout Dublin and come to your location for the treatment. Travel charges range from €5-€10 depending on your location. Would you like to book a treatment?";
  }

  // Service-related questions
  if (msg.includes('what') && (msg.includes('service') || msg.includes('offer') || msg.includes('treatment'))) {
    return `I offer these beauty services:\n\n` +
      `💆‍♀️ Facial Treatments:\n` +
      `• Basic Facial (€40) - 45 minutes\n` +
      `• Luxury Facial (€60) - 60 minutes\n\n` +
      `🧵 Threading Services:\n` +
      `• Eyebrow Threading (€10) - 15 minutes\n` +
      `• Full Face Threading (€25) - 30 minutes\n\n` +
      `✨ Other Services:\n` +
      `• Full Body Waxing (€70) - 90 minutes\n` +
      `• Henna Design (€20–€50) - 45-60 minutes\n\n` +
      `Would you like to book any of these treatments?`;
  }

  // Opening hours/timing questions
  if (msg.includes('opening') || msg.includes('closing') || 
      msg.includes('hours') || msg.includes('timing') || 
      (msg.includes('what') && msg.includes('time')) ||
      msg.includes('when') && msg.includes('open')) {
    return "I'm available from 9am to 8pm, 7 days a week. All services are provided at your home for your convenience. When would you like to schedule your treatment?";
  }

  // Price-related questions
  if (msg.includes('how much') || msg.includes('price') || msg.includes('cost') || msg.includes('charge')) {
    const service = extractService(message);
    if (service) {
      const serviceInfo = Object.values(SERVICES).find(s => s.name === service);
      if (serviceInfo) {
        return `The ${service} costs ${serviceInfo.price} and takes about ${serviceInfo.duration} minutes. A travel charge of €5-€10 will be added depending on your location. Would you like to book this service?`;
      }
    }
    return `Here are my services and prices:\n\n` +
      `💆‍♀️ Facial Treatments:\n` +
      `• Basic Facial (€40) - 45 minutes\n` +
      `• Luxury Facial (€60) - 60 minutes\n\n` +
      `🧵 Threading Services:\n` +
      `• Eyebrow Threading (€10) - 15 minutes\n` +
      `• Full Face Threading (€25) - 30 minutes\n\n` +
      `✨ Other Services:\n` +
      `• Full Body Waxing (€70) - 90 minutes\n` +
      `• Henna Design (€20–€50) - 45-60 minutes\n\n` +
      `A travel charge of €5-€10 will be added depending on your location.\n\n` +
      `Which service would you like to know more about?`;
  }

  // Duration questions
  if (msg.includes('how long') || msg.includes('duration') || msg.includes('take')) {
    const service = extractService(message);
    if (service) {
      const serviceInfo = Object.values(SERVICES).find(s => s.name === service);
      if (serviceInfo) {
        return `The ${service} takes about ${serviceInfo.duration} minutes. I'll come to your home for the treatment. Would you like to book this service?`;
      }
    }
    return `Here are my service durations:\n\n` +
      `💆‍♀️ Facial Treatments:\n` +
      `• Basic Facial - 45 minutes\n` +
      `• Luxury Facial - 60 minutes\n\n` +
      `🧵 Threading Services:\n` +
      `• Eyebrow Threading - 15 minutes\n` +
      `• Full Face Threading - 30 minutes\n\n` +
      `✨ Other Services:\n` +
      `• Full Body Waxing - 90 minutes\n` +
      `• Henna Design - 45-60 minutes\n\n` +
      `All services are provided at your home. Which service would you like to know more about?`;
  }

  // Location/travel questions
  if (msg.includes('where') || msg.includes('location') || msg.includes('area') || msg.includes('travel')) {
    return "I provide all beauty services at your home throughout Dublin. I'll come to your location for the treatment. Travel charges range from €5-€10 depending on your location. Would you like to book a treatment?";
  }

  // Availability questions
  if (msg.includes('when') || (msg.includes('what') && msg.includes('time')) || msg.includes('available')) {
    return "I'm available from 9am to 8pm, 7 days a week. I provide all services at your home, so just let me know what time works best for you. When would you like to schedule your treatment?";
  }

  // Payment questions
  if (msg.includes('pay') || msg.includes('payment') || msg.includes('cash') || msg.includes('card')) {
    return "I accept both cash and card payments. Payment is collected after the service is completed at your home. Would you like to book a treatment?";
  }

  // Difference between basic and luxury facial
  if ((msg.includes('difference') || msg.includes('between')) && msg.includes('facial')) {
    return `Let me explain the difference between my facial treatments:\n\n` +
      `✨ Basic Facial (€40 - 45 minutes):\n` +
      `• Deep cleansing\n` +
      `• Gentle exfoliation\n` +
      `• Face massage\n` +
      `• Basic moisturizing\n\n` +
      `✨ Luxury Facial (€60 - 60 minutes):\n` +
      `• Everything in Basic Facial, plus:\n` +
      `• Premium products\n` +
      `• Extended massage\n` +
      `• Special mask treatment\n` +
      `• Neck and shoulder massage\n\n` +
      `Both facials are provided at your home. Which one would you prefer?`;
  }

  // Booking process questions
  if (msg.includes('how') && msg.includes('book')) {
    return "Booking is simple! Just let me know:\n" +
      "1. Which service you'd like\n" +
      "2. Your preferred date and time\n" +
      "3. Your name\n" +
      "4. Your address\n\n" +
      "I'll come to your home to provide the service. Would you like to book a treatment now?";
  }

  // Cancellation/changes questions
  if (msg.includes('cancel') || msg.includes('change') || msg.includes('reschedule')) {
    return "You can cancel or reschedule your appointment up to 24 hours before the scheduled time without any charge. Just let me know and I'll help you with that. Would you like to make a booking?";
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

// Check if message is a command
function isCommand(message) {
  const commands = ['reset', 'cancel', 'help', 'menu', 'services'];
  const normalizedMsg = message.toLowerCase().trim();
  return commands.some(cmd => normalizedMsg === cmd);
}

// Handle commands
function handleCommand(message, booking) {
  const normalizedMsg = message.toLowerCase().trim();
  
  switch (normalizedMsg) {
    case 'reset':
    case 'cancel':
      return 'Booking cancelled. How can I help you today?';
    
    case 'help':
      return 'I can help you book beauty services. Just tell me what service you\'d like, and I\'ll guide you through the booking process.';
    
    case 'menu':
    case 'services':
      return `Here are our services:\n\n` +
        `💆‍♀️ Facial Treatments:\n` +
        `• Basic Facial (€40) - 45 minutes\n` +
        `• Luxury Facial (€60) - 60 minutes\n\n` +
        `🧵 Threading Services:\n` +
        `• Eyebrow Threading (€10) - 15 minutes\n` +
        `• Full Face Threading (€25) - 30 minutes\n\n` +
        `✨ Other Services:\n` +
        `• Full Body Waxing (€70) - 90 minutes\n` +
        `• Henna Design (€20–€50) - 45-60 minutes\n\n` +
        `Which service would you like to book?`;
    
    default:
      return null;
  }
}

// ============================================================================
// Health Check & Monitoring Endpoints
// ============================================================================

// Basic health check endpoint (for load balancers, uptime monitors)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Detailed status endpoint (for monitoring dashboards)
app.get('/status', async (req, res) => {
  try {
    // Check critical services
    const status = {
      status: 'operational',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      services: {
        twilio: {
          status: twilioClient ? 'configured' : 'not_configured',
          configured: !!process.env.TWILIO_ACCOUNT_SID
        },
        googleCalendar: {
          status: calendar ? 'configured' : 'not_configured',
          configured: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY
        },
        geminiAI: {
          status: process.env.GEMINI_API_KEY ? 'configured' : 'not_configured',
          configured: !!process.env.GEMINI_API_KEY
        }
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: {
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB',
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
          percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100) + '%'
        },
        cpuUsage: process.cpuUsage()
      }
    };

    // Check if any critical service is not configured
    const allConfigured = Object.values(status.services).every(s => s.configured);
    if (!allConfigured) {
      status.status = 'degraded';
      status.warning = 'Some services are not configured';
    }

    res.status(200).json(status);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: 'Failed to retrieve status',
      timestamp: new Date().toISOString()
    });
  }
});

// Readiness check (Kubernetes-style)
app.get('/ready', async (req, res) => {
  try {
    // Check if all required services are ready
    const isReady = twilioClient && process.env.OWNER_PHONE && process.env.WHATSAPP_NUMBER;

    if (isReady) {
      res.status(200).json({
        ready: true,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        ready: false,
        timestamp: new Date().toISOString(),
        message: 'Service not ready - missing required configuration'
      });
    }
  } catch (error) {
    res.status(503).json({
      ready: false,
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// ============================================================================
// Main Application Routes
// ============================================================================

// Process chat endpoint
app.post("/chat", async (req, res) => {
  try {
    const { userMessage } = req.body;
    const normalizedMessage = userMessage.toLowerCase().trim();

    // Check for general questions first
    const questionResponse = handleGeneralQuestion(userMessage);
    if (questionResponse) {
      res.json({
        reply: questionResponse,
        conversationHistory: []
      });
      return;
    }

    // Handle small talk
    const smallTalkResponse = handleSmallTalk(userMessage);
    if (smallTalkResponse) {
      res.json({
        reply: smallTalkResponse,
        conversationHistory: []
      });
      return;
    }
    
    // Reset command
    if (normalizedMessage === 'reset') {
      console.log('🔄 Resetting conversation state...');
      await saveBookingState(null);
      res.json({ 
        reply: "Conversation reset. How can I help you today?",
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

    // If we have all booking details and user confirms
    if (isBookingComplete(booking) && isConfirmation(userMessage)) {
      const result = await processBooking(booking, userMessage);
      if (result.success) {
        // Clear booking state after successful confirmation
        await saveBookingState(null);
      }
      res.json({
        reply: result.message,
        conversationHistory: []
      });
      return;
    }

    // Handle greeting or new conversation
    if (isGreeting(userMessage)) {
      const greetingResponses = [
        "Hi! How can I help you today? 😊",
        "Hey there! What can I assist you with? ✨",
        "Hello! How may I help you today? 💝",
        "Hi! What brings you here today? 🌟"
      ];
      
      // Reset booking state for new conversation
      booking = {
        name: '',
        services: [],
        date: '',
        time: '',
        address: ''
      };
      await saveBookingState(booking);
      
      res.json({
        reply: greetingResponses[Math.floor(Math.random() * greetingResponses.length)],
        conversationHistory: []
      });
      return;
    }

    // Handle booking intent or service inquiry
    if (normalizedMessage.includes('book') || 
        normalizedMessage.includes('appointment') || 
        normalizedMessage.includes('service') || 
        normalizedMessage.includes('treatment') ||
        normalizedMessage.includes('what') || 
        normalizedMessage.includes('offer')) {
      
      const serviceMenu = `Here are my services:\n\n` +
        `💆‍♀️ Facial Treatments:\n` +
        `• Basic Facial (€40) - 45 minutes\n` +
        `• Luxury Facial (€60) - 60 minutes\n\n` +
        `🧵 Threading Services:\n` +
        `• Eyebrow Threading (€10) - 15 minutes\n` +
        `• Full Face Threading (€25) - 30 minutes\n\n` +
        `✨ Other Services:\n` +
        `• Full Body Waxing (€70) - 90 minutes\n` +
        `• Henna Design (€20–€50) - 45-60 minutes\n\n` +
        `Which treatment would you like?`;
      
      res.json({
        reply: serviceMenu,
        conversationHistory: []
      });
      return;
    }

    // Extract all possible information from the message
    const updatedBooking = extractAndUpdateDetails(userMessage, booking);
    await saveBookingState(updatedBooking);
    
    // Get missing fields
    const missingFields = getMissingFields(updatedBooking);
    
    // If we have everything and it's not a confirmation, show confirmation request
    if (missingFields.length === 0 && !isConfirmation(userMessage)) {
      const servicesTotal = calculateServicesTotal(updatedBooking.services);
      const travelCharge = calculateTravelCharge(updatedBooking.address);
      const totalCost = servicesTotal + travelCharge;

      const summary = `Perfect! Here's your booking details:\n\n` +
        `📋 ━━━ Booking Details ━━━\n` +
        `👤 Name: ${updatedBooking.name}\n` +
        `💅 Services: ${updatedBooking.services.join(', ')}\n` +
        `📅 Date: ${updatedBooking.date}\n` +
        `⏰ Time: ${updatedBooking.time}\n` +
        `📍 Address: ${updatedBooking.address}\n\n` +
        `💰 Services Total: €${servicesTotal}\n` +
        `🚗 Travel Charge: €${travelCharge}\n` +
        `💳 Total Cost: €${totalCost}\n\n` +
        `Does all that look good to you?`;
      
      res.json({
        reply: summary,
        conversationHistory: []
      });
      return;
    } else if (missingFields.length === 0 && isConfirmation(userMessage)) {
      // If it's a confirmation, just ask for final confirmation
      res.json({
        reply: "Would you like me to confirm this booking for you?",
        conversationHistory: []
      });
      return;
    }

    // Handle service selection
    if (updatedBooking.services.length === 0) {
      const serviceMenu = `What treatment would you like?\n\n` +
        `💆‍♀️ Facial Treatments:\n` +
        `• Basic Facial (€40) - 45 minutes\n` +
        `• Luxury Facial (€60) - 60 minutes\n\n` +
        `🧵 Threading Services:\n` +
        `• Eyebrow Threading (€10) - 15 minutes\n` +
        `• Full Face Threading (€25) - 30 minutes\n\n` +
        `✨ Other Services:\n` +
        `• Full Body Waxing (€70) - 90 minutes\n` +
        `• Henna Design (€20–€50) - 45-60 minutes\n\n` +
        `You can book multiple treatments together!`;
      
      res.json({
        reply: serviceMenu,
        conversationHistory: []
      });
      return;
    }

    // Get next required field
    const nextField = missingFields[0];
    let prompt;

    switch (nextField) {
      case 'name':
        prompt = "Could I get your name?";
        break;
      case 'date':
        prompt = "What date would you like me to come? You can say 'tomorrow', 'next Monday', or any specific date.";
        break;
      case 'time':
        prompt = "What time works best for you? I'm available from 9am to 8pm.";
        break;
      case 'address':
        prompt = "What's your address?";
        break;
      case 'phone':
        prompt = "What's your phone number? I'll use this to send you booking confirmations via WhatsApp.";
        break;
      default:
        prompt = getNextPrompt(updatedBooking, missingFields);
    }

    res.json({
      reply: prompt,
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
app.post("/webhook", validateTwilioRequest, async (req, res) => {
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
app.post('/whatsapp', validateTwilioRequest, async (req, res) => {
  try {
    const { Body: message, From: from, ProfileName: name } = req.body;
    console.log('📱 Received WhatsApp message:', { message, from, name });

    // Create Twilio response
    const twiml = new MessagingResponse();

    // Check if this is the owner (compare full WhatsApp number)
    const ownerNumber = `whatsapp:+${process.env.OWNER_WHATSAPP_NUMBER.replace(/^\+/, '')}`;
    console.log('🔍 Comparing numbers:', { from, ownerNumber });
    const isOwner = from === ownerNumber;

    if (isOwner) {
      // Handle owner's confirmation/rejection
      const response = await handleOwnerConfirmation(message);
      console.log('👤 Owner response:', response);
      twiml.message(response);
      res.type('text/xml').send(twiml.toString());
      return;
    }

    // For customers, process the message through our booking system
    const userPhone = from.replace('whatsapp:', '');
    
    // Load or create booking state
    let bookingState = await getBookingState(userPhone) || {
      name: name || '',
      services: [],
      phone: userPhone
    };

    console.log('📝 Current booking state:', bookingState);

    // If it's a greeting and no booking exists, show services menu
    if (isGreeting(message) && (!bookingState || bookingState.services.length === 0)) {
      console.log('👋 Sending welcome message and services menu');
      const servicesMenu = `👋 Hi${name ? ' ' + name : ''}! Welcome to Puja's Beauty Parlour!\n\nI can help you book any of these services:\n\n` +
        `💆‍♀️ Facial Treatments:\n` +
        `• Basic Facial (€40) - 45 minutes\n` +
        `• Luxury Facial (€60) - 60 minutes\n\n` +
        `🧵 Threading Services:\n` +
        `• Eyebrow Threading (€10) - 15 minutes\n` +
        `• Full Face Threading (€25) - 30 minutes\n\n` +
        `✨ Other Services:\n` +
        `• Full Body Waxing (€70) - 90 minutes\n` +
        `• Henna Design (€20–€50) - 45-60 minutes\n\n` +
        `Which service would you like to book?`;
      twiml.message(servicesMenu);
    } else {
      // Process the message
      const response = await processMessage(message, bookingState);
      console.log('🤖 Bot response:', response);
      
      // Save the updated state
      if (response.booking) {
        bookingState = response.booking;
        await saveBookingState(userPhone, bookingState);
      }

      twiml.message(response.message || response);
    }
    
    console.log('📤 Sending response to WhatsApp');
    res.type('text/xml').send(twiml.toString());

  } catch (error) {
    console.error('❌ Error processing WhatsApp message:', error);
    const twiml = new MessagingResponse();
    twiml.message('Sorry, I encountered an error. Please try again.');
    res.type('text/xml').send(twiml.toString());
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
      const customerMsg = `🎉 Great news! Your appointment has been confirmed by Puja:\n\n` +
        `📅 Services: ${booking.services.join(', ')}\n` +
        `📆 Date: ${booking.date}\n` +
        `⏰ Time: ${booking.time}\n` +
        `📍 Address: ${booking.address}\n` +
        `• Phone: ${booking.phone}\n\n` +
        `I look forward to seeing you! If you need to reschedule, please contact me at least 24 hours in advance.\n\n` +
        `See you there! 💝\n` +
        `- Puja`;

      await sendWhatsAppMessage(booking.phone, customerMsg);
      
      // Response to owner
      twiml.message('✅ Booking confirmed and customer has been notified.');
    } else if (normalizedMsg === 'reject' || normalizedMsg === 'no' || normalizedMsg === 'cancel') {
      // Mark booking as rejected
      booking.status = 'rejected';
      await saveBooking(bookingId, booking);

      // Send rejection to customer
      const customerMsg = `Hi, this is Puja. I apologize, but I won't be able to accommodate your appointment request for:\n\n` +
        `📅 Services: ${booking.services.join(', ')}\n` +
        `📆 Date: ${booking.date}\n` +
        `⏰ Time: ${booking.time}\n\n` +
        `Please try booking for a different time or contact me directly and I'll help you find a suitable slot.\n\n` +
        `Thank you for understanding! 💝\n` +
        `- Puja`;

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

// Calculate services total
function calculateServicesTotal(services) {
  return services.reduce((total, service) => {
    const serviceInfo = Object.values(SERVICES).find(s => s.name === service);
    if (serviceInfo) {
      const price = parseInt(serviceInfo.price.replace('€', ''));
      return total + (isNaN(price) ? 0 : price);
    }
    return total;
  }, 0);
}

// Extract phone number from message
function extractPhoneNumber(message) {
  // Remove any non-numeric characters except + for international format
  const cleaned = message.replace(/[^\d+]/g, '');
  
  // Check for Irish phone number patterns
  const patterns = [
    /^(\+353|00353)8[35679]\d{7}$/, // International format: +353 8X XXX XXXX
    /^08[35679]\d{7}$/ // National format: 08X XXX XXXX
  ];
  
  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      // Convert to international format if needed
      if (match[0].startsWith('0')) {
        return '+353' + match[0].substring(1);
      }
      return match[0];
    }
  }
  
  return null;
}
