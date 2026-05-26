# OffTrail

OffTrail is a verified route-discovery app. It should prefer no result over invented routes or fake places.

## Production Data Setup

Create `.env.local` from `.env.example` and configure real provider keys:

- `GOOGLE_MAPS_API_KEY`: required for verified route discovery. Enable Routes API, Places API (New), Geocoding API, and Static Maps API.
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: optional browser-safe key for static map previews.
- `FOURSQUARE_API_KEY`: optional supplemental source for richer place metadata and photos.
- Supabase keys are optional unless saved routes/favorites need persistence.

Leave `OFFTRAIL_ALLOW_ESTIMATED_ROUTES` blank in production. When Google Routes is missing, OffTrail stops safely and shows a user-facing error instead of creating approximate routes.

## Commands

```bash
npm run dev
npm run build
npm run start
```

The Next.js dev tools/error overlay appears only while running `npm run dev`. Production deploys should be built with `npm run build` and served with `npm run start` or a production host.
