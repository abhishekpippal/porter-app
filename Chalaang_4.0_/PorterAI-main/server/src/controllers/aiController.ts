// server/src/controllers/aiController.ts
import { Request, Response } from "express";
import Groq from "groq-sdk";
import Order from "../models/Order";
import DriverEarnings from "../models/DriverEarnings";
import DriverPerformance from "../models/DriverPerformance";
import mongoose from "mongoose";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const groq = new Groq({ apiKey: GROQ_API_KEY || 'default-key' });
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

// Message types for chat completion
type Role = "system" | "user" | "assistant";

interface BaseMessage {
  role: Role;
  content: string;
  name?: string;
}

interface ChatCompletionMessage {
  role: Role;
  content: string;
  name?: string;
}

// ----------- Mock Data -----------
const mockDriverStats: IDriverStats = {
  tollsToday: 3,
  tripsToday: 7,
  fuelBurntToday: 8.2,
  totalEarningToday: 1850,
  netEarningToday: 1500,
  cityFuelPrices: {
    Bengaluru: 110.5,
    Mumbai: 115.2,
    Delhi: 105.8,
    Kolkata: 108.3,
  }
};

// Initialize conversation history store
const conversationHistory = new Map<string, ChatCompletionMessage[]>();

// ----------- Helper Functions -----------

function parseIntent(text: string): { 
  intent: string; 
  location?: string; 
  date?: string;
  compareWith?: string;
} {
  const t = text.toLowerCase();

  // Earnings comparison
  if (/(compare|difference|compare with|difference between) (earning|kamai|income|paise)/i.test(t)) {
    if (/yesterday/.test(t)) {
      return { intent: "earnings_comparison", compareWith: "yesterday" };
    }
    if (/last week/.test(t)) {
      return { intent: "earnings_comparison", compareWith: "lastWeek" };
    }
  }

  // Performance insights
  if (/(how.*doing|performance|improvement|tips|suggest|advice|better)/i.test(t)) {
    return { intent: "performance_insights" };
  }

  // Rest break suggestion
  if (/(break|rest|pause|thakna|tired)/i.test(t)) {
    return { intent: "rest_break" };
  }

  // Toll tax count
  if (/toll.*(cross|count|kitne|kitna|number)/.test(t)) {
    return { intent: "toll_tax_count" };
  }

  // Earnings today
  if (/(earning|kamai|income|paise|kitna|kitne|total|net).*aaj|today/.test(t)) {
    return { intent: "total_earning_today" };
  }

  return { intent: "general" };
}

// Format chat messages for Groq API
function toGroqMessage(msg: ChatCompletionMessage): ChatCompletionMessage {
  return {
    role: msg.role,
    content: msg.content,
    ...(msg.name ? { name: msg.name } : {})
  };
}

// ----------- Main Message Handler -----------

export async function handleMessage(req: Request, res: Response) {
  const { userId = "demo", text } = req.body;
  
  if (!text?.trim()) {
    return res.status(400).json({ error: "Message text is required" });
  }

  let history = conversationHistory.get(userId) || [];
  history = history.slice(-10); // Keep last 10 messages for context
  
  try {
    const intent = parseIntent(text);
    let reply = "";
    
    if (intent.intent === "toll_tax_count") {
      reply = `You have crossed ${mockDriverStats.tollsToday} toll${mockDriverStats.tollsToday === 1 ? '' : 's'} today.`;
    }
    else if (intent.intent === "total_earning_today") {
      reply = `Today's earnings: ₹${mockDriverStats.totalEarningToday}
Net earnings after expenses: ₹${mockDriverStats.netEarningToday}
Completed trips: ${mockDriverStats.tripsToday}`;
    }
    else {
      // Default to AI response
      const chatMessages: ChatCompletionMessage[] = [
        {
          role: "system",
          content: "You are a helpful AI assistant for delivery drivers. Keep responses concise and professional."
        },
        ...history.map(toGroqMessage),
        { role: "user", content: text }
      ];

      const completion = await groq.chat.completions.create({
        messages: chatMessages,
        model: MODEL,
        temperature: 0.7,
        max_tokens: 300,
      });

      reply = completion.choices[0]?.message?.content || "I couldn't generate a response.";
    }

    history.push({ role: "user", content: text });
    history.push({ role: "assistant", content: reply });
    conversationHistory.set(userId, history);

    return res.json({ reply, action: "chat_response" });
    
  } catch (err) {
    console.error("Error handling message:", err);
    return res.status(500).json({ 
      error: "Internal server error",
      message: err instanceof Error ? err.message : "Unknown error"
    });
  }
}
