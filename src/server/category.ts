const CATEGORY_WEIGHTS: Record<string, number> = {
  viewpoint: 1.5,
  garden: 1.4,
  park: 1.3,
  nature: 1.3,
  cafe: 1.2,
  food: 1.1,
  culture: 1,
  "photo-op": 1.35,
  hidden: 1.25
};

const GOOGLE_CATEGORY_MAP: Array<[string[], string]> = [
  [["park", "natural_feature"], "nature"],
  [["tourist_attraction", "point_of_interest"], "photo-op"],
  [["museum", "art_gallery"], "culture"],
  [["cafe", "bakery"], "cafe"],
  [["restaurant", "bar"], "food"],
  [["church", "hindu_temple", "mosque", "synagogue"], "culture"],
  [["shopping_mall", "store"], "culture"]
];

const NAME_CATEGORY_MAP: Array<[RegExp, string]> = [
  [/\b(view|vista|lookout|overlook|panorama|belvedere)\b/i, "viewpoint"],
  [/\b(garden|botanical|arboretum)\b/i, "garden"],
  [/\b(waterfall|falls|lake|river|forest|trail|mountain|beach)\b/i, "nature"],
  [/\b(cafe|coffee|roastery)\b/i, "cafe"],
  [/\b(gallery|museum|castle|cathedral|church|monument)\b/i, "culture"]
];

export function normalizeCategory(types: string[], name = "") {
  const lowerTypes = types.map((type) => type.toLowerCase());

  for (const [pattern, category] of NAME_CATEGORY_MAP) {
    if (pattern.test(name)) return category;
  }

  for (const [matches, category] of GOOGLE_CATEGORY_MAP) {
    if (matches.some((match) => lowerTypes.some((type) => type.includes(match)))) {
      return category;
    }
  }

  return "hidden";
}

export function categoryWeight(category: string) {
  return CATEGORY_WEIGHTS[category] || 1;
}

export function defaultVisitTime(category: string) {
  const times: Record<string, number> = {
    viewpoint: 25,
    garden: 35,
    park: 40,
    nature: 45,
    cafe: 35,
    food: 50,
    culture: 55,
    "photo-op": 25,
    hidden: 30
  };
  return times[category] || 30;
}

export function fallbackDescription(name: string, category: string) {
  const descriptions: Record<string, string> = {
    viewpoint: `${name} offers a scenic pause with strong photo potential near your route.`,
    garden: `${name} is a calm green stop worth a short detour.`,
    park: `${name} adds fresh air, space, and local texture to the journey.`,
    nature: `${name} brings a natural escape close to your route.`,
    cafe: `${name} is a relaxed local stop for coffee and a reset.`,
    food: `${name} is a convenient food stop with local flavor.`,
    culture: `${name} adds architecture, history, or art to the route.`,
    "photo-op": `${name} is a photogenic stop that can turn the route into a memory.`,
    hidden: `${name} looks like an underrated stop with discovery potential.`
  };
  return descriptions[category] || descriptions.hidden;
}

export function hiddenGemScore(rating: number, ratingCount: number, category: string) {
  if (!rating) return 0;
  return (rating / (Math.log10(ratingCount + 1) + 1)) * categoryWeight(category);
}

export function isHiddenGem(rating: number, ratingCount: number) {
  return ratingCount > 0 && ratingCount < 100 && rating > 4.0;
}
