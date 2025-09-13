// server/src/controllers/aiController.ts
import { Request, Response } from "express";
import Groq from "groq-sdk";
import Order from "../models/Order";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const groq = GROQ_API_KEY ? new Groq({ apiKey: GROQ_API_KEY }) : null;
const MODEL = "llama-3.1-8b-instant";

// Minimal message type for internal history
type Msg = {
  role: "system" | "user" | "assistant" | "function";
  content: string;
  // name only used for function messages (optional)
  name?: string;
};

// In-memory conversation history per user (demo)
const conversationHistory = new Map<string, Msg[]>();

function makeTrackingId() {
  return "ORD-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8).toUpperCase();
}

// ----------- Helpers for intent & field extraction -----------

function extractTrackingIdFrom(text: string): string | null {
  const m = text.match(/\bORD-[A-Za-z0-9]+\b/i);
  return m ? m[0].toUpperCase() : null;
}

function extractAssignee(text: string): string | null {
  const m = text.match(/assign(?:\s+to)?\s+([A-Za-z ]+)/i);
  return m ? m[1].trim() : null;
}

function extractStatus(text: string): "delivered" | "processing" | "shipped" | null {
  const lower = text.toLowerCase();
  if (/\bdelivered\b/.test(lower)) return "delivered";
  if (/\bprocessing\b/.test(lower)) return "processing";
  if (/\bshipped\b/.test(lower)) return "shipped";
  return null;
}

// 12h/24h times like “5 pm”, “5:30pm”, “17:45”
function extractPickupTime(text: string): Date | null {
  const m = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const ampm = m[3]?.toLowerCase();
  if (ampm) {
    if (ampm === "pm" && h < 12) h += 12;
    if (ampm === "am" && h === 12) h = 0;
  }
  const d = new Date();
  d.setSeconds(0, 0);
  d.setHours(h, min, 0, 0);
  if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
  return d;
}

function parseIntent(text: string): { intent: string; location?: string; date?: string; trackingId?: string } {
  const t = text.toLowerCase();

  // New: Toll tax count
  if (/toll.*(cross|count|kitne|kitna|number)/.test(t)) {
    return { intent: "toll_tax_count", date: /aaj|today/.test(t) ? "today" : undefined };
  }

  // New: Fuel price query
  const fuelMatch = t.match(/(petrol|diesel|fuel).*(price|daam|rate|kitna|kya)/);
  if (fuelMatch) {
    // Try to extract city/location
    const locMatch = t.match(/(in|mein|me|at)\s+([a-zA-Z]+)/);
    return { intent: "fuel_price_query", location: locMatch ? locMatch[2] : undefined };
  }

  // New: Trip count today
  if (/trip.*(count|kitne|kitna|number|aaj|today|complete|kiye)/.test(t)) {
    return { intent: "trip_count_today", date: /aaj|today/.test(t) ? "today" : undefined };
  }

  // New: Fuel burnt today
  if (/fuel.*(burn|consume|kitna|kitne|aaj|today)/.test(t)) {
    return { intent: "fuel_burnt_today", date: /aaj|today/.test(t) ? "today" : undefined };
  }

  // New: Earnings today
  if (/(earning|kamai|income|paise|kitna|kitne|total|net).*aaj|today/.test(t)) {
    if (/net/.test(t)) return { intent: "net_earning_today", date: "today" };
    return { intent: "total_earning_today", date: "today" };
  }

  if (/create (an )?order|place order|i want to order|new order|add order/.test(t)) {
    return { intent: "create_order" };
  }

  const track =
    t.match(/track (?:order )?([A-Za-z0-9\-]+)/i) ||
    t.match(/where is order ([A-Za-z0-9\-]+)/i);
  if (track) return { intent: "track_order", trackingId: track[1] };

  if (/next pickup|next delivery|next order|what's my next pickup|what is my next pickup/.test(t)) {
    return { intent: "next_pickup" };
  }

  if (/list (my )?orders|show (my )?orders|recent orders/.test(t)) {
    return { intent: "list_orders" };
  }

  // Soft cancel (status = cancelled)
  if (/\bcancel order\b/.test(t)) {
    return { intent: "cancel_order" };
  }

  // Hard delete
  if (/\bdelete order\b|\bremove order\b/.test(t)) {
    return { intent: "delete_order" };
  }

  if (/add address|update address/.test(t)) {
    return { intent: "update_address" };
  }

  // Generic updates (status / pickup / assignee / items)
  if (/\bupdate\b|\bmodify\b|\bchange\b/.test(t)) {
    return { intent: "update_order" };
  }

  return { intent: "general" };
}

// ----------- MOCK DATA for driver queries -----------
const mockDriverStats = {
  tollsToday: 3,
  tripsToday: 7,
  fuelBurntToday: 8.2, // liters
  totalEarningToday: 1850,
  netEarningToday: 1500,
  cityFuelPrices: {
    Bengaluru: 110.5,
    Mumbai: 115.2,
    Delhi: 105.8,
    Kolkata: 108.3,
  },
};

// Use LLM to extract structured order fields from text
async function extractOrderFieldsWithLLM(text: string) {
  if (!groq) return { item: text, qty: 1, address: null, customerName: null, pickupTime: null };

  const system =
    "You are an extractor. Parse the user message and return JSON only with keys: customerName, address, item, qty (integer), pickupTime (ISO or null). If unknown, use null.";
  const userPrompt = `Extract order details from this user message: """${text}"""`;

  try {
    // Build messages array and cast to any to avoid TS union issue
    const messages = [
      { role: "system", content: system },
      { role: "user", content: userPrompt },
    ] as unknown as any[];

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0,
    });
    const content = completion.choices[0]?.message?.content || "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : content;
    const parsed = JSON.parse(jsonStr);
    return {
      customerName: parsed.customerName || null,
      address: parsed.address || null,
      item: parsed.item || text,
      qty: parsed.qty ? Number(parsed.qty) : 1,
      pickupTime: parsed.pickupTime ? new Date(parsed.pickupTime) : null,
    };
  } catch (err) {
    console.error("Extractor LLM error:", err);
    return { item: text, qty: 1, address: null, customerName: null, pickupTime: null };
  }
}

export const aiReply = async (req: Request, res: Response) => {
  const { text, userId = "demo-user" } = req.body || {};

  try {
    if (!conversationHistory.has(userId)) {
      conversationHistory.set(userId, [
        { role: "system", content: "You are Porter Saathi, a concise task-focused assistant for deliveries." },
      ]);
    }
    const history = conversationHistory.get(userId)!;
    history.push({ role: "user", content: text });

    const parsed = parseIntent(text);

    // --- New: Toll tax count ---
    if (parsed.intent === "toll_tax_count") {
      const reply = `Aaj aapne ${mockDriverStats.tollsToday} toll tax booth cross kiye hain.`;
      history.push({ role: "assistant", content: reply });
      return res.json({ reply, action: "toll_tax_count", tollsToday: mockDriverStats.tollsToday });
    }

    // --- New: Fuel price query ---
    if (parsed.intent === "fuel_price_query") {
      const city = parsed.location ? parsed.location.charAt(0).toUpperCase() + parsed.location.slice(1).toLowerCase() : "Bengaluru";
      const cityFuelPrices = mockDriverStats.cityFuelPrices as Record<string, number>;
      const price = cityFuelPrices[city] || cityFuelPrices["Bengaluru"];
      const reply = `${city} mein petrol ka daam ₹${price.toFixed(2)} per liter hai.`;
      history.push({ role: "assistant", content: reply });
      return res.json({ reply, action: "fuel_price_query", city, price });
    }

    // --- New: Trip count today ---
    if (parsed.intent === "trip_count_today") {
      const reply = `Aaj aapne ${mockDriverStats.tripsToday} trips complete kiye hain.`;
      history.push({ role: "assistant", content: reply });
      return res.json({ reply, action: "trip_count_today", tripsToday: mockDriverStats.tripsToday });
    }

    // --- New: Fuel burnt today ---
    if (parsed.intent === "fuel_burnt_today") {
      const reply = `Aaj aapne lagbhag ${mockDriverStats.fuelBurntToday} liter fuel burn kiya hai.`;
      history.push({ role: "assistant", content: reply });
      return res.json({ reply, action: "fuel_burnt_today", fuelBurntToday: mockDriverStats.fuelBurntToday });
    }

    // --- New: Total earning today ---
    if (parsed.intent === "total_earning_today") {
      const reply = `Aaj ki kul kamai ₹${mockDriverStats.totalEarningToday} hai.`;
      history.push({ role: "assistant", content: reply });
      return res.json({ reply, action: "total_earning_today", totalEarningToday: mockDriverStats.totalEarningToday });
    }

    // --- New: Net earning today ---
    if (parsed.intent === "net_earning_today") {
      const reply = `Aaj ki net kamai ₹${mockDriverStats.netEarningToday} hai.`;
      history.push({ role: "assistant", content: reply });
      return res.json({ reply, action: "net_earning_today", netEarningToday: mockDriverStats.netEarningToday });
    }

    // CREATE ORDER
    if (parsed.intent === "create_order") {
      const extracted = await extractOrderFieldsWithLLM(text);
      const trackingId = makeTrackingId();
      const order = new Order({
        customerName: extracted.customerName || undefined,
        address: extracted.address || undefined,
        item: extracted.item,
        qty: extracted.qty || 1,
        status: "created",
        pickupTime: extracted.pickupTime || null,
        trackingId,
        metadata: { createdBy: userId, createdVia: "voice" },
      });
      await order.save();
      const reply = `Order created. Tracking ID ${order.trackingId}.`;
      history.push({ role: "assistant", content: reply });
      return res.json({ reply, action: "created_order", order });
    }

    // TRACK ORDER
    if (parsed.intent === "track_order" && parsed.trackingId) {
      const order = await Order.findOne({ trackingId: parsed.trackingId });
      if (!order) {
        const reply = `I couldn't find order ${parsed.trackingId}.`;
        history.push({ role: "assistant", content: reply });
        return res.json({ reply, action: "order_not_found", trackingId: parsed.trackingId });
      }
      const reply = `Here are the details for ${order.trackingId}: 
- Customer: ${order.customerName || "N/A"} 
- Items: ${order.item || "N/A"} 
- Address: ${order.address || "N/A"} 
- Status: ${order.status}`;
      history.push({ role: "assistant", content: reply });
      return res.json({ reply, action: "track_order", order });
    }

    // NEXT PICKUP
    if (parsed.intent === "next_pickup") {
      const next = await Order.findOne({ status: { $in: ["created", "assigned", "pending"] } }).sort({
        pickupTime: 1,
        createdAt: 1,
      });
      if (!next) {
        const reply = "You have no upcoming pickups.";
        history.push({ role: "assistant", content: reply });
        return res.json({ reply, action: "no_pickups" });
      }
      const reply = `Next pickup: ${next.item} (${next.qty}) — ${next.address || "address not set"}. Tracking ID ${
        next.trackingId
      }.`;
      history.push({ role: "assistant", content: reply });
      return res.json({ reply, action: "next_pickup", order: next });
    }

    // LIST ORDERS
    if (parsed.intent === "list_orders") {
      const orders = await Order.find({}).sort({ createdAt: -1 }).limit(10);
      const reply = orders.length ? `Showing your ${orders.length} most recent orders.` : "No orders found.";
      history.push({ role: "assistant", content: reply });
      return res.json({ reply, action: "list_orders", orders });
    }

    // CANCEL ORDER (soft cancel -> status: cancelled)
    if (parsed.intent === "cancel_order") {
      const m = text.match(/cancel order ([A-Za-z0-9\-]+)/i);
      if (m && m[1]) {
        const order = await Order.findOneAndUpdate(
          { trackingId: m[1].toUpperCase() },
          { status: "cancelled" },
          { new: true }
        );
        const reply = order ? `Order ${order.trackingId} cancelled.` : `Couldn't find order ${m[1]}.`;
        history.push({ role: "assistant", content: reply });
        return res.json({ reply, action: "cancel_order", order: order || null });
      } else {
        const reply = "Please provide the order ID to cancel (e.g., 'Cancel order ORD-ABC123').";
        history.push({ role: "assistant", content: reply });
        return res.json({ reply, action: "ask_for_order_id" });
      }
    }

    // UPDATE ADDRESS
    if (parsed.intent === "update_address") {
      const m = text.match(/ORD-[A-Za-z0-9]+/i);
      if (!m) {
        const reply =
          "Please provide the order ID to update the address (e.g., 'Update address of order ORD-ABC123 Pune').";
        history.push({ role: "assistant", content: reply });
        return res.json({ reply, action: "ask_for_order_id" });
      }

      const trackingId = m[0].toUpperCase(); // normalize

      // Extract new address (text after the ID)
      let addressMatch = text.split(trackingId)[1]?.trim();
      if (addressMatch?.toLowerCase().startsWith("to ")) {
        addressMatch = addressMatch.slice(3).trim();
      }
      if (addressMatch?.toLowerCase().startsWith("is ")) {
        addressMatch = addressMatch.slice(3).trim();
      }
      if (addressMatch?.startsWith(":")) {
        addressMatch = addressMatch.slice(1).trim();
      }

      if (!addressMatch) {
        const reply = `Please provide the new address after the order ID (e.g., 'Update address of order ${trackingId} Pune, Maharashtra').`;
        history.push({ role: "assistant", content: reply });
        return res.json({ reply, action: "ask_for_address", trackingId });
      }

      const order = await Order.findOneAndUpdate(
        { trackingId },
        { $set: { address: addressMatch } },
        { new: true }
      );

      if (!order) {
        const reply = `Sorry, I couldn't find order ${trackingId}.`;
        history.push({ role: "assistant", content: reply });
        return res.json({ reply, action: "order_not_found", trackingId });
      }

      const reply = `The address for order ${trackingId} has been updated to: ${order.address}`;
      history.push({ role: "assistant", content: reply });
      return res.json({ reply, action: "update_address", order });
    }

    // UPDATE ORDER (status / pickup / assignee / items)
    if (parsed.intent === "update_order") {
      const trackingId = extractTrackingIdFrom(text);
      if (!trackingId) {
        const reply = "Please provide a valid order ID (e.g., ORD-ABC123) to update.";
        history.push({ role: "assistant", content: reply });
        return res.json({ reply, action: "ask_for_order_id" });
      }

      const order = await Order.findOne({ trackingId });
      if (!order) {
        const reply = `Sorry, I couldn't find order ${trackingId}.`;
        history.push({ role: "assistant", content: reply });
        return res.json({ reply, action: "order_not_found", trackingId });
      }

      const updates: any = {};
      const newStatus = extractStatus(text);
      if (newStatus) updates.status = newStatus;

      if (/pick\s?up/i.test(text)) {
        const dt = extractPickupTime(text);
        if (dt) updates.pickupTime = dt;
      }

      const assignee = extractAssignee(text);
      if (assignee) updates.assignedTo = assignee;

      // Simple heuristics for items in single 'item' string
      if (/\badd\b/i.test(text)) {
        const part = text.split(/add/i)[1] ?? "";
        const addText = part.split(/(?:remove|status|assign|pickup)/i)[0];
        const items = addText.split(/(?:,| and )/i).map((s: string) => s.trim()).filter(Boolean);
        if (items.length) updates.item = [order.item, items.join(", ")].filter(Boolean).join(", ");
      }
      if (/\bremove\b/i.test(text) && order.item) {
        const part = text.split(/remove/i)[1] ?? "";
        const removeText = part.split(/(?:add|status|assign|pickup)/i)[0];
        const toRemove = removeText.split(/(?:,| and )/i).map((s: string) => s.trim()).filter(Boolean);
        if (toRemove.length) {
          let newItem = order.item;
          toRemove.forEach((rem: string) => {
            const re = new RegExp(`\\b${rem}\\b\\s*,?\\s*`, "ig");
            newItem = newItem.replace(re, "");
          });
          updates.item = newItem.replace(/,\s*,/g, ", ").replace(/^,\s*|\s*,\s*$/g, "").trim();
        }
      }

      if (Object.keys(updates).length === 0) {
        const reply = "What would you like to update? (status, pickup time, assignee, items)";
        history.push({ role: "assistant", content: reply });
        return res.json({ reply, action: "update_order", order });
      }

      const updated = await Order.findByIdAndUpdate(order._id, updates, { new: true });
      const reply =
        `Order ${trackingId} updated.\n` +
        `- Status: ${updated?.status ?? order.status}\n` +
        `- Pickup time: ${updated?.pickupTime ? new Date(updated.pickupTime).toLocaleString() : "not set"}\n` +
        `- Assigned to: ${updated?.assignedTo ?? "not set"}\n` +
        `- Items: ${updated?.item ?? "N/A"}`;
      history.push({ role: "assistant", content: reply });
      return res.json({ reply, action: "update_order", order: updated });
    }

    // DELETE ORDER (hard delete)
    if (parsed.intent === "delete_order") {
      const trackingId = extractTrackingIdFrom(text);
      if (!trackingId) {
        const reply = "Please provide the order ID to delete (e.g., 'delete order ORD-ABC123').";
        history.push({ role: "assistant", content: reply });
        return res.json({ reply, action: "ask_for_order_id" });
      }

      const order = await Order.findOne({ trackingId });
      if (!order) {
        const reply = `I couldn't find order ${trackingId}.`;
        history.push({ role: "assistant", content: reply });
        return res.json({ reply, action: "order_not_found", trackingId });
      }

      await Order.findByIdAndDelete(order._id);
      const reply = `Order ${trackingId} has been deleted.`;
      history.push({ role: "assistant", content: reply });
      return res.json({ reply, action: "delete_order", order: { trackingId } });
    }

    // FALLBACK -> LLM chat reply
    if (groq) {
      // trim history to last N messages to limit token usage
      const MAX = 8;
      const trimmed = history.slice(-MAX);

      // Build messages array for Groq; include name for function messages if present
      const groqMessages = trimmed.map((m) => {
        if (m.role === "function") {
          return { role: "function", name: m.name || "fn", content: m.content };
        }
        return { role: m.role, content: m.content };
      }) as unknown as any[]; // cast to any[] to satisfy SDK types

      const completion = await groq.chat.completions.create({
        model: MODEL,
        messages: groqMessages,
        temperature: 0.2,
      });

      const aiReply = completion.choices[0]?.message?.content || "Sorry, I didn't get that.";
      history.push({ role: "assistant", content: aiReply });
      return res.json({ reply: aiReply, action: "llm_reply" });
    }

    // If no LLM, fallback to rule-based minimal reply
    const fallbackReply = "Sorry, I couldn't process that right now.";
    history.push({ role: "assistant", content: fallbackReply });
    return res.json({ reply: fallbackReply, action: "fallback" });
  } catch (err) {
    console.error("aiReply error:", err);
    return res.status(500).json({ reply: "Internal error", error: err });
  }
};
