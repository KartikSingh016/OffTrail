import { defaultVisitTime, fallbackDescription, normalizeCategory } from "./category";
import { serverEnv } from "./env";
import { fetchJson } from "./retry";
import type { LocationEnhancement, PlaceCandidate } from "./types";

type AnthropicResponse = {
  content?: Array<{
    type?: string;
    text?: string;
  }>;
};

export async function enhanceLocations(locations: PlaceCandidate[]) {
  if (!locations.length) return locations;
  if (!serverEnv.anthropicApiKey) return locations.map(applyFallbackEnhancement);

  const enhanced = new Map<string, LocationEnhancement>();
  const chunks = chunk(locations, 50);

  for (const batch of chunks) {
    try {
      const response = await fetchJson<AnthropicResponse>(
        "https://api.anthropic.com/v1/messages",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": serverEnv.anthropicApiKey,
            "anthropic-version": "2023-06-01"
          },
          body: JSON.stringify({
            model: serverEnv.anthropicModel,
            max_tokens: 3500,
            temperature: 0.2,
            messages: [
              {
                role: "user",
                content: buildPrompt(batch)
              }
            ]
          })
        },
        "Anthropic Claude enrichment"
      );

      const text = response.content?.find((part) => part.type === "text")?.text || "";
      for (const item of parseEnhancements(text)) {
        if (item.id) enhanced.set(item.id, item);
      }
    } catch {
      for (const item of batch.map(applyFallbackEnhancement)) {
        enhanced.set(item.id, item);
      }
    }
  }

  return locations.map((location) => {
    const item = enhanced.get(location.id);
    if (!item) return applyFallbackEnhancement(location);

    const category = item.category ? normalizeCategory([item.category], location.name) : location.category;
    return {
      ...location,
      category,
      description: item.description || location.description || fallbackDescription(location.name, category),
      estimatedTime: normalizeVisitTime(item.estimatedTime) || location.estimatedTime
    };
  });
}

function buildPrompt(locations: PlaceCandidate[]) {
  const compact = locations.map((location) => ({
    id: location.id,
    name: location.name,
    category: location.category,
    rating: location.rating,
    ratingCount: location.ratingCount,
    address: location.address,
    rawCategories: location.rawCategories
  }));

  return `Given these places: ${JSON.stringify(compact)}.
For each place, generate:
1) A 1-sentence compelling description, 20 words max.
2) Best category tag from: nature, photo-op, food, culture, hidden, cafe, viewpoint, garden, park.
3) Estimated visit time in minutes.
Return JSON only as an array of objects with keys: id, description, category, estimatedTime.`;
}

function parseEnhancements(text: string): LocationEnhancement[] {
  const trimmed = text.trim();
  const jsonText = extractJson(trimmed);
  if (!jsonText) return [];

  const parsed = JSON.parse(jsonText) as unknown;
  const items = Array.isArray(parsed)
    ? parsed
    : typeof parsed === "object" && parsed && "locations" in parsed
      ? (parsed as { locations?: unknown }).locations
      : [];

  if (!Array.isArray(items)) return [];

  return items.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const value = item as Record<string, unknown>;
    if (typeof value.id !== "string") return [];
    return [
      {
        id: value.id,
        description: typeof value.description === "string" ? value.description.slice(0, 180) : undefined,
        category: typeof value.category === "string" ? value.category : undefined,
        estimatedTime: typeof value.estimatedTime === "number" ? value.estimatedTime : undefined
      }
    ];
  });
}

function extractJson(text: string) {
  if (text.startsWith("[") || text.startsWith("{")) return text;
  const arrayStart = text.indexOf("[");
  const arrayEnd = text.lastIndexOf("]");
  if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
    return text.slice(arrayStart, arrayEnd + 1);
  }
  const objectStart = text.indexOf("{");
  const objectEnd = text.lastIndexOf("}");
  if (objectStart !== -1 && objectEnd !== -1 && objectEnd > objectStart) {
    return text.slice(objectStart, objectEnd + 1);
  }
  return "";
}

function applyFallbackEnhancement(location: PlaceCandidate) {
  return {
    ...location,
    description: location.description || fallbackDescription(location.name, location.category),
    estimatedTime: location.estimatedTime || defaultVisitTime(location.category)
  };
}

function normalizeVisitTime(value?: number) {
  if (!value || !Number.isFinite(value)) return 0;
  return Math.max(10, Math.min(180, Math.round(value)));
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
