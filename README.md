# OffTrail

OffTrail is a verified travel discovery app for finding worthwhile stops along a route, near your current location, or during a layover. The product focuses on practical trip planning: provider-backed places, visible source labels, detour estimates, opening-hour awareness, and clear empty states when data is unavailable.

## Features

- Route planner for discovering places near an origin-to-destination journey
- Nearby mode with browser location support and manual city fallback
- Layover planner with travel time, return buffer, and fit-window checks
- Saved gems stored locally with notes and map links
- Provider labels and confidence states for production results
- Sample route preview kept visually separate from verified results
- Dark cinematic UI with responsive layouts and accessible form states

## Tech Stack

- Next.js
- React
- TypeScript
- Local assets in `public/assets`
- Google Maps APIs, Foursquare, and OSM/Nominatim as data providers

## Production Data Setup

Create `.env.local` from `.env.example` and configure provider keys:

- `GOOGLE_MAPS_API_KEY`: required for verified route discovery. Enable Routes API, Places API (New), Geocoding API, and Static Maps API.
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: optional browser-safe key for client-side map or photo previews.
- `FOURSQUARE_API_KEY`: optional supplemental provider for richer place metadata and photos.
- Supabase keys are optional unless saved routes and favorites need server-side persistence.

Keep `OFFTRAIL_ALLOW_ESTIMATED_ROUTES=false` in production. When verified routing is unavailable, OffTrail shows a clear user-facing state instead of displaying unverified route results.

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
npm run start
```

The Next.js development overlay only appears during `npm run dev`. Production deployments should use `npm run build` and be served through `npm run start` or a production host such as Vercel.
