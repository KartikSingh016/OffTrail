import { TtlCache } from "./cache";
import { defaultVisitTime, fallbackDescription, hiddenGemScore, isHiddenGem, normalizeCategory } from "./category";
import { decodeGooglePolyline, formatDistance, formatDuration, haversineMeters, routeDistanceMeters } from "./geo";
import { createRateLimiter } from "./rateLimit";
import { fetchJson, HttpError } from "./retry";
import type { LatLng, PlaceCandidate, RouteSummary } from "./types";

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
  extratags?: {
    image?: string;
    wikipedia?: string;
    wikimedia_commons?: string;
  };
};

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter"
];

const OSM_RESULT_LIMIT = 20;
// ponytail: a single-center query with a 7s budget was fine, but a corridor
// query spanning dozens of route points needs real headroom or it never
// finishes on the public Overpass instance - raise ceiling if that changes.
const OVERPASS_TIMEOUT_MS = 18000;
const OVERPASS_QUERY_TIMEOUT_S = 15;
const OSM_USER_AGENT = "OffTrail/1.0 (contact@offtrail.app)";

const OSRM_ROUTE_URL = "https://router.project-osrm.org/route/v1/driving";
const OSRM_TIMEOUT_MS = 10000;

type OsrmRouteResponse = {
  code?: string;
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: string;
  }>;
};

export async function calculateOsrmRoute(origin: LatLng, destination: LatLng, layovers: LatLng[] = []): Promise<RouteSummary> {
  const coordinates = [origin, ...layovers, destination].map((point) => `${point.lng},${point.lat}`).join(";");
  const url = `${OSRM_ROUTE_URL}/${coordinates}?overview=full&geometries=polyline&steps=false`;

  const data = await fetchJson<OsrmRouteResponse>(
    url,
    {
      headers: { "User-Agent": OSM_USER_AGENT },
      signal: AbortSignal.timeout(OSRM_TIMEOUT_MS)
    },
    "OSRM Routing"
  );

  const route = data.routes?.[0];
  if (data.code !== "Ok" || !route?.geometry) {
    throw new HttpError("No route found between the selected locations.", 422, "OSRM returned no route");
  }

  const path = decodeGooglePolyline(route.geometry);
  const distanceMeters = route.distance || routeDistanceMeters(path);
  const durationSeconds = route.duration ? Math.round(route.duration) : Math.round((distanceMeters / 80000) * 3600);

  return {
    path: path.map((point) => [point.lat, point.lng] as [number, number]),
    distance: formatDistance(distanceMeters),
    duration: formatDuration(durationSeconds),
    distanceMeters,
    durationSeconds
  };
}

// A single Overpass query that checks all `centers` at once (via a multi-point
// `around` filter) instead of one HTTP round trip per point - firing one query
// per sampled point re-scans heavily overlapping search areas and multiplies
// both request count and server-side cost. But one combined query doesn't scale
// either: for a long route (e.g. a 600km+ international trip) or a corridor
// through a densely-mapped area, a single query spanning 40 "around" circles
// reliably blows Overpass's own internal timeout and comes back as a 200 OK
// with zero elements - which silently starves the whole route of real
// candidates and drops discovery down to a much weaker origin/destination-only
// fallback (see discovery.ts's searchRealOsmCorridor), making every long route
// through the same origin look like it returned "the same stops". Splitting the
// corridor into smaller batches run in parallel keeps each query cheap enough to
// usually finish, and an expensive/dense batch timing out only costs that one
// stretch of the route instead of the whole search.
const OVERPASS_CHUNK_SIZE = 8;
const overpassChunkLimiter = createRateLimiter(4, 1000);

export async function searchOsmCorridor(centers: LatLng[], radiusKm: number, filters: string[] = []): Promise<PlaceCandidate[]> {
  if (!centers.length) return [];
  const radiusMeters = Math.min(Math.max(Math.round(radiusKm * 1000), 500), 12000);

  const chunks: LatLng[][] = [];
  for (let i = 0; i < centers.length; i += OVERPASS_CHUNK_SIZE) {
    chunks.push(centers.slice(i, i + OVERPASS_CHUNK_SIZE));
  }

  const results = await Promise.allSettled(
    chunks.map((chunk) => overpassChunkLimiter(() => fetchOverpassChunk(chunk, radiusMeters, filters)))
  );
  return results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
}

async function fetchOverpassChunk(centers: LatLng[], radiusMeters: number, filters: string[]): Promise<PlaceCandidate[]> {
  const query = buildOverpassQuery(centers, radiusMeters, filters);
  const anchor = centers[0];

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const data = await fetchJson<OverpassResponse>(
        endpoint,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            "User-Agent": OSM_USER_AGENT
          },
          signal: AbortSignal.timeout(OVERPASS_TIMEOUT_MS),
          body: `data=${encodeURIComponent(query)}`
        },
        "Overpass API"
      );
      const mapped = await Promise.all((data.elements || []).map((element) => mapOsmElement(element, anchor)));
      return mapped.flat();
    } catch {
      continue;
    }
  }

  return [];
}

export async function searchOsmPlaces(center: LatLng, radiusKm: number, filters: string[] = []): Promise<PlaceCandidate[]> {
  return searchOsmCorridor([center], radiusKm, filters);
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
      url.searchParams.set("extratags", "1");
      url.searchParams.set("q", query);
      if (anchor) {
        const box = viewboxAround(anchor);
        url.searchParams.set("viewbox", `${box.west},${box.north},${box.east},${box.south}`);
        url.searchParams.set("bounded", "1");
      }

      const data = await fetchJson<NominatimPlace[]>(
        url.toString(),
        {
          headers: {
            Accept: "application/json",
            "User-Agent": OSM_USER_AGENT
          },
          signal: AbortSignal.timeout(5000)
        },
        "Nominatim Search"
      );
      const mapped = (await Promise.all(data.map((place) => mapNominatimPlace(place)))).flat();
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
      url.searchParams.set("extratags", "1");
      url.searchParams.set("q", term);
      const box = viewboxAround(center, radiusKm);
      url.searchParams.set("viewbox", `${box.west},${box.north},${box.east},${box.south}`);
      url.searchParams.set("bounded", "1");

      const data = await fetchJson<NominatimPlace[]>(
        url.toString(),
        {
          headers: {
            Accept: "application/json",
            "User-Agent": OSM_USER_AGENT
          },
          signal: AbortSignal.timeout(5000)
        },
        "Nominatim Search"
      );
      const mapped = (await Promise.all(data.map((place) => mapNominatimPlace(place)))).flat();
      results.push(...mapped.filter((place) => haversineMeters(center, place) <= maxDistance));
    } catch {
      continue;
    }
  }

  return dedupeById(results);
}

function buildOverpassQuery(centers: LatLng[], radiusMeters: number, filters: string[]) {
  const clauses = osmClausesFromFilters(filters);
  const around = `(around:${radiusMeters},${centers.map((point) => `${point.lat},${point.lng}`).join(",")})`;
  // way/relation "around" checks require Overpass to evaluate full geometries
  // instead of a single point, which is far more expensive - only worth it for
  // clauses that are genuinely area features (parks, water, woods). Point
  // amenities (cafes, viewpoints, museums...) are essentially always nodes.
  const selectors = clauses.flatMap((clause) => {
    const isAreaFeature = clause.includes('"leisure"') || clause.includes('"natural"');
    return isAreaFeature
      ? [`node${around}${clause};`, `way${around}${clause};`, `relation${around}${clause};`]
      : [`node${around}${clause};`];
  });
  const resultLimit = Math.min(OSM_RESULT_LIMIT * centers.length, 300);

  return `[out:json][timeout:${OVERPASS_QUERY_TIMEOUT_S}];(${selectors.join("")});out center tags ${resultLimit};`;
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

// OSM tags a famous grave/memorial can carry alongside `tourism=attraction`
// (e.g. Beethoven's grave in Bonn), which otherwise slips into "viewpoint" or
// "photo-op" corridor searches even though a headstone isn't a scenic view.
const GRAVE_OR_CEMETERY_TAGS: Record<string, Set<string>> = {
  historic: new Set(["tomb", "grave"]),
  amenity: new Set(["grave_yard"]),
  landuse: new Set(["cemetery"])
};

function isGraveOrCemetery(tags: Record<string, string>) {
  return Object.entries(GRAVE_OR_CEMETERY_TAGS).some(([key, values]) => {
    const value = tags[key];
    return typeof value === "string" && values.has(value.toLowerCase());
  });
}

async function mapOsmElement(element: OverpassElement, center: LatLng): Promise<PlaceCandidate[]> {
  const tags = element.tags || {};
  const name = tags.name || tags["name:en"];
  const lat = element.lat ?? element.center?.lat;
  const lng = element.lon ?? element.center?.lon;
  if (!name || typeof lat !== "number" || typeof lng !== "number") return [];
  if (isGraveOrCemetery(tags)) return [];

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
  const photo = await osmImageFor(tags, { lat, lng });
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

async function mapNominatimPlace(place: NominatimPlace): Promise<PlaceCandidate[]> {
  const lat = Number(place.lat);
  const lng = Number(place.lon);
  const name = place.name || firstDisplayNamePart(place.display_name || "");
  if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) return [];
  if (!isInterestingNominatimPlace(place, name)) return [];
  if (place.class && place.type && isGraveOrCemetery({ [place.class]: place.type })) return [];

  const rawCategories = [place.class, place.type].filter(Boolean) as string[];
  const category = normalizeCategory(rawCategories, name);
  const id = `osm:${place.osm_type || "place"}:${place.osm_id || place.place_id || `${lat},${lng}`}`;
  const rating = 0;
  const ratingCount = 0;
  const photo = await osmImageFor(place.extratags || {}, { lat, lng });

  return [
    {
      id,
      name,
      lat,
      lng,
      category,
      rating,
      ratingCount,
      photos: [photo],
      description: fallbackDescription(name, category),
      address: place.display_name || "OpenStreetMap verified place",
      isHiddenGem: isHiddenGem(rating, ratingCount),
      detourDistance: "0 km",
      estimatedTime: defaultVisitTime(category),
      provider: "osm",
      sourceIds: [id],
      rawCategories,
      detourMeters: 0,
      hiddenGemScore: hiddenGemScore(rating, ratingCount, category)
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

// Most OSM POIs carry no `image`/`wikimedia_commons` tag, but tourist
// attractions and viewpoints (exactly what "cinematic view" style filters
// target) are commonly cross-referenced to a Wikipedia article via a
// `wikipedia` tag - its lead photo is a real photo of the real place, and
// the summary API is free/keyless, so it meaningfully raises how often a
// genuine photo is available without needing a paid Places API key.
const wikipediaImageCache = new TtlCache<string | null>(24 * 60 * 60 * 1000);
const wikipediaLimiter = createRateLimiter(5, 1000);

async function wikipediaImageFor(tags: Record<string, string>): Promise<string | null> {
  const raw = tags.wikipedia;
  if (!raw) return null;
  const separator = raw.indexOf(":");
  if (separator === -1) return null;
  const lang = raw.slice(0, separator).trim();
  const title = raw.slice(separator + 1).trim();
  if (!lang || !title) return null;

  const cacheKey = `${lang}:${title}`;
  const cached = wikipediaImageCache.get(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const data = await wikipediaLimiter(() =>
      fetchJson<{ thumbnail?: { source?: string }; originalimage?: { source?: string } }>(
        `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
        { headers: { "User-Agent": OSM_USER_AGENT }, signal: AbortSignal.timeout(4000) },
        "Wikipedia Summary"
      )
    );
    const image = data.originalimage?.source || data.thumbnail?.source || null;
    wikipediaImageCache.set(cacheKey, image);
    return image;
  } catch {
    wikipediaImageCache.set(cacheKey, null);
    return null;
  }
}

async function osmImageFor(tags: Record<string, string>, point: LatLng) {
  const image = tags.image;
  if (image?.startsWith("http://") || image?.startsWith("https://")) return image;

  const commons = tags.wikimedia_commons;
  if (commons?.startsWith("File:")) {
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(commons.replace(/^File:/, ""))}?width=640`;
  }

  const wikipediaImage = await wikipediaImageFor(tags);
  if (wikipediaImage) return wikipediaImage;

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
