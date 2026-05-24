import { serverEnv } from "./env";
import { fetchJson } from "./retry";
import type { LatLng } from "./types";

export type PlaceSuggestion = LatLng & {
  id: string;
  label: string;
  name: string;
};

const SAMPLE_PLACES: PlaceSuggestion[] = [
  { id: "demo-paris", name: "Paris", label: "Paris, France", lat: 48.8566, lng: 2.3522 },
  { id: "demo-lyon", name: "Lyon", label: "Lyon, France", lat: 45.764, lng: 4.8357 },
  { id: "demo-munich", name: "Munich", label: "Munich, Germany", lat: 48.1351, lng: 11.582 },
  { id: "demo-berlin", name: "Berlin", label: "Berlin, Germany", lat: 52.52, lng: 13.405 },
  { id: "demo-zurich", name: "Zurich", label: "Zurich, Switzerland", lat: 47.3769, lng: 8.5417 },
  { id: "demo-vienna", name: "Vienna", label: "Vienna, Austria", lat: 48.2082, lng: 16.3738 },
  { id: "demo-prague", name: "Prague", label: "Prague, Czechia", lat: 50.0755, lng: 14.4378 },
  { id: "demo-amsterdam", name: "Amsterdam", label: "Amsterdam, Netherlands", lat: 52.3676, lng: 4.9041 },
  { id: "demo-bruges", name: "Bruges", label: "Bruges, Belgium", lat: 51.2093, lng: 3.2247 },
  { id: "demo-florence", name: "Florence", label: "Florence, Italy", lat: 43.7696, lng: 11.2558 }
];

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
}>;

export async function autocompletePlaces(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  if (!serverEnv.googleMapsApiKey) {
    return sampleAutocomplete(trimmed);
  }

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
    return sampleAutocomplete(trimmed);
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

  const sample = sampleAutocomplete(query)[0];
  if (!serverEnv.googleMapsApiKey) {
    if (sample) return sample;
    const nominatim = await geocodeWithNominatim(query);
    return nominatim || approximatePlace(query);
  }

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", query);
    url.searchParams.set("key", serverEnv.googleMapsApiKey);
    const response = await fetchJson<GoogleGeocodeResponse>(url.toString(), {}, "Google Geocoding");
    const result = response.results?.[0];
    const location = result?.geometry?.location;
    if (!result || typeof location?.lat !== "number" || typeof location.lng !== "number") {
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
    if (sample) return sample;
    const nominatim = await geocodeWithNominatim(query);
    return nominatim || approximatePlace(query);
  }
}

function sampleAutocomplete(query: string) {
  const normalized = query.toLowerCase();
  return SAMPLE_PLACES.filter(
    (place) =>
      place.name.toLowerCase().includes(normalized) ||
      place.label.toLowerCase().includes(normalized)
  ).slice(0, 6);
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

function approximatePlace(query: string): PlaceSuggestion {
  const hash = Array.from(query.trim().toLowerCase()).reduce(
    (total, character) => (total * 31 + character.charCodeAt(0)) >>> 0,
    17
  );
  const lat = -55 + (hash % 13000) / 100;
  const lng = -170 + ((hash >>> 8) % 34000) / 100;
  const name = query.trim();
  return {
    id: `approx:${hash}`,
    name,
    label: `${name} (approximate)`,
    lat: Number(lat.toFixed(5)),
    lng: Number(lng.toFixed(5))
  };
}
