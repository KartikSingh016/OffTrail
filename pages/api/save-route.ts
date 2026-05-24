import type { NextApiRequest, NextApiResponse } from "next";
import { HttpError } from "../../src/server/retry";
import { getAuthenticatedUserId, insertSavedRoute } from "../../src/server/supabase";
import { validateSaveRouteBody, ValidationError } from "../../src/server/validation";

type ErrorResponse = {
  error: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed. Use POST." } satisfies ErrorResponse);
  }

  const token = getBearerToken(req.headers.authorization);
  if (!token) return res.status(401).json({ error: "Authentication required." } satisfies ErrorResponse);

  try {
    const body = validateSaveRouteBody(req.body);
    const userId = await getAuthenticatedUserId(token);
    const savedRoute = await insertSavedRoute({
      userId,
      origin: body.origin,
      destination: body.destination,
      routeData: body.routeData,
      locations: body.locations
    });

    return res.status(200).json({ id: savedRoute?.id });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(error.status).json({ error: error.message });
    }
    if (error instanceof HttpError) {
      return res.status(error.status).json({ error: error.message });
    }

    const message = error instanceof Error ? error.message : "Route save failed.";
    return res.status(500).json({ error: message });
  }
}

function getBearerToken(header?: string) {
  const match = header?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}
