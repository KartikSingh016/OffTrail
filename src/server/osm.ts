import { defaultVisitTime, fallbackDescription, hiddenGemScore, isHiddenGem, normalizeCategory } from "./category";
import { formatDistance, haversineMeters } from "./geo";
import type { LatLng, PlaceCandidate } from "./types";

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat?: number;
    lon?: number;
  };
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements?: OverpassElement[];
};

type NominatimPlace = {
  place_id?: number;
  osm_type?: string;
  osm_id?: number;
  display_name?: string;
  name?: string;
  lat?: string;
  lon?: string;
  type?: string;
  class?: string;
};

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter"
];

const OSM_RESULT_LIMIT = 12;
const OVERPASS_TIMEOUT_MS = 7000;

export async function searchOsmPlaces(center: LatLng, radiusKm: number, filters: string[] = []): Promise<PlaceCandidate[]> {
  const radiusMeters = Math.min(Math.max(Math.round(radiusKm * 1000), 500), 7000);
  const query = buildOverpassQuery(center, radiusMeters, filters);

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent": "OffTrail route discovery"
        },
        signal: AbortSignal.timeout(OVERPASS_TIMEOUT_MS),
        body: `data=${encodeURIComponent(query)}`
      });
      if (!response.ok) continue;
      const data = (await response.json()) as OverpassResponse;
      return (data.elements || []).flatMap((element) => mapOsmElement(element, center));
    } catch {
      continue;
    }
  }

  return [];
}

export async function searchNominatimPlaces(
  placeName: string | undefined,
  filters: string[] = [],
  anchor?: LatLng
): Promise<PlaceCandidate[]> {
  if (!placeName?.trim()) return [];

  const queries = nominatimQueries(placeName, filters);
  const results: PlaceCandidate[] = [];

  for (const query of queries) {
    try {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("format", "json");
      url.searchParams.set("limit", "4");
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("q", query);
      if (anchor) {
        const box = viewboxAround(anchor);
        url.searchParams.set("viewbox", `${box.west},${box.north},${box.east},${box.south}`);
        url.searchParams.set("bounded", "1");
      }

      const response = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          "User-Agent": "OffTrail route discovery"
        },
        signal: AbortSignal.timeout(5000)
      });
      if (!response.ok) continue;
      const data = (await response.json()) as NominatimPlace[];
      const mapped = data.flatMap((place) => mapNominatimPlace(place));
      results.push(...(anchor ? mapped.filter((place) => haversineMeters(anchor, place) <= 90000) : mapped));
    } catch {
      continue;
    }
  }

  return dedupeById(results);
}

export async function searchNominatimAround(
  center: LatLng,
  radiusKm: number,
  filters: string[] = []
): Promise<PlaceCandidate[]> {
  const terms = nominatimTerms(filters);
  const results: PlaceCandidate[] = [];
  const maxDistance = Math.min(Math.max(radiusKm * 1000, 500), 12000);

  for (const term of terms) {
    try {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("format", "json");
      url.searchParams.set("limit", "6");
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("q", term);
      const box = viewboxAround(center, radiusKm);
      url.searchParams.set("viewbox", `${box.west},${box.north},${box.east},${box.south}`);
      url.searchParams.set("bounded", "1");

      const response = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          "User-Agent": "OffTrail route discovery"
        },
        signal: AbortSignal.timeout(5000)
      });
      if (!response.ok) continue;
      const data = (await response.json()) as NominatimPlace[];
      results.push(
        ...data
          .flatMap((place) => mapNominatimPlace(place))
          .filter((place) => haversineMeters(center, place) <= maxDistance)
      );
    } catch {
      continue;
    }
  }

  return dedupeById(results);
}

function buildOverpassQuery(center: LatLng, radiusMeters: number, filters: string[]) {
  const clauses = osmClausesFromFilters(filters);
  const around = `(around:${radiusMeters},${center.lat},${center.lng})`;
  const selectors = clauses.flatMap((clause) => [
    `node${around}${clause};`,
    `way${around}${clause};`,
    `relation${around}${clause};`
  ]);

  return `[out:json][timeout:7];(${selectors.join("")});out center tags ${OSM_RESULT_LIMIT};`;
}

function osmClausesFromFilters(filters: string[]) {
  const normalized = new Set(filters.map(normalizeFilterKey));
  const clauses = new Set<string>();

  if (!normalized.size || normalized.has("nature") || normalized.has("hidden")) {
    clauses.add('["leisure"~"^(park|garden|nature_reserve)$"]');
    clauses.add('["natural"~"^(wood|water|peak|cliff|beach)$"]');
  }
  if (!normalized.size || normalized.has("viewpoint") || normalized.has("photo-op") || normalized.has("hidden")) {
    clauses.add('["tourism"~"^(viewpoint|attraction|artwork|gallery|museum)$"]');
  }
  if (!normalized.size || normalized.has("cafe") || normalized.has("food") || normalized.has("local")) {
    clauses.add('["amenity"~"^(cafe|restaurant|bar|pub|biergarten|food_court)$"]');
  }
  if (normalized.has("garden")) clauses.add('["leisure"="garden"]');
  if (normalized.has("culture")) {
    clauses.add('["tourism"~"^(museum|gallery|artwork|attraction)$"]');
    clauses.add('["historic"]');
  }

  return clauses.size ? Array.from(clauses) : ['["name"]["tourism"]', '["name"]["leisure"]', '["name"]["amenity"]'];
}

function mapOsmElement(element: OverpassElement, center: LatLng): PlaceCandidate[] {
  const tags = element.tags || {};
  const name = tags.name || tags["name:en"];
  const lat = element.lat ?? element.center?.lat;
  const lng = element.lon ?? element.center?.lon;
  if (!name || typeof lat !== "number" || typeof lng !== "number") return [];

  const rawCategories = [
    tags.tourism,
    tags.amenity,
    tags.leisure,
    tags.natural,
    tags.historic,
    tags.shop
  ].filter(Boolean) as string[];
  const category = normalizeCategory(rawCategories, name);
  const id = `osm:${element.type}:${element.id}`;
  const distance = haversineMeters(center, { lat, lng });
  const photo = osmImageFor(tags, { lat, lng });
  const rating = 0;
  const ratingCount = 0;

  return [
    {
      id,
      name,
      lat,
      lng,
      category,
      rating,
      ratingCount,
      photos: photo ? [photo] : [],
      description: fallbackDescription(name, category),
      address: tags["addr:full"] || formatAddress(tags) || tags.operator || "OpenStreetMap verified place",
      isHiddenGem: isHiddenGem(rating, ratingCount),
      detourDistance: formatDistance(distance),
      estimatedTime: defaultVisitTime(category),
      provider: "osm",
      sourceIds: [id],
      rawCategories,
      detourMeters: 0,
      hiddenGemScore: hiddenGemScore(rating, ratingCount, category)
    }
  ];
}

function mapNominatimPlace(place: NominatimPlace): PlaceCandidate[] {
  const lat = Number(place.lat);
  const lng = Number(place.lon);
  const name = place.name || firstDisplayNamePart(place.display_name || "");
  if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) return [];
  if (!isInterestingNominatimPlace(place, name)) return [];

  const rawCategories = [place.class, place.type].filter(Boolean) as string[];
  const category = normalizeCategory(rawCategories, name);
  const id = `osm:${place.osm_type || "place"}:${place.osm_id || place.place_id || `${lat},${lng}`}`;
  const rating = 0;
  const ratingCount = 0;

  return [
    {
      id,
      name,
      lat,
      lng,
      category,
      rating,
      ratingCount,
      photos: [osmStaticMapUrl({ lat, lng })],
      description: fallbackDescription(name, category),
      address: place.display_name || "OpenStreetMap verified place",
      isHiddenGem: false,
      detourDistance: "0 km",
      estimatedTime: defaultVisitTime(category),
      provider: "osm",
      sourceIds: [id],
      rawCategories,
      detourMeters: 0,
      hiddenGemScore: 0
    }
  ];
}

function isInterestingNominatimPlace(place: NominatimPlace, name: string) {
  if (/^\d+[\da-z -]*$/i.test(name.trim())) return false;

  const fields = [place.class, place.type].filter(Boolean).join(" ").toLowerCase();
  if (/\b(leisure|tourism|natural|historic|amenity|park|garden|museum|gallery|viewpoint|attraction|cafe|restaurant|bar|pub|beach|wood|water|peak|trail)\b/.test(fields)) {
    return true;
  }

  return /\b(park|garden|square|museum|gallery|viewpoint|overlook|fort|castle|trail|lake|beach|cafe|restaurant)\b/i.test(name);
}

function nominatimQueries(placeName: string, filters: string[]) {
  return nominatimTerms(filters).map((term) => `${term} in ${placeName}`);
}

function nominatimTerms(filters: string[]) {
  const normalized = new Set(filters.map(normalizeFilterKey));
  const terms = new Set<string>();
  if (!normalized.size || normalized.has("nature") || normalized.has("hidden")) {
    terms.add("park");
    terms.add("garden");
  }
  if (!normalized.size || normalized.has("viewpoint") || normalized.has("photo-op") || normalized.has("hidden")) {
    terms.add("tourist attraction");
    terms.add("museum");
    terms.add("viewpoint");
  }
  if (!normalized.size || normalized.has("cafe") || normalized.has("food") || normalized.has("local")) {
    terms.add("cafe");
    terms.add("restaurant");
  }
  return Array.from(terms).slice(0, 5);
}

function normalizeFilterKey(filter: string) {
  const key = filter.toLowerCase().trim();
  const aliases: Record<string, string> = {
    hidden_gem: "hidden",
    hidden_gems: "hidden",
    photo_op: "photo-op",
    photo_ops: "photo-op",
    viewpoints: "viewpoint",
    cafes: "cafe",
    local_favorites: "local"
  };
  return aliases[key] || key;
}

function firstDisplayNamePart(displayName: string) {
  return displayName.split(",")[0]?.trim() || "";
}

function dedupeById(places: PlaceCandidate[]) {
  const seen = new Set<string>();
  return places.filter((place) => {
    if (seen.has(place.id)) return false;
    seen.add(place.id);
    return true;
  });
}

function viewboxAround(point: LatLng, radiusKm = 90) {
  const latDelta = Math.min(Math.max(radiusKm / 111, 0.03), 0.85);
  const lngDelta = Math.min(
    Math.max(latDelta / Math.max(0.35, Math.cos((point.lat * Math.PI) / 180)), 0.03),
    1.6
  );
  return {
    west: point.lng - lngDelta,
    east: point.lng + lngDelta,
    north: point.lat + latDelta,
    south: point.lat - latDelta
  };
}

function osmImageFor(tags: Record<string, string>, point: LatLng) {
  const image = tags.image;
  if (image?.startsWith("http://") || image?.startsWith("https://")) return image;

  const commons = tags.wikimedia_commons;
  if (commons?.startsWith("File:")) {
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(commons.replace(/^File:/, ""))}?width=640`;
  }

  return osmStaticMapUrl(point);
}

export function osmStaticMapUrl(point: LatLng) {
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${point.lat},${point.lng}&zoom=15&size=640x360&markers=${point.lat},${point.lng},red-pushpin`;
}

function formatAddress(tags: Record<string, string>) {
  return [
    tags["addr:housenumber"] && tags["addr:street"] ? `${tags["addr:street"]} ${tags["addr:housenumber"]}` : tags["addr:street"],
    tags["addr:city"],
    tags["addr:country"]
  ]
    .filter(Boolean)
    .join(", ");
}
