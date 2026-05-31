import type { DiscoverRequest, LayoverInput } from "./types";

export class ValidationError extends Error {
  status = 400;
}

export function validateDiscoverRequest(body: unknown): DiscoverRequest {
  if (!body || typeof body !== "object") {
    throw new ValidationError("Request body must be a JSON object.");
  }

  const value = body as Record<string, unknown>;
  const originLat = readCoordinate(value.originLat, "originLat", "lat");
  const originLng = readCoordinate(value.originLng, "originLng", "lng");
  const destinationLat = readCoordinate(value.destinationLat, "destinationLat", "lat");
  const destinationLng = readCoordinate(value.destinationLng, "destinationLng", "lng");
  const radius = value.radius === undefined ? 5 : readNumber(value.radius, "radius");

  if (radius <= 0 || radius > 50) {
    throw new ValidationError("radius must be greater than 0 and no more than 50 km.");
  }
  const originLabel = typeof value.origin === "string" ? value.origin.trim() : "";
  const destinationLabel = typeof value.destination === "string" ? value.destination.trim() : "";
  const sameLabel = originLabel && destinationLabel && originLabel.toLowerCase() === destinationLabel.toLowerCase();
  const sameCoordinates = Math.abs(originLat - destinationLat) < 0.00001 && Math.abs(originLng - destinationLng) < 0.00001;
  if (sameLabel || sameCoordinates) {
    throw new ValidationError("Starting point and destination must be different.");
  }

  return {
    origin: originLabel || undefined,
    destination: destinationLabel || undefined,
    originLat,
    originLng,
    destinationLat,
    destinationLng,
    departureTime: readOptionalString(value.departureTime),
    radius,
    layovers: readLayovers(value.layovers),
    filters: readFilters(value.filters)
  };
}

export function validateSaveRouteBody(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new ValidationError("Request body must be a JSON object.");
  }

  const value = body as Record<string, unknown>;
  if (!isJsonObject(value.origin)) throw new ValidationError("origin is required.");
  if (!isJsonObject(value.destination)) throw new ValidationError("destination is required.");
  if (!isJsonObject(value.routeData)) throw new ValidationError("routeData is required.");
  if (!Array.isArray(value.locations)) throw new ValidationError("locations must be an array.");

  return {
    origin: value.origin,
    destination: value.destination,
    routeData: value.routeData,
    locations: value.locations
  };
}

function readCoordinate(input: unknown, field: string, axis: "lat" | "lng") {
  const value = readNumber(input, field);
  if (axis === "lat" && (value < -90 || value > 90)) {
    throw new ValidationError(`${field} must be between -90 and 90.`);
  }
  if (axis === "lng" && (value < -180 || value > 180)) {
    throw new ValidationError(`${field} must be between -180 and 180.`);
  }
  return value;
}

function readNumber(input: unknown, field: string) {
  const value = typeof input === "string" ? Number(input) : input;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ValidationError(`${field} must be a valid number.`);
  }
  return value;
}

function readLayovers(input: unknown): LayoverInput[] {
  if (input === undefined) return [];
  if (!Array.isArray(input)) throw new ValidationError("layovers must be an array.");

  return input.map((layover, index) => {
    if (!layover || typeof layover !== "object") {
      throw new ValidationError(`layovers[${index}] must be an object.`);
    }
    const value = layover as Record<string, unknown>;
    const timeAvailable =
      value.timeAvailable === undefined ? undefined : readNumber(value.timeAvailable, `layovers[${index}].timeAvailable`);
    const maxDistance =
      value.maxDistance === undefined ? undefined : readNumber(value.maxDistance, `layovers[${index}].maxDistance`);
    return {
      location: readOptionalString(value.location),
      lat: readCoordinate(value.lat, `layovers[${index}].lat`, "lat"),
      lng: readCoordinate(value.lng, `layovers[${index}].lng`, "lng"),
      timeAvailable,
      arrivalTime: readOptionalString(value.arrivalTime),
      departureTime: readOptionalString(value.departureTime),
      maxDistance,
      timeOfDay: undefined
    };
  });
}

function readFilters(input: unknown) {
  if (input === undefined) return [];
  if (!Array.isArray(input)) throw new ValidationError("filters must be an array.");
  return input.map((filter) => String(filter)).filter(Boolean);
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readOptionalString(input: unknown) {
  return typeof input === "string" && input.trim() ? input.trim() : undefined;
}
