// server/src/controllers/aiController.ts
import { Request, Response, NextFunction } from "express";
import Groq from "groq-sdk";
import Order, { IOrder } from "../models/Order";
import DriverEarnings from "../models/DriverEarnings";
import DriverPerformance from "../models/DriverPerformance";
import mongoose from "mongoose";

// Initialize conversation history store
type Role = "system" | "user" | "assistant";
interface ChatMessage {
  role: Role;
  content: string;
}

const conversationHistory = new Map<string, ChatMessage[]>();

if (!process.env.GROQ_API_KEY) {
  console.error('Warning: GROQ_API_KEY is not set in environment variables');
}

const groq = new Groq({ 
  apiKey: process.env.GROQ_API_KEY || 'default-key',
  timeout: 30000,
  maxRetries: 3
});

const MODEL = "llama-3.1-8b-instant";

// ----------- Type Definitions -----------

interface IDriverStats {
  tollsToday: number;
  tripsToday: number;
  fuelBurntToday: number;
  totalEarningToday: number;
  netEarningToday: number;
  cityFuelPrices: Record<string, number>;
}

interface IDriverEarnings extends mongoose.Document {
  driverId: string;
  date: Date;
  totalEarnings: number;
  netEarnings: number;
  tripEarnings: Array<{
    tripId: string;
    amount: number;
  }>;
  expenses: Array<{
    type: string;
    amount: number;
    category: string;
    description?: string;
  }>;
  performanceMetrics: {
    totalDistance: number;
    totalTime: number;
    avgSpeed: number;
  };
  penalties: Array<{
    type: string;
    amount: number;
    reason: string;
  }>;
}

interface IDriverPerformance extends mongoose.Document {
  driverId: string;
  weekStartDate: Date;
  busyHours: Array<{
    hour: number;
    dayOfWeek: number;
    averageEarnings: number;
  }>;
  metrics: {
    avgEarningsPerHour: number;
    totalHours: number;
    totalTrips: number;
    completedTrips: number;
    avgEarningsPerTrip: number;
    avgRating: number;
  };
}

// ----------- Helper Functions -----------

function parseIntent(text: string): { 
  intent: string; 
  location?: string; 
  date?: string;
  trackingId?: string;
} {
  const lowerText = text.toLowerCase();
  
  // Extract tracking ID
  const trackingMatch = text.match(/ORD-[A-Z0-9]+/i);
  const trackingId = trackingMatch ? trackingMatch[0].toUpperCase() : undefined;

  // Order intents
  if (lowerText.includes('track') || lowerText.includes('where')) {
    return { intent: 'track_order', trackingId };
  }
  if (lowerText.includes('cancel') || lowerText.includes('delete')) {
    return { intent: 'cancel_order', trackingId };
  }
  if (lowerText.includes('update') || lowerText.includes('change')) {
    return { intent: 'update_order', trackingId };
  }
  
  // Stats intents
  if (lowerText.includes('earning') || lowerText.includes('income')) {
    return { intent: 'earnings' };
  }
  if (lowerText.includes('performance') || lowerText.includes('stats')) {
    return { intent: 'performance' };
  }

  return { intent: 'chat' };
}

async function handleOrderIntent(
  intent: ReturnType<typeof parseIntent>,
  text: string,
  history: ChatMessage[]
) {
  if (!intent.trackingId) {
    const reply = "Please provide a valid order ID (e.g., ORD-ABC123).";
    return { reply, action: "ask_for_order_id" };
  }

  const order = await Order.findOne({ trackingId: intent.trackingId });

  if (!order) {
    const reply = `Sorry, I couldn't find order ${intent.trackingId}.`;
    return { reply, action: "order_not_found" };
  }

  switch (intent.intent) {
    case 'track_order':
      const reply = `Here are the details for ${order.trackingId}:
- Customer: ${order.customerName || "N/A"}
- Item: ${order.item || "N/A"} (Qty: ${order.qty})
- Address: ${order.address || "N/A"}
- Status: ${order.status || "Processing"}`;
      return { reply, action: "track_order", order };

    case 'cancel_order':
      await Order.findByIdAndUpdate(order._id, { status: "Cancelled" });
      return { 
        reply: `Order ${intent.trackingId} has been cancelled.`,
        action: "cancel_order",
        order: { trackingId: intent.trackingId }
      };

    case 'update_order':
      const updates: Partial<IOrder> = {};
      
      // Extract updates from text
      if (text.toLowerCase().includes('status')) {
        if (text.toLowerCase().includes('delivered')) updates.status = 'Delivered';
        if (text.toLowerCase().includes('shipping')) updates.status = 'Shipped';
        if (text.toLowerCase().includes('process')) updates.status = 'Processing';
      }

      if (text.toLowerCase().includes('assign')) {
        const assignMatch = text.match(/assign(?:ed)?\s+to\s+([a-zA-Z ]+)/i);
        if (assignMatch) {
          updates.assignedTo = assignMatch[1].trim();
        }
      }

      const updated = await Order.findByIdAndUpdate(order._id, updates, { new: true });
      return {
        reply: `Order ${intent.trackingId} has been updated:\n- Status: ${updated?.status}\n- Assigned to: ${updated?.assignedTo || 'not assigned'}`,
        action: "update_order",
        order: updated
      };
  }
}

// Format messages for Groq API
function toGroqMessage(msg: ChatMessage): { role: Role; content: string } {
  return {
    role: msg.role as Role,
    content: msg.content
  };
}

// ----------- Error Handler -----------

const handleError = (error: any) => {
  console.error('AI Controller Error:', error);
  
  if (error.name === 'GroqError') {
    return {
      status: 503,
      error: 'AI Service Error',
      message: 'The AI service is temporarily unavailable. Please try again.'
    };
  }
  
  if (error.name === 'MongoError' || error.name === 'MongooseError') {
    return {
      status: 500,
      error: 'Database Error',
      message: 'A database error occurred. Please try again.'
    };
  }

  return {
    status: 500,
    error: 'Internal Server Error',
    message: error.message || 'Something went wrong. Please try again later.'
  };
};

// ----------- Main Message Handler -----------

export async function handleMessage(req: Request, res: Response, next: NextFunction) {
  const { userId = "demo", text } = req.body;
  
  if (!text?.trim()) {
    return res.status(400).json({ error: "Message text is required" });
  }

  try {
    let history = conversationHistory.get(userId) || [];
    history = history.slice(-10); // Keep last 10 messages for context
    
    // Extract intent first to handle special cases
    const intent = parseIntent(text);
    
    // Handle order-related intents
    if (intent.intent.includes('order')) {
      const result = await handleOrderIntent(intent, text, history);
      if (result) {
        history.push({ role: "user", content: text });
        history.push({ role: "assistant", content: result.reply });
        conversationHistory.set(userId, history);
        return res.json(result);
      }
    }

    // Default to AI chat response
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are Porter Saathi, a helpful AI assistant for delivery drivers in India. Keep responses concise, professional, and culturally appropriate. Support both English and Hindi languages."
        },
        ...history.map(toGroqMessage),
        { role: "user" as Role, content: text }
      ],
      model: MODEL,
      temperature: 0.7,
      max_tokens: 300,
    });

    const reply = completion.choices[0]?.message?.content || "I couldn't generate a response.";
    
    history.push({ role: "user", content: text });
    history.push({ role: "assistant", content: reply });
    conversationHistory.set(userId, history);

    return res.json({ reply, action: "chat_response" });
    
  } catch (error) {
    const errorResponse = handleError(error);
    return res.status(errorResponse.status).json(errorResponse);
  }
}
