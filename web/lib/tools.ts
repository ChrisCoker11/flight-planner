// lib/tools.ts
// Same structure as before — schema + function + dispatcher.
// The only change: searchFlights now calls the Duffel API instead of mock data,
// so it's async. runTool is now async too, and route.ts awaits it.

import { FunctionDeclaration, SchemaType } from "@google/generative-ai";
import { searchDuffelFlights } from "./duffel";

// --- Part 1: Schema (unchanged) ---

export const FLIGHT_SEARCH_DECLARATION: FunctionDeclaration = {
  name: "search_flights",
  description:
    "Search for available flights between two airports on a given date. " +
    "Returns a list of flights sorted by price (cheapest first). " +
    "Use IATA airport codes (e.g. JFK, LAX, LHR).",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      origin: {
        type: SchemaType.STRING,
        description: "IATA code of the departure airport (e.g. 'JFK')",
      },
      destination: {
        type: SchemaType.STRING,
        description: "IATA code of the arrival airport (e.g. 'LHR')",
      },
      date: {
        type: SchemaType.STRING,
        description: "Travel date in YYYY-MM-DD format",
      },
      max_price: {
        type: SchemaType.NUMBER,
        description: "Optional maximum price to filter results",
      },
    },
    required: ["origin", "destination", "date"],
  },
};

// --- Part 2: Function (now async — calls Duffel) ---

async function searchFlights(
  origin: string,
  destination: string,
  date: string,
  max_price?: number
): Promise<string> {
  return searchDuffelFlights(
    origin.toUpperCase(),
    destination.toUpperCase(),
    date,
    max_price
  );
}

// --- Part 3: Dispatcher (now async) ---

export async function runTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  if (name === "search_flights") {
    return searchFlights(
      args.origin as string,
      args.destination as string,
      args.date as string,
      args.max_price as number | undefined
    );
  }
  throw new Error(`Unknown tool: ${name}`);
}
