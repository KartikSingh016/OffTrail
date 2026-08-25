# OffTrail

**Verified route discovery for travelers who want real stops, not guesses.**

OffTrail plans a route between two places and surfaces only the stops it can verify against live map data along the way — with real photos, honest distances, and clear source labels. If the data isn't there, OffTrail says so instead of inventing a place to fill the page.

## Features

- **Route Architect** — plan an origin-to-destination journey and get map-verified stops distributed across the whole corridor, filterable by travel vibe (viewpoints, food, cafes, hidden gems, culture, and more)
- **Near Me** — discover verified places around your current location or a manually entered city, with radius, time-window, and safety filters
- **Layover planner** — check whether a stop actually fits inside a layover window, factoring in travel time and a return buffer
- **Country journeys** — curated multi-stop itineraries for popular destinations, with season-aware imagery
- **Saved gems** — bookmark places locally with personal notes and one-tap map directions
- **Real-photo verification** — results are filtered to places with a genuine photo (sourced from the provider or Wikipedia), never a generic map pin passed off as a picture
- **Summer / winter theming** — the entire site, including destination imagery, adapts to the season you're planning for
- **No-bill by default** — runs entirely on free providers (OpenStreetMap/Overpass, Nominatim, OSRM, Wikipedia) out of the box; paid providers are opt-in and quota-gated

## Tech Stack

- [Next.js](https://nextjs.org/) 16 (Pages Router) + [React](https://react.dev/) 19
- TypeScript for the server/API layer, JavaScript (JSX) for the client UI
- [lucide-react](https://lucide.dev/) for icons
- Data providers: OpenStreetMap Overpass & Nominatim, OSRM routing, Wikipedia (photo enrichment) — with optional Google Places, Foursquare, and Anthropic enrichment
- Optional Supabase persistence for authenticated saved routes

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Install

```bash
npm install
```

### Configure environment variables (optional)

OffTrail works out of the box with no configuration — it runs entirely on free, keyless providers. Copy `.env.example` to `.env.local` only if you want to enable paid providers or persistence:

```bash
cp .env.example .env.local
```

| Variable | Purpose |
| --- | --- |
| `OFFTRAIL_ENABLE_PAID_PROVIDERS` | Master switch for Google Places / Foursquare. Keep `false` until quotas and budget alerts are set up. |
| `OFFTRAIL_ENABLE_AI_ENRICHMENT` | Enables Anthropic-powered description/category enrichment. |
| `OFFTRAIL_ENABLE_HOSTED_PERSISTENCE` | Enables Supabase-backed saved routes. |
| `NEXT_PUBLIC_OFFTRAIL_ENABLE_PAID_MAP_PREVIEWS` | Enables client-side Google static map previews. |
| `GOOGLE_MAPS_API_KEY` / `GOOGLE_PLACES_API_KEY` | Server-side Google Routes & Places keys. |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Browser-safe key for static map previews. |
| `FOURSQUARE_API_KEY` | Optional supplemental places/photos provider. |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | Optional copy enrichment. |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Optional saved-routes persistence. |
| `OFFTRAIL_ALLOW_ESTIMATED_ROUTES` | Allows a straight-line route estimate when no routing provider is configured. Keep `false` in production. |

### Run the dev server

```bash
npm run dev
```

The app runs at `http://127.0.0.1:3000`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run build` | Build the production bundle |
| `npm run start` | Serve the production build |

## Project Structure

```
pages/                Next.js routes and API endpoints
  api/                 discover, geocode, autocomplete, save-route, location intelligence
  index.tsx            Single-page app shell + SEO metadata
src/
  App.jsx              Client UI: all pages, views, and components
  styles.css            Design system (design tokens, layout, components)
  server/               Server-side logic: discovery pipeline, providers, validation
components/            Standalone client components (e.g. the route-loading globe)
supabase/               Database schema for optional hosted persistence
public/assets/          Static assets
```

## Data Philosophy

OffTrail never fabricates a place, a photo, or a route. If a provider can't verify a stop, it doesn't appear — the app shows an honest "nothing found" state with a way to widen the search instead of filling the gap with a guess.

## Deployment

The app is a standard Next.js project and deploys to any Next.js-compatible host (e.g. Vercel). Set the environment variables you need from the table above in your host's dashboard before enabling paid providers.
