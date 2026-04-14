# tools.py
#
# This file defines the "tools" that our AI agent can call.
#
# KEY CONCEPT: A tool has two parts:
#   1. A JSON schema — tells Claude WHAT the tool does and what inputs it needs
#   2. A Python function — the actual code that runs when Claude calls the tool
#
# Claude never runs Python directly. Instead it says "I want to call search_flights
# with these arguments", and then WE run the Python and give Claude the result.

import json
from mock_data import MOCK_FLIGHTS


# --- Part 1: The JSON Schema ---
# This is what we send to Claude so it knows the tool exists.
# Claude reads this and decides when and how to use the tool.

FLIGHT_SEARCH_TOOL = {
    "name": "search_flights",
    "description": (
        "Search for available flights between two airports on a given date. "
        "Returns a list of flights sorted by price (cheapest first). "
        "Use IATA airport codes (e.g. JFK, LAX, LHR)."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "origin": {
                "type": "string",
                "description": "IATA code of the departure airport (e.g. 'JFK')",
            },
            "destination": {
                "type": "string",
                "description": "IATA code of the arrival airport (e.g. 'LHR')",
            },
            "date": {
                "type": "string",
                "description": "Travel date in YYYY-MM-DD format",
            },
            "max_price": {
                "type": "number",
                "description": "Optional maximum price in USD to filter results",
            },
        },
        "required": ["origin", "destination", "date"],
    },
}


# --- Part 2: The Python Function ---
# This runs the actual search against our mock data.

def search_flights(origin: str, destination: str, date: str, max_price: float = None) -> str:
    """
    Search mock flight data and return matching results as a JSON string.
    We return a string because that's what we'll send back to Claude.
    """
    origin = origin.upper()
    destination = destination.upper()

    # Filter flights matching origin, destination, and date
    results = [
        flight for flight in MOCK_FLIGHTS
        if flight["origin"] == origin
        and flight["destination"] == destination
        and flight["departure"].startswith(date)
    ]

    # Apply optional price filter
    if max_price is not None:
        results = [f for f in results if f["price_usd"] <= max_price]

    # Sort by price ascending (cheapest first)
    results.sort(key=lambda f: f["price_usd"])

    if not results:
        return json.dumps({"error": f"No flights found from {origin} to {destination} on {date}."})

    return json.dumps({"flights": results, "count": len(results)}, indent=2)


# --- Dispatcher ---
# When Claude says "call tool X with args Y", we use this to route to the right function.

def run_tool(tool_name: str, tool_input: dict) -> str:
    if tool_name == "search_flights":
        return search_flights(**tool_input)
    raise ValueError(f"Unknown tool: {tool_name}")
