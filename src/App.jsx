import React, { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  CalendarDays,
  Camera,
  Check,
  CheckCircle,
  ChevronDown,
  Clock,
  Compass,
  Download,
  ExternalLink,
  Gem,
  Heart,
  History,
  Instagram,
  Linkedin,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Navigation,
  Plus,
  Route,
  Search,
  Settings,
  Share2,
  Snowflake,
  Star,
  Sun,
  Timer,
  Trash2,
  Twitter,
  User,
  XCircle
} from "lucide-react";
import RouteGlobeLoader from "../components/RouteGlobeLoader.jsx";

const videoUrl =
  "https://cdn.pixabay.com/video/2024/03/25/205589-927335742_large.mp4";

/* Aerial alpine footage for the homepage hero (Pixabay Content License,
   free for commercial use, no attribution required). */
const heroVideoUrl = "https://cdn.pixabay.com/video/2020/09/27/50986-463810594_large.mp4";
const heroVideoWinterUrl = "https://cdn.pixabay.com/video/2022/11/22/140025-774012768_large.mp4";

const thumbnailUrl = offTrailPlaceholderImage("Verified map source", "No provider photo available");

const paidMapPreviewsEnabled = process.env.NEXT_PUBLIC_OFFTRAIL_ENABLE_PAID_MAP_PREVIEWS === "true";
const publicGoogleMapsApiKey = paidMapPreviewsEnabled ? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "" : "";

const galleryPhotoLabels = [
  ["Golden Hour Viewpoint", "Best at sunset"],
  ["Coastal Cliffs", "Verified photo spot"],
  ["Alpine Reflection", "Still-water lake"],
  ["Old Town Streets", "Golden-hour alley"]
];

const wildernessMockPlaces = [];

const preferenceOptions = [
  { key: "nature", label: "Nature Spots" },
  { key: "photo-op", label: "Photo Locations" },
  { key: "food", label: "Cafes & Food" },
  { key: "culture", label: "Historical Sites" },
  { key: "viewpoint", label: "Viewpoints" },
  { key: "garden", label: "Hidden Gardens" },
  { key: "hidden", label: "Hidden Gems" },
  { key: "local", label: "Local Favorites" }
];

const heroVibeOptions = [
  { key: "viewpoint", label: "Cinematic views" },
  { key: "nature", label: "Nature escape" },
  { key: "food", label: "Food stops" },
  { key: "culture", label: "Historical places" },
  { key: "budget", label: "Student budget" },
  { key: "night", label: "Night walk" },
  { key: "hidden", label: "Hidden local spots" },
  { key: "rain", label: "Rainy day" }
];

const detourOptions = [
  { label: "15 min", radius: 2 },
  { label: "30 min", radius: 5 },
  { label: "1 hour", radius: 8 },
  { label: "Half day", radius: 10 }
];

const routePersonalityOptions = [
  "Fastest",
  "Scenic",
  "Hidden gems",
  "Food route",
  "Night-safe",
  "Student budget",
  "Cinematic"
];

const layoverTransitMinutes = {
  Walking: 15,
  "Public transport": 20,
  "Taxi/rideshare": 10
};

const layoverReturnBufferMinutes = 15;

function normalizeLocationInput(value = "") {
  return String(value).trim().toLowerCase().replace(/\s+/g, " ");
}

function isSameLocationInput(origin = "", destination = "") {
  const normalizedOrigin = normalizeLocationInput(origin);
  const normalizedDestination = normalizeLocationInput(destination);
  return Boolean(normalizedOrigin && normalizedDestination && normalizedOrigin === normalizedDestination);
}

function viewHref(view) {
  return view === "home" ? "/" : `/?view=${encodeURIComponent(view)}`;
}

function handleViewNavigation(event, navigateTo, view) {
  event.preventDefault();
  navigateTo(view);
}

const previewStops = [
  {
    name: "Riverside Viewpoint",
    meta: "12 min from route",
    reason: "Best for sunset photos",
    source: "Verified by Google Maps / OSM",
    status: "Open hours available when provider returns data"
  },
  {
    name: "Quiet Local Cafe",
    meta: "+18 min detour",
    reason: "Food stop with easy return access",
    source: "Provider source shown on every result",
    status: "Open now or clearly marked unknown"
  },
  {
    name: "Small Heritage Garden",
    meta: "+9 min detour",
    reason: "Nature escape close to the route",
    source: "No source means no verified card",
    status: "Confidence label included"
  }
];

const pageContent = {
  how: {
    title: "How It Works",
    subtitle: "OffTrail samples your route, searches verified map providers, labels source confidence, and lets you save the stops you trust.",
    cards: ["Enter a route", "Pick your travel vibe", "Discover verified stops", "Save or share gems"]
  }
};

const modalUrlMap = {
  hidden: "hidden-spots",
  photo: "photo-locations",
  local: "local-favorites",
  auth: "auth"
};

const modalFromUrlMap = Object.fromEntries(Object.entries(modalUrlMap).map(([key, value]) => [value, key]));

const AppContext = createContext(null);

function useOffTrail() {
  return useContext(AppContext);
}

function App({ initialView = null, initialContentPage = null, initialModal = null, initialMenuOpen = false }) {
  return (
    <OffTrailProvider initialView={initialView} initialContentPage={initialContentPage} initialModal={initialModal} initialMenuOpen={initialMenuOpen}>
      <OffTrailApp />
    </OffTrailProvider>
  );
}

function OffTrailProvider({ children, initialView = null, initialContentPage = null, initialModal = null, initialMenuOpen = false }) {
  const [view, setView] = useState(initialContentPage ? "content" : initialView || "home");
  const [contentPage, setContentPage] = useState(initialContentPage || "how");
  const [modal, setModal] = useState(initialModal);
  const [menuOpen, setMenuOpen] = useState(Boolean(initialMenuOpen));
  const [accountOpen, setAccountOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [navigationStack, setNavigationStack] = useState([]);
  const [auth, setAuth] = useState({ user: null, isAuthenticated: false });
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [journeyCountry, setJourneyCountry] = useState(null);
  const [season, setSeasonState] = useState("summer");
  const navigationStackRef = useRef([]);
  const toastTimerRef = useRef(null);
  const [routeState, setRouteState] = useState({
    origin: null,
    destination: null,
    layovers: [],
    preferences: ["nature", "photo-op", "hidden"],
    radius: 5,
    departureTime: "",
    results: null,
    selectedLocationIds: []
  });

  useEffect(() => {
    navigationStackRef.current = navigationStack;
  }, [navigationStack]);

  useEffect(() => {
    const storedAuth = readStorage("offtrail-auth", null);
    const storedRoutes = readStorage("offtrail-routes", []);
    const storedFavorites = readStorage("offtrail-favorites", []);
    const storedRouteState = readStorage("offtrail-route-state", null);
    const storedSeason = readStorage("offtrail-season", "summer");
    const urlState = parseUrlState();
    if (storedAuth?.user) setAuth({ user: storedAuth.user, isAuthenticated: true });
    setSavedRoutes(storedRoutes);
    setFavorites(storedFavorites);
    setSeasonState(storedSeason === "winter" ? "winter" : "summer");
    if (storedRouteState) setRouteState((state) => ({ ...state, ...storedRouteState }));
    if (urlState.modal) setModal(urlState.modal);
    if (urlState.menuOpen) setMenuOpen(true);
    if (urlState.contentPage) {
      setContentPage(urlState.contentPage);
      setView("content");
    } else if (urlState.view) {
      setView(urlState.view);
    }
  }, []);

  useEffect(() => {
    function handlePopState() {
      closeOverlay({ fromPopState: true });
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key !== "Escape" || (!modal && !menuOpen)) return;
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      closeOverlay();
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [modal, menuOpen]);

  useEffect(() => {
    document.body.classList.toggle("modal-open", Boolean(modal || menuOpen));
    return () => document.body.classList.remove("modal-open");
  }, [modal, menuOpen]);

  useEffect(() => {
    writeStorage("offtrail-routes", savedRoutes);
  }, [savedRoutes]);

  useEffect(() => {
    writeStorage("offtrail-favorites", favorites);
  }, [favorites]);

  useEffect(() => {
    writeStorage("offtrail-route-state", routeState);
  }, [routeState]);

  useEffect(() => {
    writeStorage("offtrail-season", season);
    document.documentElement.dataset.season = season;
  }, [season]);

  function getSnapshot(overrides = {}) {
    return {
      view,
      contentPage,
      modal,
      menuOpen,
      ...overrides
    };
  }

  function applySnapshot(snapshot, options = {}) {
    const nextSnapshot = {
      view: snapshot.view || "home",
      contentPage: snapshot.contentPage || "how",
      modal: snapshot.modal || null,
      menuOpen: Boolean(snapshot.menuOpen)
    };
    setView(nextSnapshot.view);
    setContentPage(nextSnapshot.contentPage);
    setModal(nextSnapshot.modal);
    setMenuOpen(nextSnapshot.menuOpen);
    setAccountOpen(false);
    if (!options.skipUrl) syncUrl(nextSnapshot, "replace");
  }

  function pushNavigation(nextSnapshot) {
    const previous = getSnapshot();
    const nextStack = [...navigationStackRef.current, previous];
    navigationStackRef.current = nextStack;
    setNavigationStack(nextStack);
    applySnapshot(nextSnapshot, { skipUrl: true });
    syncUrl(nextSnapshot, "push");
  }

  function openModal(nextModal) {
    if (!nextModal) {
      closeOverlay();
      return;
    }
    const nextSnapshot = getSnapshot({ modal: nextModal, menuOpen: false });
    pushNavigation(nextSnapshot);
  }

  function openMenu() {
    pushNavigation(getSnapshot({ modal: null, menuOpen: true }));
  }

  function closeOverlay(options = {}) {
    const stack = navigationStackRef.current;
    const fallback = getSnapshot({ modal: null, menuOpen: false });
    const previous = stack.at(-1) || fallback;
    navigationStackRef.current = stack.slice(0, -1);
    setNavigationStack(stack.slice(0, -1));
    applySnapshot(previous, { skipUrl: options.fromPopState });
  }

  function dismissOverlay() {
    const nextSnapshot = getSnapshot({ modal: null, menuOpen: false });
    navigationStackRef.current = [];
    setNavigationStack([]);
    applySnapshot(nextSnapshot);
  }

  function notify(message, tone = "success", retryAction = null) {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast({ message, tone, retryAction });
    toastTimerRef.current = window.setTimeout(() => setToast(null), tone === "error" ? 6000 : 3200);
  }

  function openPlanner(preferences) {
    if (preferences?.length) {
      setRouteState((state) => ({
        ...state,
        preferences: Array.from(new Set([...state.preferences, ...preferences]))
      }));
    }
    navigateTo("routeDiscovery");
  }

  function openContent(page) {
    const nextSnapshot = getSnapshot({
      view: "content",
      contentPage: page,
      modal: null,
      menuOpen: false
    });
    pushNavigation(nextSnapshot);
  }

  function navigateTo(nextView, nextContentPage = contentPage) {
    const nextSnapshot = getSnapshot({
      view: nextView,
      contentPage: nextContentPage,
      modal: null,
      menuOpen: false
    });
    navigationStackRef.current = [];
    setNavigationStack([]);
    applySnapshot(nextSnapshot, { skipUrl: true });
    syncUrl(nextSnapshot, "push");
  }

  function signIn(user) {
    const nextUser = { ...user, token: user.token || `local-session-${Date.now()}` };
    setAuth({ user: nextUser, isAuthenticated: true });
    writeStorage("offtrail-auth", { user: nextUser });
    dismissOverlay();
    notify(`Welcome, ${nextUser.name || nextUser.email}!`);
  }

  function signOut() {
    setAuth({ user: null, isAuthenticated: false });
    removeStorage("offtrail-auth");
    setAccountOpen(false);
    notify("Signed out.");
  }

  const value = {
    view,
    setView,
    contentPage,
    setContentPage,
    modal,
    setModal: openModal,
    closeOverlay,
    dismissOverlay,
    menuOpen,
    setMenuOpen: (nextOpen) => (nextOpen ? openMenu() : closeOverlay()),
    accountOpen,
    setAccountOpen,
    toast,
    auth,
    signIn,
    signOut,
    savedRoutes,
    setSavedRoutes,
    selectedRouteId,
    setSelectedRouteId,
    journeyCountry,
    setJourneyCountry,
    season,
    setSeason: (nextSeason) => setSeasonState(nextSeason === "winter" ? "winter" : "summer"),
    favorites,
    setFavorites,
    routeState,
    setRouteState,
    notify,
    openPlanner,
    openContent,
    navigateTo
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function OffTrailApp() {
  const { view, modal, toast, closeOverlay, notify } = useOffTrail();
  const usesFoundationShell = view === "home" || view === "routeDiscovery" || view === "nearby" || view === "layover" || view === "countryJourney" || view === "results" || view === "favorites";

  return (
    <main className={`app-shell ${usesFoundationShell ? "uses-foundation-shell" : ""}`}>
      {!usesFoundationShell && (
        <>
          <video className="background-video" src={videoUrl} autoPlay loop muted playsInline poster={thumbnailUrl} aria-hidden="true" />
          <div className="video-shade" aria-hidden="true" />
        </>
      )}
      {view === "home" && <LandingPage />}
      {view === "routeDiscovery" && <JourneyRouteDiscoveryPage />}
      {view === "nearby" && <ExploreAroundYouPage />}
      {view === "layover" && <LayoverPage />}
      {view === "countryJourney" && <CountryJourneyPage />}
      {view === "results" && <ResultsPage />}
      {view === "itinerary" && <ItineraryPage />}
      {view === "content" && <ContentPage />}
      {view === "dashboard" && <DashboardPage />}
      {view === "favorites" && <FavoritesPage />}
      {view === "profile" && <ProfilePage />}
      {view === "routeDetail" && <RouteDetailPage />}
      <SlideMenu />
      {modal === "hidden" && <HiddenSpotsModal />}
      {modal === "photo" && <PhotoModal />}
      {modal === "local" && <LocalFavoritesModal />}
      {modal === "auth" && <AuthModal />}
      {toast && <Toast {...toast} />}
    </main>
  );
}

function LandingPage() {
  const { navigateTo, setMenuOpen, setAccountOpen, accountOpen, auth, setModal, setRouteState, notify, openContent, setJourneyCountry, season } = useOffTrail();
  const plannerRef = useRef(null);
  const fromInputRef = useRef(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [originCoords, setOriginCoords] = useState(null);
  const [originIsGeolocated, setOriginIsGeolocated] = useState(false);
  const [locatingOrigin, setLocatingOrigin] = useState(false);
  const [detourValue, setDetourValue] = useState(1);
  const [departureTime, setDepartureTime] = useState(toDatetimeLocal(new Date(Date.now() + 86400000)));
  const [vibe, setVibe] = useState(heroVibeOptions[0].key);
  const [routeStyle, setRouteStyle] = useState("Hidden gems");
  const [submitted, setSubmitted] = useState(false);

  const selectedDetour = detourOptions[Math.round(detourValue)] || detourOptions[1];
  const selectedVibe = heroVibeOptions.find((option) => option.key === vibe) || heroVibeOptions[0];
  const fromError = submitted && !from.trim() ? "Enter a starting point." : "";
  const toError = submitted && !to.trim() ? "Enter a destination." : "";
  const sameRouteError = submitted && isSameLocationInput(from, to) ? "Starting point and destination must be different." : "";

  async function useMyLocation() {
    setLocatingOrigin(true);
    try {
      const position = await getBrowserPosition();
      const name = await resolveCurrentLocationName(position);
      setOriginCoords(position);
      setOriginIsGeolocated(true);
      setFrom(name);
      notify("Location access enabled.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Location access is unavailable. Enter a city manually.";
      notify(message, "error");
    } finally {
      setLocatingOrigin(false);
    }
  }

  function focusPlanner() {
    plannerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => fromInputRef.current?.focus(), 260);
  }

  function quickDestination(countryKey) {
    setJourneyCountry(countryKey);
    navigateTo("countryJourney");
  }

  function handleFromChange(nextValue) {
    if (originIsGeolocated && nextValue !== from) {
      setOriginCoords(null);
      setOriginIsGeolocated(false);
    }
    setFrom(nextValue);
  }

  function planRoute(event) {
    event?.preventDefault();
    setSubmitted(true);
    if (!from.trim() || !to.trim()) {
      notify("Add both a starting point and destination first.", "error");
      return;
    }
    if (isSameLocationInput(from, to)) {
      notify("Starting point and destination must be different.", "error");
      return;
    }
    setRouteState((state) => ({
      ...state,
      origin: { label: from.trim(), name: from.trim(), lat: originCoords?.lat, lng: originCoords?.lng },
      destination: { label: to.trim(), name: to.trim() },
      layovers: [],
      preferences: Array.from(new Set([vibe, "hidden"])),
      radius: selectedDetour.radius,
      travelMode: "Train",
      routeStyle,
      departureTime,
      results: null,
      selectedLocationIds: [],
      discoveryError: null,
      autoSearch: true
    }));
    navigateTo("routeDiscovery");
  }

  function trySampleRoute() {
    const sample = createSampleRouteResults();
    setRouteState({
      origin: { label: "Bonn, Germany", name: "Bonn, Germany", lat: 50.7374, lng: 7.0982 },
      destination: { label: "Cologne, Germany", name: "Cologne, Germany", lat: 50.9375, lng: 6.9603 },
      layovers: [],
      preferences: ["viewpoint", "food", "hidden"],
      radius: 5,
      travelMode: "Train",
      routeStyle: "Cinematic",
      departureTime: toDatetimeLocal(new Date(Date.now() + 60 * 60 * 1000)),
      results: sample,
      selectedLocationIds: sample.locations.slice(0, 3).map((location) => location.id),
      discoveryError: null,
      sampleMode: true
    });
    notify("Sample route loaded. Sample cards are clearly labeled as previews.", "info");
    navigateTo("routeDiscovery");
  }

  const quickDestinations = [
    ["Switzerland", "Alpine passes and glacier lakes", "switzerland", "https://cdn.pixabay.com/photo/2019/10/08/18/13/matterhorn-4535693_1280.jpg", "https://cdn.pixabay.com/photo/2017/11/28/22/31/matterhorn-2984844_1280.jpg"],
    ["Norway", "Fjords, cliffs, and coastal roads", "norway", "https://cdn.pixabay.com/photo/2024/02/24/10/31/norway-8593725_1280.jpg", "https://cdn.pixabay.com/photo/2017/03/09/13/11/norway-2129635_1280.jpg"],
    ["Spain", "Sun-baked coastlines and hill towns", "spain", "https://cdn.pixabay.com/photo/2023/10/06/07/59/coast-8297680_1280.jpg", "https://cdn.pixabay.com/photo/2022/10/25/15/58/pyrenees-7546301_1280.jpg"],
    ["Italy", "Coastal cliffs and Renaissance cities", "italy", "https://cdn.pixabay.com/photo/2017/04/19/10/47/amalfi-2241861_1280.jpg", "https://cdn.pixabay.com/photo/2017/06/28/15/32/dolomites-2451044_1280.jpg"],
    ["France", "Iron towers and lavender hills", "france", "https://cdn.pixabay.com/photo/2018/04/25/09/26/eiffel-tower-3349075_1280.jpg", "https://cdn.pixabay.com/photo/2025/11/04/15/22/chamonix-9936660_1280.jpg"]
  ];

  return (
    <section className="stitch-v2-page sd-landing" aria-label="OffTrail intelligent route discovery">
      <TopAppBar active="explore" />

      <main className="sd-main">
        <section className="sd-hero">
          <video key={season} className="sd-hero-video" src={season === "winter" ? heroVideoWinterUrl : heroVideoUrl} autoPlay loop muted playsInline aria-hidden="true" />
          <div className="sd-hero-scrim" aria-hidden="true" />
          <div className="sd-hero-copy">
            <h1>Discover the Untamed.</h1>
            <p>Curated, off-grid expeditions for the elevated explorer. Plan a real route and OffTrail surfaces map-verified stops along the way.</p>
          </div>
        </section>

        <section className="sd-planner-wrap">
          <form className="stitch-v2-planner-card sd-planner-card" ref={plannerRef} onSubmit={planRoute} noValidate>
            <h2 className="sd-planner-title">Route Architect</h2>
            <div className="stitch-v2-place-grid">
              <PlaceInput
                label="Origin"
                value={from}
                onChange={handleFromChange}
                placeholder="Enter a starting point"
                error={fromError}
                inputRef={fromInputRef}
                onUseLocation={useMyLocation}
                locating={locatingOrigin}
              />
              <PlaceInput label="Destination" value={to} onChange={setTo} placeholder="Where to?" error={toError} />
            </div>
            {sameRouteError && <p className="stitch-v2-form-error" role="alert">{sameRouteError}</p>}

            <div className="sd-field-block">
              <span className="sd-field-label">Travel Date &amp; Time</span>
              <input
                className="sd-datetime"
                type="datetime-local"
                value={departureTime}
                onChange={(event) => setDepartureTime(event.target.value)}
                aria-label="Travel date and time"
              />
            </div>

            <div className="sd-field-block">
              <div className="sd-slider-head">
                <span className="sd-field-label">Detour Tolerance</span>
                <span className="sd-slider-value">{selectedDetour.label}</span>
              </div>
              <input
                className="sd-range"
                type="range"
                min="0"
                max={detourOptions.length - 1}
                step="0.01"
                value={detourValue}
                onChange={(event) => setDetourValue(Number(event.target.value))}
                style={{ "--fill": `${(detourValue / (detourOptions.length - 1)) * 100}%` }}
                aria-label="Detour tolerance"
              />
            </div>

            <div className="sd-field-block">
              <span className="sd-field-label">Travel Vibe</span>
              <div className="sd-pill-row" role="group" aria-label="Travel vibe">
                {heroVibeOptions.map(({ key, label }) => (
                  <button key={key} type="button" className={vibe === key ? "is-active" : ""} aria-pressed={vibe === key} onClick={() => setVibe(key)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <button className="sd-submit-btn" type="submit">Plan My Route</button>
          </form>
        </section>

        <section className="sd-gems">
          <div className="sd-gems-head">
            <div>
              <h3>Recommended</h3>
              <p>Hidden highlights along potential routes.</p>
            </div>
            <button type="button" className="sd-view-all" onClick={() => navigateTo("nearby")}>
              View All <ArrowRight size={14} />
            </button>
          </div>
          <div className="sd-gems-scroll">
            {quickDestinations.map(([name, copy, scene, image, winterImage]) => (
              <article className="sd-gem-card is-destination" key={name} onClick={() => quickDestination(scene)}>
                <img className="sd-gem-image" src={season === "winter" && winterImage ? winterImage : image} alt={`${name} landscape`} />
                <div className="sd-gem-body">
                  <div className="sd-gem-top">
                    <h4>{name}</h4>
                    <ArrowRight size={18} />
                  </div>
                  <p>{copy}</p>
                  <div className="sd-gem-tags">
                    <span>Quick escape</span>
                  </div>
                </div>
              </article>
            ))}
            <button type="button" className="sd-gem-viewall" onClick={() => navigateTo("nearby")}>
              <Compass size={32} />
              <span>Explore more gems</span>
            </button>
          </div>
        </section>

      </main>

      <footer className="stitch-v2-footer">
        <div className="stitch-v2-container">
          <div>
            <strong>OffTrail</strong>
            <p>Precision route intelligence for travelers who seek depth and precision over superficial trends.</p>
            <small>© 2026 OffTrail Intelligence. All rights reserved.</small>
          </div>
          <nav aria-label="Footer navigation">
            <a href={viewHref("nearby")} onClick={(event) => handleViewNavigation(event, navigateTo, "nearby")}>Nearby</a>
            <a href={viewHref("favorites")} onClick={(event) => handleViewNavigation(event, navigateTo, "favorites")}>Saved Gems</a>
            <button type="button" onClick={() => openContent("how")}>How It Works</button>
          </nav>
        </div>
      </footer>
      <BottomNavBar active="explore" />
    </section>
  );
}

function TopAppBar({ active = "explore" }) {
  const { navigateTo, setMenuOpen, setAccountOpen, accountOpen, auth, setModal, season, setSeason } = useOffTrail();
  return (
    <header className="sd-topbar">
      <button className="sd-topbar-menu" type="button" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={22} /></button>
      <nav className="sd-topbar-links" aria-label="Primary navigation">
        <a className={active === "explore" ? "is-active" : ""} href={viewHref("home")} onClick={(event) => handleViewNavigation(event, navigateTo, "home")}>Explore</a>
        <a className={active === "discover" ? "is-active" : ""} href={viewHref("nearby")} onClick={(event) => handleViewNavigation(event, navigateTo, "nearby")}>Near Me</a>
        <a className={active === "saved" ? "is-active" : ""} href={viewHref("favorites")} onClick={(event) => handleViewNavigation(event, navigateTo, "favorites")}>Saved</a>
      </nav>
      <a className="sd-topbar-brand" href={viewHref("home")} onClick={(event) => handleViewNavigation(event, navigateTo, "home")}>OffTrail</a>
      <div className="sd-topbar-actions">
        <button
          type="button"
          className="sd-topbar-season"
          onClick={() => setSeason(season === "winter" ? "summer" : "winter")}
          aria-label={season === "winter" ? "Switch to summer theme" : "Switch to winter theme"}
          aria-pressed={season === "winter"}
        >
          {season === "winter" ? <Snowflake size={18} /> : <Sun size={18} />}
        </button>
        <button type="button" className="sd-topbar-account" onClick={() => (auth.isAuthenticated ? setAccountOpen(!accountOpen) : setModal("auth"))} aria-label={auth.isAuthenticated ? "Account" : "Sign in"}>
          <User size={20} />
        </button>
        {accountOpen && <AccountDropdown />}
      </div>
    </header>
  );
}

function BottomNavBar({ active = "explore" }) {
  const { navigateTo, auth, setModal } = useOffTrail();
  const items = [
    { key: "explore", label: "Explore", icon: Compass, onClick: () => navigateTo("home") },
    { key: "discover", label: "Near Me", icon: Navigation, onClick: () => navigateTo("nearby") },
    { key: "saved", label: "Saved", icon: Heart, onClick: () => navigateTo("favorites") },
    { key: "profile", label: "Profile", icon: User, onClick: () => (auth.isAuthenticated ? navigateTo("profile") : setModal("auth")) }
  ];
  return (
    <nav className="sd-bottom-nav" aria-label="Primary navigation">
      {items.map(({ key, label, icon: Icon, onClick }) => (
        <button key={key} type="button" className={active === key ? "is-active" : ""} onClick={onClick}>
          <Icon size={20} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

/* Free-license Pixabay photography and video (Pixabay Content License - free
   for commercial use, no attribution required) standing in for real place
   photography until a licensed photo/events provider is wired in. */
const COUNTRY_JOURNEYS = {
  switzerland: {
    name: "Switzerland",
    tagline: "An immersive mountain journey through the Alps",
    intro: "From the Matterhorn's iconic silhouette to glacier trains and hidden valleys, Switzerland rewards those who venture off the direct route.",
    heroVideo: "https://cdn.pixabay.com/video/2020/07/25/45568-443134372_large.mp4",
    places: [
      {
        name: "Zermatt & the Matterhorn",
        geocodeQuery: "Zermatt, Switzerland",
        images: [
          "https://cdn.pixabay.com/photo/2023/08/14/21/44/mountain-8190836_1280.jpg",
          "https://cdn.pixabay.com/photo/2018/07/26/07/45/switzerland-3562990_1280.jpg"
        ],
        winterImages: [
          "https://cdn.pixabay.com/photo/2015/10/27/18/31/matterhorn-1009428_1280.jpg",
          "https://cdn.pixabay.com/photo/2018/04/09/16/03/ski-3304481_1280.jpg"
        ],
        description: "A car-free alpine village beneath the Matterhorn's near-vertical pyramid, reached by train through the Mattertal valley.",
        event: "Zermatt Unplugged",
        eventNote: "An acoustic music festival held in the village each spring."
      },
      {
        name: "Lake Lucerne",
        geocodeQuery: "Lucerne, Switzerland",
        images: [
          "https://cdn.pixabay.com/photo/2017/03/04/07/00/lucerne-2115566_1280.jpg",
          "https://cdn.pixabay.com/photo/2015/05/22/22/19/chapel-bridge-779995_1280.jpg"
        ],
        winterImages: [
          "https://cdn.pixabay.com/photo/2022/03/02/20/13/lake-lucerne-7043947_1280.jpg",
          "https://cdn.pixabay.com/photo/2024/06/07/14/45/winter-8814783_1280.jpg"
        ],
        description: "A medieval old town on a glacial lake ringed by Mount Pilatus and Rigi, with a wooden chapel bridge at its center.",
        event: "Lucerne Festival",
        eventNote: "One of Europe's leading classical music festivals, held each summer."
      },
      {
        name: "Interlaken",
        geocodeQuery: "Interlaken, Switzerland",
        images: [
          "https://cdn.pixabay.com/photo/2019/01/10/21/03/landscape-3926066_1280.jpg",
          "https://cdn.pixabay.com/photo/2015/05/22/20/25/lake-thun-779670_1280.jpg"
        ],
        winterImages: [
          "https://cdn.pixabay.com/photo/2020/06/10/07/24/mountain-5281554_1280.jpg",
          "https://cdn.pixabay.com/photo/2023/05/29/12/57/mountains-8026003_1280.jpg"
        ],
        description: "Sitting between Lake Thun and Lake Brienz, the gateway to the Jungfrau region and Switzerland's adventure-sports hub.",
        event: "Paragliding & canyoning season",
        eventNote: "Outdoor operators run daily flights and canyon tours through summer and autumn."
      },
      {
        name: "Lauterbrunnen Valley",
        geocodeQuery: "Lauterbrunnen, Switzerland",
        images: [
          "https://cdn.pixabay.com/photo/2018/09/02/12/31/landscape-3648712_1280.jpg",
          "https://cdn.pixabay.com/photo/2020/04/10/22/44/switzerland-5028026_1280.jpg"
        ],
        winterImages: [
          "https://cdn.pixabay.com/photo/2019/12/04/16/38/lauterbrunnen-4673076_1280.jpg",
          "https://cdn.pixabay.com/photo/2020/11/28/12/03/mountains-5784512_1280.jpg"
        ],
        description: "A sheer-walled glacial valley with 72 waterfalls, including Staubbach Falls, made famous among hikers and climbers worldwide.",
        event: "Valley waterfall trail",
        eventNote: "The trail between Lauterbrunnen and Stechelberg is at its best after spring snowmelt."
      },
      {
        name: "Jungfraujoch",
        geocodeQuery: "Jungfraujoch, Switzerland",
        images: [
          "https://cdn.pixabay.com/photo/2012/12/26/14/13/jungfraujoch-72536_1280.jpg",
          "https://cdn.pixabay.com/photo/2022/11/03/01/07/the-alps-7566388_1280.jpg"
        ],
        winterImages: [
          "https://cdn.pixabay.com/photo/2014/12/07/16/29/jungfraujoch-559876_1280.jpg",
          "https://cdn.pixabay.com/photo/2024/09/05/08/15/landscape-9024197_1280.jpg"
        ],
        description: "The \"Top of Europe\" - a rail station at 3,454m between the Eiger and Mönch, with year-round glacier and ice-palace views.",
        event: "Ice Palace exhibits",
        eventNote: "Sculpted ice tunnels beneath the glacier, open to visitors year-round."
      }
    ]
  },
  norway: {
    name: "Norway",
    tagline: "Fjords, cliffs, and the far north",
    intro: "Steep-walled fjords, coastal roads, and long summer light make Norway one of Europe's most dramatic self-drive routes.",
    heroVideo: "https://cdn.pixabay.com/video/2018/12/30/20356-308852972_large.mp4",
    places: [
      {
        name: "Lofoten Islands",
        geocodeQuery: "Lofoten, Norway",
        images: [
          "https://cdn.pixabay.com/photo/2023/05/17/13/38/lofoten-islands-8000196_1280.jpg",
          "https://cdn.pixabay.com/photo/2025/07/12/10/04/reinebringen-9710168_1280.jpg"
        ],
        winterImages: [
          "https://cdn.pixabay.com/photo/2024/03/02/09/14/bridge-8608105_1280.jpg",
          "https://cdn.pixabay.com/photo/2024/03/02/09/17/lofoten-8608176_1280.jpg"
        ],
        description: "Jagged granite peaks rising straight out of the Norwegian Sea, dotted with red fishing cabins and white-sand beaches.",
        event: "Midnight sun season",
        eventNote: "The sun stays above the horizon from late May through mid-July."
      },
      {
        name: "Geirangerfjord",
        geocodeQuery: "Geiranger, Norway",
        images: [
          "https://cdn.pixabay.com/photo/2022/09/02/09/39/norway-7427120_1280.jpg",
          "https://cdn.pixabay.com/photo/2017/09/06/13/05/geiranger-2721378_1280.jpg"
        ],
        winterImages: [
          "https://cdn.pixabay.com/photo/2017/06/19/13/45/norway-2419363_1280.jpg",
          "https://cdn.pixabay.com/photo/2022/02/28/15/12/sea-7039432_1280.jpg"
        ],
        description: "A UNESCO World Heritage fjord with waterfalls cascading past abandoned farms clinging to near-vertical cliffs.",
        event: "Fjord cruise season",
        eventNote: "Ferries and cruise routes run most frequently through summer."
      },
      {
        name: "Bergen",
        geocodeQuery: "Bergen, Norway",
        images: [
          "https://cdn.pixabay.com/photo/2019/12/10/14/08/landscape-4685899_1280.jpg",
          "https://cdn.pixabay.com/photo/2016/07/21/00/20/bergen-1531620_1280.jpg"
        ],
        winterImages: [
          "https://cdn.pixabay.com/photo/2023/03/23/09/08/snow-7871514_1280.jpg",
          "https://cdn.pixabay.com/photo/2020/02/12/16/48/bergen-4843283_1280.jpg"
        ],
        description: "A harbor city ringed by seven mountains, with the colorful Bryggen wharf as the gateway to the western fjords.",
        event: "Bergen International Festival",
        eventNote: "Norway's largest festival for music, dance, and theatre, held each May-June."
      },
      {
        name: "Tromsø & the far north",
        geocodeQuery: "Tromsø, Norway",
        images: [
          "https://cdn.pixabay.com/photo/2021/12/11/15/06/northern-lights-6862969_1280.jpg",
          "https://cdn.pixabay.com/photo/2016/03/01/15/22/norway-1230549_1280.jpg"
        ],
        winterImages: [
          "https://cdn.pixabay.com/photo/2020/03/17/12/22/winter-4940172_1280.jpg",
          "https://cdn.pixabay.com/photo/2017/02/15/14/34/tromso-2068884_1280.jpg"
        ],
        description: "Above the Arctic Circle, a base for chasing the aurora borealis against fjord and mountain silhouettes.",
        event: "Aurora season",
        eventNote: "Northern lights are visible on clear nights from September through March."
      }
    ]
  },
  spain: {
    name: "Spain",
    tagline: "Sun-baked coastlines and hill towns",
    intro: "From Gaudí's Barcelona to Andalusia's white villages and the Balearic coast, Spain rewards a slower, detour-friendly route.",
    heroVideo: "https://cdn.pixabay.com/video/2017/01/07/7127-336300875_large.mp4",
    places: [
      {
        name: "Barcelona",
        geocodeQuery: "Barcelona, Spain",
        images: [
          "https://cdn.pixabay.com/photo/2014/08/26/14/11/cathedral-427997_1280.jpg",
          "https://cdn.pixabay.com/photo/2014/07/10/20/20/barcelona-389370_1280.jpg"
        ],
        winterImages: [
          "https://cdn.pixabay.com/photo/2020/06/15/11/59/el-born-5301517_1280.jpg",
          "https://cdn.pixabay.com/photo/2017/06/12/10/00/barcelona-2395017_1280.jpg"
        ],
        description: "Gaudí's unfinished Sagrada Família anchors a city of Modernist architecture, beach promenades, and Gothic Quarter alleys.",
        event: "La Mercè",
        eventNote: "Barcelona's biggest street festival, with human towers and fire runs each September."
      },
      {
        name: "Seville",
        geocodeQuery: "Seville, Spain",
        images: [
          "https://cdn.pixabay.com/photo/2015/05/06/07/39/seville-754966_1280.jpg",
          "https://cdn.pixabay.com/photo/2013/03/20/17/00/seville-95310_1280.jpg"
        ],
        winterImages: [
          "https://cdn.pixabay.com/photo/2022/09/28/17/49/spain-7485635_1280.jpg",
          "https://cdn.pixabay.com/photo/2013/08/15/04/50/giralda-172648_1280.jpg"
        ],
        description: "Andalusia's capital, built around the Alcázar palace and a cathedral that was once the world's largest mosque.",
        event: "Feria de Abril",
        eventNote: "A week-long spring fair of flamenco dress, horses, and all-night dancing."
      },
      {
        name: "Ibiza coastline",
        geocodeQuery: "Ibiza, Spain",
        images: [
          "https://cdn.pixabay.com/photo/2019/01/23/08/38/coast-3949782_1280.jpg",
          "https://cdn.pixabay.com/photo/2015/10/19/20/03/ibiza-996623_1280.jpg"
        ],
        winterImages: [
          "https://cdn.pixabay.com/photo/2022/09/10/08/06/ibiza-7444451_1280.jpg",
          "https://cdn.pixabay.com/photo/2015/10/13/17/46/ibiza-986551_1280.jpg"
        ],
        description: "Pine-covered cliffs drop into turquoise coves on the island's quieter north and west, away from the club strip.",
        event: "Sunset watching at Es Vedrà",
        eventNote: "Boats and cliffside bars gather nightly through the summer season."
      },
      {
        name: "Balearic sunsets",
        geocodeQuery: "San Antonio, Ibiza, Spain",
        images: [
          "https://cdn.pixabay.com/photo/2021/12/28/14/44/sunset-6899490_1280.jpg",
          "https://cdn.pixabay.com/photo/2019/11/07/20/36/es-vedra-4609854_1280.jpg"
        ],
        winterImages: [
          "https://cdn.pixabay.com/photo/2017/07/15/21/26/spain-2507801_1280.jpg",
          "https://cdn.pixabay.com/photo/2017/04/22/13/12/san-antonio-2251321_1280.jpg"
        ],
        description: "The islands' west-facing coves turn the evening ritual of watching the sun drop into the Mediterranean into an institution.",
        event: "Café del Mar sunset sessions",
        eventNote: "A decades-old sunset-and-music tradition on the San Antonio waterfront."
      }
    ]
  },
  italy: {
    name: "Italy",
    tagline: "Coastal cliffs, canals, and Renaissance cities",
    intro: "From cliffside villages on the Amalfi Coast to Venice's canals and Tuscany's hill towns, Italy is built for a slow, detour-heavy route.",
    heroVideo: "https://cdn.pixabay.com/video/2022/10/21/135821-764361985_large.mp4",
    places: [
      {
        name: "Amalfi Coast",
        geocodeQuery: "Amalfi, Italy",
        images: [
          "https://cdn.pixabay.com/photo/2017/04/19/10/47/amalfi-2241861_1280.jpg",
          "https://cdn.pixabay.com/photo/2017/03/27/23/14/amalfi-coast-2180537_1280.jpg"
        ],
        winterImages: [
          "https://cdn.pixabay.com/photo/2017/10/04/20/04/vietri-2817398_1280.jpg",
          "https://cdn.pixabay.com/photo/2014/08/05/07/54/italy-410191_1280.jpg"
        ],
        description: "A vertiginous coastal road links pastel villages stacked into cliffs above the Tyrrhenian Sea.",
        event: "Path of the Gods hiking season",
        eventNote: "The cliffside trail between Bomerano and Positano is busiest - and clearest - from spring through autumn."
      },
      {
        name: "Venice",
        geocodeQuery: "Venice, Italy",
        images: [
          "https://cdn.pixabay.com/photo/2024/12/27/21/57/venice-9294935_1280.jpg",
          "https://cdn.pixabay.com/photo/2019/02/28/14/38/venice-4026081_1280.jpg"
        ],
        winterImages: [
          "https://cdn.pixabay.com/photo/2022/11/08/20/20/building-7579247_1280.jpg",
          "https://cdn.pixabay.com/photo/2015/11/09/18/52/gondola-1035684_1280.jpg"
        ],
        description: "A city built on water, its canals threading between Gothic palaces with no cars to break the quiet.",
        event: "Venice Carnival",
        eventNote: "Elaborate masks and costumes fill the squares each February, before Lent."
      },
      {
        name: "Tuscany",
        geocodeQuery: "Siena, Italy",
        images: [
          "https://cdn.pixabay.com/photo/2017/04/30/19/33/italy-2273767_1280.jpg",
          "https://cdn.pixabay.com/photo/2021/08/29/14/43/tuscany-6583473_1280.jpg"
        ],
        winterImages: [
          "https://cdn.pixabay.com/photo/2016/12/03/09/46/snow-1879431_1280.jpg",
          "https://cdn.pixabay.com/photo/2020/04/01/07/19/forest-4990250_1280.jpg"
        ],
        description: "Cypress-lined roads connect hilltop towns, vineyards, and Renaissance art between Florence and Siena.",
        event: "Palio di Siena",
        eventNote: "A bareback horse race around Siena's main square, held each July and August."
      },
      {
        name: "Rome",
        geocodeQuery: "Rome, Italy",
        images: [
          "https://cdn.pixabay.com/photo/2025/03/31/21/30/italy-9505450_1280.jpg",
          "https://cdn.pixabay.com/photo/2018/07/20/14/02/rome-3550739_1280.jpg"
        ],
        winterImages: [
          "https://cdn.pixabay.com/photo/2016/02/20/14/02/snow-1212052_1280.jpg",
          "https://cdn.pixabay.com/photo/2018/11/03/20/50/rome-3792794_1280.jpg"
        ],
        description: "Two thousand years of history compressed into one city, with the Colosseum at its center.",
        event: "Colosseum summer evening openings",
        eventNote: "Extended hours let visitors see the arena lit after sunset during the summer months."
      }
    ]
  },
  france: {
    name: "France",
    tagline: "Iron towers, lavender hills, and the Riviera",
    intro: "Paris anchors the route, but France rewards the detour south, through lavender-covered Provence to the Mediterranean coast.",
    heroVideo: "https://cdn.pixabay.com/video/2020/06/17/42342-431738642_large.mp4",
    places: [
      {
        name: "Paris",
        geocodeQuery: "Paris, France",
        images: [
          "https://cdn.pixabay.com/photo/2018/04/25/09/26/eiffel-tower-3349075_1280.jpg",
          "https://cdn.pixabay.com/photo/2017/07/15/20/15/paris-2507590_1280.jpg"
        ],
        winterImages: [
          "https://cdn.pixabay.com/photo/2018/05/16/23/58/eiffel-tower-3407443_1280.jpg",
          "https://cdn.pixabay.com/photo/2017/03/07/12/48/paris-2123933_1280.jpg"
        ],
        description: "The Eiffel Tower anchors a city of grand boulevards, riverside walks, and neighborhood markets.",
        event: "Fête de la Musique",
        eventNote: "Free live music fills streets and squares nationwide every June 21st."
      },
      {
        name: "Provence",
        geocodeQuery: "Provence, France",
        images: [
          "https://cdn.pixabay.com/photo/2022/07/24/13/14/lavender-7341619_1280.jpg",
          "https://cdn.pixabay.com/photo/2016/06/26/09/44/landscape-1480198_1280.jpg"
        ],
        winterImages: [
          "https://cdn.pixabay.com/photo/2020/02/12/14/38/lavender-4842929_1280.jpg",
          "https://cdn.pixabay.com/photo/2016/02/03/17/26/mountain-1177529_1280.jpg"
        ],
        description: "Rolling fields turn violet each summer, with hill villages and Roman ruins scattered between them.",
        event: "Lavender bloom season",
        eventNote: "Fields around Valensole and Sault peak from mid-June to mid-July."
      },
      {
        name: "French Riviera",
        geocodeQuery: "Nice, France",
        images: [
          "https://cdn.pixabay.com/photo/2020/05/11/17/08/boat-5159224_1280.jpg",
          "https://cdn.pixabay.com/photo/2016/09/19/14/54/nice-1680430_1280.jpg"
        ],
        winterImages: [
          "https://cdn.pixabay.com/photo/2022/10/16/20/21/storm-clouds-7526102_1280.jpg",
          "https://cdn.pixabay.com/photo/2017/03/17/03/49/port-2150862_1280.jpg"
        ],
        description: "Nice's Promenade des Anglais traces a curve of Mediterranean coastline toward Monaco and Cannes.",
        event: "Nice Carnival",
        eventNote: "One of the world's largest carnivals, with flower battles and illuminated parades each February."
      },
      {
        name: "Chamonix & the French Alps",
        geocodeQuery: "Chamonix, France",
        images: [
          "https://cdn.pixabay.com/photo/2015/08/20/15/30/chamonix-897586_1280.jpg",
          "https://cdn.pixabay.com/photo/2017/05/20/23/23/mont-blanc-2330086_1280.jpg"
        ],
        winterImages: [
          "https://cdn.pixabay.com/photo/2010/12/02/mont-blanc-953_1280.jpg",
          "https://cdn.pixabay.com/photo/2018/03/02/18/29/snow-3193865_1280.jpg"
        ],
        description: "The historic base for Mont Blanc mountaineering, ringed by glaciers and cable-car access to some of the highest viewpoints in the Alps.",
        event: "UTMB (Ultra-Trail du Mont-Blanc)",
        eventNote: "A 170km ultramarathon circling the Mont Blanc massif through France, Italy, and Switzerland, held each late August."
      }
    ]
  }
};

function CountryJourneyPage() {
  const { journeyCountry, navigateTo, setRouteState, notify, season } = useOffTrail();
  const data = COUNTRY_JOURNEYS[journeyCountry] || COUNTRY_JOURNEYS.switzerland;
  const slideRefs = useRef([]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [journeyCountry]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    let rafId;
    function update() {
      const vh = window.innerHeight || 1;
      slideRefs.current.forEach((el, index) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const progress = Math.min(1, Math.max(0, -rect.top / vh));
        const isLast = index === slideRefs.current.length - 1;
        el.style.transform = `scale(${1 - progress * 0.14}) translateY(${progress * -32}px)`;
        el.style.opacity = isLast ? 1 : String(1 - progress * 0.85);
      });
      rafId = requestAnimationFrame(update);
    }
    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [journeyCountry]);

  async function planFrom(place) {
    const geocodeLabel = place.geocodeQuery || `${place.name}, ${data.name}`;
    try {
      const position = await getBrowserPosition();
      const originName = await resolveCurrentLocationName(position);
      setRouteState((state) => ({
        ...state,
        origin: { label: originName, name: originName, lat: position.lat, lng: position.lng },
        destination: { label: geocodeLabel, name: geocodeLabel },
        layovers: [],
        results: null,
        selectedLocationIds: [],
        discoveryError: null,
        autoSearch: true
      }));
      notify(`Finding verified stops from ${originName} to ${place.name}.`);
    } catch {
      setRouteState((state) => ({
        ...state,
        destination: { label: geocodeLabel, name: geocodeLabel },
        results: null,
        selectedLocationIds: [],
        discoveryError: null
      }));
      notify(`${place.name} set as your destination. Add an origin to search.`);
    }
    navigateTo("routeDiscovery");
  }

  return (
    <div className="cj-page">
      <header className="cj-topbar">
        <button type="button" onClick={() => navigateTo("home")} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <span>{data.name}</span>
        <span className="cj-topbar-spacer" />
      </header>

      <section className="cj-hero">
        <video className="cj-hero-video" src={data.heroVideo} autoPlay loop muted playsInline aria-hidden="true" />
        <div className="cj-hero-scrim" aria-hidden="true" />
        <div className="cj-hero-copy">
          <span className="cj-eyebrow">Immersive Journey</span>
          <h1>{data.name}</h1>
          <p>{data.intro}</p>
          <div className="cj-scroll-hint"><ChevronDown size={16} /> Scroll to explore</div>
        </div>
      </section>

      <div className="cj-stack">
        {data.places.map((place, index) => {
          const seasonImages = season === "winter" && place.winterImages?.length ? place.winterImages : place.images;
          return (
          <section
            key={place.name}
            className="cj-slide"
            ref={(el) => { slideRefs.current[index] = el; }}
            style={{ zIndex: index + 1 }}
          >
            <img className="cj-slide-bg" src={seasonImages[0]} alt={place.name} />
            <div className="cj-slide-scrim" aria-hidden="true" />
            <div className="cj-slide-content">
              <span className="cj-slide-index">0{index + 1} / 0{data.places.length}</span>
              <h2>{place.name}</h2>
              <p className="cj-slide-desc">{place.description}</p>
              {seasonImages.length > 1 && (
                <div className="cj-slide-gallery">
                  {seasonImages.slice(1).map((image, imageIndex) => (
                    <img key={image} src={image} alt={`${place.name} view ${imageIndex + 2}`} />
                  ))}
                </div>
              )}
              <div className="cj-slide-event">
                <CalendarDays size={16} />
                <div>
                  <strong>{place.event}</strong>
                  <span>{place.eventNote}</span>
                </div>
              </div>
              <button type="button" className="sd-submit-btn cj-slide-cta" onClick={() => planFrom(place)}>
                Add to Route <ArrowRight size={16} />
              </button>
            </div>
          </section>
          );
        })}
      </div>

      <BottomNavBar active="explore" />
    </div>
  );
}

function PlaceInput({ label, value, onChange, placeholder, error = "", valid = false, disabled = false, inputRef = null, onUseLocation = null, locating = false }) {
  const [suggestions, setSuggestions] = useState([]);
  const [focused, setFocused] = useState(false);
  const reactId = useId();
  const fieldId = `place-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${reactId.replace(/:/g, "")}`;
  const errorId = `${fieldId}-error`;
  const suggestionsId = `${fieldId}-suggestions`;

  useEffect(() => {
    if (!value || value.length < 2) {
      setSuggestions([]);
      return undefined;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/places/autocomplete?query=${encodeURIComponent(value)}`, {
          signal: controller.signal
        });
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      } catch {
        setSuggestions([]);
      }
    }, 280);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  function chooseSuggestion(suggestion) {
    onChange(suggestion.label);
    setSuggestions([]);
    setFocused(false);
  }

  return (
    <label className={`field place-field ${error ? "is-invalid" : valid ? "is-valid" : ""}`}>
      <span>{label}</span>
      <div className="place-field-row">
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          placeholder={placeholder}
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={suggestions.length ? suggestionsId : undefined}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={Boolean(error)}
          disabled={disabled}
        />
        {onUseLocation && (
          <button
            type="button"
            className="place-field-locate"
            onClick={onUseLocation}
            disabled={locating}
            aria-label={value === "Current location" ? "Location active" : "Use my current location"}
          >
            {locating ? <Loader2 size={15} className="spin" /> : <Navigation size={15} />}
          </button>
        )}
      </div>
      {error && <span className="field-error" id={errorId} role="alert">{error}</span>}
      {focused && suggestions.length > 0 && (
        <div className="suggestion-list liquid-glass" id={suggestionsId} role="listbox" aria-label={`${label} suggestions`}>
          {suggestions.map((suggestion) => (
            <button key={suggestion.id} type="button" role="option" onMouseDown={(event) => event.preventDefault()} onClick={() => chooseSuggestion(suggestion)}>
              {suggestion.label}
            </button>
          ))}
        </div>
      )}
    </label>
  );
}

function JourneyRouteDiscoveryPage() {
  const { routeState, setRouteState, setView, notify } = useOffTrail();
  const [origin, setOrigin] = useState(routeState.origin?.label || routeState.origin?.name || "");
  const [originCoords, setOriginCoords] = useState(
    routeState.origin?.lat && routeState.origin?.lng ? { lat: routeState.origin.lat, lng: routeState.origin.lng } : null
  );
  const [originIsGeolocated, setOriginIsGeolocated] = useState(
    Boolean(routeState.origin?.lat && routeState.origin?.lng)
  );
  const [locatingOrigin, setLocatingOrigin] = useState(false);
  const [destination, setDestination] = useState(routeState.destination?.label || routeState.destination?.name || "");
  const [departureTime, setDepartureTime] = useState(routeState.departureTime || toDatetimeLocal(new Date(Date.now() + 86400000)));
  const [travelMode, setTravelMode] = useState(routeState.travelMode || "Train");
  const [radius, setRadius] = useState(routeState.radius || 5);
  const [preferences, setPreferences] = useState(new Set(routeState.preferences || ["nature", "viewpoint", "hidden", "photo-op"]));
  const [layovers, setLayovers] = useState(routeState.layovers?.length ? routeState.layovers : []);
  const [results, setResults] = useState(routeState.results);
  const [loading, setLoading] = useState(Boolean(routeState.autoSearch));
  const [submitted, setSubmitted] = useState(false);
  const [discoveryState, setDiscoveryState] = useState(routeState.discoveryError || null);
  const [scanStage, setScanStage] = useState(routeState.results ? "complete" : "idle");

  async function useMyLocation() {
    setLocatingOrigin(true);
    try {
      const position = await getBrowserPosition();
      const name = await resolveCurrentLocationName(position);
      setOriginCoords(position);
      setOriginIsGeolocated(true);
      setOrigin(name);
      notify("Location access enabled.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Location access is unavailable. Enter a city manually.", "error");
    } finally {
      setLocatingOrigin(false);
    }
  }

  function handleOriginChange(nextValue) {
    if (originIsGeolocated && nextValue !== origin) {
      setOriginCoords(null);
      setOriginIsGeolocated(false);
    }
    setOrigin(nextValue);
  }

  async function discoverRoute(event) {
    event?.preventDefault?.();
    setSubmitted(true);
    if (!origin.trim() || !destination.trim()) {
      notify("From and To locations are required.", "error");
      return;
    }
    if (isSameLocationInput(origin, destination)) {
      const discoveryError = {
        type: "route",
        message: "Starting point and destination must be different."
      };
      setResults(null);
      setDiscoveryState(discoveryError);
      setRouteState((state) => ({ ...state, discoveryError }));
      setScanStage("error");
      notify("Starting point and destination must be different.", "error");
      return;
    }

    setLoading(true);
    setDiscoveryState(null);
    setScanStage("geocoding");
    try {
      const [originPlace, destinationPlace, layoverPlaces] = await Promise.all([
        originIsGeolocated && originCoords
          ? Promise.resolve({ lat: originCoords.lat, lng: originCoords.lng, name: origin })
          : geocode(origin),
        geocode(destination),
        Promise.all(
          layovers
            .filter((layover) => layover.label?.trim())
            .map(async (layover) => {
              const place = await geocode(layover.label);
              const timeAvailable = minutesBetweenTimes(layover.arrivalTime, layover.departureTime) || layover.timeAvailable || 120;
              return {
                ...place,
                id: layover.id,
                label: layover.label,
                arrivalTime: layover.arrivalTime,
                departureTime: layover.departureTime,
                maxDistance: Number(layover.maxDistance || 2),
                timeAvailable
              };
          })
        )
      ]);

      setScanStage("routing");
      const response = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originLat: originPlace.lat,
          originLng: originPlace.lng,
          destinationLat: destinationPlace.lat,
          destinationLng: destinationPlace.lng,
          origin: originPlace.name || origin,
          destination: destinationPlace.name || destination,
          departureTime,
          layovers: layoverPlaces.map((layover) => ({
            location: layover.name || layover.label,
            lat: layover.lat,
            lng: layover.lng,
            coordinates: { lat: layover.lat, lng: layover.lng },
            arrivalTime: layover.arrivalTime,
            departureTime: layover.departureTime,
            maxDistance: layover.maxDistance,
            timeAvailable: layover.timeAvailable
          })),
          radius,
          filters: Array.from(preferences)
        })
      });
      const result = await response.json();
      if (!response.ok) {
        const message = result.error || "Route discovery failed.";
        const discoveryError = classifyDiscoveryError(message);
        const publicMessage = friendlyDiscoveryMessage(discoveryError, message);
        setResults(null);
        setDiscoveryState(discoveryError);
        setScanStage("error");
        setRouteState((state) => ({ ...state, results: null, selectedLocationIds: [], discoveryError }));
        notify(publicMessage, "error", discoverRoute);
        return;
      }

      result.locations = curateDiscoveredLocations(result.locations);
      result.total = result.locations.length;

      setScanStage("places");
      setResults(result);
      setDiscoveryState(
        result.locations?.length
          ? null
          : {
              type: "empty",
              message: "No verified hidden places came back for this route. Try a wider radius or fewer filters."
            }
      );
      setRouteState({
        origin: originPlace,
        destination: destinationPlace,
        layovers: layoverPlaces,
        preferences: Array.from(preferences),
        radius,
        departureTime,
        travelMode,
        date: departureTime.slice(0, 10),
        results: result,
        selectedLocationIds: result.locations.slice(0, 3).map((location) => location.id),
        discoveryError: result.locations?.length
          ? null
          : {
              type: "empty",
              message: "No verified hidden places came back for this route. Try a wider radius or fewer filters."
            }
      });
      notify(result.locations?.length ? `Found ${result.total} places along your route.` : "No hidden places found for this route yet.", result.locations?.length ? "success" : "info");
      setScanStage(result.locations?.length ? "complete" : "empty");
      if (result.locations?.length) setView("results");
    } catch (error) {
      console.warn("Journey discovery error:", error);
      const message = error instanceof Error ? error.message : "Failed to discover route.";
      setResults(null);
      const discoveryError = classifyDiscoveryError(message);
      const publicMessage = friendlyDiscoveryMessage(discoveryError, message);
      setRouteState((state) => ({ ...state, results: null, selectedLocationIds: [], discoveryError }));
      setDiscoveryState(discoveryError);
      setScanStage("error");
      notify(publicMessage, "error", discoverRoute);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (routeState.autoSearch) {
      setRouteState((state) => ({ ...state, autoSearch: false }));
      discoverRoute();
    }
    // Run once on mount only - this fires the search that "Plan My Route"
    // on the homepage already promised, instead of leaving the user on the
    // pre-search placeholder until they notice they must submit again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="sd-discover">
        <TopAppBar active="explore" />
        <main className="sd-discover-loading-main">
          <RouteGlobeLoader originLabel={origin} destLabel={destination} scanStage={scanStage} />
        </main>
      </div>
    );
  }

  return (
    <RouteMapPlannerPage
      origin={origin}
      setOrigin={handleOriginChange}
      onUseLocation={useMyLocation}
      locatingOrigin={locatingOrigin}
      destination={destination}
      setDestination={setDestination}
      departureTime={departureTime}
      setDepartureTime={setDepartureTime}
      travelMode={travelMode}
      setTravelMode={setTravelMode}
      radius={radius}
      setRadius={setRadius}
      preferences={preferences}
      setPreferences={setPreferences}
      submitted={submitted}
      onSubmit={discoverRoute}
      discoveryState={discoveryState}
      setView={setView}
      sampleMode={Boolean(routeState.sampleMode || results?.isSample)}
    />
  );
}

function RouteMapPlannerPage({
  origin,
  setOrigin,
  onUseLocation,
  locatingOrigin = false,
  destination,
  setDestination,
  departureTime,
  setDepartureTime,
  travelMode,
  setTravelMode,
  radius,
  setRadius,
  preferences,
  setPreferences,
  submitted,
  onSubmit,
  discoveryState,
  setView,
  sampleMode = false
}) {
  const travelModes = ["Train", "Car", "Walking", "Cycling"];
  return (
    <div className="sd-discover">
      <TopAppBar active="explore" />
      <main className="sd-discover-main">
        <section className="sd-discover-header">
          <h1>Route Architect</h1>
          <p>Enter two places and OffTrail will only surface stops it can verify along the way.</p>
        </section>

        <section className="sd-planner-wrap sd-route-architect">
          <form className="stitch-v2-planner-card sd-planner-card" onSubmit={onSubmit} noValidate>
            {sampleMode && (
              <div className="sample-data-warning" role="status" aria-live="polite">
                <strong>DEMO DATA - NOT REAL PROVIDER RESULT</strong>
                <span>Sample cards stay separate from verified production results.</span>
              </div>
            )}
            <div className="stitch-v2-place-grid">
              <PlaceInput
                label="Origin"
                value={origin}
                onChange={setOrigin}
                placeholder="Enter a starting point"
                error={submitted && !origin.trim() ? "Origin is required." : ""}
                onUseLocation={onUseLocation}
                locating={locatingOrigin}
              />
              <PlaceInput label="Destination" value={destination} onChange={setDestination} placeholder="Edinburgh, UK" error={submitted && !destination.trim() ? "Destination is required." : ""} />
            </div>

            <div className="sd-field-block">
              <span className="sd-field-label">Travel Date &amp; Time</span>
              <input
                className="sd-datetime"
                type="datetime-local"
                value={departureTime}
                onChange={(event) => setDepartureTime(event.target.value)}
              />
            </div>

            <div className="sd-field-block">
              <span className="sd-field-label">Transport Mode</span>
              <div className="sd-pill-row" role="group" aria-label="Transport mode">
                {travelModes.map((mode) => (
                  <button key={mode} type="button" className={travelMode === mode ? "is-active" : ""} aria-pressed={travelMode === mode} onClick={() => setTravelMode(mode)}>
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="sd-field-block">
              <div className="sd-slider-head">
                <span className="sd-field-label">Route Corridor</span>
                <span className="sd-slider-value">{radius}km</span>
              </div>
              <input className="sd-range" type="range" min="1" max="10" value={radius} onChange={(event) => setRadius(Number(event.target.value))} aria-label="Route corridor" />
              <div className="sd-slider-ends"><span>Direct</span><span>Wide corridor</span></div>
            </div>

            <details className="advanced-filter-panel sd-discover-advanced">
              <summary>Advanced filters</summary>
              <div className="sd-pill-row">
                {preferenceOptions.map((option) => (
                  <button key={option.key} type="button" className={preferences.has(option.key) ? "is-active" : ""} onClick={() => toggleSet(preferences, setPreferences, option.key)}>
                    {option.label}
                  </button>
                ))}
              </div>
            </details>

            <button className="sd-submit-btn" type="submit">Plan My Route</button>
          </form>
        </section>

        <section className="sd-route-status">
          {discoveryState?.type ? (
            <DiscoveryStatePanel
              type={discoveryState.type}
              message={discoveryState.message}
              onRetry={onSubmit}
              onNearby={() => setView("nearby")}
            />
          ) : (
            <div className="sd-discover-empty">
              <Compass size={32} />
              <strong>Awaiting a verified route</strong>
              <p>Plan a route above and OffTrail will show real, map-verified stops along the way - never invented ones.</p>
            </div>
          )}
        </section>
      </main>
      <BottomNavBar active="explore" />
    </div>
  );
}

function DiscoveryStatePanel({ type = "idle", message, onRetry, onNearby }) {
  const states = {
    idle: {
      title: "Off the Map",
      copy: "Plan a real route and OffTrail will only show stops it can verify. Enter an origin and destination to begin.",
      icon: Compass,
      primary: "Run Scan",
      secondary: "Explore Nearby"
    },
    coordinates: {
      title: "Uncharted Coordinates",
      copy: "OffTrail could not verify that location. Check the spelling or try a nearby landmark, station, or city center.",
      icon: Compass,
      primary: "Try Again",
      secondary: "Search Nearby"
    },
    empty: {
      title: "Off the Map",
      copy: "We couldn't verify enough hidden gems for this specific path. Try adjusting your detour tolerance or choosing a more scenic route.",
      icon: Compass,
      primary: "Expand Search",
      secondary: "Modify Route"
    },
    route: {
      title: "Off the Map",
      copy: "OffTrail could not verify a real route for these inputs. Check the locations or try nearby stations and city centers.",
      icon: Compass,
      primary: "Modify Route",
      secondary: "Explore Nearby"
    },
    system: {
      title: "Signal Interrupted",
      copy: "Verified routing is not configured or the provider is temporarily unavailable. OffTrail stops safely instead of returning guesses.",
      icon: Compass,
      primary: "Retry Scan",
      secondary: "Explore Nearby"
    }
  };
  const state = states[type] || states.idle;
  const Icon = state.icon;

  return (
    <article className={`discovery-state-card is-${type}`} role={type === "idle" ? "status" : "alert"} aria-live={type === "idle" ? "polite" : "assertive"}>
      <div className="dsc-rings" aria-hidden="true"><span /><span /></div>
      <div className="dsc-mark">
        <Icon size={40} />
      </div>
      <h3>{state.title}</h3>
      <p>{message || state.copy}</p>
      <div className="dsc-actions">
        <button className="sd-submit-btn dsc-primary" type="button" onClick={onRetry}>{state.primary}</button>
        <button className="dsc-secondary" type="button" onClick={onNearby}>{state.secondary}</button>
      </div>
    </article>
  );
}

function ExploreAroundYouPage() {
  const { notify, favorites, setFavorites } = useOffTrail();
  const [location, setLocation] = useState("");
  const [radius, setRadius] = useState(5);
  const [timeWindow, setTimeWindow] = useState("2 hours");
  const [filters, setFilters] = useState(new Set(["hidden", "nature", "viewpoint", "open-now"]));
  const [openNow, setOpenNow] = useState(true);
  const [safeLate, setSafeLate] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("manual");
  const [places, setPlaces] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState("");

  async function useCurrentLocation() {
    setLoading(true);
    setNearbyError("");
    try {
      const position = await getBrowserPosition();
      setUserLocation(position);
      setLocation("Current location");
      setLocationStatus("allowed");
      notify("Location access enabled. Run a scan to load nearby verified places.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Location access is unavailable. Enter a city manually.";
      setLocationStatus("denied");
      setNearbyError(message);
      notify(message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function runNearbyScan(event) {
    event?.preventDefault();
    setLoading(true);
    setNearbyError("");
    try {
      let position = userLocation;
      if (location.trim() && location !== "Current location") {
        position = await geocode(location);
        setLocationStatus("manual");
      }
      if (!position) {
        position = await getBrowserPosition();
        setLocation("Current location");
        setLocationStatus("allowed");
      }
      const nextLocation = { lat: position.lat, lng: position.lng };
      const response = await fetch("/api/location-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: nextLocation.lat,
          longitude: nextLocation.lng,
          radius: radius * 1000,
          categories: Array.from(filters)
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nearby scan failed.");
      setUserLocation(data.userLocation || nextLocation);
      setPlaces((data.locations || []).map(normalizeIntelligencePlace));
      notify("Nearby scan complete.");
    } catch (error) {
      console.error("Nearby scan error:", error);
      const message = error instanceof Error ? error.message : "Failed to load. Please try again.";
      setNearbyError(message);
      notify(message, "error", runNearbyScan);
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredPlaces = places.filter((place) => {
    if (openNow && place.isOpenAtArrival === false) return false;
    if (safeLate && !place.safeForNighttime) return false;
    return true;
  });

  return (
    <StitchSpatialRadarPage
      location={location}
      setLocation={setLocation}
      radius={radius}
      setRadius={setRadius}
      timeWindow={timeWindow}
      setTimeWindow={setTimeWindow}
      filters={filters}
      setFilters={setFilters}
      openNow={openNow}
      setOpenNow={setOpenNow}
      safeLate={safeLate}
      setSafeLate={setSafeLate}
      userLocation={userLocation}
      locationStatus={locationStatus}
      locations={filteredPlaces}
      activeId={activeId}
      setActiveId={setActiveId}
      selectedPlace={selectedPlace}
      setSelectedPlace={setSelectedPlace}
      loading={loading}
      onSubmit={runNearbyScan}
      onUseLocation={useCurrentLocation}
      favorites={favorites}
      setFavorites={setFavorites}
      notify={notify}
      nearbyError={nearbyError}
    />
  );
}

function LayoverPage() {
  const { notify, favorites, setFavorites } = useOffTrail();
  const [hub, setHub] = useState("");
  const [availableTime, setAvailableTime] = useState("2 hours");
  const [method, setMethod] = useState("Walking");
  const [interest, setInterest] = useState("Food");
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [nightSafeOnly, setNightSafeOnly] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [places, setPlaces] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);

  const minutesAvailable = layoverMinutes(availableTime);
  const transitTime = layoverTransitMinutes[method] || 15;
  const returnBuffer = layoverReturnBufferMinutes;
  const visitWindow = minutesAvailable - transitTime * 2 - returnBuffer;
  const canRunLayover = visitWindow >= 15;
  const hubError = submitted && !hub.trim() ? "Enter an airport, station, city, or address." : "";
  const visiblePlaces = places.filter((place) => {
    if (openNowOnly && place.isOpenAtArrival === false) return false;
    if (nightSafeOnly && !place.safeForNighttime) return false;
    return place.fitsLayoverWindow;
  });

  async function runLayover(event) {
    event.preventDefault();
    setSubmitted(true);
    setError("");
    if (!hub.trim()) {
      notify("Add a station or airport first.", "error");
      return;
    }
    if (!canRunLayover) {
      const message = "This layover window is too short once travel time and the return buffer are included.";
      setError(message);
      notify(message, "error");
      return;
    }
    setLoading(true);
    try {
      const place = await geocode(hub);
      const response = await fetch("/api/location-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: place.lat,
          longitude: place.lng,
          radius: layoverRadius(availableTime, method),
          categories: [
            interest.toLowerCase().replace(/\s+/g, "_"),
            openNowOnly ? "open-now" : "verified",
            nightSafeOnly ? "night-safe" : "practical",
            method === "Walking" ? "walkable" : "transit"
          ]
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Layover discovery failed.");
      const normalized = (data.locations || [])
        .map((item, index) => normalizeIntelligencePlace(item, index))
        .map((item) => annotateLayoverStop(item, minutesAvailable, returnBuffer, method))
        .filter((item) => (!openNowOnly || item.isOpenAtArrival !== false) && (!nightSafeOnly || item.safeForNighttime))
        .slice(0, 12);
      setPlaces(normalized);
      notify(normalized.some((place) => place.fitsLayoverWindow) ? "Layover options loaded." : "No verified places fit this layover window.", normalized.some((place) => place.fitsLayoverWindow) ? "success" : "info");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Layover discovery failed.";
      setError(message);
      setPlaces([]);
      notify(message, "error", runLayover);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="layover-page">
      <StitchTopNav active="layover" />
      <main className="layover-layout">
        <form className="glass-card shimmer-border layover-panel" onSubmit={runLayover} noValidate>
          <span className="font-label-caps text-label-caps text-tertiary">Layover discovery</span>
          <h1>Find verified stops that fit your return window</h1>
          <p>OffTrail only shows places that can reasonably fit your available time and return buffer.</p>
          <label className={hubError ? "has-error" : ""}>
            <span>Station or airport</span>
            <input value={hub} onChange={(event) => setHub(event.target.value)} placeholder="Airport, station, city, or address" aria-invalid={Boolean(hubError)} />
            {hubError && <small>{hubError}</small>}
          </label>
          <div className="layover-form-grid">
            <label>
              <span>Available time</span>
              <select value={availableTime} onChange={(event) => setAvailableTime(event.target.value)}>
                {["45 min", "1 hour", "2 hours", "4 hours", "Half day"].map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label>
              <span>Travel method</span>
              <select value={method} onChange={(event) => setMethod(event.target.value)}>
                {["Walking", "Public transport", "Taxi/rideshare"].map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label>
              <span>Interest</span>
              <select value={interest} onChange={(event) => setInterest(event.target.value)}>
                {["Food", "Photos", "Nature", "Culture", "Quiet place", "Night safe stop"].map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
          </div>
          <div className="layover-buffer">
            <span>Safe return buffer</span>
            <strong>{returnBuffer} min</strong>
            <small>{transitTime} min there + {transitTime} min back. Maximum visit time: {Math.max(0, visitWindow)} min.</small>
          </div>
          {!canRunLayover && <p className="inline-helper-error" role="alert">This window is too short after travel time and return buffer. Choose more time or a faster transport mode.</p>}
          <div className="layover-options-row" role="group" aria-label="Layover filters">
            <label>
              <input type="checkbox" checked={openNowOnly} onChange={() => setOpenNowOnly(!openNowOnly)} />
              <span>Open now only</span>
            </label>
            <label>
              <input type="checkbox" checked={nightSafeOnly} onChange={() => setNightSafeOnly(!nightSafeOnly)} />
              <span>Night-safe filter</span>
            </label>
          </div>
          {error && <p className="inline-helper-error" role="alert">{friendlyDiscoveryMessage(classifyDiscoveryError(error), error)}</p>}
          <button className="stitch-primary" type="submit" disabled={loading || !canRunLayover}>
            {loading ? <Loader2 className="spin" size={18} /> : <Clock size={18} />}
            {loading ? "Checking verified stops..." : "Find Layover Gems"}
          </button>
        </form>
        <section className="layover-results">
          <div className="stitch-found-head">
            <h2>Layover options</h2>
            <span>{visiblePlaces.length ? `${visiblePlaces.length} verified fits` : "Verified only"}</span>
          </div>
          {loading && (
            <article className="glass-card layover-state" role="status" aria-live="polite">
              <Loader2 className="spin" size={28} />
              <strong>Checking real places near your hub...</strong>
              <p>Filtering by distance, available time, and return buffer.</p>
            </article>
          )}
          {!loading && !visiblePlaces.length && (
            <article className="glass-card layover-state" role={submitted ? "alert" : "status"} aria-live={submitted ? "assertive" : "polite"}>
              <Search size={30} />
              <strong>{submitted ? "No verified layover stops found" : "Enter a station or airport"}</strong>
              <p>{submitted ? "Try increasing available time or choosing a different interest." : "Add your hub and available time to search real nearby places."}</p>
            </article>
          )}
          <div className="layover-card-grid">
            {visiblePlaces.map((place) => (
              <article className={`layover-fit-card ${place.fitsLayoverWindow ? "" : "does-not-fit"}`} key={place.id}>
                <StitchRecommendationCard
                  place={{ ...place, detourDistance: place.detourDistance || `${place.timeThere} min from hub` }}
                  variant="small"
                  saved={favorites.some((favorite) => favorite.id === place.id)}
                  onSelect={setSelectedPlace}
                  onSave={() => {
                    setFavorites(toggleFavorite(favorites, place));
                    notify("Gem saved on this device.");
                  }}
                />
                <div className="layover-fit-grid">
                  <span><strong>{place.timeThere}m</strong> there</span>
                  <span><strong>{place.visitTime}m</strong> visit</span>
                  <span><strong>{place.timeBack}m</strong> back</span>
                  <span><strong>{place.returnBuffer}m</strong> buffer</span>
                  <em>{place.fitsLayoverWindow ? "Fits your window" : "Does not fit safely"}</em>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      {selectedPlace && <PlaceDetailDrawer place={selectedPlace} onClose={() => setSelectedPlace(null)} />}
    </section>
  );
}

function StitchTopNav({ active = "explore" }) {
  const { navigateTo, setModal, setMenuOpen, auth } = useOffTrail();
  return (
    <header className="stitch-system-nav">
      <a className="stitch-system-brand" href={viewHref("home")} onClick={(event) => handleViewNavigation(event, navigateTo, "home")}>
        OffTrail
      </a>
      <nav>
        <a className={active === "explore" ? "is-active" : ""} href={viewHref("home")} onClick={(event) => handleViewNavigation(event, navigateTo, "home")}>Explore</a>
        <a className={active === "nearby" ? "is-active" : ""} href={viewHref("nearby")} onClick={(event) => handleViewNavigation(event, navigateTo, "nearby")}>Nearby</a>
        <a className={active === "saved" ? "is-active" : ""} href={viewHref("favorites")} onClick={(event) => handleViewNavigation(event, navigateTo, "favorites")}>Saved</a>
      </nav>
      <div>
        <button type="button" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={19} /></button>
        <button type="button" onClick={() => (auth.isAuthenticated ? navigateTo("profile") : setModal("auth"))} aria-label="Account"><User size={19} /></button>
      </div>
    </header>
  );
}

function StitchSpatialRadarPage({
  location,
  setLocation,
  radius,
  setRadius,
  timeWindow,
  setTimeWindow,
  filters,
  setFilters,
  openNow,
  setOpenNow,
  safeLate,
  setSafeLate,
  userLocation,
  locationStatus,
  locations,
  activeId,
  setActiveId,
  selectedPlace,
  setSelectedPlace,
  loading,
  onSubmit,
  onUseLocation,
  favorites,
  setFavorites,
  notify,
  nearbyError
}) {
  const radiusOptions = [2, 5, 10];
  const timeOptions = ["1 hour", "2 hours", "4 hours"];
  const categoryFilters = [
    { key: "hidden", label: "Hidden gems" },
    { key: "nature", label: "Nature" },
    { key: "viewpoint", label: "Viewpoints" },
    { key: "photo_op", label: "Photo spots" },
    { key: "local", label: "Local" },
    { key: "garden", label: "Gardens" },
    { key: "food", label: "Food" },
    { key: "quiet", label: "Quiet" }
  ];
  const pins = locations.map((place, index) => ({
    ...place,
    point: place.point || locationPoint(place, userLocation, index)
  }));
  const featured = pins[0];
  const gridItems = pins.slice(1);
  const isSaved = (place) => favorites.some((favorite) => favorite.id === place.id);
  const toggleSave = (place) => {
    setFavorites(toggleFavorite(favorites, place));
    notify("Favorite updated.");
  };

  return (
    <section className="sd-discover">
      <TopAppBar active="discover" />
      <main className="sd-discover-main">
        <section className="sd-discover-header">
          <h1>Discover the Unseen</h1>
          <p>Curated hidden gems, verified by local experts. Escape the well-trodden path.</p>
          <form className="sd-discover-search" onSubmit={onSubmit}>
            <Search size={18} />
            <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Search destinations..." disabled={loading} />
          </form>
          {nearbyError && <p className="sd-discover-error" role="alert">{nearbyError}</p>}
          <div className="sd-pill-row sd-discover-filters">
            <button type="button" className={filters.size === 0 ? "is-active" : ""} onClick={() => setFilters(new Set())}>All</button>
            {categoryFilters.map((option) => (
              <button key={option.key} type="button" className={filters.has(option.key) ? "is-active" : ""} onClick={() => toggleSet(filters, setFilters, option.key)}>
                {option.label}
              </button>
            ))}
          </div>
          <details className="advanced-filter-panel sd-discover-advanced">
            <summary>Search radius, time window &amp; safety filters</summary>
            <div className="stitch-radar-group">
              <label className="font-label-caps text-label-caps text-on-surface-variant">Scan Radius</label>
              <div className="stitch-radius-buttons">
                {radiusOptions.map((option) => (
                  <button key={option} className={radius === option ? "is-active" : ""} type="button" onClick={() => setRadius(option)} disabled={loading}>
                    {option}KM
                  </button>
                ))}
              </div>
            </div>
            <div className="stitch-radar-group">
              <label className="font-label-caps text-label-caps text-on-surface-variant">Available time</label>
              <div className="stitch-time-buttons">
                {timeOptions.map((option) => (
                  <button key={option} className={timeWindow === option ? "is-active" : ""} type="button" onClick={() => setTimeWindow(option)} disabled={loading}>
                    <span>{option === "1 hour" ? "1h Window" : option === "2 hours" ? "2h Window" : "4h Window"}</span>
                    <Clock size={16} />
                  </button>
                ))}
              </div>
            </div>
            <div className="stitch-radar-toggles">
              <label>
                <input type="checkbox" checked={openNow} onChange={() => setOpenNow(!openNow)} />
                <span>Open now</span>
              </label>
              <label>
                <input type="checkbox" checked={safeLate} onChange={() => setSafeLate(!safeLate)} />
                <span>Night safe</span>
              </label>
            </div>
          </details>
          <div className="sd-discover-scan-row">
            <button type="button" className="tiny-glass-button" onClick={onUseLocation} disabled={loading}>
              <Navigation size={15} />
              {locationStatus === "allowed" ? "Location active" : "Use my location"}
            </button>
            <button type="button" className="sd-submit-btn sd-discover-scan-btn" onClick={onSubmit} disabled={loading}>
              {loading ? "Scanning near you..." : "Scan Nearby"}
            </button>
          </div>
        </section>

        {featured ? (
          <section className="sd-featured-gem">
            <div className="sd-featured-image">
              <img src={placeImageUrl(featured)} alt={featured.name} onError={(event) => handlePlaceImageError(event, featured)} />
              <div className="sd-featured-scrim" aria-hidden="true" />
              <div className="sd-featured-badges">
                {sourceLabel(featured) && <span className="is-verified"><CheckCircle size={14} /> Verified</span>}
                <span>{labelForType(featured.type) || "Nearby"}</span>
              </div>
            </div>
            <div className="sd-featured-copy">
              <span className="sd-featured-meta"><MapPin size={16} /> {confidenceLabel(featured)}</span>
              <h2>{featured.name}</h2>
              <p>{featured.description}</p>
              <div className="sd-featured-actions">
                <button type="button" className="sd-submit-btn" onClick={() => setSelectedPlace(featured)}>
                  Explore Location <ArrowRight size={16} />
                </button>
                <SavedGemButton saved={isSaved(featured)} onClick={() => toggleSave(featured)} />
              </div>
            </div>
          </section>
        ) : (
          <div className="sd-discover-empty">
            {loading ? <Gem size={32} /> : nearbyError ? <XCircle size={32} /> : <Compass size={32} />}
            <strong>{loading ? "Finding places near you" : nearbyError ? "Location access is off" : "Awaiting verified scan"}</strong>
            <p>{loading ? "OffTrail is asking real providers for nearby places." : nearbyError ? "You can still search manually by entering a city, station, or address." : "Scan to load nearby places from real map data."}</p>
          </div>
        )}

        {gridItems.length > 0 && (
          <section className="sd-discover-grid-section">
            <div className="sd-gems-head">
              <h3>Curated Selections</h3>
            </div>
            <div className="sd-discover-grid">
              {gridItems.map((place) => (
                <article key={place.id} className="sd-discover-card" onMouseEnter={() => setActiveId(place.id)} onMouseLeave={() => setActiveId(null)}>
                  <button type="button" className="sd-discover-card-image" onClick={() => setSelectedPlace(place)} aria-label={`View ${place.name}`}>
                    <img src={placeImageUrl(place)} alt={place.name} onError={(event) => handlePlaceImageError(event, place)} />
                    <span className="sd-discover-card-badge">{labelForType(place.type) || "Nearby"}</span>
                  </button>
                  <SavedGemButton saved={isSaved(place)} onClick={() => toggleSave(place)} />
                  <button type="button" className="sd-discover-card-body" onClick={() => setSelectedPlace(place)}>
                    <h4>{place.name}</h4>
                    <p>{place.description}</p>
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
      <BottomNavBar active="discover" />
      {selectedPlace && <PlaceDetailDrawer place={selectedPlace} onClose={() => setSelectedPlace(null)} />}
    </section>
  );
}

function StitchRecommendationCard({ place, variant = "small", active, saved, onHover, onSelect, onSave }) {
  const image = placeImageUrl(place);
  const distance = detourLabel(place);
  const rating = Number(place.rating || 0);
  const source = sourceLabel(place);
  const confidence = confidenceLabel(place);

  return (
    <article
      className={`glass-panel stitch-reco-card is-${variant} ${active ? "is-active" : ""} ${place.isSample ? "is-sample" : ""}`}
      onMouseEnter={() => onHover?.(place.id)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(place.id)}
      onBlur={() => onHover?.(null)}
      tabIndex={0}
      role="button"
      onClick={() => onSelect?.(place)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect?.(place);
        }
      }}
    >
      <img src={image} alt={place.name} onError={(event) => handlePlaceImageError(event, place)} />
      <div className="stitch-reco-shade" />
      {place.isSample && <strong className="sample-card-watermark">SAMPLE</strong>}
      <div className="stitch-reco-body">
        <div>
          <span>{place.isSample ? "Sample" : source ? (place.isHiddenGem ? "Verified hidden gem" : `${rating ? rating.toFixed(1) : "Verified"} place`) : "Map result"}</span>
          <small>{distance} away</small>
        </div>
        <h4>{place.name}</h4>
        <p>{place.description}</p>
        <div className="result-badge-row">
          {source && <span>{source}</span>}
          <span>{confidence}</span>
          <span>{openStatusLabel(place)}</span>
        </div>
        <footer>
          <button type="button" onClick={(event) => { event.stopPropagation(); onSave?.(); }}>
            <Heart size={15} fill={saved ? "currentColor" : "none"} />
            {saved ? "Saved" : "Save"}
          </button>
          <a href={googleDirectionsUrl(place)} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()}>
            Directions
            <ArrowRight size={15} />
          </a>
        </footer>
      </div>
    </article>
  );
}

function AnimatedRouteMap({ route, locations = [], selected = new Set(), onSelectPlace, variant = "journey", scanStage = "idle", loading = false }) {
  const routeBounds = route?.path?.length ? makeBounds(route.path, locations.map((location) => placeCoordinates(location))) : null;
  const routePath = routeBounds ? routePathData(route.path, routeBounds) : "";
  const pins = locations.map((location, index) => ({
    ...location,
    point: location.point || routeLocationPoint(location, index, routeBounds, route?.path)
  }));
  const startLabel = route?.segments?.[0]?.from || "Origin";
  const endLabel = route?.segments?.at?.(-1)?.to || "Destination";
  const originPoint = routeBounds && route?.path?.length ? toPercent({ lat: route.path[0][0], lng: route.path[0][1] }, routeBounds) : null;
  const destPoint = routeBounds && route?.path?.length ? toPercent({ lat: route.path[route.path.length - 1][0], lng: route.path[route.path.length - 1][1] }, routeBounds) : null;
  const hasVerifiedRoute = Boolean(routePath);
  const routeStatus = hasVerifiedRoute ? "VERIFIED ROUTE" : loading ? "CHECKING REAL ROUTE" : "AWAITING SCAN";
  const coordinateLabel = hasVerifiedRoute
    ? formatMapCoordinate(route.path[0]?.[0], route.path[0]?.[1])
    : "NO VERIFIED COORDINATES";

  return (
    <section className={`animated-route-map ${variant} scan-${scanStage} ${loading ? "is-scanning" : ""} ${hasVerifiedRoute ? "has-route" : "no-route"}`} aria-label="Animated route map">
      <div className="map-atmosphere" />
      <div className="stitch-map-frame" aria-hidden="true">
        <span /><span /><span /><span />
      </div>
      <svg className="animated-map-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={`routeGradient-${variant}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffb1c6" />
            <stop offset="100%" stopColor="#ab2c60" />
          </linearGradient>
        </defs>
        {hasVerifiedRoute && <path className="route-shadow-line" d={routePath} />}
        {hasVerifiedRoute && <path className="route-active-line" d={routePath} stroke={`url(#routeGradient-${variant})`} pathLength="1" />}
        {hasVerifiedRoute && <path className="route-comet-glow" d={routePath} pathLength="1" />}
        {hasVerifiedRoute && <path className="route-comet-line" d={routePath} pathLength="1" />}
        {hasVerifiedRoute && pins.map((pin) => (
          <path
            key={`line-${pin.id}`}
            className="route-branch-line"
            d={`M ${pin.point.routeX || pin.point.x} ${pin.point.routeY || 50} Q ${(pin.point.x + (pin.point.routeX || pin.point.x)) / 2} ${pin.point.y - 12}, ${pin.point.x} ${pin.point.y}`}
            pathLength="1"
          />
        ))}
      </svg>
      {(loading || hasVerifiedRoute || !pins.length) && (
        <div className="route-scan-sequence" aria-hidden="true">
          <span className="route-radar-ring" />
          <span className="route-radar-ring delay-one" />
          <span className="route-radar-ring delay-two" />
          <div className="route-scanner-core">
            <Gem size={24} />
          </div>
        </div>
      )}
      {loading && (
        <div className="route-scan-overlay">
          <span className="wilderness-eyebrow">{scanStageLabel(scanStage)}</span>
          <strong>{scanStageHeadline(scanStage)}</strong>
          <div className="scan-progress-track"><i /></div>
          <small>OffTrail only renders verified routes and real place signals.</small>
        </div>
      )}
      {hasVerifiedRoute && originPoint && destPoint && (
        <>
          <div className="map-endpoint is-start" style={{ left: `${originPoint.x}%`, top: `${originPoint.y}%` }}>
            <span>
              <i className="map-endpoint-ring" />
            </span>
            <strong>{startLabel}</strong>
          </div>
          <div className="map-endpoint is-end" style={{ left: `${destPoint.x}%`, top: `${destPoint.y}%` }}>
            <span>
              <i className="map-endpoint-ring" />
            </span>
            <strong>{endLabel}</strong>
          </div>
        </>
      )}
      {pins.map((location, index) => (
        <button
          key={location.id}
          className={`floating-route-pin ${selected.has(location.id) ? "is-selected" : ""}`}
          type="button"
          style={{ left: `${location.point.x}%`, top: `${location.point.y}%`, animationDelay: `${index * 160}ms` }}
          onClick={() => onSelectPlace?.(location)}
          aria-label={`View ${location.name}`}
        >
          <Gem size={16} />
          <span>{location.name}</span>
        </button>
      ))}
      <div className="map-hud top-left">{coordinateLabel}</div>
      <div className="map-hud bottom-right">SIGNALS: {pins.length} // STATUS: {routeStatus}</div>
      {!pins.length && (
        <div className="animated-map-empty">
          <Gem size={28} />
          <strong>Awaiting verified route scan</strong>
          <span>Real pins appear here after OffTrail receives route and place data.</span>
        </div>
      )}
    </section>
  );
}

function SavedGemButton({ saved, onClick }) {
  return (
    <button className={`save-gem-button ${saved ? "is-saved" : ""}`} type="button" onClick={onClick} aria-label={saved ? "Remove saved gem" : "Save gem"}>
      <Heart size={16} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}

function placeCoordinates(place) {
  const lat = Number(place.lat ?? place.coordinates?.lat ?? place.location?.latitude);
  const lng = Number(place.lng ?? place.coordinates?.lng ?? place.location?.longitude);
  return {
    lat: Number.isFinite(lat) ? lat : 0,
    lng: Number.isFinite(lng) ? lng : 0
  };
}

function googleDirectionsUrl(place) {
  const { lat, lng } = placeCoordinates(place);
  const destination = lat && lng ? `${lat},${lng}` : place.name || "";
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

function placeImageUrl(place) {
  const providerPhoto = firstUsableImage([place.photo, ...(place.photos || [])]);
  return providerPhoto || googleStaticMapUrl(place) || osmStaticMapUrl(place) || offTrailPlaceholderImage(place.name || "Verified place", "No provider photo available");
}

function hideBrokenImage(event) {
  event.currentTarget.style.opacity = "0";
  event.currentTarget.setAttribute("aria-hidden", "true");
}

function handlePlaceImageError(event, place) {
  const img = event.currentTarget;
  const stage = img.dataset.fallbackStage || "primary";

  if (stage === "primary") {
    const mapPreview = googleStaticMapUrl(place) || osmStaticMapUrl(place);
    if (mapPreview) {
      img.dataset.fallbackStage = "map";
      img.src = mapPreview;
      return;
    }
  }

  img.dataset.fallbackStage = "placeholder";
  img.src = offTrailPlaceholderImage(place?.name || "Verified place", "Map preview unavailable");
}

function firstUsableImage(candidates = []) {
  return candidates.find((candidate) => {
    if (typeof candidate !== "string") return false;
    if (!candidate.trim()) return false;
    return /^(https?:|data:image\/|\/)/i.test(candidate);
  });
}

const MAX_SUGGESTED_LOCATIONS = 20;

function isRealPlacePhoto(url) {
  return typeof url === "string" && !/staticmap\.openstreetmap\.de|maps\.googleapis\.com\/maps\/api\/staticmap/i.test(url);
}

function hasRealPlacePhoto(location) {
  return [location.photo, ...(location.photos || [])].some((candidate) => firstUsableImage([candidate]) && isRealPlacePhoto(candidate));
}

function curateDiscoveredLocations(locations = []) {
  return locations
    .filter((location) => hasRealPlacePhoto(location))
    .sort((a, b) => (a.detourMeters ?? Infinity) - (b.detourMeters ?? Infinity))
    .slice(0, MAX_SUGGESTED_LOCATIONS);
}

function offTrailPlaceholderImage(title = "Verified place", subtitle = "Photo unavailable") {
  const safeTitle = String(title).slice(0, 42);
  const safeSubtitle = String(subtitle).slice(0, 52);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
      <defs>
        <radialGradient id="g" cx="68%" cy="28%" r="68%">
          <stop offset="0" stop-color="#ffb1c6" stop-opacity="0.34"/>
          <stop offset="0.42" stop-color="#201f1f" stop-opacity="0.28"/>
          <stop offset="1" stop-color="#0e0e0e"/>
        </radialGradient>
        <linearGradient id="line" x1="0" x2="1">
          <stop offset="0" stop-color="#d7c3b0" stop-opacity="0"/>
          <stop offset="0.5" stop-color="#d7c3b0"/>
          <stop offset="1" stop-color="#ffb1c6" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="960" height="540" fill="#0e0e0e"/>
      <rect width="960" height="540" fill="url(#g)"/>
      <g opacity="0.28" stroke="#d7c3b0" stroke-width="1">
        <path d="M0 410 C160 310 280 345 420 260 S690 120 960 176" fill="none"/>
        <path d="M0 452 C160 370 318 388 480 310 S760 215 960 240" fill="none"/>
        <circle cx="688" cy="192" r="52" fill="none"/>
        <circle cx="688" cy="192" r="96" fill="none" opacity="0.5"/>
      </g>
      <path d="M0 416 C180 306 320 352 476 260 S720 126 960 176" stroke="url(#line)" stroke-width="6" fill="none" stroke-linecap="round"/>
      <g transform="translate(72 342)">
        <path d="M36 0 72 26 56 72 16 72 0 26Z" fill="#d7c3b0"/>
        <text x="96" y="22" fill="#e5e2e1" font-family="Hanken Grotesk, Arial, sans-serif" font-size="32" font-weight="700">${escapeSvgText(safeTitle)}</text>
        <text x="96" y="58" fill="#ddbfc6" font-family="Hanken Grotesk, Arial, sans-serif" font-size="18" letter-spacing="3">${escapeSvgText(safeSubtitle).toUpperCase()}</text>
      </g>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function escapeSvgText(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function googleStaticMapUrl(place) {
  if (!publicGoogleMapsApiKey) return "";
  const { lat, lng } = placeCoordinates(place);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return "";
  const marker = encodeURIComponent(`color:purple|${lat},${lng}`);
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=640x300&scale=2&markers=${marker}&key=${publicGoogleMapsApiKey}`;
}

function osmStaticMapUrl(place) {
  const { lat, lng } = placeCoordinates(place);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return "";
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=640x360&markers=${lat},${lng},red-pushpin`;
}

function PlaceDetailDrawer({ place, onClose }) {
  const { routeState, setRouteState, setView, notify, favorites, setFavorites } = useOffTrail();
  const image = placeImageUrl(place);
  const saved = favorites.some((favorite) => favorite.id === place.id);
  const directionsUrl = googleDirectionsUrl(place);
  const staticMapUrl = googleStaticMapUrl(place) || osmStaticMapUrl(place);
  const rating = Number(place.rating || 0);
  const source = sourceLabel(place);
  const confidence = confidenceLabel(place);
  const openStatus = openStatusLabel(place);

  function addToItinerary() {
    setRouteState((state) => {
      const ids = new Set(state.selectedLocationIds || []);
      ids.add(place.id);
      return { ...state, selectedLocationIds: Array.from(ids) };
    });
    notify("Added to itinerary.");
  }

  async function sharePlace() {
    try {
      await navigator.clipboard?.writeText(`${place.name} - ${place.description}`);
      notify("Share text copied.");
    } catch {
      notify("Failed to load. Please try again.", "error", sharePlace);
    }
  }

  return (
    <div className="stitch-detail-layer" role="dialog" aria-modal="true" aria-label={place.name}>
      <button className="stitch-detail-backdrop" type="button" aria-label="Close detail" onClick={onClose} />
      <section className="stitch-detail-page">
        <div className="stitch-detail-map-bg" style={{ backgroundImage: `url(${image})` }} aria-hidden="true" />
        <header className="stitch-detail-nav">
          <button type="button" onClick={onClose} aria-label="Back">
            <ArrowLeft size={20} />
          </button>
          <strong>OffTrail</strong>
          <button type="button" onClick={() => {
            setFavorites(toggleFavorite(favorites, place));
            notify("Favorite updated.");
          }} aria-label={saved ? "Remove saved gem" : "Save gem"}>
            <Heart size={20} fill={saved ? "currentColor" : "none"} />
          </button>
        </header>

        <section className="stitch-detail-hero">
          <img src={image} alt={place.name} onError={(event) => handlePlaceImageError(event, place)} />
          <div className="stitch-detail-hero-overlay" />
          <div className="stitch-detail-copy">
            <div className="stitch-detail-kicker">
              <span>{place.isHiddenGem ? "Rare Discovery" : labelForType(place.type) || place.category}</span>
              <div>
                {[0, 1, 2, 3, 4].map((star) => (
                  <Star key={star} size={16} fill={rating >= star + 1 || (rating > star && rating < star + 1) ? "currentColor" : "none"} />
                ))}
              </div>
            </div>
            <h1>{place.name}</h1>
            <p>{place.description}</p>
          </div>
          <div className="float-gem stitch-floating-detail-pin" aria-hidden="true">
            <div className="glass-panel shimmer-border">
              <Gem size={56} />
            </div>
          </div>
        </section>

        <section className="stitch-detail-grid">
          <article className="glass-panel shimmer-border stitch-detail-card is-special">
            <div>
              <Settings className="text-primary" size={22} />
              <h2>Why It's Special</h2>
            </div>
            <div className="stitch-detail-two-col">
              <section>
                <h3>Why recommended</h3>
                <p>{place.isHiddenGem ? "High rating and lower crowd signals make this a stronger hidden-gem candidate than obvious tourist stops nearby." : "This place matched the route corridor with practical distance, access, and timing."}</p>
              </section>
              <section>
                <h3>Verification</h3>
                <p>{source ? `${source} - ` : ""}{confidence}. {openStatus}. Check the external map before departing for live conditions.</p>
              </section>
            </div>
            <div className="stitch-detail-tags">
              {(place.tags || [labelForType(place.type), place.safeForNighttime ? "Safe late-night" : "Route fit", place.isOpenAtArrival ? "Open now" : "Check hours"]).map((tag) => (
                <span key={tag}><Gem size={15} />{tag}</span>
              ))}
            </div>
          </article>

          <article className="glass-panel shimmer-border stitch-detail-card is-data">
            <div className="stitch-detail-actions">
              <button type="button" onClick={addToItinerary}><MapPin size={16} /> Add to Route</button>
            </div>
            <div className="sd-gem-bento">
              <div>
                <Timer size={20} />
                <span>Proximity</span>
                <strong>{detourLabel(place)}</strong>
              </div>
              <div>
                <Clock size={20} />
                <span>Travel Time</span>
                <strong>{place.walkingTime || place.estimatedTime || 20}m</strong>
              </div>
            </div>
            <h3 className="sd-gem-notes-title">Terrain Notes</h3>
            <ul className="sd-gem-notes">
              <li>
                <CheckCircle size={18} />
                <div>
                  <h4>Confidence</h4>
                  <p>{confidence}</p>
                </div>
              </li>
              <li>
                <Clock size={18} />
                <div>
                  <h4>Open status</h4>
                  <p>{place.todaysHours || place.openingHours || openStatus}</p>
                </div>
              </li>
              {(place.tags || [labelForType(place.type)]).filter(Boolean).slice(0, 2).map((tag) => (
                <li key={tag}>
                  <Gem size={18} />
                  <div>
                    <h4>{tag}</h4>
                  </div>
                </li>
              ))}
            </ul>
            <a className="sd-gem-directions" href={directionsUrl} target="_blank" rel="noopener noreferrer">View on map</a>
          </article>

          <article className="glass-panel shimmer-border stitch-detail-card is-overlay">
            <svg viewBox="0 0 1000 200" preserveAspectRatio="none" aria-hidden="true">
              <path className="path-animate" d="M0,100 Q250,50 500,100 T1000,100" />
              <path className="path-animate secondary" d="M0,120 Q300,170 600,120 T1000,120" />
            </svg>
            <div>
              <h2>Intelligence Overlay</h2>
              <p>Vector paths indicate practical access and route handoff. Use the external map for live navigation and terrain updates.</p>
            </div>
            <div className="stitch-detail-map-preview">
              <img
                src={staticMapUrl || offTrailPlaceholderImage(place.name || "Verified place", "Map preview unavailable")}
                alt={`Map preview for ${place.name}`}
                onError={(event) => handlePlaceImageError(event, place)}
              />
            </div>
            <button type="button" onClick={sharePlace}><Share2 size={16} /> Share</button>
            <button type="button" onClick={() => setView(routeState.results ? "results" : "routeDiscovery")}><Route size={16} /> View Route</button>
          </article>
        </section>
      </section>
    </div>
  );
}

function ResultsPage() {
  const { routeState, setRouteState, setView, setModal, auth, notify, savedRoutes, setSavedRoutes, favorites, setFavorites } = useOffTrail();
  const results = routeState.results;
  const [saving, setSaving] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const lineRef = useRef(null);

  useEffect(() => {
    if (!results) return undefined;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function handleScroll() {
      if (!lineRef.current) return;
      if (reduceMotion) {
        lineRef.current.style.height = "100%";
        return;
      }
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const percent = docHeight > 0 ? Math.min(100, Math.max(0, (window.scrollY / docHeight) * 100 + 8)) : 0;
      lineRef.current.style.height = `${percent}%`;
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [results]);

  useEffect(() => {
    if (!results) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const stops = Array.from(document.querySelectorAll(".jt-stop"));
    stops.forEach((stop) => stop.classList.add("jt-stop-pending"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.remove("jt-stop-pending");
          entry.target.classList.add("jt-stop-revealed");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -80px 0px" }
    );
    stops.forEach((stop) => observer.observe(stop));
    return () => observer.disconnect();
  }, [results]);

  if (!results) return <EmptyState title="No route yet" action="Plan a route" onAction={() => setView("routeDiscovery")} />;

  const selected = new Set(routeState.selectedLocationIds);

  async function saveRoute() {
    if (saving) return;
    if (!auth.isAuthenticated) {
      notify("Sign in required to save routes.", "error");
      setModal("auth");
      return;
    }

    const record = {
      id: `route-${Date.now()}`,
      origin: routeState.origin,
      destination: routeState.destination,
      date: routeState.date || new Date().toISOString().slice(0, 10),
      spotsFound: results.total,
      routeData: results.route,
      locations: results.locations.filter((location) => selected.has(location.id)),
      thumbnail: results.locations[0]?.photos?.[0] || thumbnailUrl
    };

    setSaving(true);
    try {
      const response = await fetch("/api/save-route", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.user.token}`
        },
        body: JSON.stringify({
          origin: routeState.origin,
          destination: routeState.destination,
          routeData: results.route,
          locations: record.locations.map((location) => location.id)
        })
      });
      if (!response.ok) throw new Error("Saved locally until Supabase is configured.");
      const data = await response.json();
      record.id = data.id || record.id;
    } catch {
      // Local authenticated fallback keeps the UX complete when persistence is not configured.
    } finally {
      setSaving(false);
    }

    setSavedRoutes([record, ...savedRoutes.filter((route) => route.id !== record.id)]);
    notify("Route saved!");
  }

  function toggleLocation(id) {
    setRouteState((state) => {
      const ids = new Set(state.selectedLocationIds);
      ids.has(id) ? ids.delete(id) : ids.add(id);
      return { ...state, selectedLocationIds: Array.from(ids) };
    });
  }

  const backgroundImage = results.locations.length ? placeImageUrl(results.locations[0]) : null;

  return (
    <section className="jt-page">
      {backgroundImage && <div className="jt-page-bg" style={{ backgroundImage: `url(${backgroundImage})` }} aria-hidden="true" />}
      <TopAppBar active="explore" />
      <main className="jt-main">
        <header className="jt-hero">
          <span className="jt-eyebrow">Route Architect</span>
          <h1>{routeState.origin?.name || "Origin"} to {routeState.destination?.name || "Destination"}</h1>
          <p>{results.route.distance} - {results.route.duration} - {results.total} verified stops found</p>
          <div className="jt-hero-actions">
            <button className="jt-save-btn" type="button" onClick={saveRoute} disabled={saving}>
              {saving ? <Loader2 className="spin" size={16} /> : <Bookmark size={16} />}
              Save Route
            </button>
            <span className="jt-hero-stat">{selected.size} added - {routeState.radius} km radius</span>
          </div>
        </header>

        <div className="jt-map-card glass-card">
          <AnimatedRouteMap route={results.route} locations={results.locations} selected={selected} onSelectPlace={setSelectedPlace} variant="results" />
        </div>

        {results.locations.length ? (
          <div className="jt-timeline">
            <div className="jt-line-track" aria-hidden="true" />
            <div className="jt-line-fill" ref={lineRef} aria-hidden="true" />
            <div className="jt-stops">
              {results.locations.map((location, index) => (
                <JourneyStop
                  key={location.id}
                  place={location}
                  side={index % 2 === 0 ? "left" : "right"}
                  selected={selected.has(location.id)}
                  saved={favorites.some((favorite) => favorite.id === location.id)}
                  onOpen={() => setSelectedPlace(location)}
                  onToggle={() => toggleLocation(location.id)}
                  onSave={() => {
                    setFavorites(toggleFavorite(favorites, location));
                    notify("Favorite updated.");
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          <DiscoveryStatePanel
            type="empty"
            message="No verified places came back for this route. Increase the radius, loosen filters, or try another corridor."
            onRetry={() => setView("routeDiscovery")}
            onNearby={() => setView("nearby")}
          />
        )}
      </main>

      <div className="jt-cta-bar">
        <button className="jt-cta-btn" type="button" onClick={() => setView("itinerary")}>
          <Navigation size={18} />
          View Itinerary
        </button>
      </div>

      {selectedPlace && <PlaceDetailDrawer place={selectedPlace} onClose={() => setSelectedPlace(null)} />}
    </section>
  );
}

function JourneyStop({ place, side, selected, saved, onOpen, onToggle, onSave }) {
  const image = placeImageUrl(place);
  const distance = detourLabel(place);
  const rating = Number(place.rating || 0);
  const time = place.walkingTime || place.estimatedTime;
  const category = labelForType(place.type) || place.category;

  return (
    <article className={`jt-stop jt-stop-${side} ${selected ? "is-added" : ""}`}>
      <div className="jt-stop-copy">
        <h2>{place.name}</h2>
        <span className="jt-stop-region">{category || "Verified stop"}</span>
        <p>{place.description}</p>
      </div>
      <span className="jt-node" aria-hidden="true" />
      <div className="jt-stop-card glass-card">
        <button type="button" className="jt-stop-image" onClick={onOpen} aria-label={`View details for ${place.name}`}>
          <img src={image} alt={place.name} onError={(event) => handlePlaceImageError(event, place)} />
          {place.isHiddenGem && <span className="jt-stop-badge">Hidden gem</span>}
        </button>
        <div className="jt-stop-mobile-header">
          <h2>{place.name}</h2>
          <span className="jt-stop-region">{category || "Verified stop"}</span>
        </div>
        <div className="jt-stop-meta">
          <span className="jt-stat-chip"><MapPin size={12} /> {distance}</span>
          {time && <span className="jt-stat-chip"><Timer size={12} /> {time} min</span>}
          <span className="jt-stat-chip"><Star size={12} /> {rating > 0 ? rating.toFixed(1) : "Unrated"}</span>
        </div>
        <div className="jt-stop-actions">
          <a className="jt-icon-btn" href={googleDirectionsUrl(place)} target="_blank" rel="noopener noreferrer" aria-label={`Directions to ${place.name}`}>
            <Navigation size={14} />
          </a>
          <button type="button" className="jt-icon-btn" onClick={onSave} aria-label={saved ? "Remove saved gem" : "Save gem"}>
            <Heart size={14} fill={saved ? "currentColor" : "none"} />
          </button>
          <button type="button" className={`jt-add-btn ${selected ? "is-selected" : ""}`} onClick={onToggle}>
            {selected ? <Check size={14} /> : <Plus size={14} />}
            {selected ? "Added" : "Add"}
          </button>
        </div>
      </div>
    </article>
  );
}

function ItineraryPage() {
  const { routeState, setView, notify } = useOffTrail();
  const results = routeState.results;
  const selected = new Set(routeState.selectedLocationIds);
  const stops = (results?.locations || []).filter((location) => selected.has(location.id));
  const [sharing, setSharing] = useState(false);

  async function shareItinerary() {
    setSharing(true);
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable.");
      await navigator.clipboard?.writeText(window.location.href);
      notify("Share link copied.");
    } catch {
      notify("Failed to load. Please try again.", "error", shareItinerary);
    } finally {
      setSharing(false);
    }
  }

  return (
    <section className="app-page itinerary-page">
      <PageTopbar title="Itinerary" />
      <div className="timeline liquid-glass-strong">
        <TimelineItem time="9:00 AM" title={`Start: ${routeState.origin?.name || "Origin"}`} />
        {stops.map((stop, index) => (
          <TimelineItem
            key={stop.id}
            time={addMinutes("9:00 AM", 45 + index * 55)}
            title={stop.name}
            duration={`${stop.estimatedTime} min visit`}
            image={stop.photos[0] || thumbnailUrl}
            description={stop.description}
          />
        ))}
        <TimelineItem time="4:00 PM" title={`End: ${routeState.destination?.name || "Destination"}`} />
      </div>
      <div className="page-actions">
        <button className="mini-button liquid-glass" type="button" onClick={() => notify("Google Maps export link prepared.")}>
          <ExternalLink size={16} />
          Export to Google Maps
        </button>
        <button className="mini-button liquid-glass" type="button" onClick={shareItinerary} disabled={sharing}>
          {sharing ? <Loader2 className="spin" size={16} /> : <Share2 size={16} />}
          Share Itinerary
        </button>
        <button className="mini-button liquid-glass" type="button" onClick={() => window.print()}>
          <Download size={16} />
          Download PDF
        </button>
        <button className="solid-action" type="button" onClick={() => setView("results")}>Back to Results</button>
      </div>
    </section>
  );
}

function ContentPage() {
  const { contentPage } = useOffTrail();
  const page = pageContent[contentPage] || pageContent.how;
  return (
    <section className="app-page content-page">
      <PageTopbar title={page.title} />
      <div className="content-hero liquid-glass-strong">
        <h1>{page.title}</h1>
        <p>{page.subtitle}</p>
        <div className="content-card-grid">
          {page.cards.map((card) => (
            <article className="liquid-glass" key={card}>{card}</article>
          ))}
        </div>
      </div>
    </section>
  );
}

function DashboardPage() {
  const { savedRoutes, setView, setSelectedRouteId } = useOffTrail();
  return (
    <section className="app-page dashboard-page">
      <PageTopbar title="My Saved Routes" />
      <div className="dashboard-grid">
        {savedRoutes.length === 0 && <EmptyState title="No saved routes yet" description="Your discovery archive will collect every route you save." action="Plan your first route" />}
        {savedRoutes.map((route) => (
          <article className="saved-route-card liquid-glass" key={route.id}>
            <img
              src={route.thumbnail || thumbnailUrl}
              alt=""
              onError={(event) => {
                event.currentTarget.src = offTrailPlaceholderImage("Saved route", "Preview unavailable");
              }}
            />
            <h3>{route.origin?.name || "Origin"} -&gt; {route.destination?.name || "Destination"}</h3>
            <p>{route.date} - {route.spotsFound} spots found</p>
            <button className="mini-button liquid-glass" type="button" onClick={() => { setSelectedRouteId(route.id); setView("routeDetail"); }}>View Route</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function FavoritesPage() {
  const { favorites, setFavorites, navigateTo, notify } = useOffTrail();

  function removeFavorite(id) {
    setFavorites(favorites.filter((favorite) => favorite.id !== id));
    notify("Gem removed from this device.");
  }

  function updateNote(id, note) {
    setFavorites(favorites.map((favorite) => (favorite.id === id ? { ...favorite, note } : favorite)));
  }

  function clearFavorites() {
    setFavorites([]);
    notify("Saved gems cleared from this device.");
  }

  const backgroundImage = favorites.length ? placeImageUrl(favorites[0]) : null;

  return (
    <section className="jt-page">
      {backgroundImage && <div className="jt-page-bg" style={{ backgroundImage: `url(${backgroundImage})` }} aria-hidden="true" />}
      <TopAppBar active="saved" />
      <main className="jt-main">
        <header className="jt-hero">
          <span className="jt-eyebrow">Your Collection</span>
          <h1>Saved Gems</h1>
          <p>Places you have bookmarked while exploring, stored on this device until account sync is configured.</p>
          {favorites.length > 0 && (
            <div className="jt-hero-actions">
              <span className="jt-hero-stat">{favorites.length} saved</span>
              <button className="jt-save-btn" type="button" onClick={clearFavorites}>
                <Trash2 size={16} />
                Clear all
              </button>
            </div>
          )}
        </header>

        {favorites.length === 0 ? (
          <article className="discovery-state-card is-idle" role="status" aria-live="polite">
            <div className="dsc-rings" aria-hidden="true"><span /><span /></div>
            <div className="dsc-mark">
              <Heart size={40} />
            </div>
            <h3>No Gems Saved Yet</h3>
            <p>Tap the bookmark icon on any place to start building your personal travel map.</p>
            <div className="dsc-actions">
              <button className="sd-submit-btn dsc-primary" type="button" onClick={() => navigateTo("nearby")}>Explore Nearby</button>
            </div>
          </article>
        ) : (
          <div className="jt-saved-grid">
            {favorites.map((location) => (
              <SavedGemCard
                key={location.id}
                location={location}
                onRemove={() => removeFavorite(location.id)}
                onNoteChange={(note) => updateNote(location.id, note)}
              />
            ))}
          </div>
        )}
      </main>
      <BottomNavBar active="saved" />
    </section>
  );
}

function SavedGemCard({ location, onRemove, onNoteChange }) {
  const image = placeImageUrl(location);
  return (
    <article className="jt-saved-card glass-card">
      <img className="jt-saved-card-image" src={image} alt={location.name} onError={(event) => handlePlaceImageError(event, location)} />
      <div className="jt-saved-card-body">
        <h2>{location.name}</h2>
        <span className="jt-stop-region">{[location.category, detourLabel(location), sourceLabel(location)].filter(Boolean).join(" - ")}</span>
        <label className="jt-saved-note">
          <span>Personal note</span>
          <textarea
            value={location.note || ""}
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder="Why did you save this place?"
            rows={2}
          />
        </label>
        <div className="jt-stop-actions">
          <a className="jt-icon-btn" href={googleDirectionsUrl(location)} target="_blank" rel="noopener noreferrer" aria-label={`Directions to ${location.name}`}>
            <Navigation size={14} />
          </a>
          <button type="button" className="jt-add-btn" onClick={onRemove}>
            <Trash2 size={14} />
            Remove
          </button>
        </div>
      </div>
    </article>
  );
}

function ProfilePage() {
  const { auth } = useOffTrail();
  return (
    <section className="app-page content-page">
      <PageTopbar title="Account Settings" />
      <div className="content-hero liquid-glass-strong">
        <User size={44} />
        <h1>{auth.user?.name || "Traveler"}</h1>
        <p>{auth.user?.email || "No account email"}</p>
        <div className="content-card-grid">
          <article className="liquid-glass">Default route radius: 5 km</article>
          <article className="liquid-glass">Preferred categories: nature, hidden, photo-op</article>
          <article className="liquid-glass">Notification cadence: trip planning only</article>
        </div>
      </div>
    </section>
  );
}

function RouteDetailPage() {
  const { savedRoutes, setView, selectedRouteId } = useOffTrail();
  const route = savedRoutes.find((item) => item.id === selectedRouteId) || null;
  return (
    <section className="app-page content-page">
      <PageTopbar title="Saved Route" />
      <div className="content-hero liquid-glass-strong">
        <h1>{route ? `${route.origin?.name || "Origin"} to ${route.destination?.name || "Destination"}` : "No route selected"}</h1>
        <p>{route ? `${route.spotsFound} spots saved for ${route.date}` : "Save a route first to view its details."}</p>
        <button className="solid-action" type="button" onClick={() => setView("dashboard")}>Back to Dashboard</button>
      </div>
    </section>
  );
}

function SlideMenu() {
  const { menuOpen, setMenuOpen, navigateTo, auth, signOut } = useOffTrail();
  const menuItems = [
    ["home", "Explore"],
    ["nearby", "Nearby"],
    ["favorites", "Saved"]
  ];

  function navigate(view) {
    navigateTo(view);
  }

  return (
    <div className={`menu-overlay ${menuOpen ? "is-open" : ""}`} aria-hidden={!menuOpen}>
      <button className="menu-backdrop" type="button" aria-label="Back" onClick={() => setMenuOpen(false)} />
      <aside className="slide-menu liquid-glass-strong">
        <button className="back-button liquid-glass" type="button" onClick={() => setMenuOpen(false)} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <h2>Menu</h2>
        {menuItems.map(([key, label]) => (
          <a className="menu-link" href={viewHref(key)} key={key} onClick={(event) => { event.preventDefault(); navigate(key); }}>
            {label}
            <ArrowRight size={16} />
          </a>
        ))}
        {auth.isAuthenticated && (
          <button className="menu-link" type="button" onClick={signOut}>
            Sign Out
            <LogOut size={16} />
          </button>
        )}
      </aside>
    </div>
  );
}

function AccountDropdown() {
  const { navigateTo, signOut } = useOffTrail();
  return (
    <div className="account-dropdown liquid-glass">
      <button type="button" onClick={() => navigateTo("dashboard")}><History size={15} /> My Saved Routes</button>
      <button type="button" onClick={() => navigateTo("favorites")}><Heart size={15} /> My Favorites</button>
      <button type="button" onClick={() => navigateTo("profile")}><Settings size={15} /> Account Settings</button>
      <button type="button" onClick={signOut}><LogOut size={15} /> Sign Out</button>
    </div>
  );
}

function HiddenSpotsModal() {
  const { setModal, openPlanner } = useOffTrail();
  return (
    <Modal title="Hidden Spots" onClose={() => setModal(null)}>
      <div className="mini-map liquid-glass">
        {["18%", "42%", "68%"].map((left, index) => <span key={left} style={{ left, top: `${28 + index * 18}%` }} />)}
      </div>
      <p>Find secret gardens, tucked-away viewpoints, and locals-only spots.</p>
      <button className="solid-action" type="button" onClick={() => openPlanner(["hidden", "garden", "viewpoint"])}>Explore Hidden Spots</button>
    </Modal>
  );
}

function PhotoModal() {
  const { setModal, openPlanner } = useOffTrail();
  return (
    <Modal title="Photo Locations" onClose={() => setModal(null)} size="wide">
      <div className="gallery-grid">
        {galleryPhotoLabels.map(([title, subtitle]) => (
          <img key={title} src={offTrailPlaceholderImage(title, subtitle)} alt={title} />
        ))}
      </div>
      <p>Discover the most photogenic spots along your journey.</p>
      <button className="solid-action" type="button" onClick={() => openPlanner(["photo-op", "viewpoint"])}>Find Photo Ops</button>
    </Modal>
  );
}

function LocalFavoritesModal() {
  const { setModal, openPlanner } = useOffTrail();
  return (
    <Modal title="Local Favorites" onClose={() => setModal(null)}>
      <p>Places locals love but tourists miss.</p>
      <div className="sample-card-stack">
        {["Canal-side breakfast window", "Quiet sunset terrace", "Family-run market stall"].map((item) => <article className="liquid-glass" key={item}>{item}</article>)}
      </div>
      <button className="solid-action local-picks-action" type="button" onClick={() => openPlanner(["local", "food", "hidden"])}>
        Browse Local Picks
        <ArrowRight size={18} />
      </button>
    </Modal>
  );
}

function AuthModal() {
  const { setModal, signIn, notify } = useOffTrail();
  const [tab, setTab] = useState("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function submit(event) {
    event.preventDefault();
    setSubmitted(true);
    if (!email.includes("@") || password.length < 6) {
      notify("Use a valid email and a password with at least 6 characters.", "error");
      return;
    }
    setLoading(true);
    window.setTimeout(() => {
      signIn({ id: `user-${email}`, email, name: email.split("@")[0] });
      setLoading(false);
    }, 500);
  }

  function continueWithGoogle() {
    setGoogleLoading(true);
    window.setTimeout(() => {
      notify("Google OAuth is not configured yet. Use email sign-in for this local build.", "error");
      setGoogleLoading(false);
    }, 350);
  }

  const emailError = submitted && !email.includes("@") ? "Enter a valid email address." : "";
  const passwordError = submitted && password.length < 6 ? "Use at least 6 characters." : "";

  return (
    <Modal title="Account" onClose={() => setModal(null)}>
      <div className="auth-tabs">
        <button className={tab === "signup" ? "is-active" : ""} type="button" onClick={() => setTab("signup")}>Sign Up</button>
        <button className={tab === "signin" ? "is-active" : ""} type="button" onClick={() => setTab("signin")}>Sign In</button>
      </div>
      <form className="auth-form" onSubmit={submit}>
        <label className={`field ${emailError ? "is-invalid" : email ? "is-valid" : ""}`}>
          <span>Email</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required aria-invalid={Boolean(emailError)} />
          {emailError && <span className="field-error">{emailError}</span>}
        </label>
        <label className={`field ${passwordError ? "is-invalid" : password.length >= 6 ? "is-valid" : ""}`}>
          <span>Password</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required aria-invalid={Boolean(passwordError)} />
          {passwordError && <span className="field-error">{passwordError}</span>}
        </label>
        <button className="solid-action" type="submit" disabled={loading}>{loading ? <Loader2 className="spin" size={16} /> : <Mail size={16} />}{tab === "signup" ? "Create Account" : "Sign In"}</button>
      </form>
      <button className="mini-button liquid-glass" type="button" onClick={continueWithGoogle} disabled={googleLoading}>
        {googleLoading && <Loader2 className="spin" size={16} />}
        Continue with Google
      </button>
    </Modal>
  );
}

function Modal({ title, children, onClose, size = "normal" }) {
  const [closing, setClosing] = useState(false);

  function requestClose() {
    if (closing) return;
    setClosing(true);
    window.setTimeout(onClose, 200);
  }

  return (
    <div className={`modal-layer ${closing ? "is-closing" : ""}`}>
      <button className="modal-backdrop" type="button" aria-label="Back" onClick={requestClose} />
      <section className={`modal-card modal modal-container liquid-glass-strong modal-${size}`} role="dialog" aria-modal="true" aria-label={title}>
        <button className="back-button liquid-glass" type="button" onClick={requestClose} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <div className="modal-head">
          <h2>{title}</h2>
        </div>
        {children}
      </section>
    </div>
  );
}

function PageTopbar({ title }) {
  const { setView, setMenuOpen, auth, setModal, accountOpen, setAccountOpen } = useOffTrail();
  return (
    <nav className="page-topbar liquid-glass">
      <button className="brand brand-button" type="button" onClick={() => setView("home")}><Gem size={28} />OffTrail</button>
      <h2>{title}</h2>
      <div className="page-top-actions">
        <button className="mini-button liquid-glass" type="button" onClick={() => setMenuOpen(true)}><Menu size={16} /> Menu</button>
        <div className="account-wrap">
          <button className="mini-button liquid-glass" type="button" onClick={() => (auth.isAuthenticated ? setAccountOpen(!accountOpen) : setModal("auth"))}><User size={16} /> Account</button>
          {accountOpen && <AccountDropdown />}
        </div>
      </div>
    </nav>
  );
}

function LoadingRoute({ step }) {
  const messages = ["Building your route...", "Checking real map data...", "Finding verified stops near your path..."];
  return (
    <div className="loading-route" role="status" aria-live="polite">
      <Gem className="pulse" size={70} />
      <h3>{messages[step]}</h3>
      <p>OffTrail is sampling the route corridor and scoring every stop by vibe, distance, and rarity.</p>
    </div>
  );
}

function EmptyState({ title, description, action, onAction }) {
  const { openPlanner, setView } = useOffTrail();
  return (
    <div className="empty-state liquid-glass-strong">
      <Search size={44} />
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {action && <button className="solid-action" type="button" onClick={onAction || (() => (action === "Back home" ? setView("home") : openPlanner()))}>{action}</button>}
    </div>
  );
}

function TimelineItem({ time, title, duration, image, description }) {
  return (
    <article className="timeline-item">
      <time>{time}</time>
      <div className="timeline-dot" />
      <div className="timeline-card liquid-glass">
        {image && (
          <img
            src={image}
            alt=""
            onError={(event) => {
              event.currentTarget.src = offTrailPlaceholderImage(title, "Itinerary photo unavailable");
            }}
          />
        )}
        <div>
          <h3>{title}</h3>
          {duration && <p>{duration}</p>}
          {description && <p>{description}</p>}
        </div>
      </div>
    </article>
  );
}

function Toast({ message, tone, retryAction }) {
  return (
    <div className={`toast liquid-glass-strong toast-${tone} ${tone === "error" ? "error-toast" : ""}`} role={tone === "error" ? "alert" : "status"} aria-live={tone === "error" ? "assertive" : "polite"}>
      <span>{message}</span>
      {retryAction && (
        <button type="button" onClick={retryAction}>
          Retry
        </button>
      )}
    </div>
  );
}

function getBrowserPosition() {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.reject(new Error("Location access is unavailable in this browser. Enter a city or address instead."));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }),
      (error) => {
        const code = error?.code;
        if (code === 1) {
          reject(new Error("Location access is off. Enter a city, station, or address manually."));
          return;
        }
        if (code === 2) {
          reject(new Error("Location is unavailable right now. Enter a city, station, or address manually."));
          return;
        }
        reject(new Error("Location request timed out. Enter a city, station, or address manually."));
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
    );
  });
}

async function resolveCurrentLocationName(position) {
  try {
    const response = await fetch(`/api/places/reverse-geocode?lat=${position.lat}&lng=${position.lng}`);
    const data = await response.json();
    return data.name || "Current location";
  } catch {
    return "Current location";
  }
}

function locationPoint(location, userLocation, index) {
  const fallbackPoints = [
    { x: 30, y: 40 },
    { x: 65, y: 60 },
    { x: 43, y: 28 },
    { x: 70, y: 35 },
    { x: 24, y: 62 },
    { x: 56, y: 72 },
    { x: 78, y: 52 },
    { x: 36, y: 72 },
    { x: 62, y: 24 },
    { x: 20, y: 48 }
  ];
  const latDelta = location.coordinates?.lat - userLocation?.lat;
  const lngDelta = location.coordinates?.lng - userLocation?.lng;
  if (!Number.isFinite(latDelta) || !Number.isFinite(lngDelta)) return fallbackPoints[index % fallbackPoints.length];
  return {
    x: clamp(50 + lngDelta * 900, 16, 84),
    y: clamp(50 - latDelta * 900, 16, 84)
  };
}

function labelForType(type) {
  const labels = {
    hidden_gem: "Hidden Gem",
    photo_op: "Photo Op",
    viewpoint: "Viewpoint",
    nature: "Nature"
  };
  return labels[type] || "Nearby";
}

function formatMeters(value) {
  const meters = Number(value || 0);
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
  return `${Math.max(1, Math.round(meters))}m`;
}

function sourceLabel(place = {}) {
  if (place.isSample || /sample/i.test(place.provider || place.source || "")) return "Sample";
  const raw = String(place.provider || place.source || place.dataSource || "");
  if (/google/i.test(raw)) return "Google Maps";
  if (/foursquare/i.test(raw)) return "Foursquare";
  if (/osm|openstreetmap/i.test(raw) || String(place.id || "").startsWith("osm:")) return "OSM";
  return "";
}

function confidenceLabel(place = {}) {
  if (place.isSample) return "Sample";
  if (place.confidence) return String(place.confidence);
  const rating = Number(place.rating || 0);
  const count = Number(place.ratingCount || place.userRatingCount || 0);
  if (rating >= 4.2 && count >= 25) return "High confidence";
  if (rating || count || place.provider || place.source) return "Medium confidence";
  return "Low confidence";
}

function openStatusLabel(place = {}) {
  if (place.isOpenAtArrival === true || place.isOpen === true) return "Open now";
  if (place.isOpenAtArrival === false || place.isOpen === false) return "Closed";
  return "Hours unavailable";
}

function detourLabel(place = {}) {
  if (place.detourDistance) return place.detourDistance;
  if (place.distanceFromStationLabel) return place.distanceFromStationLabel;
  if (place.estimatedTime || place.walkingTime) return `+${place.estimatedTime || place.walkingTime} min detour`;
  return formatMeters(place.distance || place.distanceMeters || 0);
}

function layoverMinutes(value = "2 hours") {
  const map = {
    "45 min": 45,
    "1 hour": 60,
    "2 hours": 120,
    "4 hours": 240,
    "Half day": 360
  };
  return map[value] || 120;
}

function layoverRadius(value = "2 hours", method = "Walking") {
  const base = {
    "45 min": 900,
    "1 hour": 1400,
    "2 hours": 2600,
    "4 hours": 5200,
    "Half day": 8000
  }[value] || 2600;
  if (method === "Taxi/rideshare") return Math.min(base * 2, 12000);
  if (method === "Public transport") return Math.min(Math.round(base * 1.45), 10000);
  return base;
}

function annotateLayoverStop(place, minutesAvailable, returnBuffer, method = "Walking") {
  const baseTravel = Number(place.walkingTime || place.estimatedTime || 0) || Math.max(6, Math.round((place.distance || 900) / 90));
  const methodMultiplier = method === "Taxi/rideshare" ? 0.65 : method === "Public transport" ? 0.9 : 1;
  const timeThere = Math.max(4, Math.round(baseTravel * methodMultiplier));
  const timeBack = Math.max(4, Math.round(baseTravel * methodMultiplier));
  const visitTime = Math.max(10, Math.min(75, minutesAvailable - returnBuffer - timeThere - timeBack));
  const totalTime = timeThere + timeBack + Math.max(0, visitTime) + returnBuffer;
  return {
    ...place,
    timeThere,
    timeBack,
    visitTime: Math.max(0, visitTime),
    returnBuffer,
    totalLayoverTime: totalTime,
    fitsLayoverWindow: totalTime <= minutesAvailable && visitTime > 0,
    detourDistance: `${timeThere} min from hub`
  };
}

function normalizeIntelligencePlace(location, index = 0) {
  const lat = location.coordinates?.lat ?? location.lat;
  const lng = location.coordinates?.lng ?? location.lng;
  const distance = Number(location.distance || location.distanceFromStation || 0);
  const photo = location.photo || location.photos?.find((url) => /^https?:\/\//i.test(url)) || osmStaticMapPreview({ lat, lng });
  const type = location.type || (location.category === "photo-op" ? "photo_op" : "nature");
  return {
    ...location,
    lat,
    lng,
    coordinates: location.coordinates || { lat, lng },
    photo,
    photos: location.photos?.length ? location.photos : [photo],
    category: location.category || labelForType(type).toLowerCase(),
    type,
    description: location.description || "Verified map result near this scan area.",
    rating: Number(location.rating || 0),
    distance,
    detourDistance: location.detourDistance || formatMeters(distance),
    estimatedTime: location.estimatedTime || Math.max(10, Math.round((distance || 900) / 90)),
    walkingTime: location.walkingTime || Math.max(2, Math.round((distance || 400) / 80)),
    isOpenAtArrival: location.isOpenAtArrival ?? location.isOpen,
    safeForNighttime: location.safeForNighttime ?? distance <= 2500,
    photoScore: location.photoScore || 0,
    bestTime: location.bestTime || "Check current conditions",
    crowdLevel: location.crowdLevel || "Unknown",
    tags: location.tags || [labelForType(type), formatMeters(distance), location.isOpen ? "Open now" : "Check hours"],
    point: location.point || routeLocationPoint(location, index)
  };
}

function classifyDiscoveryError(message = "") {
  if (/not found|spelling|uncharted|coordinate|location/i.test(message)) {
    return { type: "coordinates", message };
  }
  if (/no verified route|route cannot|could not verify.*route|same origin|same destination|origin and destination|no route/i.test(message)) {
    return { type: "route", message };
  }
  if (/no verified|no hidden|no places|empty|zero/i.test(message)) {
    return { type: "empty", message };
  }
  if (/not configured|routing|provider|api key|routes api|temporarily unavailable/i.test(message)) {
    return { type: "system", message };
  }
  return { type: "system", message };
}

function friendlyDiscoveryMessage(error = {}, fallback = "") {
  const message = error.message || "";
  if (/ROUTING_NOT_CONFIGURED|GOOGLE_MAPS_API_KEY|OFFTRAIL_ALLOW|API key|provider|Routes API|not configured/i.test(message)) {
    return "Verified route discovery is not configured yet. Add a Google Maps server key with Routes and Places enabled, then retry.";
  }
  if (error.type === "coordinates") {
    return message || "That location could not be verified. Check the spelling or try a nearby station, landmark, or city center.";
  }
  if (error.type === "route") {
    return message || "No verified route found. Check the locations or try nearby stations and city centers.";
  }
  if (error.type === "empty") {
    return message || "No verified hidden gems came back for this route yet. Increase the radius, loosen filters, or try a nearby route.";
  }
  return message || fallback;
}

function scanStageLabel(stage = "idle") {
  const labels = {
    idle: "Awaiting Scan",
    geocoding: "Resolving Coordinates",
    routing: "Scanning Route Corridor",
    places: "Reading Live Gem Signals",
    complete: "Route Verified",
    empty: "No Echoes Detected",
    error: "Signal Interrupted"
  };
  return labels[stage] || labels.idle;
}

function scanStageHeadline(stage = "idle") {
  const headlines = {
    idle: "Ready to scan",
    geocoding: "Locking onto real coordinates",
    routing: "Tracing verified terrain",
    places: "Revealing real nearby places",
    complete: "Discovery corridor ready",
    empty: "The path is quiet",
    error: "Scan stopped safely"
  };
  return headlines[stage] || headlines.idle;
}

function formatMapCoordinate(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "NO VERIFIED COORDINATES";
  return `LAT ${lat.toFixed(4)} // LON ${lng.toFixed(4)}`;
}

function osmStaticMapPreview(point) {
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return thumbnailUrl;
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${point.lat},${point.lng}&zoom=15&size=640x360&markers=${point.lat},${point.lng},red-pushpin`;
}

function createSampleRouteResults() {
  const locations = [
    {
      id: "sample-riverside-viewpoint",
      name: "Sample: Riverside Viewpoint",
      category: "Cinematic views",
      type: "viewpoint",
      description: "A sample stop showing how verified route cards look with source and confidence badges.",
      coordinates: { lat: 50.7548, lng: 7.0747 },
      distance: 1200,
      detourDistance: "+12 min detour",
      estimatedTime: 12,
      rating: 4.6,
      ratingCount: 86,
      isOpenAtArrival: true,
      isHiddenGem: true,
      provider: "Sample",
      source: "Sample",
      confidence: "Sample",
      isSample: true,
      tags: ["Sample", "Cinematic", "Verified card pattern"]
    },
    {
      id: "sample-local-food-stop",
      name: "Sample: Local Food Stop",
      category: "Food stops",
      type: "food",
      description: "Sample food card with a safe return estimate. Production mode requires a provider-backed place.",
      coordinates: { lat: 50.8291, lng: 7.0447 },
      distance: 2100,
      detourDistance: "+18 min detour",
      estimatedTime: 18,
      rating: 4.4,
      ratingCount: 124,
      isOpenAtArrival: null,
      isHiddenGem: false,
      provider: "Sample",
      source: "Sample",
      confidence: "Sample",
      isSample: true,
      tags: ["Sample", "Food", "Return-friendly"]
    },
    {
      id: "sample-heritage-garden",
      name: "Sample: Heritage Garden",
      category: "Nature escape",
      type: "nature",
      description: "A sample nature stop used only to preview the experience without claiming provider verification.",
      coordinates: { lat: 50.902, lng: 6.9845 },
      distance: 900,
      detourDistance: "+9 min detour",
      estimatedTime: 9,
      rating: 4.7,
      ratingCount: 54,
      isOpenAtArrival: true,
      isHiddenGem: true,
      provider: "Sample",
      source: "Sample",
      confidence: "Sample",
      isSample: true,
      tags: ["Sample", "Nature", "Short detour"]
    }
  ];

  return {
    isSample: true,
    total: locations.length,
    route: {
      distance: "31 km",
      duration: "32 min",
      segments: [{ from: "Bonn, Germany", to: "Cologne, Germany" }],
      path: [
        [50.7374, 7.0982],
        [50.7548, 7.0747],
        [50.8291, 7.0447],
        [50.902, 6.9845],
        [50.9375, 6.9603]
      ]
    },
    locations
  };
}

function routeLocationPoint(location, index = 0, bounds = null, routePath = []) {
  const coordinates = placeCoordinates(location);
  if (bounds && Number.isFinite(coordinates.lat) && Number.isFinite(coordinates.lng)) {
    const point = toPercent(coordinates, bounds);
    const routeAnchor = closestRoutePoint(coordinates, routePath);
    const anchor = routeAnchor ? toPercent(routeAnchor, bounds) : { x: point.x, y: point.y };
    return {
      x: clamp(point.x, 14, 86),
      y: clamp(point.y, 14, 86),
      routeX: clamp(anchor.x, 8, 92),
      routeY: clamp(anchor.y, 8, 92)
    };
  }
  if (location.point) return location.point;
  const points = [
    { x: 31, y: 54, routeX: 28, routeY: 57 },
    { x: 58, y: 31, routeX: 51, routeY: 38 },
    { x: 74, y: 64, routeX: 72, routeY: 58 },
    { x: 43, y: 25, routeX: 39, routeY: 43 },
    { x: 23, y: 69, routeX: 21, routeY: 73 },
    { x: 66, y: 47, routeX: 61, routeY: 43 },
    { x: 82, y: 30, routeX: 77, routeY: 39 },
    { x: 38, y: 73, routeX: 34, routeY: 68 },
    { x: 52, y: 67, routeX: 52, routeY: 45 },
    { x: 71, y: 22, routeX: 74, routeY: 32 }
  ];
  return points[index % points.length];
}

function downsamplePoints(points, maxPoints) {
  if (points.length <= maxPoints) return points;
  const step = (points.length - 1) / (maxPoints - 1);
  const result = [];
  for (let i = 0; i < maxPoints; i += 1) result.push(points[Math.round(i * step)]);
  return result;
}

// Real road-traced GPS points zigzag at the density OSRM returns them; a
// Catmull-Rom spline through a thinned-out set of points reads as a real
// road instead of a jagged polyline.
function smoothPathFromPoints(points) {
  if (points.length < 3) {
    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
  }
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

function routePathData(path = [], bounds = null) {
  if (!bounds || !Array.isArray(path) || path.length < 2) {
    return "M 10 78 C 27 72 32 34 51 38 S 72 78 88 18";
  }
  const points = downsamplePoints(path, 80).map(([lat, lng]) => toPercent({ lat, lng }, bounds));
  return smoothPathFromPoints(points);
}

function closestRoutePoint(point, routePath = []) {
  if (!Array.isArray(routePath) || !routePath.length) return null;
  let best = null;
  let bestDistance = Infinity;
  for (const [lat, lng] of routePath) {
    const distance = Math.hypot(point.lat - lat, point.lng - lng);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = { lat, lng };
    }
  }
  return best;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function syncUrl(snapshot, mode = "push") {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.search = "";
  if (snapshot.modal) {
    url.searchParams.set("modal", modalUrlMap[snapshot.modal] || snapshot.modal);
  } else if (snapshot.menuOpen) {
    url.searchParams.set("menu", "main");
  } else if (snapshot.view === "content") {
    url.searchParams.set("page", snapshot.contentPage || "how");
  } else if (snapshot.view && snapshot.view !== "home") {
    url.searchParams.set("view", snapshot.view);
  }
  const method = mode === "replace" ? "replaceState" : "pushState";
  window.history[method]({ offtrail: true }, "", `${url.pathname}${url.search}${url.hash}`);
}

function parseUrlState() {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const modalParam = params.get("modal");
  const pageParam = params.get("page");
  const viewParam = params.get("view");
  const allowedViews = new Set(["home", "routeDiscovery", "nearby", "layover", "results", "itinerary", "dashboard", "favorites", "profile", "routeDetail"]);
  return {
    modal: modalParam ? modalFromUrlMap[modalParam] || null : null,
    menuOpen: params.get("menu") === "main",
    contentPage: pageParam && pageContent[pageParam] ? pageParam : null,
    view: viewParam && allowedViews.has(viewParam) ? viewParam : null
  };
}

function isTypingTarget(target) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

async function geocode(value) {
  const response = await fetch(`/api/places/geocode?query=${encodeURIComponent(value)}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Location not found.");
  return data;
}

function updateLayover(setLayovers, id, patch) {
  setLayovers((layovers) => layovers.map((layover) => (layover.id === id ? { ...layover, ...patch } : layover)));
}

function toggleSet(set, setSet, key) {
  const next = new Set(set);
  next.has(key) ? next.delete(key) : next.add(key);
  setSet(next);
}

function readStorage(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage is optional; in-memory state still keeps the current session functional.
  }
}

function removeStorage(key) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Storage is optional; sign-out state is already applied in memory.
  }
}

function toggleFavorite(favorites, location) {
  return favorites.some((item) => item.id === location.id)
    ? favorites.filter((item) => item.id !== location.id)
    : [location, ...favorites];
}

function makeBounds(path, locations) {
  const points = [
    ...path.map(([lat, lng]) => ({ lat, lng })),
    ...locations.map(({ lat, lng }) => ({ lat, lng }))
  ];
  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs)
  };
}

function toPercent(point, bounds) {
  const lngRange = bounds.maxLng - bounds.minLng || 1;
  const latRange = bounds.maxLat - bounds.minLat || 1;
  return {
    x: 8 + ((point.lng - bounds.minLng) / lngRange) * 84,
    y: 92 - ((point.lat - bounds.minLat) / latRange) * 84
  };
}

function addMinutes(start, minutes) {
  const [hourPart, minutePart] = start.replace(" AM", "").split(":").map(Number);
  const date = new Date(2026, 0, 1, hourPart, minutePart + minutes);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function toDatetimeLocal(value) {
  const date = value instanceof Date ? value : new Date(value);
  const safe = Number.isNaN(date.getTime()) ? new Date() : date;
  const offset = safe.getTimezoneOffset();
  return new Date(safe.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function minutesBetweenTimes(start = "03:00", end = "07:00") {
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  if (![startHour, startMinute, endHour, endMinute].every(Number.isFinite)) return 0;
  let startTotal = startHour * 60 + startMinute;
  let endTotal = endHour * 60 + endMinute;
  if (endTotal <= startTotal) endTotal += 24 * 60;
  return endTotal - startTotal;
}

export default App;
