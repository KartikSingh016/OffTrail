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

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
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

    const response = await fetch(url.toString(), {
      headers: {
        "Accept": "application/json",
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
  const display = normalizeText(`${result.name || ""} ${result.display_name || ""}`);
  const tokens = normalizedQuery.split(" ").filter((token) => token.length > 2);
  const matchedTokens = tokens.filter((token) => display.includes(token));
  const importance = typeof result.importance === "number" ? result.importance : 0;
  const kind = [result.class, result.type, result.addresstype].filter(Boolean).join(" ").toLowerCase();
  const acceptedKinds = /\b(place|boundary|city|town|village|hamlet|suburb|neighbourhood|state|county|municipality|railway|station|airport|amenity|tourism|leisure|natural|historic|building|road)\b/;

  if (!acceptedKinds.test(kind)) return false;
  if (tokens.length && matchedTokens.length / tokens.length < 0.6) return false;
  return importance >= 0.05 || matchedTokens.length > 0;
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
