// lib/tools.ts
// Port of tools.py. Same two-part structure:
//   1. FLIGHT_SEARCH_DECLARATION — the schema Gemini reads
//   2. searchFlights()           — the actual function that runs
//   3. runTool()                 — dispatcher

import { FunctionDeclaration, SchemaType } from "@google/generative-ai";
import { MOCK_FLIGHTS } from "./mockData";

// --- Part 1: Schema ---

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
        description: "Optional maximum price in USD to filter results",
      },
    },
    required: ["origin", "destination", "date"],
  },
};

// --- Part 2: Function ---

function searchFlights(
  origin: string,
  destination: string,
  date: string,
  max_price?: number
): string {
  origin = origin.toUpperCase();
  destination = destination.toUpperCase();

  let results = MOCK_FLIGHTS.filter(
    (f) =>
      f.origin === origin &&
      f.destination === destination &&
      f.departure.startsWith(date)
  );

  if (max_price !== undefined) {
    results = results.filter((f) => f.price_usd <= max_price);
  }

  results.sort((a, b) => a.price_usd - b.price_usd);

  if (results.length === 0) {
    return JSON.stringify({
      error: `No flights found from ${origin} to ${destination} on ${date}.`,
    });
  }

  return JSON.stringify({ flights: results, count: results.length }, null, 2);
}

// --- Part 3: Dispatcher ---

export function runTool(name: string, args: Record<string, unknown>): string {
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
