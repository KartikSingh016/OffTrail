import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Camera, Compass, Gem, Loader2, MapPin, Navigation, Star } from "lucide-react";

const MAP_BACKGROUND = "/assets/map-preview.webp";

const EMPTY_COORDINATES = { lat: 0, lng: 0 };

const PIN_POSITIONS = [
  { x: 31, y: 39 },
  { x: 66, y: 61 },
  { x: 43, y: 27 },
  { x: 72, y: 36 },
  { x: 26, y: 63 },
  { x: 58, y: 30 },
  { x: 39, y: 72 },
  { x: 76, y: 54 },
  { x: 20, y: 48 },
  { x: 52, y: 79 }
];

const STAGES = {
  idle: 0,
  radar: 1,
  pins: 2,
  lines: 3,
  interactive: 4
};

export default function ExploreAroundYou({ onClose, notify }) {
  const [stage, setStage] = useState("idle");
  const [locations, setLocations] = useState([]);
  const [userLocation, setUserLocation] = useState(EMPTY_COORDINATES);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Getting your location...");
  const [sheetHeight, setSheetHeight] = useState(60);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const frameRef = useRef(null);
  const touchStartRef = useRef(0);
  const cardRefs = useRef({});

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setStage("radar"), 100),
      window.setTimeout(() => setStage("pins"), 800),
      window.setTimeout(() => setStage("lines"), 1500),
      window.setTimeout(() => setStage("interactive"), 2200)
    ];

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadLocations() {
      try {
        const coordinates = await getUserCoordinates();
        if (cancelled) return;
        setUserLocation(coordinates);
        setStatus("Scanning nearby hidden gems...");

        const response = await fetch("/api/location-intelligence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latitude: coordinates.lat,
            longitude: coordinates.lng,
            radius: 5000,
            categories: ["hidden_gem", "photo_op", "viewpoint", "nature"]
          })
        });

        if (!response.ok) throw new Error("Location intelligence request failed");
        const data = await response.json();
        if (cancelled) return;

        const nextLocations = Array.isArray(data.locations) ? data.locations : [];
        setLocations(nextLocations.slice(0, 10).map(normalizeLocation).filter(Boolean));
        if (data.userLocation) setUserLocation(data.userLocation);
        setStatus(nextLocations.length ? "Nearby discoveries ready" : data.message || "No real nearby places found");
      } catch (error) {
        if (cancelled) return;
        setLocations([]);
        setStatus("Location permission is required to run a real nearby scan.");
        notify?.("Location permission is required. Open Nearby and enter a city if you prefer.", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadLocations();

    return () => {
      cancelled = true;
    };
  }, [notify]);

  const pins = useMemo(
    () =>
      locations.slice(0, 10).map((location, index) => ({
        ...location,
        position: PIN_POSITIONS[index % PIN_POSITIONS.length]
      })),
    [locations]
  );

  function handleMouseMove(event) {
    if (frameRef.current) return;
    const pointerX = event.clientX;
    const pointerY = event.clientY;
    frameRef.current = window.requestAnimationFrame(() => {
      const amount = 20;
      const x = (pointerX / window.innerWidth - 0.5) * amount;
      const y = (pointerY / window.innerHeight - 0.5) * amount;
      setParallax({ x, y });
      frameRef.current = null;
    });
  }

  function setActiveLocation(locationId, shouldScroll = false) {
    setActiveId(locationId);
    if (shouldScroll) {
      cardRefs.current[locationId]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function handleKeyDown(event, locationId) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    setActiveLocation(locationId, true);
  }

  function handleTouchStart(event) {
    touchStartRef.current = event.touches[0].clientY;
  }

  function handleTouchMove(event) {
    const startY = touchStartRef.current;
    if (!startY) return;
    const diff = startY - event.touches[0].clientY;
    const nextHeight = Math.max(34, Math.min(88, 60 + (diff / window.innerHeight) * 100));
    setSheetHeight(nextHeight);
  }

  function handleTouchEnd() {
    setSheetHeight((height) => (height < 48 ? 38 : 60));
    touchStartRef.current = 0;
  }

  const stageValue = STAGES[stage];
  const showPins = stageValue >= STAGES.pins;
  const showLines = stageValue >= STAGES.lines;
  const interactive = stageValue >= STAGES.interactive;

  return (
    <section className="rtli-overlay" onMouseMove={handleMouseMove} aria-label="Explore Around You radar">
      <div className="rtli-map-background" aria-hidden="true">
        <img
          id="map-bg"
          src={MAP_BACKGROUND}
          alt=""
          style={{ transform: `scale(1.06) translate(${parallax.x}px, ${parallax.y}px)` }}
        />
        <div className="rtli-map-vignette" />
      </div>

      <button className="rtli-back glass-surface" type="button" onClick={onClose} aria-label="Back to OffTrail">
        <ArrowLeft size={21} />
      </button>

      <div className="rtli-title glass-surface">
        <p>Explore Around You</p>
        <h2>Real-time location intelligence</h2>
        <span>{status}</span>
      </div>

      <svg className="rtli-connection-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {showLines &&
          pins.map((pin, index) => (
            <path
              key={pin.id}
              id={`rtli-line-${pin.id}`}
              className={`rtli-line ${activeId === pin.id ? "is-active" : ""}`}
              d={linePath(pin.position)}
              stroke={pinColor(pin.type)}
              style={{ animationDelay: `${index * 150}ms` }}
            />
          ))}
      </svg>

      <div className="rtli-user-location" aria-label={userLocation.lat || userLocation.lng ? `Your location ${userLocation.lat}, ${userLocation.lng}` : "Waiting for your location"}>
        <div className="rtli-user-stack">
          {stageValue >= STAGES.radar && <span className="rtli-radar-wave" />}
          <span className="rtli-user-pulse" />
          <span className="rtli-user-dot" />
        </div>
      </div>

      {pins.map((pin, index) => (
        <button
          key={pin.id}
          id={`rtli-pin-${pin.id}`}
          className={`rtli-pin rtli-pin-${pin.type} ${showPins ? "is-visible" : ""} ${
            activeId === pin.id ? "is-active" : ""
          }`}
          type="button"
          style={{ left: `${pin.position.x}%`, top: `${pin.position.y}%`, animationDelay: `${index * 200}ms` }}
          onMouseEnter={() => setActiveLocation(pin.id)}
          onMouseLeave={() => setActiveId(null)}
          onFocus={() => setActiveLocation(pin.id)}
          onBlur={() => setActiveId(null)}
          onClick={() => setActiveLocation(pin.id, true)}
          onKeyDown={(event) => handleKeyDown(event, pin.id)}
          aria-label={`${pin.name}, ${formatDistance(pin.distance)} away`}
        >
          <PinIcon type={pin.type} />
        </button>
      ))}

      <aside
        className={`rtli-bottom-sheet glass-surface-strong ${interactive ? "is-open" : ""}`}
        style={{ "--sheet-height": `${sheetHeight}vh` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="rtli-sheet-handle" aria-hidden="true" />
        <div className="rtli-sheet-heading">
          <div>
            <p>Nearby scan</p>
            <h3>{loading ? "Mapping discoveries..." : `${pins.length} gems around you`}</h3>
          </div>
          {loading && <Loader2 className="rtli-loader" size={22} />}
        </div>
        <div className="rtli-location-cards">
          {!loading && !pins.length && (
            <p className="rtli-empty">No verified nearby places are shown until OffTrail has a real location and a successful scan.</p>
          )}
          {pins.map((location) => (
            <button
              ref={(node) => {
                if (node) cardRefs.current[location.id] = node;
              }}
              key={location.id}
              className={`rtli-location-card glass-surface ${activeId === location.id ? "is-active" : ""}`}
              type="button"
              onMouseEnter={() => setActiveLocation(location.id)}
              onMouseLeave={() => setActiveId(null)}
              onFocus={() => setActiveLocation(location.id)}
              onBlur={() => setActiveId(null)}
              onClick={() => setActiveLocation(location.id)}
            >
              <img src={location.photo} alt="" loading="lazy" onError={(event) => handleImageFallback(event, location)} />
              <span className={`rtli-card-icon rtli-card-icon-${location.type}`}>
                <PinIcon type={location.type} />
              </span>
              <span className="rtli-card-content">
                <span className="rtli-card-topline">
                  <strong>{location.name}</strong>
                  <span>{labelForType(location.type)}</span>
                </span>
                <span className="rtli-card-description">{location.description}</span>
                <span className="rtli-card-meta">
                  <MapPin size={14} />
                  {formatDistance(location.distance)}
                  <Star size={14} />
                  {Number(location.rating || 0) > 0 ? Number(location.rating).toFixed(1) : "Unrated"}
                  <span className={location.isOpen ? "is-open" : "is-closed"}>
                    {location.isOpen ? "Open now" : "Closed"}
                  </span>
                </span>
              </span>
            </button>
          ))}
        </div>
      </aside>
    </section>
  );
}

function getUserCoordinates() {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.reject(new Error("Location access is unavailable."));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6))
        }),
      (error) => {
        if (error?.code === 1) reject(new Error("Location access is off. Enter a city in Nearby mode."));
        else if (error?.code === 2) reject(new Error("Location is unavailable. Enter a city in Nearby mode."));
        else reject(new Error("Location request timed out. Enter a city in Nearby mode."));
      },
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 1800 }
    );
  });
}

function normalizeLocation(location) {
  const coordinates = location.coordinates || { lat: location.lat, lng: location.lng };
  if (!location.id || !location.name || !Number.isFinite(coordinates?.lat) || !Number.isFinite(coordinates?.lng)) {
    return null;
  }
  const distance = Number(location.distance || 0);
  const photo = firstRealPhoto([location.photo, ...(location.photos || [])]) || osmMapPreview(coordinates);
  return {
    id: location.id,
    name: location.name,
    type: location.type || (location.category === "photo-op" ? "photo_op" : "nature"),
    coordinates,
    distance,
    description: location.description || "Verified map result near this scan area.",
    photo,
    rating: Number(location.rating || 0),
    isOpen: Boolean(location.isOpen),
    category: location.category || "nearby"
  };
}

function firstRealPhoto(photos) {
  return photos.find((photo) => typeof photo === "string" && /^https?:\/\//i.test(photo));
}

function osmMapPreview(point) {
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${point.lat},${point.lng}&zoom=15&size=640x360&markers=${point.lat},${point.lng},red-pushpin`;
}

function handleImageFallback(event, location) {
  const img = event.currentTarget;
  if (!img.dataset.fallbackStage) {
    img.dataset.fallbackStage = "map";
    img.src = osmMapPreview(location.coordinates);
    return;
  }
  img.src = placeholderImage(location.name || "Nearby place");
}

function placeholderImage(title) {
  const safeTitle = String(title).slice(0, 42).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
      <rect width="640" height="360" fill="#0d0e0e"/>
      <circle cx="432" cy="132" r="120" fill="#7cd5d5" opacity="0.16"/>
      <path d="M0 260 C120 210 210 235 320 178 S505 92 640 124" stroke="#b4cbc6" stroke-width="4" fill="none"/>
      <text x="44" y="260" fill="#e3e2e1" font-family="Hanken Grotesk, Arial, sans-serif" font-size="24" font-weight="700">${safeTitle}</text>
      <text x="44" y="294" fill="#c2c8c5" font-family="Hanken Grotesk, Arial, sans-serif" font-size="13" letter-spacing="3">NO PROVIDER PHOTO</text>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function linePath(position) {
  const midX = (50 + position.x) / 2;
  const midY = Math.min(82, Math.max(18, (50 + position.y) / 2 - 14));
  return `M 50 50 Q ${midX} ${midY} ${position.x} ${position.y}`;
}

function pinColor(type) {
  if (type === "photo_op") return "#4cd7f6";
  if (type === "viewpoint") return "#adc6ff";
  return "#ddb7ff";
}

function labelForType(type) {
  if (type === "photo_op") return "Photo op";
  if (type === "viewpoint") return "Viewpoint";
  if (type === "nature") return "Nature";
  return "Hidden gem";
}

function formatDistance(distance) {
  const meters = Number(distance || 0);
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km away`;
  return `${Math.round(meters)}m away`;
}

function PinIcon({ type }) {
  if (type === "photo_op") return <Camera size={17} />;
  if (type === "viewpoint") return <Navigation size={17} />;
  if (type === "nature") return <Compass size={17} />;
  return <Gem size={17} />;
}
