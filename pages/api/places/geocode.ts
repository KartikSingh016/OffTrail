import type { NextApiRequest, NextApiResponse } from "next";
import { geocodePlace } from "../../../src/server/geocode";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed. Use GET." });
  }

  const query = Array.isArray(req.query.query) ? req.query.query[0] : req.query.query;
  if (!query) return res.status(400).json({ error: "query is required." });

  try {
    const place = await geocodePlace(query);
    return res.status(200).json(place);
  } catch (error) {
    return res.status(404).json({
      error: error instanceof Error ? error.message : "Location not found."
    });
  }
}
