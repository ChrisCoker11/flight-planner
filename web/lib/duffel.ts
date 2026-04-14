// lib/duffel.ts
//
// Duffel API client for real flight search.
//
// Duffel's flow:
//   1. POST /air/offer_requests?return_offers=true  — search for flights
//   2. The response includes offers with prices, airlines, schedules
//
// We map Duffel's verbose response shape into the same simple format
// our agent already understands, so the system prompt doesn't need to change.

const DUFFEL_BASE = "https://api.duffel.com";

export interface Flight {
  flight_number: string;
  airline: string;
  origin: string;
  destination: string;
  departure: string;
  arrival: string;
  duration_hours: number;
  price: number;
  currency: string;
  stops: number;
}

// Duffel durations come as ISO 8601 e.g. "PT7H30M"
function parseDurationHours(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return 0;
  const h = parseInt(match[1] ?? "0");
  const m = parseInt(match[2] ?? "0");
  return Math.round((h + m / 60) * 10) / 10;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapOffer(offer: any): Flight {
  const slice = offer.slices[0];
  const firstSeg = slice.segments[0];
  const lastSeg = slice.segments[slice.segments.length - 1];

  return {
    flight_number: firstSeg.marketing_carrier_flight_number ?? "N/A",
    airline: offer.owner.name,
    origin: firstSeg.origin.iata_code,
    destination: lastSeg.destination.iata_code,
    departure: firstSeg.departing_at.replace("T", " ").slice(0, 16),
    arrival: lastSeg.arriving_at.replace("T", " ").slice(0, 16),
    duration_hours: parseDurationHours(slice.duration),
    price: parseFloat(offer.total_amount),
    currency: offer.total_currency,
    stops: slice.segments.length - 1,
  };
}

export async function searchDuffelFlights(
  origin: string,
  destination: string,
  date: string,
  max_price?: number
): Promise<string> {
  const apiKey = process.env.DUFFEL_API_KEY;
  if (!apiKey) {
    return JSON.stringify({ error: "DUFFEL_API_KEY is not set." });
  }

  const res = await fetch(
    `${DUFFEL_BASE}/air/offer_requests?return_offers=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "Duffel-Version": "v2",
      },
      body: JSON.stringify({
        data: {
          slices: [{ origin, destination, departure_date: date }],
          passengers: [{ type: "adult" }],
          cabin_class: "economy",
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return JSON.stringify({ error: `Duffel error ${res.status}: ${JSON.stringify(err)}` });
  }

  const body = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let flights: Flight[] = (body.data?.offers ?? []).map(mapOffer);

  if (max_price !== undefined) {
    flights = flights.filter((f) => f.price <= max_price);
  }

  flights.sort((a, b) => a.price - b.price);

  // Cap at 5 results to keep the context concise
  const results = flights.slice(0, 5);

  if (results.length === 0) {
    return JSON.stringify({
      error: `No flights found from ${origin} to ${destination} on ${date}.`,
    });
  }

  return JSON.stringify({ flights: results, count: results.length }, null, 2);
}
