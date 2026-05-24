import type { NextApiRequest, NextApiResponse } from "next";
import { autocompletePlaces } from "../../../src/server/geocode";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed. Use GET." });
  }

  const query = Array.isArray(req.query.query) ? req.query.query[0] : req.query.query;
  const suggestions = await autocompletePlaces(query || "");
  return res.status(200).json({ suggestions });
}
