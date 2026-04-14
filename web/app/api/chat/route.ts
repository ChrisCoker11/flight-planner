// app/api/chat/route.ts
//
// This is the agent loop — a Next.js API route that the UI calls on every message.
//
// The frontend sends:
//   { message: string, history: GeminiMessage[] }
//
// We run the full agent loop here (including any tool calls) and return:
//   { reply: string }
//
// The frontend never sees tool calls — it only ever receives the final text answer.
// This keeps the UI simple and the agent logic entirely server-side.

import { GoogleGenerativeAI, Content } from "@google/generative-ai";
import { FLIGHT_SEARCH_DECLARATION, runTool } from "@/lib/tools";
import { NextRequest, NextResponse } from "next/server";

const MODEL = "gemini-2.5-flash";

const SYSTEM_PROMPT = `You are a helpful flight search assistant.
Your job is to help users find the cheapest available flights.

When a user asks about flights:
1. Extract the origin, destination, and travel date from their message.
2. Use the search_flights tool to look up available options.
3. Present the results clearly, highlighting the cheapest option.
4. If no flights are found, tell the user and suggest alternatives.

Always use IATA airport codes when calling the tool (e.g. JFK, LAX, LHR).
If the user gives a city name, convert it to the correct IATA code yourself.

The search_flights tool returns a list of flight objects. Each object contains:
- flight_number, airline
- origin, destination
- departure and arrival (datetime strings)
- duration_hours
- price_usd
- stops (0 = nonstop, 1+ = connecting)
- seats_left

Use ALL of these fields when answering follow-up questions. Never say a field is
unavailable — if you already called the tool this conversation, the data is in
your context. Re-read the tool result before saying something is missing.`;

export async function POST(req: NextRequest) {
  const { message, history } = await req.json() as {
    message: string;
    history: Content[];
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not set" }, { status: 500 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: SYSTEM_PROMPT,
    tools: [{ functionDeclarations: [FLIGHT_SEARCH_DECLARATION] }],
  });

  // Restore conversation history so the agent has full context
  const chat = model.startChat({ history });

  // Agent loop — identical concept to agent.py
  let result = await chat.sendMessage(message);

  while (true) {
    const response = result.response;
    const functionCalls = response.functionCalls();

    if (!functionCalls || functionCalls.length === 0) {
      // No tool calls — return the final text answer
      return NextResponse.json({ reply: response.text() });
    }

    // Run each tool and collect results (await since Duffel is async)
    const toolResults = await Promise.all(
      functionCalls.map(async (fc) => ({
        functionResponse: {
          name: fc.name,
          response: { result: await runTool(fc.name, fc.args as Record<string, unknown>) },
        },
      }))
    );

    // Send results back and continue the loop
    result = await chat.sendMessage(toolResults);
  }
}
