import { hiddenGemScore, isHiddenGem } from "./category";
import { searchFoursquarePlaces } from "./foursquare";
import { calculateRoute, searchGooglePlaces } from "./google";
import {
  distanceToRouteMeters,
  formatDistance,
  formatDuration,
  haversineMeters,
  interpolateRoute
} from "./geo";
import { createRateLimiter } from "./rateLimit";
import { enhanceLocations } from "./ai";
import { generateDemoPlaces, generateLayoverDemoPlaces } from "./demoPlaces";
import type { DiscoverRequest, DiscoverResponse, LatLng, LocationResult, PlaceCandidate, TimeOfDay } from "./types";

const googleLimiter = createRateLimiter(10, 1000);
const foursquareLimiter = createRateLimiter(10, 1000);

export async function discover(input: DiscoverRequest): Promise<DiscoverResponse> {
  const radiusKm = input.radius || 5;
  const filters = normalizeFilters(input.filters || []);
  const route = await calculateRoute(input);
  const routeWithTime = addRouteTimeSegments(route, input);
  const routePoints = route.path.map(([lat, lng]) => ({ lat, lng }));
  const searchPoints = interpolateRoute(routePoints, 2500);

  const searchResults = await Promise.allSettled(
    searchPoints.map(async (point) => {
      const [google, foursquare] = await Promise.allSettled([
        googleLimiter(() => searchGooglePlaces(point, radiusKm)),
        foursquareLimiter(() => searchFoursquarePlaces(point, radiusKm))
      ]);

      return [
        ...(google.status === "fulfilled" ? google.value : []),
        ...(foursquare.status === "fulfilled" ? foursquare.value : [])
      ];
    })
  );

  const discovered = searchResults.flatMap((result) =>
    result.status === "fulfilled" ? result.value : []
  );
  const demoCandidates = [...generateDemoPlaces(routePoints), ...generateLayoverDemoPlaces(input.layovers || [])];
  const candidates = discovered.length ? discovered : demoCandidates;

  const deduped = dedupeLocations(candidates);
  const scored = deduped.map((location) => scoreLocation(location, routePoints));
  const filtered = applyFilters(scored, filters);
  const sorted = filtered.sort((a, b) => {
    if (a.detourMeters !== b.detourMeters) return a.detourMeters - b.detourMeters;
    return b.hiddenGemScore - a.hiddenGemScore;
  });

  const limited = sorted.slice(0, 100);
  const enhanced = await enhanceLocations(limited);
  const timeAware = applyTimeAwareness(enhanced, input, routeWithTime.durationSeconds);
  const sortedByTime = sortTimeAwareLocations(timeAware);

  return {
    route: routeWithTime,
    locations: sortedByTime.map(stripInternalFields),
    total: timeAware.length
  };
}

function scoreLocation(location: PlaceCandidate, routePoints: LatLng[]): PlaceCandidate {
  const detourMeters = distanceToRouteMeters(location, routePoints);
  const score = hiddenGemScore(location.rating, location.ratingCount, location.category);
  return {
    ...location,
    detourMeters,
    detourDistance: formatDistance(detourMeters),
    hiddenGemScore: score,
    isHiddenGem: isHiddenGem(location.rating, location.ratingCount)
  };
}

function applyFilters(locations: PlaceCandidate[], filters: string[]) {
  if (!filters.length) return locations;

  return locations.filter((location) => {
    const categories = new Set([
      location.category,
      ...location.rawCategories.map((category) => category.toLowerCase())
    ]);

    return filters.some((filter) => {
      if (filter === "hidden") return location.isHiddenGem;
      if (filter === "nature") {
        return categories.has("nature") || categories.has("park") || categories.has("garden");
      }
      if (filter === "cafe") return categories.has("cafe") || categories.has("coffee shop");
      return categories.has(filter);
    });
  });
}

function dedupeLocations(locations: PlaceCandidate[]) {
  const bySourceId = new Map<string, PlaceCandidate>();
  const buckets = new Map<string, PlaceCandidate[]>();
  const merged: PlaceCandidate[] = [];

  for (const location of locations) {
    const exact = location.sourceIds.find((id) => bySourceId.has(id));
    if (exact) {
      mergeInto(bySourceId.get(exact)!, location);
      continue;
    }

    const duplicate = findSpatialDuplicate(location, buckets);
    if (duplicate) {
      mergeInto(duplicate, location);
      for (const id of location.sourceIds) bySourceId.set(id, duplicate);
      continue;
    }

    merged.push(location);
    for (const id of location.sourceIds) bySourceId.set(id, location);
    const key = spatialKey(location);
    const bucket = buckets.get(key) || [];
    bucket.push(location);
    buckets.set(key, bucket);
  }

  return merged;
}

function findSpatialDuplicate(location: PlaceCandidate, buckets: Map<string, PlaceCandidate[]>) {
  const latKey = Math.round(location.lat * 10000);
  const lngKey = Math.round(location.lng * 10000);

  for (let latOffset = -5; latOffset <= 5; latOffset += 1) {
    for (let lngOffset = -5; lngOffset <= 5; lngOffset += 1) {
      const bucket = buckets.get(`${latKey + latOffset}:${lngKey + lngOffset}`) || [];
      const duplicate = bucket.find(
        (candidate) =>
          haversineMeters(location, candidate) <= 50 &&
          normalizeName(candidate.name) === normalizeName(location.name)
      );
      if (duplicate) return duplicate;
    }
  }

  return undefined;
}

function mergeInto(target: PlaceCandidate, incoming: PlaceCandidate) {
  target.rating = Math.max(target.rating, incoming.rating);
  target.ratingCount = Math.max(target.ratingCount, incoming.ratingCount);
  target.photos = Array.from(new Set([...target.photos, ...incoming.photos])).slice(0, 5);
  target.rawCategories = Array.from(new Set([...target.rawCategories, ...incoming.rawCategories]));
  target.sourceIds = Array.from(new Set([...target.sourceIds, ...incoming.sourceIds]));
  if (!target.address && incoming.address) target.address = incoming.address;
  if (incoming.provider === "google") target.id = incoming.id;
}

function spatialKey(location: LatLng) {
  return `${Math.round(location.lat * 10000)}:${Math.round(location.lng * 10000)}`;
}

function normalizeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

function normalizeFilters(filters: string[]) {
  return filters
    .map((filter) => filter.trim().toLowerCase())
    .filter(Boolean)
    .map((filter) => (filter === "viewpoints" ? "viewpoint" : filter));
}

function stripInternalFields(location: PlaceCandidate): LocationResult {
  return {
    id: location.id,
    name: location.name,
    lat: location.lat,
    lng: location.lng,
    category: location.category,
    rating: location.rating,
    ratingCount: location.ratingCount,
    photos: location.photos,
    description: location.description,
    address: location.address,
    isHiddenGem: location.isHiddenGem,
    detourDistance: location.detourDistance,
    estimatedTime: location.estimatedTime,
    photo: location.photo || location.photos[0],
    isOpenAtArrival: location.isOpenAtArrival,
    is24Hours: location.is24Hours,
    openingHours: location.openingHours,
    todaysHours: location.todaysHours,
    opensAt: location.opensAt,
    closesAt: location.closesAt,
    nextOpenTime: location.nextOpenTime,
    arrivalTime: location.arrivalTime,
    arrivalTimeLabel: location.arrivalTimeLabel,
    timeOfDay: location.timeOfDay,
    fitsInLayover: location.fitsInLayover,
    layoverWindow: location.layoverWindow,
    layoverName: location.layoverName,
    distanceFromStation: location.distanceFromStation,
    distanceFromStationLabel: location.distanceFromStationLabel,
    walkingTime: location.walkingTime,
    safeForNighttime: location.safeForNighttime
  };
}

function addRouteTimeSegments(route: DiscoverResponse["route"], input: DiscoverRequest) {
  const departure = parseDepartureTime(input.departureTime);
  const arrival = new Date(departure.getTime() + route.durationSeconds * 1000);
  const stops = [
    {
      label: input.origin || "Origin",
      point: { lat: input.originLat, lng: input.originLng },
      departure
    },
    ...(input.layovers || []).map((layover, index) => ({
      label: layover.location || `Layover ${index + 1}`,
      point: { lat: layover.lat, lng: layover.lng },
      arrival: combineDateAndTime(departure, layover.arrivalTime, index + 1),
      departure: combineDateAndTime(departure, layover.departureTime, index + 1)
    })),
    {
      label: input.destination || "Destination",
      point: { lat: input.destinationLat, lng: input.destinationLng },
      arrival
    }
  ];

  const segments = stops.slice(0, -1).map((stop, index) => {
    const next = stops[index + 1];
    const segmentDeparture = stop.departure || departure;
    const fallbackSeconds = Math.max(900, Math.round(route.durationSeconds / Math.max(stops.length - 1, 1)));
    const segmentArrival = next.arrival || new Date(segmentDeparture.getTime() + fallbackSeconds * 1000);
    const durationSeconds = Math.max(0, Math.round((segmentArrival.getTime() - segmentDeparture.getTime()) / 1000));
    return {
      from: stop.label,
      to: next.label,
      departure: segmentDeparture.toISOString(),
      arrival: segmentArrival.toISOString(),
      duration: formatDuration(durationSeconds || fallbackSeconds),
      durationSeconds: durationSeconds || fallbackSeconds
    };
  });

  return {
    ...route,
    departureTime: departure.toISOString(),
    arrivalTime: arrival.toISOString(),
    segments
  };
}

function applyTimeAwareness(locations: PlaceCandidate[], input: DiscoverRequest, routeDurationSeconds: number) {
  const departure = parseDepartureTime(input.departureTime);
  const destinationArrival = new Date(departure.getTime() + routeDurationSeconds * 1000);
  const contexts = buildTimeContexts(input, destinationArrival);
  const enriched = locations.map((location) => enrichLocationForTime(location, nearestContext(location, contexts)));
  const nightFiltered = enriched.filter((location) => {
    if (location.timeOfDay !== "night" && location.timeOfDay !== "early-morning") return true;
    if (!location.layoverName) return true;
    return location.safeForNighttime;
  });
  return nightFiltered.length ? nightFiltered : enriched;
}

function buildTimeContexts(input: DiscoverRequest, destinationArrival: Date) {
  const departure = parseDepartureTime(input.departureTime);
  const layovers = (input.layovers || []).map((layover, index) => {
    const arrival = combineDateAndTime(departure, layover.arrivalTime, index + 1);
    const leave = combineDateAndTime(departure, layover.departureTime, index + 1);
    return {
      name: layover.location || `Layover ${index + 1}`,
      point: { lat: layover.lat, lng: layover.lng },
      arrival,
      departure: leave,
      maxDistanceMeters: Math.max(250, (layover.maxDistance || 2) * 1000),
      isLayover: true
    };
  });

  return [
    ...layovers,
    {
      name: input.destination || "Destination",
      point: { lat: input.destinationLat, lng: input.destinationLng },
      arrival: destinationArrival,
      departure: new Date(destinationArrival.getTime() + 4 * 3600 * 1000),
      maxDistanceMeters: 10000,
      isLayover: false
    }
  ];
}

function nearestContext(location: PlaceCandidate, contexts: ReturnType<typeof buildTimeContexts>) {
  return contexts.reduce((best, context) =>
    haversineMeters(location, context.point) < haversineMeters(location, best.point) ? context : best
  );
}

function enrichLocationForTime(location: PlaceCandidate, context: ReturnType<typeof buildTimeContexts>[number]) {
  const target = context.arrival;
  const distanceFromStation = Math.round(haversineMeters(location, context.point));
  const walkingTime = Math.max(1, Math.round(distanceFromStation / 80));
  const hours = resolveOpeningHours(location, target);
  const timeOfDay = getTimeOfDay(target);
  const layoverMinutes = Math.max(0, Math.round((context.departure.getTime() - context.arrival.getTime()) / 60000));
  const safeForNighttime =
    distanceFromStation <= context.maxDistanceMeters &&
    ["cafe", "food", "restaurant", "bakery", "train_station"].includes(location.category);

  return {
    ...location,
    photo: location.photos[0],
    isOpenAtArrival: hours.isOpenAtArrival,
    is24Hours: hours.is24Hours,
    openingHours: hours.todaysHours,
    todaysHours: hours.todaysHours,
    opensAt: hours.opensAt,
    closesAt: hours.closesAt,
    nextOpenTime: hours.nextOpenTime,
    arrivalTime: target.toISOString(),
    arrivalTimeLabel: formatClock(target),
    timeOfDay,
    fitsInLayover: layoverMinutes ? location.estimatedTime + walkingTime * 2 <= layoverMinutes : true,
    layoverWindow: context.isLayover ? `${formatClock(context.arrival)}-${formatClock(context.departure)}` : "",
    layoverName: context.isLayover ? context.name : "",
    distanceFromStation,
    distanceFromStationLabel: distanceFromStation < 1000 ? `${distanceFromStation}m` : formatDistance(distanceFromStation),
    walkingTime,
    safeForNighttime:
      timeOfDay === "night" || timeOfDay === "early-morning" ? safeForNighttime : distanceFromStation <= context.maxDistanceMeters
  };
}

function sortTimeAwareLocations(locations: PlaceCandidate[]) {
  return [...locations].sort((a, b) => {
    if (Boolean(a.isOpenAtArrival) !== Boolean(b.isOpenAtArrival)) return a.isOpenAtArrival ? -1 : 1;
    if (Boolean(a.safeForNighttime) !== Boolean(b.safeForNighttime)) return a.safeForNighttime ? -1 : 1;
    return (a.distanceFromStation || a.detourMeters) - (b.distanceFromStation || b.detourMeters);
  });
}

function resolveOpeningHours(location: PlaceCandidate, target: Date) {
  const fromGoogle = location.openingHoursData?.periods?.length
    ? resolveGoogleOpeningHours(location.openingHoursData.periods, target)
    : null;
  return fromGoogle || inferOpeningHours(location.category, target);
}

function resolveGoogleOpeningHours(periods: NonNullable<PlaceCandidate["openingHoursData"]>["periods"], target: Date) {
  if (!periods?.length) return null;
  const day = target.getDay();
  const time = `${String(target.getHours()).padStart(2, "0")}${String(target.getMinutes()).padStart(2, "0")}`;
  const todays = periods.filter((period) => period.open.day === day);
  const openPeriod = todays.find((period) => {
    if (!period.close) return true;
    return time >= period.open.time && time <= period.close.time;
  });
  const next = todays[0] || periods.find((period) => period.open.day >= day) || periods[0];
  const opensAt = formatHour(next.open.time);
  const closesAt = next.close ? formatHour(next.close.time) : "24 Hours";
  const is24Hours = Boolean(openPeriod && !openPeriod.close);
  return {
    isOpenAtArrival: Boolean(openPeriod),
    is24Hours,
    todaysHours: is24Hours ? "24 Hours" : `${opensAt}-${closesAt}`,
    opensAt,
    closesAt,
    nextOpenTime: opensAt
  };
}

function inferOpeningHours(category: string, target: Date) {
  const ranges: Record<string, [string, string, boolean]> = {
    cafe: ["0600", "2300", false],
    food: ["0700", "2300", false],
    restaurant: ["1000", "2300", false],
    bakery: ["0500", "1400", false],
    viewpoint: ["0000", "2400", true],
    nature: ["0000", "2400", true],
    "photo-op": ["0000", "2400", true],
    park: ["0600", "2200", false],
    garden: ["0800", "2000", false],
    culture: ["1000", "1800", false]
  };
  const [open, close, is24Hours] = ranges[category] || ["0900", "2100", false];
  const current = `${String(target.getHours()).padStart(2, "0")}${String(target.getMinutes()).padStart(2, "0")}`;
  const isOpenAtArrival = is24Hours || (current >= open && current <= close);
  return {
    isOpenAtArrival,
    is24Hours,
    todaysHours: is24Hours ? "24 Hours" : `${formatHour(open)}-${formatHour(close)}`,
    opensAt: formatHour(open),
    closesAt: is24Hours ? "24 Hours" : formatHour(close),
    nextOpenTime: formatHour(open)
  };
}

function parseDepartureTime(value?: string) {
  const parsed = value ? new Date(value) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function combineDateAndTime(base: Date, time?: string, dayOffset = 0) {
  const next = new Date(base);
  next.setDate(next.getDate() + dayOffset);
  if (time) {
    const [hours, minutes] = time.split(":").map(Number);
    if (Number.isFinite(hours)) next.setHours(hours, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  }
  return next;
}

function getTimeOfDay(date: Date): TimeOfDay {
  const hour = date.getHours();
  if (hour >= 0 && hour < 5) return "night";
  if (hour >= 5 && hour < 8) return "early-morning";
  if (hour >= 8 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "evening";
}

function formatHour(value: string) {
  if (value === "2400") return "24:00";
  return `${value.slice(0, 2)}:${value.slice(2, 4)}`;
}

function formatClock(date: Date) {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
