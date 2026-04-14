# agent.py (Gemini version)
#
# The agent loop is identical in concept to the Anthropic version:
#   1. Send user message + available tools to the model
#   2. If the model calls a tool → run it, send result back, repeat
#   3. If the model gives a text answer → show it, done
#
# KEY DIFFERENCES vs Anthropic SDK:
#   - Tool schema uses "parameters" instead of "input_schema"
#   - We check for function_call *parts* instead of stop_reason == "tool_use"
#   - Message history uses protos.Content objects instead of plain dicts
#   - API key is configured globally, not passed per-request

import os
import google.generativeai as genai
from google.generativeai import protos
from tools import run_tool

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

MODEL = "gemini-2.5-flash"

SYSTEM_PROMPT = """You are a helpful flight search assistant.
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
your context. Re-read the tool result before saying something is missing.
"""

# ---------------------------------------------------------------------------
# Tool Schema (Gemini format)
#
# Very similar to Anthropic's format — main difference is the key name:
#   Anthropic → "input_schema"
#   Gemini    → "parameters"
# ---------------------------------------------------------------------------

FLIGHT_SEARCH_TOOL_SCHEMA = {
    "function_declarations": [
        {
            "name": "search_flights",
            "description": (
                "Search for available flights between two airports on a given date. "
                "Returns a list of flights sorted by price (cheapest first). "
                "Use IATA airport codes (e.g. JFK, LAX, LHR)."
            ),
            "parameters": {
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
    ]
}

# ---------------------------------------------------------------------------
# The Agent Loop
# ---------------------------------------------------------------------------

def run_agent(user_message: str, model: genai.GenerativeModel, history: list) -> str:
    """
    Run the agent loop for a single user message.

    `history` is the full conversation so far — passed in and mutated in place.
    This is what enables multi-turn: each call picks up where the last left off.

    Returns the final text response from Gemini.
    """
    print(f"\n[User]: {user_message}")

    # Append this turn's user message to the shared history
    history.append(
        protos.Content(role="user", parts=[protos.Part(text=user_message)])
    )

    # `contents` now IS the history — not a fresh list
    contents = history

    while True:
        response = model.generate_content(
            contents=contents,
            tools=[FLIGHT_SEARCH_TOOL_SCHEMA],
        )

        candidate = response.candidates[0]

        # Check if any parts contain a function/tool call
        # (Gemini doesn't use a stop_reason for this — we inspect the parts directly)
        function_calls = [
            part for part in candidate.content.parts
            if part.function_call.name  # non-empty name means it's a tool call
        ]

        if function_calls:
            # Add the model's response (with tool calls) to the history
            contents.append(candidate.content)

            # Run each tool and collect results
            tool_result_parts = []
            for part in function_calls:
                fc = part.function_call
                args = dict(fc.args)
                print(f"\n[Tool Call]: {fc.name}({args})")

                result = run_tool(fc.name, args)
                print(f"[Tool Result]: {result[:200]}...")

                tool_result_parts.append(
                    protos.Part(
                        function_response=protos.FunctionResponse(
                            name=fc.name,
                            response={"result": result},  # Gemini wraps results in a dict
                        )
                    )
                )

            # Send tool results back so Gemini can continue
            contents.append(protos.Content(role="user", parts=tool_result_parts))

        else:
            # No tool calls — this is the final answer.
            # Save the model's reply into history so the next turn can reference it.
            history.append(candidate.content)
            final_text = response.text
            print(f"\n[Agent]: {final_text}")
            return final_text


# ---------------------------------------------------------------------------
# Main — simple interactive chat
# ---------------------------------------------------------------------------

def main():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Error: Set your GEMINI_API_KEY environment variable first.")
        print("  export GEMINI_API_KEY='AIza...'")
        return

    genai.configure(api_key=api_key)

    model = genai.GenerativeModel(
        model_name=MODEL,
        system_instruction=SYSTEM_PROMPT,
    )

    print("Flight Finder Agent (Gemini)")
    print("=" * 40)
    print("Example: 'Find me the cheapest flight from JFK to LHR on 2026-05-10'")
    print("Type 'quit' to exit.\n")

    # One history list for the entire session.
    # Every turn appends to it, so the model always has full context.
    history = []

    while True:
        user_input = input("You: ").strip()
        if user_input.lower() in ("quit", "exit", "q"):
            break
        if not user_input:
            continue
        run_agent(user_input, model, history)


if __name__ == "__main__":
    main()
