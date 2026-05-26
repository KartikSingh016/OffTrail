import type { NextApiRequest, NextApiResponse } from "next";
import { searchFoursquarePlaces } from "../../src/server/foursquare";
import { searchGooglePlaces } from "../../src/server/google";
import { haversineMeters } from "../../src/server/geo";
import { osmStaticMapUrl, searchNominatimAround, searchOsmPlaces } from "../../src/server/osm";
import type { LatLng, PlaceCandidate } from "../../src/server/types";

type LocationIntelligenceRequest = {
  latitude?: number;
  longitude?: number;
  radius?: number;
  categories?: string[];
};

type IntelligenceLocation = {
  id: string;
  name: string;
  type: "hidden_gem" | "photo_op" | "viewpoint" | "nature";
  coordinates: LatLng;
  distance: number;
  description: string;
  photo: string;
  rating: number;
  isOpen: boolean;
  category: string;
};

type LocationIntelligenceResponse = {
  locations: IntelligenceLocation[];
  userLocation: LatLng;
  message?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LocationIntelligenceResponse | { error: string }>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const input = req.body as LocationIntelligenceRequest;
  const latitude = Number(input.latitude);
  const longitude = Number(input.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return res.status(400).json({ error: "latitude must be between -90 and 90." });
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return res.status(400).json({ error: "longitude must be between -180 and 180." });
  }

  const userLocation = { lat: latitude, lng: longitude };
  const radiusKm = Math.min(Math.max(Number(input.radius || 5000) / 1000, 0.5), 10);
  const categories = new Set((input.categories || []).map((category) => category.toLowerCase()));

  try {
    const [google, foursquare] = await Promise.allSettled([
      searchGooglePlaces(userLocation, radiusKm, Array.from(categories)),
      searchFoursquarePlaces(userLocation, radiusKm)
    ]);

    const providerPlaces = [
      ...(google.status === "fulfilled" ? google.value : []),
      ...(foursquare.status === "fulfilled" ? foursquare.value : [])
    ];
    const realPlaces = providerPlaces.length
      ? providerPlaces
      : await searchNearbyOpenData(userLocation, radiusKm, Array.from(categories));

    const filteredPlaces = realPlaces.filter((place) => matchesRequestedCategory(place, categories));
    const locations = filteredPlaces
      .map((place) => mapProviderPlace(place, userLocation))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10);

    return res.status(200).json({
      locations,
      userLocation,
      message: locations.length
        ? undefined
        : "No verified nearby places were returned by the configured providers. Try a wider radius or another category."
    });
  } catch {
    return res.status(200).json({
      locations: [],
      userLocation,
      message: "Nearby providers are temporarily unavailable. OffTrail did not create synthetic places."
    });
  }
}

async function searchNearbyOpenData(userLocation: LatLng, radiusKm: number, categories: string[]) {
  const osm = await searchOsmPlaces(userLocation, radiusKm, categories);
  if (osm.length) return osm;
  return searchNominatimAround(userLocation, radiusKm, categories);
}

function mapProviderPlace(place: PlaceCandidate, userLocation: LatLng): IntelligenceLocation {
  const distance = Math.round(haversineMeters(userLocation, place));
  const point = { lat: place.lat, lng: place.lng };
  return {
    id: place.id,
    name: place.name,
    type: typeFromCategory(place.category, place.isHiddenGem),
    coordinates: point,
    distance,
    description: place.description,
    photo: firstRealPhoto(place.photos) || osmStaticMapUrl(point),
    rating: place.rating || 0,
    isOpen: place.isOpenAtArrival ?? ["nature", "viewpoint", "photo-op"].includes(place.category),
    category: place.category
  };
}

function typeFromCategory(category: string, hiddenGem: boolean): IntelligenceLocation["type"] {
  if (hiddenGem || category === "hidden" || category === "garden") return "hidden_gem";
  if (category === "photo-op") return "photo_op";
  if (category === "viewpoint") return "viewpoint";
  return "nature";
}

function matchesRequestedCategory(place: PlaceCandidate, categories: Set<string>) {
  if (!categories.size) return true;
  if (place.category === "culture" && !categories.has("culture")) return false;
  if (place.category === "food" && !categories.has("food") && !categories.has("local")) return false;
  if (place.category === "cafe" && !categories.has("cafe") && !categories.has("food") && !categories.has("local")) return false;
  const type = typeFromCategory(place.category, place.isHiddenGem);
  return categories.has(type) || categories.has(place.category);
}

function firstRealPhoto(photos: string[]) {
  return photos.find((photo) => /^https?:\/\//i.test(photo));
}
