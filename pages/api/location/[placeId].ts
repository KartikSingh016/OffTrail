import type { NextApiRequest, NextApiResponse } from "next";
import { fetchFoursquarePlaceDetail } from "../../../src/server/foursquare";
import { fetchGooglePlaceDetail } from "../../../src/server/google";
import { HttpError } from "../../../src/server/retry";

type ErrorResponse = {
  error: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed. Use GET." });
  }

  const placeId = Array.isArray(req.query.placeId) ? req.query.placeId[0] : req.query.placeId;
  if (!placeId) return res.status(400).json({ error: "placeId is required." } satisfies ErrorResponse);

  try {
    const detail = placeId.startsWith("fsq:")
      ? await fetchFoursquarePlaceDetail(placeId.replace(/^fsq:/, ""))
      : await fetchGooglePlaceDetail(placeId);

    return res.status(200).json(detail);
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({ error: error.message });
    }

    const message = error instanceof Error ? error.message : "Location lookup failed.";
    return res.status(500).json({ error: message });
  }
}
