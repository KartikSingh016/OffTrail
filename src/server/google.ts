import { TtlCache } from "./cache";
import { defaultVisitTime, fallbackDescription, hiddenGemScore, isHiddenGem, normalizeCategory } from "./category";
import { serverEnv } from "./env";
import {
  decodeGooglePolyline,
  directFallbackPath,
  formatDistance,
  formatDuration,
  routeCacheKey,
  routeDistanceMeters
} from "./geo";
import { fetchJson, HttpError } from "./retry";
import type { DiscoverRequest, LatLng, PlaceCandidate, RouteSummary } from "./types";

const routeCache = new TtlCache<RouteSummary>(24 * 60 * 60 * 1000);

const GOOGLE_INCLUDED_TYPES = [
  "tourist_attraction",
  "park",
  "museum",
  "cafe",
  "restaurant",
  "art_gallery",
  "shopping_mall",
  "church"
];

const GOOGLE_TYPES_BY_PREFERENCE: Record<string, string[]> = {
  nature: ["park", "tourist_attraction"],
  park: ["park"],
  garden: ["park", "tourist_attraction"],
  viewpoint: ["tourist_attraction", "park"],
  viewpoints: ["tourist_attraction", "park"],
  "photo-op": ["tourist_attraction", "art_gallery", "museum"],
  photo_ops: ["tourist_attraction", "art_gallery", "museum"],
  photo_locations: ["tourist_attraction", "art_gallery", "museum"],
  cafe: ["cafe", "bakery"],
  cafes: ["cafe", "bakery"],
  food: ["restaurant", "cafe", "bakery", "bar"],
  culture: ["museum", "art_gallery", "church", "tourist_attraction"],
  historical: ["museum", "church", "tourist_attraction"],
  hidden: ["park", "tourist_attraction", "art_gallery"],
  hidden_gems: ["park", "tourist_attraction", "art_gallery"],
  local: ["restaurant", "cafe", "bar"],
  local_favorites: ["restaurant", "cafe", "bar"]
};

type GoogleRouteResponse = {
  routes?: Array<{
    distanceMeters?: number;
    duration?: string;
    polyline?: {
      encodedPolyline?: string;
    };
  }>;
};

type GooglePlacesResponse = {
  places?: GooglePlace[];
};

type GooglePlace = {
  id?: string;
  displayName?: {
    text?: string;
  };
  formattedAddress?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  rating?: number;
  userRatingCount?: number;
  photos?: Array<{
    name?: string;
  }>;
  types?: string[];
  regularOpeningHours?: {
    weekdayDescriptions?: string[];
    openNow?: boolean;
    periods?: Array<{
      open?: {
        day?: number;
        hour?: number;
        minute?: number;
        time?: string;
      };
      close?: {
        day?: number;
        hour?: number;
        minute?: number;
        time?: string;
      };
    }>;
  };
  reviews?: Array<{
    name?: string;
    rating?: number;
    text?: {
      text?: string;
    };
    publishTime?: string;
    authorAttribution?: {
      displayName?: string;
      uri?: string;
    };
  }>;
  websiteUri?: string;
  nationalPhoneNumber?: string;
};

export async function calculateRoute(input: DiscoverRequest): Promise<RouteSummary> {
  const key = routeCacheKey(input);
  const cached = routeCache.get(key);
  if (cached) return cached;

  const origin = { lat: input.originLat, lng: input.originLng };
  const destination = { lat: input.destinationLat, lng: input.destinationLng };

  if (!serverEnv.googleMapsApiKey) {
    if (serverEnv.allowEstimatedRoutes) {
      const fallback = createFallbackRoute(origin, destination, input.layovers || []);
      routeCache.set(key, fallback);
      return fallback;
    }
    throw new HttpError(
      "Google Routes API is required to calculate a safe route. Add GOOGLE_MAPS_API_KEY or set OFFTRAIL_ALLOW_ESTIMATED_ROUTES=true for local demos only.",
      503,
      "Missing GOOGLE_MAPS_API_KEY"
    );
  }

  const response = await fetchJson<GoogleRouteResponse>(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": serverEnv.googleMapsApiKey,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline"
      },
      body: JSON.stringify({
        origin: { location: { latLng: toGoogleLatLng(origin) } },
        destination: { location: { latLng: toGoogleLatLng(destination) } },
        intermediates: (input.layovers || []).map((layover) => ({
          location: { latLng: toGoogleLatLng(layover) }
        })),
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        computeAlternativeRoutes: false,
        polylineQuality: "HIGH_QUALITY",
        polylineEncoding: "ENCODED_POLYLINE"
      })
    },
    "Google Routes API"
  );

  const route = response.routes?.[0];
  const encoded = route?.polyline?.encodedPolyline;
  if (!route || !encoded) {
    throw new HttpError("No route found between the selected locations.", 422, "No route returned by Google Routes API");
  }

  const path = decodeGooglePolyline(encoded);
  const distanceMeters = route.distanceMeters || routeDistanceMeters(path);
  const durationSeconds = parseGoogleDuration(route.duration) || Math.round((distanceMeters / 80000) * 3600);
  const summary = {
    path: path.map((point) => [point.lat, point.lng] as [number, number]),
    distance: formatDistance(distanceMeters),
    duration: formatDuration(durationSeconds),
    distanceMeters,
    durationSeconds
  };
  routeCache.set(key, summary);
  return summary;
}

export async function searchGooglePlaces(center: LatLng, radiusKm: number, preferences: string[] = []): Promise<PlaceCandidate[]> {
  if (!serverEnv.googleMapsApiKey) return [];

  const response = await fetchJson<GooglePlacesResponse>(
    "https://places.googleapis.com/v1/places:searchNearby",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": serverEnv.googleMapsApiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.photos,places.types,places.regularOpeningHours"
      },
      body: JSON.stringify({
        includedTypes: getGoogleTypesFromPreferences(preferences),
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: toGoogleLatLng(center),
            radius: Math.min(Math.max(radiusKm * 1000, 500), 50000)
          }
        }
      })
    },
    "Google Places Nearby Search"
  );

  return (response.places || []).flatMap(mapGooglePlace);
}

function getGoogleTypesFromPreferences(preferences: string[]) {
  const types = preferences.flatMap((preference) => {
    const key = preference.trim().toLowerCase();
    return GOOGLE_TYPES_BY_PREFERENCE[key] || [];
  });
  const unique = Array.from(new Set(types));
  return unique.length ? unique.slice(0, 20) : GOOGLE_INCLUDED_TYPES;
}

export async function fetchGooglePlaceDetail(placeId: string) {
  if (!serverEnv.googleMapsApiKey) {
    throw new HttpError(
      "GOOGLE_MAPS_API_KEY is required for Google place details.",
      503,
      "Missing GOOGLE_MAPS_API_KEY"
    );
  }

  const place = await fetchJson<GooglePlace>(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    {
      headers: {
        "X-Goog-Api-Key": serverEnv.googleMapsApiKey,
        "X-Goog-FieldMask":
          "id,displayName,formattedAddress,location,rating,userRatingCount,photos,types,regularOpeningHours,reviews,websiteUri,nationalPhoneNumber"
      }
    },
    "Google Place Details"
  );

  const category = normalizeCategory(place.types || [], place.displayName?.text || "");
  return {
    id: place.id || placeId,
    name: place.displayName?.text || "Unknown place",
    lat: place.location?.latitude || 0,
    lng: place.location?.longitude || 0,
    category,
    rating: place.rating || 0,
    ratingCount: place.userRatingCount || 0,
    photos: mapGooglePhotos(place.photos),
    description: fallbackDescription(place.displayName?.text || "This place", category),
    address: place.formattedAddress || "",
    hours: place.regularOpeningHours || null,
    reviews: (place.reviews || []).map((review) => ({
      author: review.authorAttribution?.displayName || "",
      rating: review.rating || 0,
      text: review.text?.text || "",
      publishTime: review.publishTime || ""
    })),
    website: place.websiteUri || "",
    phone: place.nationalPhoneNumber || ""
  };
}

function mapGooglePlace(place: GooglePlace): PlaceCandidate[] {
  const id = place.id;
  const name = place.displayName?.text;
  const lat = place.location?.latitude;
  const lng = place.location?.longitude;
  if (!id || !name || typeof lat !== "number" || typeof lng !== "number") return [];

  const category = normalizeCategory(place.types || [], name);
  const rating = place.rating || 0;
  const ratingCount = place.userRatingCount || 0;

  return [
    {
      id,
      name,
      lat,
      lng,
      category,
      rating,
      ratingCount,
      photos: mapGooglePhotos(place.photos),
      description: fallbackDescription(name, category),
      address: place.formattedAddress || "",
      isHiddenGem: isHiddenGem(rating, ratingCount),
      detourDistance: "0 km",
      estimatedTime: defaultVisitTime(category),
      provider: "google",
      sourceIds: [id],
      rawCategories: place.types || [],
      detourMeters: 0,
      hiddenGemScore: hiddenGemScore(rating, ratingCount, category),
      openingHoursData: normalizeOpeningHours(place.regularOpeningHours)
    }
  ];
}

function normalizeOpeningHours(hours: GooglePlace["regularOpeningHours"]) {
  if (!hours) return undefined;
  return {
    openNow: hours.openNow,
    weekdayDescriptions: hours.weekdayDescriptions || [],
    periods: (hours.periods || []).flatMap((period) => {
      const open = normalizePeriodPoint(period.open);
      if (!open) return [];
      return [
        {
          open,
          close: normalizePeriodPoint(period.close) || undefined
        }
      ];
    })
  };
}

function normalizePeriodPoint(point?: { day?: number; hour?: number; minute?: number; time?: string }) {
  if (!point || typeof point.day !== "number") return null;
  const time =
    point.time ||
    `${String(point.hour || 0).padStart(2, "0")}${String(point.minute || 0).padStart(2, "0")}`;
  return {
    day: point.day,
    time
  };
}

function mapGooglePhotos(photos?: Array<{ name?: string }>) {
  if (!serverEnv.googleMapsApiKey) return [];
  return (photos || [])
    .slice(0, 3)
    .map((photo) =>
      photo.name
        ? `https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=800&key=${serverEnv.googleMapsApiKey}`
        : ""
    )
    .filter(Boolean);
}

function createFallbackRoute(origin: LatLng, destination: LatLng, layovers: LatLng[] = []): RouteSummary {
  const stops = [origin, ...layovers, destination];
  const path = stops.flatMap((stop, index) => {
    if (index === 0) return [stop];
    return directFallbackPath(stops[index - 1], stop).slice(1);
  });
  const distanceMeters = routeDistanceMeters(path);
  const durationSeconds = Math.round((distanceMeters / 80000) * 3600);
  return {
    path: path.map((point) => [point.lat, point.lng] as [number, number]),
    distance: formatDistance(distanceMeters),
    duration: formatDuration(durationSeconds),
    distanceMeters,
    durationSeconds
  };
}

function parseGoogleDuration(duration?: string) {
  if (!duration) return 0;
  const match = duration.match(/^(\d+(?:\.\d+)?)s$/);
  return match ? Math.round(Number(match[1])) : 0;
}

function toGoogleLatLng(point: LatLng) {
  return {
    latitude: point.lat,
    longitude: point.lng
  };
}
