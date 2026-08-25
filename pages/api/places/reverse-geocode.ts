import type { NextApiRequest, NextApiResponse } from "next";
import { reverseGeocode } from "../../../src/server/geocode";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed. Use GET." });
  }

  const lat = Number(Array.isArray(req.query.lat) ? req.query.lat[0] : req.query.lat);
  const lng = Number(Array.isArray(req.query.lng) ? req.query.lng[0] : req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: "lat and lng are required." });
  }

  const name = await reverseGeocode(lat, lng);
  return res.status(200).json({ name });
}
