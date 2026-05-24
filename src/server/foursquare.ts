import { defaultVisitTime, fallbackDescription, hiddenGemScore, isHiddenGem, normalizeCategory } from "./category";
import { serverEnv } from "./env";
import { fetchJson, HttpError } from "./retry";
import type { LatLng, PlaceCandidate } from "./types";

type FoursquareSearchResponse = {
  results?: FoursquarePlace[];
};

type FoursquarePlace = {
  fsq_id?: string;
  name?: string;
  geocodes?: {
    main?: {
      latitude?: number;
      longitude?: number;
    };
  };
  location?: {
    formatted_address?: string;
    address?: string;
  };
  categories?: Array<{
    name?: string;
  }>;
  photos?: Array<{
    prefix?: string;
    suffix?: string;
  }>;
  rating?: number;
  stats?: {
    total_ratings?: number;
    total_photos?: number;
    total_tips?: number;
  };
  hours?: unknown;
  tips?: Array<{
    text?: string;
  }>;
};

export async function searchFoursquarePlaces(center: LatLng, radiusKm: number): Promise<PlaceCandidate[]> {
  if (!serverEnv.foursquareApiKey) return [];

  const url = new URL("https://api.foursquare.com/v3/places/search");
  url.searchParams.set("ll", `${center.lat},${center.lng}`);
  url.searchParams.set("radius", String(Math.min(Math.max(Math.round(radiusKm * 1000), 500), 50000)));
  url.searchParams.set("limit", "50");
  url.searchParams.set("sort", "DISTANCE");
  url.searchParams.set(
    "fields",
    "fsq_id,name,geocodes,location,categories,photos,rating,stats"
  );

  const response = await fetchJson<FoursquareSearchResponse>(
    url.toString(),
    {
      headers: {
        Authorization: serverEnv.foursquareApiKey,
        Accept: "application/json"
      }
    },
    "Foursquare Places Search"
  );

  return (response.results || []).flatMap(mapFoursquarePlace);
}

export async function fetchFoursquarePlaceDetail(fsqId: string) {
  if (!serverEnv.foursquareApiKey) {
    throw new HttpError(
      "FOURSQUARE_API_KEY is required for Foursquare place details.",
      503,
      "Missing FOURSQUARE_API_KEY"
    );
  }

  const url = new URL(`https://api.foursquare.com/v3/places/${encodeURIComponent(fsqId)}`);
  url.searchParams.set(
    "fields",
    "fsq_id,name,geocodes,location,categories,photos,rating,stats,hours,tips,website,tel"
  );

  const place = await fetchJson<FoursquarePlace>(
    url.toString(),
    {
      headers: {
        Authorization: serverEnv.foursquareApiKey,
        Accept: "application/json"
      }
    },
    "Foursquare Place Details"
  );

  const categoryNames = (place.categories || []).map((category) => category.name || "").filter(Boolean);
  const category = normalizeCategory(categoryNames, place.name || "");
  const rating = normalizeFoursquareRating(place.rating);
  const ratingCount = place.stats?.total_ratings || 0;

  return {
    id: `fsq:${place.fsq_id || fsqId}`,
    name: place.name || "Unknown place",
    lat: place.geocodes?.main?.latitude || 0,
    lng: place.geocodes?.main?.longitude || 0,
    category,
    rating,
    ratingCount,
    photos: mapFoursquarePhotos(place.photos),
    description: fallbackDescription(place.name || "This place", category),
    address: place.location?.formatted_address || place.location?.address || "",
    hours: place.hours || null,
    reviews: (place.tips || []).map((tip) => ({ text: tip.text || "" }))
  };
}

function mapFoursquarePlace(place: FoursquarePlace): PlaceCandidate[] {
  const id = place.fsq_id;
  const name = place.name;
  const lat = place.geocodes?.main?.latitude;
  const lng = place.geocodes?.main?.longitude;
  if (!id || !name || typeof lat !== "number" || typeof lng !== "number") return [];

  const rawCategories = (place.categories || []).map((category) => category.name || "").filter(Boolean);
  const category = normalizeCategory(rawCategories, name);
  const rating = normalizeFoursquareRating(place.rating);
  const ratingCount = place.stats?.total_ratings || 0;

  return [
    {
      id: `fsq:${id}`,
      name,
      lat,
      lng,
      category,
      rating,
      ratingCount,
      photos: mapFoursquarePhotos(place.photos),
      description: fallbackDescription(name, category),
      address: place.location?.formatted_address || place.location?.address || "",
      isHiddenGem: isHiddenGem(rating, ratingCount),
      detourDistance: "0 km",
      estimatedTime: defaultVisitTime(category),
      provider: "foursquare",
      sourceIds: [`fsq:${id}`],
      rawCategories,
      detourMeters: 0,
      hiddenGemScore: hiddenGemScore(rating, ratingCount, category)
    }
  ];
}

function normalizeFoursquareRating(rating?: number) {
  if (!rating) return 0;
  return rating > 5 ? Number((rating / 2).toFixed(1)) : rating;
}

function mapFoursquarePhotos(photos?: Array<{ prefix?: string; suffix?: string }>) {
  return (photos || [])
    .slice(0, 3)
    .map((photo) => (photo.prefix && photo.suffix ? `${photo.prefix}original${photo.suffix}` : ""))
    .filter(Boolean);
}
