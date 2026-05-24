import type { NextApiRequest, NextApiResponse } from "next";
import { searchFoursquarePlaces } from "../../src/server/foursquare";
import { searchGooglePlaces } from "../../src/server/google";
import { haversineMeters } from "../../src/server/geo";
import type { LatLng, PlaceCandidate } from "../../src/server/types";

type LocationIntelligenceRequest = {
  latitude?: number;
  longitude?: number;
  radius?: number;
  categories?: string[];
};

type IntelligenceLocation = {
  id: string;
  name: string;
  type: "hidden_gem" | "photo_op" | "viewpoint" | "nature";
  coordinates: LatLng;
  distance: number;
  description: string;
  photo: string;
  rating: number;
  isOpen: boolean;
  category: string;
};

type LocationIntelligenceResponse = {
  locations: IntelligenceLocation[];
  userLocation: LatLng;
};

const DEMO_PHOTOS = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDO14rPiGqat7AjcxGLybdovNh4qdz6eCt9z3UUzODXNeu7QQ3vn4LSpNmVffTX6VQsyUnUeL_7DWvtFrP-AqnAnPGsWIEzBMedhz84LAIpqhd-QWO_YnOm1iv9RtHIo8bzT2bIfjk28R6MVD4JtR0Ui6ZmA8BsmK7Z-_pAlsv_o649fLeVJB35aN_83j8X1ipxln__NHYnzwAQhvGDLmE-N5MqYkiIduHyuUPxc_YT6Mg2vwJ1Sq6eubjDpeocNo1oSbi9KRgbC3M",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuD5jwyfJYwM7McWKEBMMvPpEXhOobxdgCp9DSYexx62nPHSlvoIe8a1-MWNfOHMX4i0ec-vCsT3CRX0dQPmCuAsdluNcMVfqPtzZ9tXS7lzBS4OKVMLuXtnqprzjrD7INtcz2jKBbLQIIu57OKOldUgY1KQzP0s21SN0nN4XLnzdp8XPdpDV35mMp_Kc4sZBBr8luUiBaWaM7Q6a31yXFYAVna64E3o5WJUj2IrCNzR5AwS1Ic-PZILuzvAaSkrWCxXVZlor6BcKkE",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAnvabVXfklf31kqDB4ZSiWbWwKjsmk34TohXv_RQHr3oSeYxF0ANZaZ0y9zkraizeHjzYJEtQRZO24Kf8v9lgQeHDqt_kO6AXvGnkiaBcD9U2suXvikUdIHprS9UiCEYUSpbSHfqQKNloHpBRWP92P1yFHbjjsHzCGs_QQVUqVEwcJaHFrOV55lbFAK7OZkwSGp_aqg4V3xHhB87cGauLNAP-D1QgSu774GXuyhK1Q3DJQ6_z2s5i2DJQeWtJUN0kT_vmI1DY20NA",
  "https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg?auto=compress&cs=tinysrgb&w=640"
];

const DEMO_LOCATIONS = [
  {
    id: "loc_1",
    name: "Obsidian Gorge",
    type: "hidden_gem" as const,
    offset: { lat: 0.0108, lng: -0.0176 },
    distance: 1200,
    description: "Rare geological formation with deep teal water veins.",
    rating: 4.8,
    category: "nature"
  },
  {
    id: "loc_2",
    name: "Twilight Crest",
    type: "photo_op" as const,
    offset: { lat: -0.0162, lng: 0.0282 },
    distance: 2800,
    description: "Perfect elevation for celestial long-exposure shots.",
    rating: 4.9,
    category: "viewpoint"
  },
  {
    id: "loc_3",
    name: "Moss Lantern Path",
    type: "nature" as const,
    offset: { lat: 0.0201, lng: 0.0123 },
    distance: 1900,
    description: "Quiet green trail with soft light and almost no crowds.",
    rating: 4.7,
    category: "nature"
  },
  {
    id: "loc_4",
    name: "Glasswater Overlook",
    type: "viewpoint" as const,
    offset: { lat: -0.0095, lng: -0.0262 },
    distance: 2400,
    description: "Wind-cut overlook with a wide cinematic view.",
    rating: 4.6,
    category: "viewpoint"
  }
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LocationIntelligenceResponse | { error: string }>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const input = req.body as LocationIntelligenceRequest;
  const latitude = Number(input.latitude);
  const longitude = Number(input.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return res.status(400).json({ error: "latitude must be between -90 and 90." });
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return res.status(400).json({ error: "longitude must be between -180 and 180." });
  }

  const userLocation = { lat: latitude, lng: longitude };
  const radiusKm = Math.min(Math.max(Number(input.radius || 5000) / 1000, 0.5), 10);
  const categories = new Set((input.categories || []).map((category) => category.toLowerCase()));

  try {
    const [google, foursquare] = await Promise.allSettled([
      searchGooglePlaces(userLocation, radiusKm),
      searchFoursquarePlaces(userLocation, radiusKm)
    ]);

    const providerPlaces = [
      ...(google.status === "fulfilled" ? google.value : []),
      ...(foursquare.status === "fulfilled" ? foursquare.value : [])
    ];

    const mapped = providerPlaces.map((place) => mapProviderPlace(place, userLocation));
    const filtered = mapped.filter((location) => !categories.size || categories.has(location.type) || categories.has(location.category));
    const locations = (filtered.length ? filtered : demoLocations(userLocation))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10);

    return res.status(200).json({ locations, userLocation });
  } catch {
    return res.status(200).json({
      locations: demoLocations(userLocation).slice(0, 10),
      userLocation
    });
  }
}

function mapProviderPlace(place: PlaceCandidate, userLocation: LatLng): IntelligenceLocation {
  const distance = Math.round(haversineMeters(userLocation, place));
  return {
    id: place.id,
    name: place.name,
    type: typeFromCategory(place.category, place.isHiddenGem),
    coordinates: { lat: place.lat, lng: place.lng },
    distance,
    description: place.description,
    photo: place.photos[0] || DEMO_PHOTOS[distance % DEMO_PHOTOS.length],
    rating: place.rating || 4.4,
    isOpen: place.isOpenAtArrival ?? true,
    category: place.category
  };
}

function demoLocations(userLocation: LatLng): IntelligenceLocation[] {
  return DEMO_LOCATIONS.map((location, index) => ({
    id: location.id,
    name: location.name,
    type: location.type,
    coordinates: {
      lat: Number((userLocation.lat + location.offset.lat).toFixed(6)),
      lng: Number((userLocation.lng + location.offset.lng).toFixed(6))
    },
    distance: location.distance,
    description: location.description,
    photo: DEMO_PHOTOS[index % DEMO_PHOTOS.length],
    rating: location.rating,
    isOpen: true,
    category: location.category
  }));
}

function typeFromCategory(category: string, hiddenGem: boolean): IntelligenceLocation["type"] {
  if (hiddenGem || category === "hidden" || category === "garden") return "hidden_gem";
  if (category === "photo-op") return "photo_op";
  if (category === "viewpoint") return "viewpoint";
  return "nature";
}
