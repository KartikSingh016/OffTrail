import type { DiscoverRequest, LatLng } from "./types";

const EARTH_RADIUS_METERS = 6371000;

const toRad = (value: number) => (value * Math.PI) / 180;
const toDeg = (value: number) => (value * 180) / Math.PI;

export function haversineMeters(a: LatLng, b: LatLng) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

export function formatDistance(meters: number) {
  const km = meters / 1000;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

export function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${minutes}min`;
  return remainder ? `${hours}h ${remainder}min` : `${hours}h`;
}

export function decodeGooglePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

export function interpolateRoute(points: LatLng[], intervalMeters: number, maxPoints = 80) {
  if (points.length <= 1) return points;

  const samples: LatLng[] = [points[0]];
  let carried = 0;

  for (let i = 1; i < points.length; i += 1) {
    const start = points[i - 1];
    const end = points[i];
    const segmentMeters = haversineMeters(start, end);
    let nextDistance = intervalMeters - carried;

    while (nextDistance < segmentMeters) {
      const ratio = nextDistance / segmentMeters;
      samples.push({
        lat: start.lat + (end.lat - start.lat) * ratio,
        lng: start.lng + (end.lng - start.lng) * ratio
      });
      nextDistance += intervalMeters;
    }

    carried = segmentMeters - (nextDistance - intervalMeters);
  }

  samples.push(points[points.length - 1]);

  if (samples.length <= maxPoints) return samples;

  const reduced: LatLng[] = [];
  const step = (samples.length - 1) / (maxPoints - 1);
  for (let i = 0; i < maxPoints; i += 1) {
    reduced.push(samples[Math.round(i * step)]);
  }
  return reduced;
}

function project(point: LatLng, origin: LatLng, meanLat: number) {
  return {
    x: toRad(point.lng - origin.lng) * Math.cos(meanLat) * EARTH_RADIUS_METERS,
    y: toRad(point.lat - origin.lat) * EARTH_RADIUS_METERS
  };
}

function distancePointToSegmentMeters(point: LatLng, a: LatLng, b: LatLng) {
  const meanLat = toRad((point.lat + a.lat + b.lat) / 3);
  const p = project(point, a, meanLat);
  const end = project(b, a, meanLat);
  const lenSq = end.x * end.x + end.y * end.y;
  if (!lenSq) return haversineMeters(point, a);

  const t = Math.max(0, Math.min(1, (p.x * end.x + p.y * end.y) / lenSq));
  const closest = {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t
  };
  return haversineMeters(point, closest);
}

export function distanceToRouteMeters(point: LatLng, route: LatLng[]) {
  if (!route.length) return 0;
  if (route.length === 1) return haversineMeters(point, route[0]);

  let min = Number.POSITIVE_INFINITY;
  for (let i = 1; i < route.length; i += 1) {
    min = Math.min(min, distancePointToSegmentMeters(point, route[i - 1], route[i]));
  }
  return min;
}

export function directFallbackPath(origin: LatLng, destination: LatLng) {
  const distance = haversineMeters(origin, destination);
  const segments = Math.max(8, Math.min(80, Math.ceil(distance / 25000)));
  const path: LatLng[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const ratio = i / segments;
    path.push({
      lat: origin.lat + (destination.lat - origin.lat) * ratio,
      lng: origin.lng + (destination.lng - origin.lng) * ratio
    });
  }
  return path;
}

export function routeDistanceMeters(points: LatLng[]) {
  return points.reduce((sum, point, index) => {
    if (index === 0) return 0;
    return sum + haversineMeters(points[index - 1], point);
  }, 0);
}

export function routeCacheKey(input: DiscoverRequest) {
  const layovers = input.layovers || [];
  return JSON.stringify({
    origin: [roundCoord(input.originLat), roundCoord(input.originLng)],
    destination: [roundCoord(input.destinationLat), roundCoord(input.destinationLng)],
    layovers: layovers.map((layover) => [roundCoord(layover.lat), roundCoord(layover.lng)])
  });
}

function roundCoord(value: number) {
  return Number(value.toFixed(5));
}
