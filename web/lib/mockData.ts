// lib/mockData.ts
// Direct port of mock_data.py — same data, just TypeScript types added.

export interface Flight {
  flight_number: string;
  airline: string;
  origin: string;
  destination: string;
  departure: string;
  arrival: string;
  duration_hours: number;
  price_usd: number;
  stops: number;
  seats_left: number;
}

export const MOCK_FLIGHTS: Flight[] = [
  {
    flight_number: "AA101",
    airline: "American Airlines",
    origin: "JFK",
    destination: "LHR",
    departure: "2026-05-10 08:00",
    arrival: "2026-05-10 20:00",
    duration_hours: 7,
    price_usd: 420,
    stops: 0,
    seats_left: 12,
  },
  {
    flight_number: "BA202",
    airline: "British Airways",
    origin: "JFK",
    destination: "LHR",
    departure: "2026-05-10 11:30",
    arrival: "2026-05-10 23:45",
    duration_hours: 7.25,
    price_usd: 380,
    stops: 0,
    seats_left: 4,
  },
  {
    flight_number: "UA303",
    airline: "United Airlines",
    origin: "JFK",
    destination: "LHR",
    departure: "2026-05-10 14:00",
    arrival: "2026-05-11 06:30",
    duration_hours: 8.5,
    price_usd: 290,
    stops: 1,
    seats_left: 28,
  },
  {
    flight_number: "DL404",
    airline: "Delta",
    origin: "LAX",
    destination: "JFK",
    departure: "2026-05-10 06:00",
    arrival: "2026-05-10 14:15",
    duration_hours: 5.25,
    price_usd: 210,
    stops: 0,
    seats_left: 7,
  },
  {
    flight_number: "SW505",
    airline: "Southwest",
    origin: "LAX",
    destination: "JFK",
    departure: "2026-05-10 09:45",
    arrival: "2026-05-10 18:00",
    duration_hours: 5.25,
    price_usd: 175,
    stops: 0,
    seats_left: 33,
  },
  {
    flight_number: "NK606",
    airline: "Spirit",
    origin: "LAX",
    destination: "JFK",
    departure: "2026-05-10 13:00",
    arrival: "2026-05-10 23:45",
    duration_hours: 6.75,
    price_usd: 99,
    stops: 1,
    seats_left: 50,
  },
];
