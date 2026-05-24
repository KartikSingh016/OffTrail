import { defaultVisitTime, fallbackDescription, hiddenGemScore, isHiddenGem } from "./category";
import { distanceToRouteMeters, formatDistance } from "./geo";
import type { LatLng, PlaceCandidate } from "./types";

const DEMO_NAMES = [
  ["Hidden Garden Courtyard", "garden", 4.8, 37],
  ["Old Stone Viewpoint", "viewpoint", 4.6, 58],
  ["Riverside Photo Bend", "photo-op", 4.5, 89],
  ["Locals' Coffee Room", "cafe", 4.7, 72],
  ["Quiet Forest Path", "nature", 4.4, 51],
  ["Tiny History Chapel", "culture", 4.3, 64],
  ["Market Street Favorite", "food", 4.6, 95],
  ["Overlook Picnic Steps", "viewpoint", 4.9, 29],
  ["Pocket Park Terrace", "park", 4.5, 43],
  ["Mural Alley Corner", "photo-op", 4.2, 34]
] as const;

const PHOTOS = [
  "https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg?auto=compress&cs=tinysrgb&w=640",
  "https://images.pexels.com/photos/2516409/pexels-photo-2516409.jpeg?auto=compress&cs=tinysrgb&w=640",
  "https://images.pexels.com/photos/2901209/pexels-photo-2901209.jpeg?auto=compress&cs=tinysrgb&w=640",
  "https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=640",
  "https://images.pexels.com/photos/2404370/pexels-photo-2404370.jpeg?auto=compress&cs=tinysrgb&w=640"
];

export function generateDemoPlaces(routePoints: LatLng[]) {
  if (!routePoints.length) return [];

  const places = DEMO_NAMES.map(([name, category, rating, ratingCount], index) => {
    const anchor = routePoints[Math.min(routePoints.length - 1, Math.round(((index + 1) / (DEMO_NAMES.length + 1)) * (routePoints.length - 1)))];
    const side = index % 2 === 0 ? 1 : -1;
    const offset = 0.008 + (index % 4) * 0.003;
    const lat = anchor.lat + side * offset;
    const lng = anchor.lng + side * offset * 0.7;
    const detourMeters = distanceToRouteMeters({ lat, lng }, routePoints);
    return {
      id: `demo-${index + 1}`,
      name,
      lat,
      lng,
      category,
      rating,
      ratingCount,
      photos: [PHOTOS[index % PHOTOS.length]],
      description: fallbackDescription(name, category),
      address: "Demo route corridor",
      isHiddenGem: isHiddenGem(rating, ratingCount),
      detourDistance: formatDistance(detourMeters),
      estimatedTime: defaultVisitTime(category),
      provider: "google" as const,
      sourceIds: [`demo-${index + 1}`],
      rawCategories: [category],
      detourMeters,
      hiddenGemScore: hiddenGemScore(rating, ratingCount, category)
    };
  });

  return places satisfies PlaceCandidate[];
}

export function generateLayoverDemoPlaces(layovers: Array<LatLng & { location?: string }>) {
  return layovers.flatMap((layover, layoverIndex) =>
    [
      ["Station Night Cafe", "cafe", 4.4, 82, 0.002, 0.001],
      ["Early Bakery Counter", "bakery", 4.6, 45, -0.003, 0.002],
      ["Late Platform Bites", "food", 4.2, 68, 0.004, -0.002],
      ["Old Town Dawn View", "viewpoint", 4.7, 34, 0.018, 0.016]
    ].map(([name, category, rating, ratingCount, latOffset, lngOffset], index) => {
      const lat = layover.lat + Number(latOffset);
      const lng = layover.lng + Number(lngOffset);
      const detourMeters = distanceToRouteMeters({ lat, lng }, [layover]);
      const id = `demo-layover-${layoverIndex + 1}-${index + 1}`;
      return {
        id,
        name: `${layover.location ? `${layover.location} ` : ""}${name}`,
        lat,
        lng,
        category: String(category),
        rating: Number(rating),
        ratingCount: Number(ratingCount),
        photos: [PHOTOS[(layoverIndex + index) % PHOTOS.length]],
        description: fallbackDescription(String(name), String(category)),
        address: layover.location || "Layover area",
        isHiddenGem: isHiddenGem(Number(rating), Number(ratingCount)),
        detourDistance: formatDistance(detourMeters),
        estimatedTime: defaultVisitTime(String(category)),
        provider: "google" as const,
        sourceIds: [id],
        rawCategories: [String(category)],
        detourMeters,
        hiddenGemScore: hiddenGemScore(Number(rating), Number(ratingCount), String(category)),
        openingHoursData:
          index === 0 || index === 2
            ? {
                openNow: true,
                weekdayDescriptions: ["Open 24 hours"],
                periods: [
                  {
                    open: { day: 0, time: "0000" }
                  },
                  {
                    open: { day: 1, time: "0000" }
                  },
                  {
                    open: { day: 2, time: "0000" }
                  },
                  {
                    open: { day: 3, time: "0000" }
                  },
                  {
                    open: { day: 4, time: "0000" }
                  },
                  {
                    open: { day: 5, time: "0000" }
                  },
                  {
                    open: { day: 6, time: "0000" }
                  }
                ]
              }
            : undefined
      };
    })
  ) satisfies PlaceCandidate[];
}
