import type { NextApiRequest, NextApiResponse } from "next";
import { discover } from "../../src/server/discovery";
import type { DiscoverResponse } from "../../src/server/types";
import { geocodePlace } from "../../src/server/geocode";
import { validateDiscoverRequest, ValidationError } from "../../src/server/validation";

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DiscoverResponse | ErrorResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const input = validateDiscoverRequest(await normalizeDiscoverBody(req.body));
    const result = await discover(input);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(error.status).json({ error: error.message });
    }

    const message = error instanceof Error ? error.message : "Discovery failed.";
    return res.status(500).json({ error: message });
  }
}

async function normalizeDiscoverBody(body: unknown) {
  if (!body || typeof body !== "object") return body;
  const value = { ...(body as Record<string, unknown>) };

  if ((value.originLat === undefined || value.originLng === undefined) && typeof value.origin === "string") {
    const origin = await geocodePlace(value.origin);
    value.originLat = origin.lat;
    value.originLng = origin.lng;
  }

  if (
    (value.destinationLat === undefined || value.destinationLng === undefined) &&
    typeof value.destination === "string"
  ) {
    const destination = await geocodePlace(value.destination);
    value.destinationLat = destination.lat;
    value.destinationLng = destination.lng;
  }

  if (Array.isArray(value.layovers)) {
    value.layovers = await Promise.all(
      value.layovers.map(async (layover) => {
        if (!layover || typeof layover !== "object") return layover;
        const next = { ...(layover as Record<string, unknown>) };
        const coordinates = next.coordinates;
        if (coordinates && typeof coordinates === "object") {
          const point = coordinates as Record<string, unknown>;
          next.lat = next.lat ?? point.lat;
          next.lng = next.lng ?? point.lng;
        }
        if ((next.lat === undefined || next.lng === undefined) && typeof next.location === "string") {
          const place = await geocodePlace(next.location);
          next.lat = place.lat;
          next.lng = place.lng;
        }
        return next;
      })
    );
  }

  return value;
}
