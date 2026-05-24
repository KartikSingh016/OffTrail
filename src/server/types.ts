export type LatLng = {
  lat: number;
  lng: number;
};

export type LayoverInput = LatLng & {
  location?: string;
  coordinates?: LatLng;
  timeAvailable?: number;
  arrivalTime?: string;
  departureTime?: string;
  maxDistance?: number;
  timeOfDay?: TimeOfDay;
};

export type DiscoverRequest = {
  origin?: string;
  destination?: string;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  departureTime?: string;
  layovers?: LayoverInput[];
  radius?: number;
  filters?: string[];
};

export type TimeOfDay = "early-morning" | "morning" | "afternoon" | "evening" | "night";

export type OpeningPeriod = {
  open: {
    day: number;
    time: string;
  };
  close?: {
    day: number;
    time: string;
  };
};

export type OpeningHours = {
  openNow?: boolean;
  periods?: OpeningPeriod[];
  weekdayDescriptions?: string[];
};

export type RouteSegment = {
  from: string;
  to: string;
  departure: string;
  arrival: string;
  duration: string;
  durationSeconds: number;
};

export type RouteSummary = {
  path: [number, number][];
  distance: string;
  duration: string;
  distanceMeters: number;
  durationSeconds: number;
  segments?: RouteSegment[];
  departureTime?: string;
  arrivalTime?: string;
};

export type LocationResult = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  rating: number;
  ratingCount: number;
  photos: string[];
  description: string;
  address: string;
  isHiddenGem: boolean;
  detourDistance: string;
  estimatedTime: number;
  photo?: string;
  isOpenAtArrival?: boolean;
  is24Hours?: boolean;
  openingHours?: string;
  todaysHours?: string;
  opensAt?: string;
  closesAt?: string;
  nextOpenTime?: string;
  arrivalTime?: string;
  arrivalTimeLabel?: string;
  timeOfDay?: TimeOfDay;
  fitsInLayover?: boolean;
  layoverWindow?: string;
  layoverName?: string;
  distanceFromStation?: number;
  distanceFromStationLabel?: string;
  walkingTime?: number;
  safeForNighttime?: boolean;
};

export type PlaceCandidate = LocationResult & {
  provider: "google" | "foursquare";
  sourceIds: string[];
  rawCategories: string[];
  detourMeters: number;
  hiddenGemScore: number;
  openingHoursData?: OpeningHours;
};

export type DiscoverResponse = {
  route: RouteSummary;
  locations: LocationResult[];
  total: number;
};

export type LocationEnhancement = {
  id: string;
  description?: string;
  category?: string;
  estimatedTime?: number;
};
