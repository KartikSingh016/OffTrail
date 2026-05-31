import { serverEnv } from "./env";
import { fetchJson } from "./retry";
import type { LatLng } from "./types";

export type PlaceSuggestion = LatLng & {
  id: string;
  label: string;
  name: string;
};

export class GeocodeError extends Error {
  status = 404;
}

const knownPlaces: PlaceSuggestion[] = [
  { id: "known:bad-honnef", name: "Bad Honnef", label: "Bad Honnef, North Rhine-Westphalia, Germany", lat: 50.6439, lng: 7.2278 },
  { id: "known:bonn", name: "Bonn", label: "Bonn, North Rhine-Westphalia, Germany", lat: 50.7374, lng: 7.0982 },
  { id: "known:cologne", name: "Cologne", label: "Cologne, North Rhine-Westphalia, Germany", lat: 50.9375, lng: 6.9603 },
  { id: "known:munich", name: "Munich", label: "Munich, Bavaria, Germany", lat: 48.1372, lng: 11.5755 },
  { id: "known:berlin", name: "Berlin", label: "Berlin, Germany", lat: 52.52, lng: 13.405 },
  { id: "known:paris", name: "Paris", label: "Paris, France", lat: 48.8566, lng: 2.3522 },
  { id: "known:london", name: "London", label: "London, United Kingdom", lat: 51.5072, lng: -0.1276 },
  { id: "known:new-delhi", name: "New Delhi", label: "New Delhi, Delhi, India", lat: 28.6139, lng: 77.209 },
  { id: "known:mumbai", name: "Mumbai", label: "Mumbai, Maharashtra, India", lat: 19.076, lng: 72.8777 }
];

const knownPlaceAliases = new Map<string, string>([
  ["bad honnef", "known:bad-honnef"],
  ["bad honnef germany", "known:bad-honnef"],
  ["bonn", "known:bonn"],
  ["bonn germany", "known:bonn"],
  ["cologne", "known:cologne"],
  ["cologne germany", "known:cologne"],
  ["koln", "known:cologne"],
  ["köln", "known:cologne"],
  ["koeln", "known:cologne"],
  ["munich", "known:munich"],
  ["munich germany", "known:munich"],
  ["munchen", "known:munich"],
  ["münchen", "known:munich"],
  ["muenchen", "known:munich"],
  ["berlin", "known:berlin"],
  ["berlin germany", "known:berlin"],
  ["paris", "known:paris"],
  ["paris france", "known:paris"],
  ["london", "known:london"],
  ["london uk", "known:london"],
  ["london united kingdom", "known:london"],
  ["new delhi", "known:new-delhi"],
  ["new delhi india", "known:new-delhi"],
  ["delhi", "known:new-delhi"],
  ["mumbai", "known:mumbai"],
  ["mumbai india", "known:mumbai"],
  ["bombay", "known:mumbai"]
]);

type GoogleAutocompleteResponse = {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: {
        text?: string;
      };
      structuredFormat?: {
        mainText?: {
          text?: string;
        };
      };
    };
  }>;
};

type GoogleGeocodeResponse = {
  results?: Array<{
    place_id?: string;
    formatted_address?: string;
    partial_match?: boolean;
    geometry?: {
      location?: {
        lat?: number;
        lng?: number;
      };
    };
    address_components?: Array<{
      long_name?: string;
      types?: string[];
    }>;
  }>;
};

type NominatimResponse = Array<{
  place_id?: number;
  display_name?: string;
  lat?: string;
  lon?: string;
  name?: string;
  class?: string;
  type?: string;
  addresstype?: string;
  importance?: number;
  namedetails?: Record<string, string>;
}>;

export async function autocompletePlaces(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  if (!serverEnv.googleMapsApiKey) return autocompleteWithNominatim(trimmed);

  try {
    const response = await fetchJson<GoogleAutocompleteResponse>(
      "https://places.googleapis.com/v1/places:autocomplete",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": serverEnv.googleMapsApiKey
        },
        body: JSON.stringify({
          input: trimmed,
          includedPrimaryTypes: ["locality", "administrative_area_level_1", "geocode"]
        })
      },
      "Google Places Autocomplete"
    );

    return (response.suggestions || [])
      .map((suggestion) => suggestion.placePrediction)
      .filter(Boolean)
      .slice(0, 6)
      .map((prediction) => ({
        id: prediction!.placeId || prediction!.text?.text || "",
        label: prediction!.text?.text || "",
        name: prediction!.structuredFormat?.mainText?.text || prediction!.text?.text || ""
      }))
      .filter((item) => item.id && item.label);
  } catch {
    return autocompleteWithNominatim(trimmed);
  }
}

export async function geocodePlace(query: string): Promise<PlaceSuggestion> {
  const coordinate = parseCoordinates(query);
  if (coordinate) {
    return {
      id: `coords:${coordinate.lat},${coordinate.lng}`,
      name: query,
      label: query,
      lat: coordinate.lat,
      lng: coordinate.lng
    };
  }

  if (!serverEnv.googleMapsApiKey) {
    const nominatim = await geocodeWithNominatim(query);
    if (nominatim) return nominatim;
    const known = knownPlaceFallback(query);
    if (known) return known;
    throw new GeocodeError(`Location not found: "${query}". Check the spelling or choose a suggestion.`);
  }

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", query);
    url.searchParams.set("key", serverEnv.googleMapsApiKey);
    const response = await fetchJson<GoogleGeocodeResponse>(url.toString(), {}, "Google Geocoding");
    const result = response.results?.[0];
    const location = result?.geometry?.location;
    if (!result || result.partial_match || typeof location?.lat !== "number" || typeof location.lng !== "number") {
      throw new Error("Location not found.");
    }
    return {
      id: result.place_id || result.formatted_address || query,
      name:
        result.address_components?.find((component) => component.types?.includes("locality"))?.long_name ||
        result.formatted_address ||
        query,
      label: result.formatted_address || query,
      lat: location.lat,
      lng: location.lng
    };
  } catch {
    const nominatim = await geocodeWithNominatim(query);
    if (nominatim) return nominatim;
    const known = knownPlaceFallback(query);
    if (known) return known;
    throw new GeocodeError(`Location not found: "${query}". Check the spelling or choose a suggestion.`);
  }
}

function parseCoordinates(value: string) {
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

async function autocompleteWithNominatim(query: string): Promise<PlaceSuggestion[]> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "6");
    url.searchParams.set("q", query);
    url.searchParams.set("accept-language", "en");
    url.searchParams.set("namedetails", "1");

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
        "User-Agent": "OffTrail route discovery"
      }
    });
    if (!response.ok) return [];
    const data = (await response.json()) as NominatimResponse;
    return data.flatMap((result) => {
      const lat = Number(result.lat);
      const lng = Number(result.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
      if (!isConfidentNominatimResult(query, result)) return [];
      return [
        {
          id: result.place_id ? `osm:${result.place_id}` : `osm:${lat},${lng}`,
          name: result.name || firstDisplayNamePart(result.display_name || query),
          label: result.display_name || result.name || query,
          lat,
          lng
        }
      ];
    });
  } catch {
    return [];
  }
}

async function geocodeWithNominatim(query: string): Promise<PlaceSuggestion | null> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    url.searchParams.set("q", query);
    url.searchParams.set("accept-language", "en");
    url.searchParams.set("namedetails", "1");

    const response = await fetch(url.toString(), {
      headers: {
        "Accept": "application/json",
        "Accept-Language": "en",
        "User-Agent": "OffTrail route discovery demo"
      }
    });
    if (!response.ok) return null;
    const data = (await response.json()) as NominatimResponse;
    const result = data[0];
    const lat = Number(result?.lat);
    const lng = Number(result?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (!result || !isConfidentNominatimResult(query, result)) return null;

    return {
      id: result.place_id ? `osm:${result.place_id}` : `osm:${query}`,
      name: result.name || query,
      label: result.display_name || query,
      lat,
      lng
    };
  } catch {
    return null;
  }
}

function isConfidentNominatimResult(query: string, result: NominatimResponse[number]) {
  const normalizedQuery = normalizeText(query);
  const aliases = Object.values(result.namedetails || {}).join(" ");
  const display = normalizeText(`${result.name || ""} ${result.display_name || ""} ${aliases}`);
  const tokens = normalizedQuery.split(" ").filter((token) => token.length > 2);
  const matchedTokens = tokens.filter((token) => display.includes(token));
  const importance = typeof result.importance === "number" ? result.importance : 0;
  const kind = [result.class, result.type, result.addresstype].filter(Boolean).join(" ").toLowerCase();
  const acceptedKinds = /\b(place|boundary|administrative|city|town|village|hamlet|suburb|neighbourhood|state|county|municipality|railway|station|airport|amenity|tourism|leisure|natural|historic|building|road)\b/;
  const broadPlaceKind = /\b(place|boundary|administrative|city|town|village|state|county|municipality|railway|station|airport)\b/.test(kind);
  const highConfidenceProviderMatch = broadPlaceKind && importance >= 0.25;

  if (!acceptedKinds.test(kind)) return false;
  if (tokens.length && matchedTokens.length / tokens.length < 0.6 && !highConfidenceProviderMatch) return false;
  return importance >= 0.05 || matchedTokens.length > 0 || highConfidenceProviderMatch;
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function firstDisplayNamePart(displayName: string) {
  return displayName.split(",")[0]?.trim() || "";
}

function knownPlaceFallback(query: string) {
  const normalized = normalizeText(query);
  const withoutCountryComma = normalizeText(query.split(",")[0] || query);
  const placeId = knownPlaceAliases.get(normalized) || knownPlaceAliases.get(withoutCountryComma);
  const place = knownPlaces.find((item) => item.id === placeId);
  return place ? { ...place } : null;
}
