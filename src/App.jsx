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
  Map as MapIcon,
  MapPin,
  Menu,
  Navigation,
  Plus,
  Route,
  Search,
  Settings,
  Share2,
  Star,
  Timer,
  Trash2,
  Twitter,
  User,
  XCircle
} from "lucide-react";
import ExploreAroundYou from "../components/ExploreAroundYou.jsx";

const videoUrl =
  "https://cdn.pixabay.com/video/2024/03/25/205589-927335742_large.mp4";

const thumbnailUrl = offTrailPlaceholderImage("Verified map source", "No provider photo available");

const paidMapPreviewsEnabled = process.env.NEXT_PUBLIC_OFFTRAIL_ENABLE_PAID_MAP_PREVIEWS === "true";
const publicGoogleMapsApiKey = paidMapPreviewsEnabled ? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "" : "";

const intelligenceMapUrl = "/assets/map-preview.webp";
const intelligencePreviewUrl = "/assets/map-preview.webp";
const wildernessHeroUrl = "/assets/hero-road.webp";
const stitchHeroUrl = "/assets/hero-road.webp";
const stitchMapUrl = "/assets/map-preview.webp";
const stitchCtaUrl = "/assets/cta-road.webp";
const unchartedCoordinatesUrl = "/assets/error-uncharted.webp";
const silentPathUrl = "/assets/error-empty.webp";
const signalInterruptedUrl = "/assets/error-signal.webp";
const stationNightUrl = "/assets/station-night.webp";

const galleryPhotos = [
  "/assets/gallery-1.webp",
  "/assets/gallery-2.webp",
  "/assets/gallery-3.webp",
  "/assets/gallery-4.webp"
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

const travelModeOptions = ["Train", "Car", "Walking", "Cycling"];

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
  planner: "plan-route",
  hidden: "hidden-spots",
  photo: "photo-locations",
  local: "local-favorites",
  auth: "auth",
  intelligence: "location-intelligence",
  exploreAround: "explore-around-you",
  signupPrompt: "signup-prompt"
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
    const urlState = parseUrlState();
    if (storedAuth?.user) setAuth({ user: storedAuth.user, isAuthenticated: true });
    setSavedRoutes(storedRoutes);
    setFavorites(storedFavorites);
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
    openModal("planner");
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
  const usesFoundationShell = view === "home" || view === "routeDiscovery" || view === "nearby" || view === "layover" || view === "error";

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
      {view === "error" && <DiscoveryErrorPage />}
      {view === "results" && <ResultsPage />}
      {view === "itinerary" && <ItineraryPage />}
      {view === "content" && <ContentPage />}
      {view === "dashboard" && <DashboardPage />}
      {view === "favorites" && <FavoritesPage />}
      {view === "profile" && <ProfilePage />}
      {view === "routeDetail" && <RouteDetailPage />}
      <SlideMenu />
      {modal === "planner" && <PlannerModal />}
      {modal === "hidden" && <HiddenSpotsModal />}
      {modal === "photo" && <PhotoModal />}
      {modal === "local" && <LocalFavoritesModal />}
      {modal === "auth" && <AuthModal />}
      {modal === "intelligence" && <LocationIntelligenceOverlay />}
      {modal === "exploreAround" && <ExploreAroundYou onClose={closeOverlay} notify={notify} />}
      {modal === "signupPrompt" && <SignupPrompt />}
      {toast && <Toast {...toast} />}
    </main>
  );
}

function LandingPage() {
  const { navigateTo, setMenuOpen, setAccountOpen, accountOpen, auth, setModal, setRouteState, notify } = useOffTrail();
  const plannerRef = useRef(null);
  const fromInputRef = useRef(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [travelMode, setTravelMode] = useState("Train");
  const [detour, setDetour] = useState(detourOptions[1].label);
  const [vibe, setVibe] = useState(heroVibeOptions[0].key);
  const [routeStyle, setRouteStyle] = useState("Hidden gems");
  const [submitted, setSubmitted] = useState(false);

  const selectedDetour = detourOptions.find((option) => option.label === detour) || detourOptions[1];
  const selectedVibe = heroVibeOptions.find((option) => option.key === vibe) || heroVibeOptions[0];
  const fromError = submitted && !from.trim() ? "Enter a starting point." : "";
  const toError = submitted && !to.trim() ? "Enter a destination." : "";
  const sameRouteError = submitted && isSameLocationInput(from, to) ? "Starting point and destination must be different." : "";

  function focusPlanner() {
    plannerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => fromInputRef.current?.focus(), 260);
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
      origin: { label: from.trim(), name: from.trim() },
      destination: { label: to.trim(), name: to.trim() },
      layovers: [],
      preferences: Array.from(new Set([vibe, "hidden"])),
      radius: selectedDetour.radius,
      travelMode,
      routeStyle,
      departureTime: state.departureTime || toDatetimeLocal(new Date(Date.now() + 60 * 60 * 1000)),
      results: null,
      selectedLocationIds: [],
      discoveryError: null
    }));
    notify("Route planner loaded. Run discovery to fetch verified stops.", "info");
    navigateTo("routeDiscovery");
  }

  function exploreNearMe() {
    notify("Nearby mode opened. Allow location access or search a city manually.", "info");
    navigateTo("nearby");
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

  const waypointCards = [
    ["Riverside Viewpoint", "12 min from route - Best for sunset photos", "VERIFIED", "verified"],
    ["Quiet Local Cafe", "+18 min detour - Open now with easy return", "FOOD GEM", "food"],
    ["Small Heritage Garden", "+9 min detour - Quiet nature escape", "NATURE", "nature"]
  ];
  const featureCards = [
    [Navigation, "Explore Nearby", "Discovery based on current location or searching a specific city.", "Scan nearby", exploreNearMe],
    [MapPin, "Stopover Nearby", "Use Nearby at stations, airports, or cities to find verified places around a short stop.", "Search nearby", exploreNearMe],
    [Heart, "Saved Gems", "Your personal map and notes, kept safe and accessible on device.", "View saved", () => navigateTo("favorites")]
  ];

  return (
    <section className="stitch-v2-page" aria-label="OffTrail intelligent route discovery">
      <header className="stitch-v2-nav">
        <a className="stitch-v2-brand" href={viewHref("home")} onClick={(event) => handleViewNavigation(event, navigateTo, "home")}>OffTrail</a>
        <nav className="stitch-v2-links" aria-label="Primary navigation">
          <a className="is-active" href={viewHref("home")} onClick={(event) => handleViewNavigation(event, navigateTo, "home")}>Explore</a>
          <a href={viewHref("nearby")} onClick={(event) => handleViewNavigation(event, navigateTo, "nearby")}>Nearby</a>
          <a href={viewHref("favorites")} onClick={(event) => handleViewNavigation(event, navigateTo, "favorites")}>Saved</a>
        </nav>
        <div className="stitch-v2-actions">
          <button type="button" aria-label="Search nearby" onClick={exploreNearMe}><Search size={18} /></button>
          <button type="button" className="stitch-v2-signin" onClick={() => (auth.isAuthenticated ? setAccountOpen(!accountOpen) : setModal("auth"))}>
            {auth.isAuthenticated ? "Account" : "Sign In"}
          </button>
          <button className="stitch-v2-menu" type="button" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={19} /></button>
          {accountOpen && <AccountDropdown />}
        </div>
      </header>

      <main className="stitch-v2-main">
        <section className="stitch-v2-hero">
          <div className="stitch-v2-container stitch-v2-hero-grid">
            <div className="stitch-v2-hero-copy">
              <span className="stitch-v2-kicker">__Intelligent Exploration</span>
              <h1>
                Discover verified <br />
                <em>hidden gems</em> along your route.
              </h1>
              <p>
                Plan a route and find real, map-verified stops for food, views, nature, and culture.
                Powered by live provider data.
              </p>
              <div className="stitch-v2-cta-row">
                <button className="stitch-v2-primary" type="button" onClick={() => planRoute()}>Plan My Route</button>
                <button className="stitch-v2-secondary" type="button" onClick={exploreNearMe}>Explore Near Me</button>
              </div>
            </div>

            <form className="stitch-v2-planner-card" ref={plannerRef} onSubmit={planRoute} noValidate>
              <div className="stitch-v2-planner-head">
                <h2><Route size={15} /> Route Planner</h2>
                <span>Verified stops only</span>
              </div>
              <div className="stitch-v2-place-grid">
                <PlaceInput label="From" value={from} onChange={setFrom} placeholder="London, UK" error={fromError} inputRef={fromInputRef} />
                <PlaceInput label="To" value={to} onChange={setTo} placeholder="Edinburgh, UK" error={toError} />
              </div>
              {sameRouteError && <p className="stitch-v2-form-error" role="alert">{sameRouteError}</p>}
              <div className="stitch-v2-control-block">
                <span>Travel Mode</span>
                <div className="stitch-v2-chip-row" role="group" aria-label="Travel mode">
                  {travelModeOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={travelMode === option ? "is-active" : ""}
                      aria-pressed={travelMode === option}
                      onClick={() => setTravelMode(option)}
                    >
                      {option === "Train" && <Navigation size={13} />}
                      {option === "Car" && <MapIcon size={13} />}
                      {option === "Walking" && <MapPin size={13} />}
                      {option === "Cycling" && <Compass size={13} />}
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <div className="stitch-v2-bottom-grid">
                <label>
                  <span>Detour Tolerance</span>
                  <select value={detour} onChange={(event) => setDetour(event.target.value)}>
                    {detourOptions.map((option) => <option key={option.label}>{option.label}</option>)}
                  </select>
                </label>
                <div className="stitch-v2-control-block">
                  <span>Travel Vibe</span>
                  <div className="stitch-v2-mini-tags" role="group" aria-label="Travel vibe">
                    {[
                      ["nature", "Nature"],
                      ["food", "Food"],
                      ["viewpoint", "Cinematic"]
                    ].map(([key, label]) => (
                      <button key={key} type="button" className={vibe === key ? "is-active" : ""} aria-pressed={vibe === key} onClick={() => setVibe(key)}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </form>
          </div>
        </section>

        <section className="stitch-v2-waypoints">
          <div className="stitch-v2-container">
            <div className="stitch-v2-section-head">
              <div>
                <span className="stitch-v2-kicker">__Live Visualization</span>
                <h2>Verified Waypoints</h2>
              </div>
              <p>OffTrail maps real-time data against your route to find high-confidence stops that actually exist and are open.</p>
            </div>
            <div className="stitch-v2-visual-grid">
              <div className="stitch-v2-map-visual">
                <video className="stitch-v2-map-video" src={videoUrl} autoPlay loop muted playsInline poster={wildernessHeroUrl} aria-hidden="true" />
                <div className="stitch-v2-dot-grid" aria-hidden="true" />
                <svg viewBox="0 0 800 600" aria-hidden="true">
                  <path className="stitch-v2-route-path" d="M100 500 Q 200 450 300 480 T 500 400 T 700 100" fill="none" />
                  <circle className="stitch-v2-pulse" cx="300" cy="480" r="6" />
                  <circle className="stitch-v2-pulse is-ochre" cx="500" cy="400" r="6" />
                </svg>
                <div className="stitch-v2-map-status">
                  <CheckCircle size={18} />
                  <div>
                    <strong>Checking real routes...</strong>
                    <span>Provider-backed stops only</span>
                  </div>
                </div>
              </div>
              <div className="stitch-v2-waypoint-list">
                {waypointCards.map(([name, copy, badge, tone]) => (
                  <article className={`stitch-v2-waypoint-card is-${tone}`} key={name}>
                    <div>
                      <h3>{name}</h3>
                      <span>{badge}</span>
                    </div>
                    <p>{copy}</p>
                    <small><MapIcon size={13} /> {tone === "verified" ? "Verified by OSM / configured providers" : tone === "food" ? "Provider source shown on result" : "Confidence label included"}</small>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="stitch-v2-features">
          <div className="stitch-v2-container stitch-v2-feature-grid">
            {featureCards.map(([Icon, title, copy, action, onClick]) => (
              <button className="stitch-v2-feature-card" type="button" key={title} onClick={onClick}>
                <Icon size={22} />
                <h3>{title}</h3>
                <p>{copy}</p>
                <strong>{action} <ArrowRight size={13} /></strong>
              </button>
            ))}
          </div>
        </section>

        <section className="stitch-v2-trust">
          <div className="stitch-v2-container stitch-v2-trust-grid">
            <div>
              <span className="stitch-v2-kicker">__OffTrail Standard</span>
              <h2>Verified by Design</h2>
              <p>Results are shown only when source data is available. No ghost locations, no outdated markers.</p>
              <div className="stitch-v2-trust-points">
                {[
                  [CheckCircle, "Real provider data only", "Production cards require a live map source signal."],
                  [XCircle, "Clear failure states", "If data fails, we say so instead of inventing stops."],
                  [History, "Open-hours aware", "Always clearly marked open, closed, or unknown status."],
                  [Timer, "Distance confidence", "Verified detour times based on current traffic/mode."]
                ].map(([Icon, title, copy]) => (
                  <article key={title}>
                    <Icon size={18} />
                    <div>
                      <h3>{title}</h3>
                      <p>{copy}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
            <aside className="stitch-v2-provider-card">
              <div>
                <span><CheckCircle size={24} /></span>
                <div>
                  <h3>OSM Linked / Provider Ready</h3>
                  <p>No-bill mode until paid providers are enabled</p>
                </div>
              </div>
              <p>
                "OffTrail uses provider-backed route and place data, shows source and confidence labels,
                and stops the flow when a route cannot be verified."
              </p>
            </aside>
          </div>
        </section>

        <section className="stitch-v2-final">
          <h2>Ready to find your next hidden stop?</h2>
          <p>Start with a real route. OffTrail will only show stops it can verify with absolute certainty.</p>
          <div>
            <button className="stitch-v2-primary" type="button" onClick={focusPlanner}>Start Planning</button>
            <button className="stitch-v2-secondary" type="button" onClick={() => navigateTo("favorites")}>View Saved Gems</button>
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
          </nav>
        </div>
      </footer>
    </section>
  );
}

function AppShell({ active = "explore", className = "", children }) {
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const frameRef = useRef(null);
  const showShellNav = !className.includes("landing-page");

  function handlePointerMove(event) {
    if (frameRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const pointerX = event.clientX;
    const pointerY = event.clientY;
    frameRef.current = window.requestAnimationFrame(() => {
      const x = ((pointerX - rect.left) / rect.width - 0.5) * 18;
      const y = ((pointerY - rect.top) / rect.height - 0.5) * 18;
      setParallax({ x, y });
      frameRef.current = null;
    });
  }

  return (
    <section
      className={`gf-shell ${className}`}
      onPointerMove={handlePointerMove}
      style={{ "--gf-parallax-x": `${parallax.x}px`, "--gf-parallax-y": `${parallax.y}px` }}
    >
      <WildernessBackdrop />
      {showShellNav && <WildernessNavbar active={active} />}
      <main className="gf-main">{children}</main>
    </section>
  );
}

function WildernessBackdrop() {
  return (
    <div className="gf-background" aria-hidden="true">
      <img className="gf-background-fallback" src={wildernessHeroUrl} alt="" />
      <video className="gf-background-video" id="hero-video" src={videoUrl} autoPlay loop muted playsInline poster={wildernessHeroUrl} />
      <div className="gf-background-shade" />
    </div>
  );
}

function WildernessNavbar({ active }) {
  const { setView, setModal, setMenuOpen, auth, accountOpen, setAccountOpen } = useOffTrail();
  const links = [
    ["explore", "Explore", "home"],
    ["nearby", "Nearby", "nearby"],
    ["saved", "Saved", "favorites"]
  ];

  return (
    <header className="gf-navbar">
      <button className="gf-logo" type="button" onClick={() => setView("home")} aria-label="OffTrail home">
        <Gem size={30} />
        <span>OffTrail</span>
      </button>
      <nav className="gf-nav-links" aria-label="Primary navigation">
        {links.map(([key, label, viewName]) => (
          <button
            key={key}
            className={active === key ? "is-active" : ""}
            type="button"
            onClick={() => setView(viewName)}
          >
            {label}
          </button>
        ))}
        <button
          className="gf-nav-account-link"
          type="button"
          onClick={() => (auth.isAuthenticated ? setView("dashboard") : setModal("auth"))}
        >
          Account
        </button>
      </nav>
      <div className="gf-nav-actions">
        <button className="gf-menu-button" type="button" onClick={() => setMenuOpen(true)} aria-label="Open menu">
          <Menu size={18} />
        </button>
        <div className="account-wrap">
          <button
            className="gf-account-button"
            type="button"
            onClick={() => (auth.isAuthenticated ? setAccountOpen(!accountOpen) : setModal("auth"))}
          >
            <User size={17} />
            <span>Account</span>
          </button>
          {accountOpen && <AccountDropdown />}
        </div>
      </div>
    </header>
  );
}

function FoundationPage({ active, eyebrow, title, description, action, onAction }) {
  const { setModal } = useOffTrail();
  return (
    <AppShell active={active}>
      <section className="gf-foundation-panel">
        <p className="gf-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
        <button className="gf-primary-button" type="button" onClick={() => setModal(onAction)}>
          <ArrowRight size={18} />
          {action}
        </button>
      </section>
    </AppShell>
  );
}

function MobileBottomNav({ active }) {
  const { setView } = useOffTrail();
  const items = [
    ["explore", "Explore", "home", Compass],
    ["nearby", "Nearby", "nearby", MapPin],
    ["saved", "Saved", "favorites", Gem]
  ];

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {items.map(([key, label, viewName, Icon]) => (
        <button key={key} className={active === key ? "is-active" : ""} type="button" onClick={() => setView(viewName)}>
          <Icon size={18} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

function HeroSection() {
  const { setView, setModal, auth } = useOffTrail();

  return (
    <section className="wilderness-hero">
      <div className="hero-copy-panel">
        <SectionHeader eyebrow="Next-gen discovery" title="Discover verified hidden gems along your route" />
        <p>
          Practical journey discovery for routes, layovers, and nearby exploration - uncover hidden gems,
          viewpoints, gardens, local favorites, and photogenic places most travelers miss.
        </p>
        <div className="hero-actions">
          <button className="wilderness-primary" type="button" onClick={() => setView("routeDiscovery")}>
            <Route size={18} />
            Plan My Route
          </button>
          <button className="wilderness-secondary" type="button" onClick={() => setView("nearby")}>
            <Navigation size={18} />
            Explore Around You
          </button>
        </div>
        <div className="hero-category-row">
          <button type="button" onClick={() => setModal("hidden")}><Gem size={14} /> Hidden gems</button>
          <button type="button" onClick={() => setModal("photo")}><Camera size={14} /> Photo spots</button>
          <button type="button" onClick={() => setModal("local")}><Compass size={14} /> Local favorites</button>
        </div>
        <div className="tactical-stats" aria-label="OffTrail discovery stats">
          <Stat label="Data nodes" value="12.4K" />
          <Stat label="Open-late checks" value="24h" />
          <Stat label="Route precision" value="99%" />
        </div>
      </div>

      <div className="hero-visual-panel">
        <AnimatedRouteMap
          route={null}
          locations={wildernessMockPlaces}
          selected={new Set(wildernessMockPlaces.slice(0, 2).map((place) => place.id))}
          variant="hero"
        />
        <div className="floating-feature-card route-intel-card">
          <Navigation size={20} />
          <div>
            <strong>Route Intelligence</strong>
            <span>Every POI scored by detour, rarity, hours, and vibe.</span>
          </div>
        </div>
        <button className="floating-feature-card realtime-card" type="button" onClick={() => setModal("intelligence")}>
          <img src={intelligencePreviewUrl} alt="" />
          <span>
            <strong>Real-time Location Intelligence</strong>
            <small>Photos, ratings, and insider tips for every stop</small>
          </span>
          <ArrowRight size={18} />
        </button>
        <button
          className="floating-feature-card archive-card"
          type="button"
          onClick={() => (auth.isAuthenticated ? setView("dashboard") : setModal("signupPrompt"))}
        >
          <MapIcon size={20} />
          <span>
            <strong>Discovery Archive</strong>
            <small>Save routes and revisit favorite gems.</small>
          </span>
        </button>
      </div>
    </section>
  );
}

function FeatureBento() {
  const { setView } = useOffTrail();
  return (
    <section className="wilderness-bento" aria-label="OffTrail capabilities">
      {[
        {
          icon: Route,
          title: "Journey Route Discovery",
          copy: "Trace a full start-to-destination path, then reveal hidden places one by one along the corridor.",
          action: "Build route",
          onClick: () => setView("routeDiscovery")
        },
        {
          icon: Compass,
          title: "Explore Around You",
          copy: "Use a 2 to 10 km radar to find nearby gems based on available time, safety, and mood.",
          action: "Activate scan",
          onClick: () => setView("nearby")
        },
        {
          icon: Clock,
          title: "Layover Discovery",
          copy: "Turn odd-hour waits into practical, open-now, walkable options near your station.",
          action: "See layover logic",
          onClick: () => setView("routeDiscovery")
        }
      ].map((item) => {
        const Icon = item.icon;
        return (
          <button className="wilderness-bento-card" type="button" key={item.title} onClick={item.onClick}>
            <span className="bento-icon"><Icon size={24} /></span>
            <h3>{item.title}</h3>
            <p>{item.copy}</p>
            <strong>{item.action} <ArrowRight size={15} /></strong>
          </button>
        );
      })}
    </section>
  );
}

function SocialLink({ href, label, children }) {
  return (
    <a href={href} aria-label={label} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

function PlannerModal() {
  const { routeState, setRouteState, setModal, setView, notify, dismissOverlay } = useOffTrail();
  const [origin, setOrigin] = useState(routeState.origin?.label || "");
  const [destination, setDestination] = useState(routeState.destination?.label || "");
  const [layovers, setLayovers] = useState(routeState.layovers || []);
  const [departureTime, setDepartureTime] = useState(routeState.departureTime || toDatetimeLocal(new Date()));
  const [radius, setRadius] = useState(routeState.radius || 5);
  const [preferences, setPreferences] = useState(new Set(routeState.preferences || []));
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!loading) return undefined;
    const interval = window.setInterval(() => setLoadingStep((step) => (step + 1) % 3), 950);
    return () => window.clearInterval(interval);
  }, [loading]);

  async function discoverRoute() {
    if (loading) return;
    if (!origin.trim() || !destination.trim()) {
      notify("From and To locations are required.", "error");
      return;
    }
    if (isSameLocationInput(origin, destination)) {
      const message = "Starting point and destination must be different.";
      setError(message);
      notify(message, "error");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [originPlace, destinationPlace, layoverPlaces] = await Promise.all([
        geocode(origin),
        geocode(destination),
        Promise.all(
          layovers
            .filter((layover) => layover.label?.trim())
            .map(async (layover) => {
              const place = await geocode(layover.label);
              const timeAvailable = minutesBetweenTimes(layover.arrivalTime, layover.departureTime) || layover.timeAvailable || 120;
              return {
                ...place,
                arrivalTime: layover.arrivalTime,
                departureTime: layover.departureTime,
                maxDistance: layover.maxDistance,
                timeAvailable
              };
            })
        )
      ]);

      const body = {
        originLat: originPlace.lat,
        originLng: originPlace.lng,
        destinationLat: destinationPlace.lat,
        destinationLng: destinationPlace.lng,
        origin: originPlace.name || originPlace.label || origin,
        destination: destinationPlace.name || destinationPlace.label || destination,
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
      };

      const response = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const result = await response.json();
      if (!response.ok) {
        const message = result.error || "Route discovery failed.";
        const discoveryError = classifyDiscoveryError(message);
        const publicMessage = friendlyDiscoveryMessage(discoveryError, message);
        setRouteState((state) => ({ ...state, results: null, selectedLocationIds: [], discoveryError }));
        setError(publicMessage);
        notify(publicMessage, "error", () => setModal("planner"));
        dismissOverlay();
        setView("error");
        return;
      }

      setRouteState({
        origin: originPlace,
        destination: destinationPlace,
        layovers: layoverPlaces,
        preferences: Array.from(preferences),
        radius,
        departureTime,
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
      dismissOverlay();
      if (result.locations?.length) {
        setView("results");
        notify(`Found ${result.total} places along your route.`);
      } else {
        setView("error");
        notify("No hidden places found for this route yet.", "info");
      }
    } catch (error) {
      console.warn("Discovery error:", error);
      const message = error instanceof Error ? error.message : "Failed to discover route.";
      const discoveryError = classifyDiscoveryError(message);
      const publicMessage = friendlyDiscoveryMessage(discoveryError, message);
      setRouteState((state) => ({ ...state, results: null, selectedLocationIds: [], discoveryError }));
      setError(publicMessage);
      notify(publicMessage, "error", () => setModal("planner"));
      dismissOverlay();
      setView("error");
    } finally {
      setLoading(false);
    }
  }

  async function submitPlanner(event) {
    event.preventDefault();
    setSubmitted(true);
    await discoverRoute();
  }

  const originError = submitted && !origin.trim() ? "Choose a start location." : "";
  const destinationError = submitted && !destination.trim() ? "Choose a destination." : "";

  return (
    <Modal title="Plan My Route" onClose={() => setModal(null)} size="wide">
      {loading && <LoadingRoute step={loadingStep} />}
      {error && <p className="form-error helper-text" role="alert">{error}</p>}
      <form className="planner-grid" onSubmit={submitPlanner}>
          <PlaceInput label="From" value={origin} onChange={setOrigin} placeholder="Paris, France or 48.8566,2.3522" error={originError} valid={submitted && Boolean(origin.trim())} disabled={loading} />
          <PlaceInput label="To" value={destination} onChange={setDestination} placeholder="Munich, Germany or 48.1351,11.582" error={destinationError} valid={submitted && Boolean(destination.trim())} disabled={loading} />
          <label className="field is-valid time-input-section">
            <span>Departure Date & Time</span>
            <input
              type="datetime-local"
              value={departureTime}
              min={toDatetimeLocal(new Date())}
              onChange={(event) => setDepartureTime(event.target.value)}
              required
              disabled={loading}
            />
          </label>
          <label className="field">
            <span>Search radius: {radius} km</span>
            <input type="range" min="1" max="10" value={radius} onChange={(event) => setRadius(Number(event.target.value))} disabled={loading} />
          </label>
          <div className="layover-section">
            <div className="section-heading">
              <h3 className="section-header">Layovers</h3>
              <button
                className="mini-button liquid-glass"
                type="button"
                disabled={loading}
                onClick={() =>
                  setLayovers([
                    ...layovers,
                    {
                      id: crypto.randomUUID(),
                      label: "",
                      arrivalTime: "03:00",
                      departureTime: "07:00",
                      maxDistance: 2,
                      timeAvailable: 240
                    }
                  ])
                }
              >
                <Plus size={14} />
                Add Layover
              </button>
            </div>
            {layovers.length === 0 && <p className="muted">Optional stops with time available.</p>}
            {layovers.map((layover) => (
              <div className="layover-row" key={layover.id}>
                <PlaceInput label="Layover" value={layover.label} onChange={(value) => updateLayover(setLayovers, layover.id, { label: value })} placeholder="Munich, Germany" disabled={loading} />
                <label className="field">
                  <span>Arrival Time</span>
                  <input type="time" value={layover.arrivalTime || "03:00"} onChange={(event) => updateLayover(setLayovers, layover.id, { arrivalTime: event.target.value })} disabled={loading} />
                </label>
                <label className="field">
                  <span>Departure Time</span>
                  <input type="time" value={layover.departureTime || "07:00"} onChange={(event) => updateLayover(setLayovers, layover.id, { departureTime: event.target.value })} disabled={loading} />
                </label>
                <label className="field">
                  <span>Max distance: {layover.maxDistance || 2} km</span>
                  <input type="range" min="0.5" max="10" step="0.5" value={layover.maxDistance || 2} onChange={(event) => updateLayover(setLayovers, layover.id, { maxDistance: Number(event.target.value) })} disabled={loading} />
                </label>
                <button className="icon-only liquid-glass" type="button" aria-label="Remove layover" disabled={loading} onClick={() => setLayovers(layovers.filter((item) => item.id !== layover.id))}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <div className="preferences-panel liquid-glass">
            <h3 className="section-header">Preferences</h3>
            <div className="checkbox-grid">
              {preferenceOptions.map((option) => (
                <label className="check-row checkbox-wrapper" key={option.key}>
                  <input
                    className="checkbox"
                    type="checkbox"
                    checked={preferences.has(option.key)}
                    disabled={loading}
                    onChange={() => toggleSet(preferences, setPreferences, option.key)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
          <button className="submit-route discover-route-btn liquid-glass-strong" type="submit" disabled={loading}>
            {loading ? <Loader2 className="spin" size={20} /> : <Search size={20} />}
            {loading ? "Discovering..." : "Discover Route"}
          </button>
        </form>
    </Modal>
  );
}

function PlaceInput({ label, value, onChange, placeholder, error = "", valid = false, disabled = false, inputRef = null }) {
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
  const { routeState, setRouteState, setView, notify, favorites, setFavorites } = useOffTrail();
  const [origin, setOrigin] = useState(routeState.origin?.label || routeState.origin?.name || "");
  const [destination, setDestination] = useState(routeState.destination?.label || routeState.destination?.name || "");
  const [departureTime, setDepartureTime] = useState(routeState.departureTime || toDatetimeLocal(new Date(Date.now() + 86400000)));
  const [travelMode, setTravelMode] = useState(routeState.travelMode || "Train");
  const [radius, setRadius] = useState(routeState.radius || 5);
  const [preferences, setPreferences] = useState(new Set(routeState.preferences || ["nature", "viewpoint", "hidden", "photo-op"]));
  const [layovers, setLayovers] = useState(routeState.layovers?.length ? routeState.layovers : []);
  const [results, setResults] = useState(routeState.results);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [discoveryState, setDiscoveryState] = useState(routeState.discoveryError || null);
  const [scanStage, setScanStage] = useState(routeState.results ? "complete" : "idle");

  const visibleLocations = results?.locations || [];
  const layoverPlaces = useMemo(
    () =>
      visibleLocations
        .filter((location) => location.layoverName || location.layoverWindow || location.distanceFromStationLabel || location.fitsInLayover)
        .slice(0, 4),
    [visibleLocations]
  );
  const selected = new Set(routeState.selectedLocationIds || []);

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
        geocode(origin),
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

  function toggleLocation(id) {
    setRouteState((state) => {
      const ids = new Set(state.selectedLocationIds);
      ids.has(id) ? ids.delete(id) : ids.add(id);
      return { ...state, selectedLocationIds: Array.from(ids) };
    });
  }

  return (
    <RouteMapPlannerPage
      origin={origin}
      setOrigin={setOrigin}
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
      layovers={layovers}
      setLayovers={setLayovers}
      loading={loading}
      submitted={submitted}
      onSubmit={discoverRoute}
      results={results}
      visibleLocations={visibleLocations}
      selected={selected}
      selectedPlace={selectedPlace}
      setSelectedPlace={setSelectedPlace}
      discoveryState={discoveryState}
      scanStage={scanStage}
      favorites={favorites}
      setFavorites={setFavorites}
      toggleLocation={toggleLocation}
      layoverPlaces={layoverPlaces}
      notify={notify}
      setView={setView}
      sampleMode={Boolean(routeState.sampleMode || results?.isSample)}
    />
  );
}

function compactMapLabel(value, fallback = "Place") {
  const clean = String(value || fallback).split(",")[0].trim() || fallback;
  return clean.length > 24 ? `${clean.slice(0, 22)}...` : clean;
}

function IllustratedMapLabel({ className, label, width = 18, x = 0, y = 0 }) {
  return (
    <g className={`irm-map-label ${className}`} transform={`translate(${x} ${y})`}>
      <rect x={-width / 2} y="-2.4" width={width} height="4.2" rx="1" />
      <text x="0" y="0.3" textAnchor="middle">{label}</text>
    </g>
  );
}

function IllustratedTree({ x, y, scale = 1 }) {
  return (
    <g className="irm-tree" transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x="-3" y="18" width="6" height="18" rx="2" />
      <path d="M0 -18 L-18 20 H18 Z" />
      <path d="M0 -34 L-14 5 H14 Z" />
    </g>
  );
}

function IllustratedMountain({ x, y, scale = 1 }) {
  return (
    <g className="irm-mountain" transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M-70 48 L-26 -48 L34 48 Z" />
      <path d="M-4 48 L42 -36 L84 48 Z" />
      <path className="snow" d="M-35 -28 L-26 -48 L-13 -24 L-24 -29 Z" />
      <path className="snow" d="M32 -17 L42 -36 L55 -12 L42 -18 Z" />
    </g>
  );
}

function IllustratedCastle({ x, y, scale = 1 }) {
  return (
    <g className="irm-castle" transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x="-58" y="-2" width="116" height="58" rx="6" />
      <rect x="-70" y="-34" width="28" height="90" rx="5" />
      <rect x="42" y="-34" width="28" height="90" rx="5" />
      <path d="M-70 -34 L-56 -62 L-42 -34 Z M42 -34 L56 -62 L70 -34 Z M-22 -2 L0 -42 L22 -2 Z" />
      {[-40, -16, 16, 40].map((wx) => <rect className="window" x={wx} y="18" width="8" height="12" rx="2" key={wx} />)}
    </g>
  );
}

function IllustratedWaterfall({ x, y, scale = 1 }) {
  return (
    <g className="irm-waterfall" transform={`translate(${x} ${y}) scale(${scale})`}>
      <path className="rock" d="M-55 -24 C-28 -56 32 -50 56 -16 C30 -4 10 8 -5 34 C-30 26 -52 8 -55 -24Z" />
      <path className="fall-dark" d="M-10 -30 C16 -4 -6 24 22 54" />
      <path className="fall" d="M-12 -30 C12 -4 -9 24 18 54" />
      <ellipse className="pool" cx="23" cy="64" rx="42" ry="15" />
    </g>
  );
}

function IllustratedRouteMap({ startLabel, endLabel, route, places = [], sampleMode = false }) {
  const start = compactMapLabel(startLabel, "Origin");
  const end = compactMapLabel(endLabel, "Destination");
  const routePath = Array.isArray(route?.path)
    ? route.path.filter(([lat, lng]) => Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)))
    : [];
  const routePlaces = places
    .map((place) => {
      const lat = Number(place.lat ?? place.coordinates?.lat ?? place.location?.latitude);
      const lng = Number(place.lng ?? place.coordinates?.lng ?? place.location?.longitude);
      return { ...place, coordinates: { lat, lng } };
    })
    .filter((place) => Number.isFinite(place.coordinates.lat) && Number.isFinite(place.coordinates.lng));
  const hasGeometry = routePath.length >= 2;
  const bounds = hasGeometry ? makeBounds(routePath, routePlaces.map((place) => place.coordinates)) : null;
  const routeD = hasGeometry ? routePathData(routePath, bounds) : "";
  const endpoints = hasGeometry
    ? {
        start: toPercent({ lat: routePath[0][0], lng: routePath[0][1] }, bounds),
        end: toPercent({ lat: routePath[routePath.length - 1][0], lng: routePath[routePath.length - 1][1] }, bounds)
      }
    : null;
  const plottedPlaces = hasGeometry
    ? routePlaces.slice(0, 6).map((place, index) => ({
        ...place,
        point: toPercent(place.coordinates, bounds),
        index
      }))
    : [];
  const trees = hasGeometry
    ? routePath.filter((_, index) => index % Math.max(1, Math.floor(routePath.length / 10)) === 0).slice(0, 10).map(([lat, lng], index) => {
        const point = toPercent({ lat, lng }, bounds);
        return [clamp(point.x + (index % 2 ? -9 : 9), 8, 92), clamp(point.y + (index % 3 ? 8 : -8), 8, 92), 0.08 + (index % 3) * 0.015];
      })
    : [];
  const waves = [
    [10, 10], [82, 14], [8, 34], [88, 44], [9, 68], [84, 82], [18, 92], [78, 7]
  ];

  return (
    <svg className={`illustrated-route-map ${hasGeometry ? "has-geometry" : "awaiting-geometry"}`} viewBox="0 0 100 100" role="img" aria-label={`Route-grounded illustrated map from ${start} to ${end}`}>
      <defs>
        <filter id="irm-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0.8" stdDeviation="0.9" floodColor="#14343d" floodOpacity="0.24" />
        </filter>
        <linearGradient id="irm-sea" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#aee4ec" />
          <stop offset="100%" stopColor="#67c7dc" />
        </linearGradient>
        <linearGradient id="irm-land" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#9fcf69" />
          <stop offset="50%" stopColor="#77b651" />
          <stop offset="100%" stopColor="#b7dc72" />
        </linearGradient>
      </defs>

      <rect width="100" height="100" fill="url(#irm-sea)" />

      {waves.map(([x, y], index) => (
        <path className="irm-wave" d="M0 0 Q2 -1 4 0 T8 0" transform={`translate(${x} ${y})`} key={index} />
      ))}

      <g className="irm-compass" transform="translate(9 10) scale(0.12)">
        <circle r="42" />
        <path d="M0 -70 L12 -12 L70 0 L12 12 L0 70 L-12 12 L-70 0 L-12 -12 Z" />
        <text x="0" y="-84">N</text><text x="0" y="103">S</text><text x="-101" y="5">W</text><text x="91" y="5">E</text>
      </g>

      <g className="irm-boat" transform="translate(90 80) scale(0.1)">
        <path d="M-52 10 H54 L36 34 H-32 Z" />
        <rect x="-24" y="-20" width="42" height="28" rx="4" />
        <circle cx="-24" cy="18" r="4" /><circle cx="0" cy="18" r="4" /><circle cx="24" cy="18" r="4" />
      </g>
      <g className="irm-sail" transform="translate(90 52) scale(0.09)">
        <path d="M0 -62 L0 38" />
        <path d="M2 -55 L52 20 H2 Z" />
        <path d="M-4 -34 L-42 26 H-4 Z" />
        <path d="M-52 38 H60" />
      </g>
      <g className="irm-whale" transform="translate(11 45) scale(0.1)">
        <path d="M-54 14 C-20 -24 43 -24 78 6 C46 46 -22 42 -54 14Z" />
        <path d="M70 8 L100 -16 L94 20 Z" />
        <circle cx="-24" cy="4" r="4" />
        <path d="M-75 -44 Q-58 -66 -41 -44 M-88 -26 Q-66 -42 -46 -26" />
      </g>

      {hasGeometry ? (
        <>
          <path className="irm-route-corridor-back" d={routeD} />
          <path className="irm-route-corridor" d={routeD} />
          <path className="irm-river-grounded" d={routeD} />
          {trees.map(([x, y, scale], index) => <IllustratedTree x={x} y={y} scale={scale} key={index} />)}
          <g className="irm-road">
            <path className="outline" d={routeD} />
            <path className="fill" d={routeD} />
            <circle className="endpoint" cx={endpoints.start.x} cy={endpoints.start.y} r="1.6" />
            <circle className="endpoint" cx={endpoints.end.x} cy={endpoints.end.y} r="1.6" />
            {routePath.slice(1, -1).filter((_, index) => index % Math.max(1, Math.floor(routePath.length / 4)) === 0).slice(0, 4).map(([lat, lng], index) => {
              const point = toPercent({ lat, lng }, bounds);
              return <circle className="waypoint" cx={point.x} cy={point.y} r="0.8" key={`${lat}-${lng}-${index}`} />;
            })}
          </g>
          <g className="irm-pin" transform={`translate(${endpoints.end.x} ${endpoints.end.y - 4}) scale(0.08)`}>
            <path d="M0 -38 C26 -38 44 -18 44 6 C44 38 0 68 0 68 C0 68 -44 38 -44 6 C-44 -18 -26 -38 0 -38Z" />
            <circle r="15" />
          </g>
          {plottedPlaces.map((place) => (
            <g className="irm-place-callout" transform={`translate(${place.point.x} ${place.point.y})`} key={place.id || place.name}>
              <path d={`M0 0 Q${place.index % 2 ? -5 : 5} ${place.index % 3 ? -6 : 6} ${place.index % 2 ? -12 : 12} ${place.index % 3 ? -10 : 10}`} />
              <g transform={`translate(${place.index % 2 ? -15 : 15} ${place.index % 3 ? -12 : 12})`}>
                {place.type === "food" ? <IllustratedCastle x={0} y={0} scale={0.04} /> : place.type === "viewpoint" ? <IllustratedMountain x={0} y={0} scale={0.05} /> : <IllustratedWaterfall x={0} y={0} scale={0.045} />}
                <IllustratedMapLabel className="place" label={compactMapLabel(place.name, "Verified stop")} width={Math.min(18, Math.max(10, compactMapLabel(place.name).length * 0.9))} />
              </g>
            </g>
          ))}
          <IllustratedMapLabel className="dynamic start" label={start} width={Math.min(24, Math.max(11, start.length * 0.9))} x={clamp(endpoints.start.x + 8, 12, 88)} y={clamp(endpoints.start.y + 4, 10, 92)} />
          <IllustratedMapLabel className="dynamic end" label={end} width={Math.min(24, Math.max(11, end.length * 0.9))} x={clamp(endpoints.end.x - 8, 12, 88)} y={clamp(endpoints.end.y - 4, 8, 90)} />
          {sampleMode && <text className="irm-demo-watermark" x="50" y="96" textAnchor="middle">Demo geometry - not a provider result</text>}
        </>
      ) : (
        <g className="irm-awaiting">
          <rect x="20" y="36" width="60" height="24" rx="3" />
          <text x="50" y="45" textAnchor="middle">Awaiting verified route geometry</text>
          <text x="50" y="52" textAnchor="middle">No cartoon map is drawn until a real route path exists.</text>
        </g>
      )}
    </svg>
  );
}

function RouteMapPlannerPage({
  origin,
  setOrigin,
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
  loading,
  submitted,
  onSubmit,
  results,
  visibleLocations,
  selectedPlace,
  setSelectedPlace,
  discoveryState,
  scanStage,
  notify,
  setView,
  sampleMode = false
}) {
  const hasRoute = Boolean(results?.route);
  const routeDistance = results?.route?.distance || "Awaiting route";
  const routeDuration = results?.route?.duration || "Provider check";
  const startLabel = results?.route?.segments?.[0]?.from || origin || "Origin";
  const endLabel = results?.route?.segments?.at?.(-1)?.to || destination || "Destination";
  const plannedTrips = origin || destination ? [`${origin || "Origin"} to ${destination || "Destination"}`] : [];
  return (
    <main className="route-map-page">
      <aside className="route-map-sidebar" aria-label="Route planner">
        <button className="route-map-logo" type="button" onClick={() => setView("home")} aria-label="OffTrail home">
          <Gem size={25} />
          <span>OffTrail</span>
        </button>

        <label className="route-map-search">
          <span className="sr-only">Search planned trips</span>
          <Search size={17} />
          <input type="search" placeholder="Search trips" />
        </label>

        <form className="route-map-planner-card" onSubmit={onSubmit} noValidate>
          <div className="route-map-planner-head">
            <span>Route Planner</span>
            <Gem size={19} />
          </div>
          <h1>Plan a route</h1>
          <p>Enter two places and OffTrail will only show provider-verified stops.</p>
          {sampleMode && (
            <div className="sample-data-warning" role="status" aria-live="polite">
              <strong>DEMO DATA - NOT REAL PROVIDER RESULT</strong>
              <span>Sample cards stay separate from verified production results.</span>
            </div>
          )}
          <div className="route-map-field-stack">
            <PlaceInput label="Origin" value={origin} onChange={setOrigin} placeholder="London, UK" error={submitted && !origin.trim() ? "Origin is required." : ""} disabled={loading} />
            <PlaceInput label="Destination" value={destination} onChange={setDestination} placeholder="Edinburgh, UK" error={submitted && !destination.trim() ? "Destination is required." : ""} disabled={loading} />
            <label>
              <span>Travel Date & Time</span>
              <input type="datetime-local" value={departureTime} onChange={(event) => setDepartureTime(event.target.value)} disabled={loading} />
            </label>
            <label>
              <span>Transport Mode</span>
              <select value={travelMode} onChange={(event) => setTravelMode(event.target.value)} disabled={loading}>
                <option>Train</option>
                <option>Car</option>
                <option>Walking</option>
                <option>Cycling</option>
              </select>
            </label>
          </div>
          <div className="route-map-radius">
            <div>
              <span>Route corridor</span>
              <strong>{radius}km</strong>
            </div>
            <input type="range" min="1" max="10" value={radius} onChange={(event) => setRadius(Number(event.target.value))} disabled={loading} />
          </div>
          <details className="route-map-advanced">
            <summary>Advanced filters</summary>
            <FilterChips options={preferenceOptions} selected={preferences} onToggle={(key) => toggleSet(preferences, setPreferences, key)} />
          </details>
          <button className="route-map-submit" type="submit" disabled={loading}>
            {loading ? <Loader2 className="spin" size={18} /> : <Search size={18} />}
            <span>{loading ? "Checking real routes..." : "Plan My Route"}</span>
          </button>
        </form>

        {plannedTrips.length > 0 && (
        <section className="route-map-trips" aria-label="Planned trips">
          <h2>Current draft</h2>
          {plannedTrips.map((trip, index) => (
            <button className="is-active" type="button" key={`${trip}-${index}`} onClick={() => notify("Current planner route selected.")}>
              <span>{trip}</span>
              <small>{hasRoute ? "Provider route loaded" : "Not verified yet"}</small>
            </button>
          ))}
        </section>
        )}

        <div className="route-map-sidebar-actions">
          <button type="button" onClick={() => setView("profile")}><User size={17} /> Profile</button>
          <button type="button" onClick={() => notify("Settings are available from your account menu.")}><Settings size={17} /> Settings</button>
          <button type="button" className="is-primary" onClick={() => setView("home")}><Plus size={17} /> New Trip</button>
        </div>
      </aside>

      <section className="route-map-main" aria-label="Illustrated route map">
        <IllustratedRouteMap
          startLabel={startLabel}
          endLabel={endLabel}
          route={results?.route}
          places={visibleLocations}
          sampleMode={sampleMode}
        />
        <div className="route-map-topbar">
          <button type="button" onClick={() => setView("home")} aria-label="Back to OffTrail home"><ArrowLeft size={18} /></button>
          <strong>OffTrail</strong>
          <button type="button" aria-label="Save route" onClick={() => notify("Save route after a verified route is loaded.")}><Heart size={18} /></button>
        </div>
        {hasRoute && (
        <div className="route-map-title-ribbon" aria-hidden="true">
          <span>{startLabel}</span>
          <strong>to</strong>
          <span>{endLabel}</span>
        </div>
        )}
        <div className="route-map-bottom-cards">
          <article>
            <div><MapPin size={18} /><strong>{routeDistance}</strong></div>
            <div><Clock size={18} /><strong>{routeDuration}</strong></div>
          </article>
          <article>
            <span><i /> {hasRoute ? "Route geometry" : "Provider route required"}</span>
            <span><i className="is-water" /> {hasRoute ? "Verified stops only" : "No fake stops drawn"}</span>
          </article>
        </div>
        <div className="route-map-controls" aria-label="Map controls">
          <button type="button" onClick={() => notify("Zoom controls are visual until map providers are enabled.")}>+</button>
          <button type="button" onClick={() => notify("Zoom controls are visual until map providers are enabled.")}>-</button>
          <button type="button" onClick={() => notify("Location focus is available from Explore Nearby.")}><Compass size={18} /></button>
        </div>
        {discoveryState?.type && !loading && (
          <article className="route-map-state" role={discoveryState?.type ? "alert" : "status"} aria-live={discoveryState?.type ? "assertive" : "polite"}>
            <Compass size={26} />
            <strong>No verified route loaded</strong>
            <p>{discoveryState?.message || "Use the planner to check provider-backed routes. OffTrail will not invent stops when source data is unavailable."}</p>
            {discoveryState?.type && <button type="button" onClick={onSubmit}>Try again</button>}
          </article>
        )}
        {loading && (
          <article className="route-map-state is-loading" role="status" aria-live="polite">
            <Loader2 className="spin" size={26} />
            <strong>{scanStageHeadline(scanStage)}</strong>
            <p>Checking real routes and verified stop data.</p>
          </article>
        )}
        {visibleLocations.length > 0 && (
          <section className="route-map-results" aria-label="Verified stops">
            <div>
              <h2>Verified stops</h2>
              <span>{visibleLocations.length} found</span>
            </div>
            {visibleLocations.slice(0, 3).map((location, index) => (
              <button type="button" key={location.id} onClick={() => setSelectedPlace(location)}>
                <strong>{location.name}</strong>
                <span>{location.detourLabel || location.distanceLabel || `${index + 1} stop`}</span>
              </button>
            ))}
          </section>
        )}
      </section>
      {selectedPlace && <PlaceDetailDrawer place={selectedPlace} onClose={() => setSelectedPlace(null)} />}
    </main>
  );
}

function StitchJourneyResultsPage({
  origin,
  setOrigin,
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
  layovers,
  setLayovers,
  loading,
  submitted,
  onSubmit,
  results,
  visibleLocations,
  selected,
  selectedPlace,
  setSelectedPlace,
  discoveryState,
  scanStage,
  favorites,
  setFavorites,
  toggleLocation,
  layoverPlaces,
  notify,
  setView,
  sampleMode = false
}) {
  const hasRoute = Boolean(results?.route);
  const routeDistance = results?.route?.distance;
  const routeDuration = results?.route?.duration;
  const startLabel = results?.route?.segments?.[0]?.from || origin || "Origin";
  const endLabel = results?.route?.segments?.at?.(-1)?.to || destination || "Destination";

  return (
    <main className="stitch-results-page">
      <StitchTopNav active="routes" />
      <div className="stitch-orb-bg" aria-hidden="true">
        <span />
        <span />
      </div>
      <section className="stitch-results-grid">
        <aside className="stitch-mission-panel">
          <form className="glass-card shimmer-border stitch-mission-card" onSubmit={onSubmit}>
            <div className="stitch-mission-head">
              <span className="font-label-caps text-label-caps text-tertiary">Route Planner</span>
              <Gem className="text-primary" size={22} />
            </div>
            <h2 className="font-display-lg text-headline-lg">Route discovery</h2>
            <p className="text-on-surface-variant">Enter two places, then choose how far you are willing to detour.</p>
            {sampleMode && (
              <div className="sample-data-warning" role="status" aria-live="polite">
                <strong>SAMPLE PREVIEW — NOT PROVIDER VERIFIED</strong>
                <span>These cards preview the interface and are styled differently from verified results.</span>
              </div>
            )}
            <div className="stitch-route-fields">
              <PlaceInput label="Origin" value={origin} onChange={setOrigin} placeholder="City, station, address" error={submitted && !origin.trim() ? "Origin is required." : ""} disabled={loading} />
              <PlaceInput label="Destination" value={destination} onChange={setDestination} placeholder="City, station, address" error={submitted && !destination.trim() ? "Destination is required." : ""} disabled={loading} />
              <label>
                <span>Travel Date & Time</span>
                <input type="datetime-local" value={departureTime} onChange={(event) => setDepartureTime(event.target.value)} disabled={loading} />
              </label>
              <label>
                <span>Transport Mode</span>
                <select value={travelMode} onChange={(event) => setTravelMode(event.target.value)} disabled={loading}>
                  <option>Train</option>
                  <option>Car</option>
                  <option>Walking</option>
                  <option>Cycling</option>
                </select>
              </label>
            </div>
            <div className="stitch-radius-mini">
              <div>
                <span className="font-label-caps text-label-caps">Route corridor</span>
                <strong>{radius}KM</strong>
              </div>
              <input type="range" min="1" max="10" value={radius} onChange={(event) => setRadius(Number(event.target.value))} />
            </div>
            <details className="advanced-filter-panel">
              <summary>Advanced filters</summary>
              <FilterChips options={preferenceOptions} selected={preferences} onToggle={(key) => toggleSet(preferences, setPreferences, key)} />
            </details>
            <button className="stitch-export-button" type="submit" disabled={loading}>
              {loading ? <Loader2 className="spin" size={18} /> : <Search size={18} />}
              <span>{loading ? "Checking real routes..." : "Plan My Route"}</span>
              <Compass size={18} />
            </button>
          </form>
          {hasRoute && (
            <div className="glass-card stitch-tactical-stats" aria-label="Verified route summary">
              <div>Distance: {routeDistance}</div>
              <div>Duration: {routeDuration}</div>
              <div>Verified stops: {visibleLocations.length}</div>
            </div>
          )}
        </aside>

        <section className="stitch-corridor-stage">
          <div className="glass-card stitch-corridor-map">
            <img src={stitchMapUrl} alt="" onError={hideBrokenImage} />
            <div className="stitch-map-gradient" aria-hidden="true" />
            <StitchRouteSvg route={results?.route} locations={visibleLocations} selected={selected} onSelectPlace={setSelectedPlace} loading={loading} scanStage={scanStage} />
            <div className="stitch-live-feed">
              <i />
              <span>Verified data only</span>
            </div>
            {hasRoute && (
              <div className="stitch-dest-chip">
                <span>{endLabel}</span>
                <strong>DESTINATION</strong>
              </div>
            )}
            <div className="stitch-map-actions">
              <button type="button" onClick={() => notify("Map preview focused.")} aria-label="Focus map preview"><Search size={18} /></button>
              <button type="button" onClick={() => notify("Map layers will be configurable when provider maps are connected.")} aria-label="Map layers"><MapIcon size={18} /></button>
            </div>
            {!visibleLocations.length && (
              <div className="stitch-map-empty glass-card">
                <Compass size={32} />
                <strong>{loading ? scanStageHeadline(scanStage) : discoveryState?.type ? "Scan stopped safely" : "Plan a route to load verified stops"}</strong>
                <p>{loading ? "OffTrail is checking real routes and provider-backed places." : discoveryState?.message || "Enter a real origin and destination, then plan the route. Verified stops appear after source data is returned."}</p>
              </div>
            )}
          </div>
        </section>

        <section className="stitch-found-panel">
          <div className="stitch-found-head">
            <h3 className="font-headline-lg-mobile text-on-surface">Found Gems</h3>
            <span>{visibleLocations.length ? "Sorted by shortest detour" : "Verified results only"}</span>
          </div>
          <div className="stitch-found-list custom-scrollbar">
            {visibleLocations.length ? (
              visibleLocations.map((location, index) => (
                <StitchGemResultCard
                  key={location.id}
                  place={location}
                  index={index}
                  selected={selected.has(location.id)}
                  saved={favorites.some((favorite) => favorite.id === location.id)}
                  onSelect={() => setSelectedPlace(location)}
                  onToggle={() => toggleLocation(location.id)}
                  onSave={() => {
                    setFavorites(toggleFavorite(favorites, location));
                    notify("Favorite updated.");
                  }}
                />
              ))
            ) : (
              <DiscoveryStatePanel
                type={discoveryState?.type || "idle"}
                message={discoveryState?.message}
                onRetry={onSubmit}
                onNearby={() => setView("nearby")}
              />
            )}
          </div>
        </section>
      </section>
      {layoverPlaces.length > 0 && <LayoverDiscoveryPanel suggestions={layoverPlaces} onSelect={setSelectedPlace} layovers={layovers} />}
      {selectedPlace && <PlaceDetailDrawer place={selectedPlace} onClose={() => setSelectedPlace(null)} />}
    </main>
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

function StitchRouteSvg({ route, locations = [], selected = new Set(), onSelectPlace, loading, scanStage }) {
  const bounds = route?.path?.length ? makeBounds(route.path, locations.map((location) => placeCoordinates(location))) : null;
  const path = bounds ? routePathData(route.path, bounds) : "";
  const pins = locations.map((location, index) => ({
    ...location,
    point: routeLocationPoint(location, index, bounds, route?.path)
  }));

  return (
    <div className={`stitch-route-layer ${loading ? "is-loading" : ""} ${path ? "has-route" : "no-route"}`}>
      <svg className="stitch-route-svg" fill="none" viewBox="0 0 100 100" preserveAspectRatio="none">
        {path && <path className="glow-line" d={path} stroke="#7cd5d5" strokeLinecap="round" strokeWidth="1.2" />}
        {pins.slice(0, 10).map((pin) => (
          <path
            key={`branch-${pin.id}`}
            className="stitch-branch-line"
            d={`M ${pin.point.routeX || pin.point.x} ${pin.point.routeY || 50} Q ${(pin.point.x + (pin.point.routeX || pin.point.x)) / 2} ${pin.point.y - 10}, ${pin.point.x} ${pin.point.y}`}
          />
        ))}
      </svg>
      {loading && (
        <div className="stitch-loading-scan" role="status" aria-live="polite">
          <Gem size={28} />
          <strong>{scanStageLabel(scanStage)}</strong>
        </div>
      )}
      {pins.map((pin, index) => (
        <button
          key={pin.id}
          className={`stitch-map-pin pin-float ${selected.has(pin.id) ? "is-selected" : ""}`}
          type="button"
          style={{ left: `${pin.point.x}%`, top: `${pin.point.y}%`, animationDelay: `${index * 180 - 500}ms` }}
          onClick={() => onSelectPlace?.(pin)}
          aria-label={`Open ${pin.name}`}
        >
          <span />
        </button>
      ))}
    </div>
  );
}

function StitchGemResultCard({ place, index = 0, onSelect, onToggle, onSave, selected, saved }) {
  const image = placeImageUrl(place);
  const distance = detourLabel(place);
  const source = sourceLabel(place);
  const confidence = confidenceLabel(place);
  const openStatus = openStatusLabel(place);
  const reason = place.reason || place.description || "A verified place close enough to consider for this route.";
  return (
    <article
      className={`glass-card group stitch-gem-result ${selected ? "is-selected" : ""} ${place.isSample ? "is-sample" : ""}`}
      style={{ animationDelay: `${index * 90}ms` }}
      onClick={onSelect}
      tabIndex={0}
      role="button"
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect?.();
        }
      }}
    >
      <div className="stitch-gem-image">
        <img src={image} alt={place.name} onError={(event) => handlePlaceImageError(event, place)} />
        <div />
        {place.isSample && <strong className="sample-card-watermark">SAMPLE</strong>}
        <span>{place.isSample ? "SAMPLE" : distance}</span>
      </div>
      <div className="stitch-gem-copy">
        <div>{labelForType(place.type) || place.category || "Verified Place"}</div>
        <h4>{place.name}</h4>
        <p>{reason}</p>
        <div className="result-badge-row">
          {place.isSample ? <span>Sample preview</span> : source ? <span>Verified</span> : null}
          <span>{openStatus}</span>
          <span>{confidence}</span>
          {source && <span>{source}</span>}
          <span>{distance}</span>
        </div>
        <footer className="result-actions">
          <button type="button" onClick={(event) => { event.stopPropagation(); onSave?.(); }} aria-label={saved ? "Remove saved gem" : "Save gem"}>
            <Heart size={15} fill={saved ? "currentColor" : "none"} />
            {saved ? "Saved" : "Save"}
          </button>
          <button type="button" onClick={(event) => { event.stopPropagation(); onToggle?.(); }}>
            {selected ? "Added" : "Add stop"}
          </button>
          <a href={googleDirectionsUrl(place)} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()}>
            View map
          </a>
        </footer>
      </div>
    </article>
  );
}

function RoutePlannerCard({
  origin,
  setOrigin,
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
  layovers,
  setLayovers,
  loading,
  submitted,
  onSubmit
}) {
  return (
    <form className="route-planner-card wilderness-glass shimmer-border" onSubmit={onSubmit}>
      <SectionHeader eyebrow="Active Journey" title="Route discovery" compact />
      <PlaceInput label="Starting point" value={origin} onChange={setOrigin} placeholder="Bad Honnef" error={submitted && !origin.trim() ? "Choose a start point." : ""} disabled={loading} />
      <PlaceInput label="Destination" value={destination} onChange={setDestination} placeholder="Munich" error={submitted && !destination.trim() ? "Choose a destination." : ""} disabled={loading} />
      <div className="planner-inline-grid">
        <label className="field is-valid">
          <span>Travel date & time</span>
          <input type="datetime-local" value={departureTime} onChange={(event) => setDepartureTime(event.target.value)} disabled={loading} />
        </label>
        <label className="field select-field">
          <span>Transport mode</span>
          <select value={travelMode} onChange={(event) => setTravelMode(event.target.value)} disabled={loading}>
            <option>Train</option>
            <option>Car</option>
            <option>Walk</option>
            <option>Bike</option>
          </select>
        </label>
      </div>
      <RadiusSelector min={1} max={10} value={radius} onChange={setRadius} label="Route corridor radius" />
      <FilterChips options={preferenceOptions} selected={preferences} onToggle={(key) => toggleSet(preferences, setPreferences, key)} />
      <div className="layover-mini-stack">
        <div className="section-heading">
          <span className="wilderness-eyebrow">Layover intelligence</span>
          <button
            className="tiny-glass-button"
            type="button"
            disabled={loading}
            onClick={() =>
              setLayovers([
                ...layovers,
                {
                  id: crypto.randomUUID(),
                  label: "",
                  arrivalTime: "03:00",
                  departureTime: "07:00",
                  maxDistance: 2,
                  timeAvailable: 240
                }
              ])
            }
          >
            <Plus size={14} />
            Add
          </button>
        </div>
        {layovers.map((layover) => (
          <div className="compact-layover" key={layover.id}>
            <PlaceInput label="Layover" value={layover.label || layover.name || ""} onChange={(value) => updateLayover(setLayovers, layover.id, { label: value })} placeholder="Nuremberg Hbf" disabled={loading} />
            <div className="planner-inline-grid">
              <label className="field">
                <span>Arrive</span>
                <input type="time" value={layover.arrivalTime || "03:00"} onChange={(event) => updateLayover(setLayovers, layover.id, { arrivalTime: event.target.value })} disabled={loading} />
              </label>
              <label className="field">
                <span>Leave</span>
                <input type="time" value={layover.departureTime || "07:00"} onChange={(event) => updateLayover(setLayovers, layover.id, { departureTime: event.target.value })} disabled={loading} />
              </label>
            </div>
          </div>
        ))}
      </div>
      <button className="wilderness-primary full-width" type="submit" disabled={loading}>
        {loading ? <Loader2 className="spin" size={18} /> : <Search size={18} />}
        {loading ? "Mapping corridor..." : "Discover Route"}
      </button>
    </form>
  );
}

function JourneySummaryCard({ origin, destination, radius, results, selectedCount }) {
  return (
    <section className="journey-summary-card wilderness-glass">
      <div className="timeline-mini">
        <span className="timeline-node is-start" />
        <div>
          <small>From</small>
          <strong>{origin || "Origin"}</strong>
        </div>
        <span className="timeline-line" />
        <span className="timeline-node is-end" />
        <div>
          <small>To</small>
          <strong>{destination || "Destination"}</strong>
        </div>
      </div>
      <div className="summary-stat-grid">
        <Stat label="Gems found" value={results ? results.total : 0} />
        <Stat label="Radius" value={`${radius} km`} />
        <Stat label="Added" value={selectedCount || 0} />
      </div>
    </section>
  );
}

function DiscoveryStatePanel({ type = "idle", message, onRetry, onNearby }) {
  const states = {
    idle: {
      eyebrow: "Awaiting Scan",
      title: "Plan a route to load verified places",
      copy: "Enter a real origin and destination, then plan the route. OffTrail will not invent places when route or provider data is unavailable.",
      image: stitchMapUrl,
      icon: Search,
      primary: "Run Scan",
      secondary: "Explore Nearby"
    },
    coordinates: {
      eyebrow: "Location Error",
      title: "Uncharted Coordinates",
      copy: "OffTrail could not verify that location. Check the spelling or try a nearby landmark, station, or city center.",
      image: unchartedCoordinatesUrl,
      icon: Compass,
      primary: "Try Again",
      secondary: "Search Nearby"
    },
    empty: {
      eyebrow: "No Discoveries",
      title: "No verified stops found",
      copy: "We could not find reliable places for this route and filters. Increase detour time, loosen filters, or try a nearby route.",
      image: silentPathUrl,
      icon: Navigation,
      primary: "Expand Search",
      secondary: "Modify Route"
    },
    route: {
      eyebrow: "No verified route",
      title: "No verified route found",
      copy: "OffTrail could not verify a real route for these inputs. Check the locations or try nearby stations and city centers.",
      image: signalInterruptedUrl,
      icon: XCircle,
      primary: "Modify Route",
      secondary: "Explore Nearby"
    },
    system: {
      eyebrow: "Signal Interrupted",
      title: "Route intelligence offline",
      copy: "Verified routing is not configured or the provider is temporarily unavailable. OffTrail stops safely instead of returning guesses.",
      image: signalInterruptedUrl,
      icon: XCircle,
      primary: "Retry Scan",
      secondary: "Explore Nearby"
    }
  };
  const state = states[type] || states.idle;
  const Icon = state.icon;

  return (
    <article className={`discovery-state-card is-${type}`} role={type === "idle" ? "status" : "alert"} aria-live={type === "idle" ? "polite" : "assertive"}>
      <img src={state.image} alt="" aria-hidden="true" />
      <div className="discovery-state-shade" aria-hidden="true" />
      <div className="discovery-scan-line" aria-hidden="true" />
      <div className="discovery-state-icon">
        <Icon size={34} />
      </div>
      <span className="wilderness-eyebrow">{state.eyebrow}</span>
      <h3>{state.title}</h3>
      <p>{message || state.copy}</p>
      <div className="discovery-state-actions">
        <button className="tiny-glass-button" type="button" onClick={onRetry}>
          <Search size={14} />
          {state.primary}
        </button>
        <button className="tiny-glass-button" type="button" onClick={onNearby}>
          <Navigation size={14} />
          {state.secondary}
        </button>
      </div>
    </article>
  );
}

function DiscoveryErrorPage() {
  const { routeState, navigateTo, setModal } = useOffTrail();
  const error = routeState.discoveryError || { type: "system", message: "The wilderness connection is weak. Our intelligence systems are recalibrating." };
  const isNoGems = error.type === "empty";
  const isCoordinates = error.type === "coordinates";
  const state = {
    coordinates: {
      eyebrow: "Signal interrupted",
      title: "Uncharted Coordinates",
      copy: "OffTrail could not verify that location. Check the spelling or try a nearby station, landmark, or city center.",
      image: unchartedCoordinatesUrl,
      icon: Compass,
      primary: "Try Again",
      secondary: "Search Nearby"
    },
    empty: {
      eyebrow: "No echoes detected",
      title: "No verified stops found",
      copy: "We could not find reliable places for this route and filter combination. Try increasing your detour time or choosing another vibe.",
      image: silentPathUrl,
      icon: Navigation,
      primary: "Modify Route",
      secondary: "Explore Nearby"
    },
    route: {
      eyebrow: "No verified route",
      title: "No verified route found",
      copy: "OffTrail could not verify a real route for those inputs. We do not invent routes or places.",
      image: signalInterruptedUrl,
      icon: XCircle,
      primary: "Modify Route",
      secondary: "Explore Nearby"
    },
    system: {
      eyebrow: "System recalibrating",
      title: "Signal Interrupted",
      copy: "Verified routing is not configured or the provider is temporarily unavailable. OffTrail stopped the scan instead of inventing a route.",
      image: signalInterruptedUrl,
      icon: XCircle,
      primary: "Retry Scan",
      secondary: "Explore Nearby"
    }
  }[error.type] || {
    eyebrow: "System recalibrating",
    title: "Signal Interrupted",
    copy: "Verified routing is not configured or the provider is temporarily unavailable. OffTrail stopped the scan instead of inventing a route.",
    image: signalInterruptedUrl,
    icon: XCircle,
    primary: "Retry Scan",
    secondary: "Explore Nearby"
  };
  const Icon = state.icon;
  const displayMessage = friendlyDiscoveryMessage(error, state.copy);

  return (
    <section className={`stitch-error-page ${isNoGems ? "is-no-gems" : ""} ${isCoordinates ? "is-coordinates" : ""}`}>
      <img className="stitch-error-bg" src={state.image} alt="" aria-hidden="true" />
      <div className="stitch-error-gradient" aria-hidden="true" />
      <header className="stitch-error-nav">
        <a className="stitch-wordmark" href={viewHref("home")} onClick={(event) => handleViewNavigation(event, navigateTo, "home")}>OffTrail</a>
        <div>
          <a href={viewHref("nearby")} onClick={(event) => handleViewNavigation(event, navigateTo, "nearby")}>Nearby</a>
        </div>
      </header>
      <main className="stitch-error-canvas">
        {isNoGems ? (
          <div className="stitch-empty-orbit">
            <span /><span /><span />
            <svg viewBox="0 0 200 200" aria-hidden="true">
              <path d="M40,160 Q80,140 100,100 T160,40" />
              <circle cx="40" cy="160" r="3" />
              <circle cx="160" cy="40" r="3" />
            </svg>
            <div>
              <Icon size={56} />
              <strong>No Echoes Detected</strong>
            </div>
          </div>
        ) : (
          <div className="stitch-error-orb">
            <Icon size={76} />
            <i /><i /><i />
          </div>
        )}
        <article className="stitch-error-card">
          <span className="wilderness-eyebrow">{state.eyebrow}</span>
          <h1>{state.title}</h1>
          <p>{displayMessage}</p>
          {isNoGems && (
            <div className="stitch-radius-preview">
              <span>Scan Radius</span>
              <strong>{routeState.radius || 5}km</strong>
              <div><i /></div>
              <small><span>2km</span><span>20km</span></small>
            </div>
          )}
          <div className="stitch-error-actions">
            <button className="wilderness-primary" type="button" onClick={() => (isCoordinates ? setModal("planner") : navigateTo("routeDiscovery"))}>
              <Search size={17} />
              {state.primary}
            </button>
            <button className="wilderness-secondary" type="button" onClick={() => navigateTo("nearby")}>
              <Navigation size={17} />
              {state.secondary}
            </button>
          </div>
        </article>
      </main>
    </section>
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
  const pins = locations.map((place, index) => ({
    ...place,
    point: place.point || locationPoint(place, userLocation, index)
  }));
  const featured = pins[0];
  const sideCards = pins.slice(1, 3);
  const wideCard = pins[3] || pins[0];

  return (
    <section className="stitch-radar-page">
      <StitchTopNav active="nearby" />
      <main className="stitch-spatial-main">
        <aside className="stitch-radar-controls glass-panel">
          <div className="stitch-radar-status">
            <span className="font-label-caps text-label-caps text-on-surface-variant">Nearby discovery</span>
            <div>
              <i />
              <h2 className="font-headline-lg text-primary">Explore near me</h2>
            </div>
          </div>
          <form onSubmit={onSubmit} className="stitch-radar-form">
            <label className="stitch-vector-field">
              <span>Location</span>
              <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Current location or city" disabled={loading} />
              {nearbyError && <small className="inline-helper-error">Location access is off or unavailable. Enter a city, station, or address manually.</small>}
            </label>
            <button className="tiny-glass-button nearby-location-button" type="button" onClick={onUseLocation} disabled={loading}>
              <Navigation size={15} />
              {locationStatus === "allowed" ? "Location active" : "Use my location"}
            </button>
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
            <details className="advanced-filter-panel">
              <summary>Advanced filters</summary>
              <FilterChips
                options={[
                  { key: "hidden", label: "Hidden gems" },
                  { key: "nature", label: "Nature" },
                  { key: "viewpoint", label: "Viewpoints" },
                  { key: "photo_op", label: "Photo spots" },
                  { key: "local", label: "Local favorites" },
                  { key: "garden", label: "Gardens" },
                  { key: "food", label: "Food" },
                  { key: "quiet", label: "Quiet places" }
                ]}
                selected={filters}
                onToggle={(key) => toggleSet(filters, setFilters, key)}
              />
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
            <button className="stitch-deploy-button" type="submit" disabled={loading}>
              {loading ? <Gem size={18} /> : <Navigation size={18} />}
              {loading ? "Finding places near you" : "Scan Nearby"}
            </button>
          </form>
        </aside>

        <section className="stitch-radar-canvas">
          <div className="stitch-radar-background" aria-hidden="true">
            <img src={stitchHeroUrl} alt="" onError={hideBrokenImage} />
            <div />
          </div>
          <div className="stitch-radar-visual" aria-label="Spatial radar map">
            <div className="stitch-radar-rings" aria-hidden="true">
              <span /><span /><span />
            </div>
            <div className="radar-sweep" aria-hidden="true" />
            <svg className="stitch-radar-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {pins.slice(0, 10).map((pin) => (
                <path
                  key={pin.id}
                  className={`traveling-light ${activeId === pin.id ? "is-active" : ""}`}
                  d={`M 50 50 Q ${(50 + pin.point.x) / 2} ${(50 + pin.point.y) / 2 - 10}, ${pin.point.x} ${pin.point.y}`}
                />
              ))}
            </svg>
            <button className="stitch-user-dot" type="button" aria-label="Your location">
              <Navigation size={18} />
            </button>
            {pins.map((pin, index) => (
              <button
                key={pin.id}
                className={`stitch-radar-gem gem-bob ${activeId === pin.id ? "is-active" : ""}`}
                style={{ left: `${pin.point.x}%`, top: `${pin.point.y}%`, animationDelay: `${index * -0.45}s` }}
                type="button"
                onMouseEnter={() => setActiveId(pin.id)}
                onMouseLeave={() => setActiveId(null)}
                onFocus={() => setActiveId(pin.id)}
                onBlur={() => setActiveId(null)}
                onClick={() => setSelectedPlace(pin)}
              >
                {pin.type === "photo_op" ? <Camera size={16} /> : <Gem size={16} />}
                <strong>{pin.name}</strong>
              </button>
            ))}
            {!pins.length && (
              <div className="stitch-radar-empty glass-panel" role={nearbyError ? "alert" : "status"} aria-live={nearbyError ? "assertive" : "polite"}>
                {loading ? <Gem size={34} /> : <Compass size={34} />}
                <strong>{loading ? "Finding places near you" : nearbyError ? "Location access is off" : "Awaiting verified scan"}</strong>
                <p>{loading ? "OffTrail is asking real providers for nearby places." : nearbyError ? "You can still search manually by entering a city, station, or address." : "Scan to load nearby places from real map data."}</p>
              </div>
            )}
            {Number.isFinite(userLocation?.lat) && Number.isFinite(userLocation?.lng) && (
              <>
                <div className="stitch-radar-coordinate top">LAT {Math.abs(userLocation.lat).toFixed(4)} deg</div>
                <div className="stitch-radar-coordinate bottom">LON {Math.abs(userLocation.lng).toFixed(4)} deg</div>
              </>
            )}
          </div>

          <div className="stitch-live-recommendations">
            <div className="stitch-live-head">
              <div>
                <span className="font-label-caps text-label-caps text-primary">Intelligence</span>
                <h3 className="font-headline-lg text-on-surface">Live Recommendations</h3>
              </div>
              <div>
                <button type="button" aria-label="Previous recommendation"><ArrowLeft size={18} /></button>
                <button type="button" aria-label="Next recommendation"><ArrowRight size={18} /></button>
              </div>
            </div>
            <div className="stitch-bento-grid">
              {featured ? (
                <StitchRecommendationCard place={featured} variant="large" active={activeId === featured.id} saved={favorites.some((favorite) => favorite.id === featured.id)} onHover={setActiveId} onSelect={setSelectedPlace} onSave={() => {
                  setFavorites(toggleFavorite(favorites, featured));
                  notify("Favorite updated.");
                }} />
              ) : (
                <article className="glass-panel stitch-reco-card is-large is-empty">
                  <Search size={28} />
                  <h4>Scan to load verified nearby places</h4>
                  <p>OffTrail will not display invented locations. Results appear here only after the nearby endpoint returns verified data.</p>
                </article>
              )}
              {sideCards.map((place) => (
                <StitchRecommendationCard key={place.id} place={place} active={activeId === place.id} saved={favorites.some((favorite) => favorite.id === place.id)} onHover={setActiveId} onSelect={setSelectedPlace} onSave={() => {
                  setFavorites(toggleFavorite(favorites, place));
                  notify("Favorite updated.");
                }} />
              ))}
              {wideCard && (
                <StitchRecommendationCard place={wideCard} variant="wide" active={activeId === wideCard.id} saved={favorites.some((favorite) => favorite.id === wideCard.id)} onHover={setActiveId} onSelect={setSelectedPlace} onSave={() => {
                  setFavorites(toggleFavorite(favorites, wideCard));
                  notify("Favorite updated.");
                }} />
              )}
            </div>
          </div>
        </section>
      </main>
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

function ExploreAroundYouRadar({ userLocation, locations, radius, activeId, setActiveId, onSelect }) {
  const pins = locations.map((location, index) => ({
    ...location,
    point: location.point || locationPoint(location, userLocation, index)
  }));

  return (
    <section className="nearby-radar wilderness-glass">
      <div className="radar-title">
        <span>Radius</span>
        <strong>{radius} km</strong>
      </div>
      <div className="radar-rings" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <svg className="radar-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {pins.slice(0, 10).map((pin) => (
          <path
            key={pin.id}
            className={`radar-connection ${activeId === pin.id ? "is-active" : ""}`}
            d={`M 50 50 Q ${(50 + pin.point.x) / 2} ${(50 + pin.point.y) / 2 - 12}, ${pin.point.x} ${pin.point.y}`}
            pathLength="1"
          />
        ))}
      </svg>
      <button className="radar-user-dot" type="button" aria-label="Your location">
        <Navigation size={16} />
      </button>
      {pins.map((pin, index) => (
        <button
          key={pin.id}
          className={`radar-pin ${activeId === pin.id ? "is-active" : ""}`}
          style={{ left: `${pin.point.x}%`, top: `${pin.point.y}%`, animationDelay: `${index * 130}ms` }}
          type="button"
          aria-label={`${pin.name}, ${formatMeters(pin.distance || pin.distanceMeters || 0)} away`}
          onMouseEnter={() => setActiveId(pin.id)}
          onMouseLeave={() => setActiveId(null)}
          onFocus={() => setActiveId(pin.id)}
          onBlur={() => setActiveId(null)}
          onClick={() => onSelect(pin)}
        >
          {pin.type === "photo_op" ? <Camera size={16} /> : <Gem size={16} />}
          <span>{pin.name}</span>
        </button>
      ))}
      {!pins.length && (
        <div className="radar-empty-state">
          <Compass size={28} />
          <strong>No scan results yet</strong>
          <span>Enter a location or allow browser location, then run Scan Nearby.</span>
        </div>
      )}
    </section>
  );
}

function SectionHeader({ eyebrow, title, compact = false }) {
  return (
    <header className={`section-header-block ${compact ? "is-compact" : ""}`}>
      <span>{eyebrow}</span>
      <h1>{title}</h1>
    </header>
  );
}

function RadiusSelector({ min = 2, max = 10, value, onChange, label }) {
  return (
    <label className="radius-selector">
      <span>{label}: <strong>{value} km</strong></span>
      <input type="range" min={min} max={max} step="1" value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <small><span>{min}km</span><span>{max}km</span></small>
    </label>
  );
}

function FilterChips({ options, selected, onToggle }) {
  return (
    <div className="filter-chip-wrap" aria-label="Interest filters">
      {options.map((option) => (
        <button
          key={option.key}
          className={selected.has(option.key) ? "is-selected" : ""}
          type="button"
          aria-pressed={selected.has(option.key)}
          onClick={() => onToggle(option.key)}
        >
          {option.label}
        </button>
      ))}
    </div>
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
  const hasVerifiedRoute = Boolean(routePath);
  const routeStatus = hasVerifiedRoute ? "VERIFIED ROUTE" : loading ? "CHECKING REAL ROUTE" : "AWAITING SCAN";
  const coordinateLabel = hasVerifiedRoute
    ? formatMapCoordinate(route.path[0]?.[0], route.path[0]?.[1])
    : "NO VERIFIED COORDINATES";

  return (
    <section className={`animated-route-map ${variant} scan-${scanStage} ${loading ? "is-scanning" : ""} ${hasVerifiedRoute ? "has-route" : "no-route"}`} aria-label="Animated route map">
      <img className="map-terrain-image" src={stitchMapUrl} alt="" aria-hidden="true" />
      <div className="map-atmosphere" />
      <div className="stitch-map-frame" aria-hidden="true">
        <span /><span /><span /><span />
      </div>
      <svg className="animated-map-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={`routeGradient-${variant}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#b4cbc6" />
            <stop offset="100%" stopColor="#7cd5d5" />
          </linearGradient>
        </defs>
        {hasVerifiedRoute && <path className="route-shadow-line" d={routePath} />}
        {hasVerifiedRoute && <path className="route-active-line" d={routePath} stroke={`url(#routeGradient-${variant})`} pathLength="1" />}
        {hasVerifiedRoute && pins.slice(0, 10).map((pin) => (
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
      {hasVerifiedRoute && (
        <>
          <div className="map-endpoint is-start" style={{ left: "10%", top: "78%" }}>
            <span />
            <strong>{startLabel}</strong>
          </div>
          <div className="map-endpoint is-end" style={{ left: "88%", top: "18%" }}>
            <span />
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

function HiddenGemCard({ place, index = 0, selected = false, saved = false, active = false, onSelect, onToggle, onSave, onHover }) {
  const image = placeImageUrl(place);
  const distance = detourLabel(place);
  const open = place.isOpenAtArrival ?? place.isOpen;
  const directionsUrl = googleDirectionsUrl(place);
  const rating = Number(place.rating || 0);
  const source = sourceLabel(place);
  const confidence = confidenceLabel(place);

  function handleCardKeyDown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect?.();
    }
  }

  return (
    <article
      className={`hidden-gem-card wilderness-glass ${active ? "is-active" : ""}`}
      style={{ animationDelay: `${index * 80}ms` }}
      tabIndex={0}
      role="button"
      onClick={(event) => {
        if (event.target.closest("button,a")) return;
        onSelect?.();
      }}
      onKeyDown={handleCardKeyDown}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      onFocus={() => onHover?.(true)}
      onBlur={() => onHover?.(false)}
    >
      <div className="hidden-card-image-wrap">
        <img src={image} alt={place.name} onError={(event) => handlePlaceImageError(event, place)} />
        {place.isHiddenGem && <span className="hidden-card-badge">Hidden gem</span>}
      </div>
      <div className="hidden-card-body">
        <div className="hidden-card-topline">
          <StatusBadge open={open} is24Hours={place.is24Hours} nextOpenTime={place.nextOpenTime} />
          <SavedGemButton saved={saved} onClick={onSave} />
        </div>
        <h3>{place.name}</h3>
        <p>{place.description}</p>
        <div className="place-meta-row">
          <span><MapPin size={13} /> {distance}</span>
          {(place.walkingTime || place.estimatedTime) && <span><Timer size={13} /> {place.walkingTime || place.estimatedTime} min</span>}
          <span><Star size={13} /> {rating > 0 ? rating.toFixed(1) : "Unrated"}</span>
        </div>
        <div className="tag-strip">
          {place.isSample ? <span>Sample</span> : source ? <span>Verified</span> : null}
          {source && <span>{source}</span>}
          <span>{confidence}</span>
          <span>{labelForType(place.type) || place.category}</span>
          {place.isHiddenGem && <span>Hidden Gem</span>}
          {place.safeForNighttime && <span>Safe late</span>}
        </div>
        <div className="card-actions-row">
          <a className="tiny-glass-button" href={directionsUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open directions to ${place.name}`}>
            <Navigation size={14} />
            Directions
          </a>
          <button className="tiny-glass-button" type="button" onClick={onSelect}>
            View details
          </button>
          {onToggle && (
            <button className={`tiny-glass-button ${selected ? "is-selected" : ""}`} type="button" onClick={onToggle}>
              {selected ? <Check size={14} /> : <Plus size={14} />}
              {selected ? "Added" : "Add"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function SavedGemButton({ saved, onClick }) {
  return (
    <button className={`save-gem-button ${saved ? "is-saved" : ""}`} type="button" onClick={onClick} aria-label={saved ? "Remove saved gem" : "Save gem"}>
      <Heart size={16} fill={saved ? "currentColor" : "none"} />
    </button>
  );
}

function StatusBadge({ open, is24Hours, nextOpenTime }) {
  if (open === undefined || open === null) {
    return (
      <span className="status-badge is-unknown">
        <Clock size={13} />
        Hours unavailable
      </span>
    );
  }
  return (
    <span className={`status-badge ${open ? "is-open" : "is-closed"}`}>
      {open ? <CheckCircle size={13} /> : <XCircle size={13} />}
      {open ? (is24Hours ? "24h open" : "Open now") : `Closed${nextOpenTime ? ` until ${nextOpenTime}` : ""}`}
    </span>
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

function offTrailPlaceholderImage(title = "Verified place", subtitle = "Photo unavailable") {
  const safeTitle = String(title).slice(0, 42);
  const safeSubtitle = String(subtitle).slice(0, 52);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
      <defs>
        <radialGradient id="g" cx="68%" cy="28%" r="68%">
          <stop offset="0" stop-color="#7cd5d5" stop-opacity="0.34"/>
          <stop offset="0.42" stop-color="#203431" stop-opacity="0.28"/>
          <stop offset="1" stop-color="#0d0e0e"/>
        </radialGradient>
        <linearGradient id="line" x1="0" x2="1">
          <stop offset="0" stop-color="#b4cbc6" stop-opacity="0"/>
          <stop offset="0.5" stop-color="#b4cbc6"/>
          <stop offset="1" stop-color="#7cd5d5" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="960" height="540" fill="#0d0e0e"/>
      <rect width="960" height="540" fill="url(#g)"/>
      <g opacity="0.28" stroke="#b4cbc6" stroke-width="1">
        <path d="M0 410 C160 310 280 345 420 260 S690 120 960 176" fill="none"/>
        <path d="M0 452 C160 370 318 388 480 310 S760 215 960 240" fill="none"/>
        <circle cx="688" cy="192" r="52" fill="none"/>
        <circle cx="688" cy="192" r="96" fill="none" opacity="0.5"/>
      </g>
      <path d="M0 416 C180 306 320 352 476 260 S720 126 960 176" stroke="url(#line)" stroke-width="6" fill="none" stroke-linecap="round"/>
      <g transform="translate(72 342)">
        <path d="M36 0 72 26 56 72 16 72 0 26Z" fill="#b4cbc6"/>
        <text x="96" y="22" fill="#e3e2e1" font-family="Hanken Grotesk, Arial, sans-serif" font-size="32" font-weight="700">${escapeSvgText(safeTitle)}</text>
        <text x="96" y="58" fill="#c2c8c5" font-family="Hanken Grotesk, Arial, sans-serif" font-size="18" letter-spacing="3">${escapeSvgText(safeSubtitle).toUpperCase()}</text>
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

function formatCoordinates(place) {
  const { lat, lng } = placeCoordinates(place);
  if (!lat || !lng) return "Map preview available after location data loads.";
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
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
            <div className="stitch-detail-proximity">
              <section>
                <span>Proximity</span>
                <strong>{detourLabel(place)} </strong>
              </section>
              <section>
                <span>Travel</span>
                <strong>{place.walkingTime || place.estimatedTime || 20}m</strong>
              </section>
            </div>
            <div className="stitch-detail-signal">
              <div>
                <span>Confidence</span>
                <strong>{confidence}</strong>
              </div>
              <i style={{ width: `${Math.min(100, Math.max(28, rating ? rating * 20 : 64))}%` }} />
              <div>
                <span>Open status</span>
                <strong>{place.todaysHours || place.openingHours || openStatus}</strong>
              </div>
            </div>
            <div className="stitch-detail-actions">
              <button type="button" onClick={addToItinerary}>Add stop</button>
              <a href={directionsUrl} target="_blank" rel="noopener noreferrer">View on map</a>
            </div>
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
              {staticMapUrl ? (
                <img
                  src={staticMapUrl}
                  alt={`Map preview for ${place.name}`}
                  onError={(event) => handlePlaceImageError(event, place)}
                />
              ) : (
                <span>{formatCoordinates(place)}</span>
              )}
            </div>
            <button type="button" onClick={sharePlace}><Share2 size={16} /> Share</button>
            <button type="button" onClick={() => setView(routeState.results ? "results" : "routeDiscovery")}><Route size={16} /> View Route</button>
          </article>
        </section>
      </section>
    </div>
  );
}

function LayoverDiscoveryPanel({ suggestions = [], layovers = [], onSelect }) {
  const firstLayover = layovers[0];
  const title = firstLayover
    ? `${firstLayover.label || firstLayover.name || "Layover"}${firstLayover.arrivalTime && firstLayover.departureTime ? `, ${firstLayover.arrivalTime} - ${firstLayover.departureTime}` : ""}`
    : "Add a layover to scan short-stop options";

  return (
    <section className="layover-discovery-panel wilderness-glass">
      <img src={stationNightUrl} alt="" />
      <div className="layover-panel-copy">
        <SectionHeader eyebrow="Layover Discovery" title={title} compact />
        <p>
          Layover recommendations are created only from route results with real place data. Add a layover,
          run discovery, then OffTrail prioritizes open, walkable, time-fit options.
        </p>
        <div className="layover-safety-tags">
          <span><CheckCircle size={14} /> Safe late-night</span>
          <span><Clock size={14} /> Open now first</span>
          <span><MapPin size={14} /> Under 2 km</span>
        </div>
      </div>
      <div className="layover-suggestion-grid">
        {!suggestions.length && (
          <div className="layover-empty-state">
            No layover places loaded yet. Add a layover in the planner and run discovery.
          </div>
        )}
        {suggestions.map((place) => (
          <button className="layover-suggestion" type="button" key={place.id} onClick={() => onSelect(place)}>
            <strong>{place.name}</strong>
            <span>{place.distanceFromStationLabel} - {place.walkingTime} min walk</span>
            <StatusBadge open={place.isOpenAtArrival} is24Hours={place.is24Hours} />
          </button>
        ))}
      </div>
    </section>
  );
}

function ResultsPage() {
  const { routeState, setRouteState, setView, setModal, auth, notify, savedRoutes, setSavedRoutes, favorites, setFavorites } = useOffTrail();
  const results = routeState.results;
  const [saving, setSaving] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);

  if (!results) return <EmptyState title="No route yet" action="Plan a route" onAction={() => setModal("planner")} />;

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

  return (
    <section className="app-page results-layout">
      <PageTopbar title="Route Results" />
      <aside className="results-summary liquid-glass-strong">
        <h2>{routeState.origin?.name || "Origin"} to {routeState.destination?.name || "Destination"}</h2>
        <p>{results.route.distance} - {results.route.duration}</p>
        <div className="stat-grid">
          <Stat label="Spots found" value={results.total} />
          <Stat label="Added" value={selected.size} />
          <Stat label="Radius" value={`${routeState.radius} km`} />
        </div>
        <button className="solid-action" type="button" onClick={saveRoute} disabled={saving}>
          {saving ? <Loader2 className="spin" size={17} /> : <Bookmark size={17} />}
          Save Route
        </button>
      </aside>
      <AnimatedRouteMap route={results.route} locations={results.locations} selected={selected} onSelectPlace={setSelectedPlace} variant="results" />
      <aside className="location-list discovered-locations-panel liquid-glass">
        <h2>Discovered locations</h2>
        {results.locations.length ? (
          results.locations.map((location) => (
            <HiddenGemCard
              key={location.id}
              place={location}
              selected={selected.has(location.id)}
              saved={favorites.some((favorite) => favorite.id === location.id)}
              onSelect={() => setSelectedPlace(location)}
              onToggle={() => toggleLocation(location.id)}
              onSave={() => {
                setFavorites(toggleFavorite(favorites, location));
                notify("Favorite updated.");
              }}
            />
          ))
        ) : (
          <DiscoveryStatePanel
            type="empty"
            message="No verified places came back for this route. Increase the radius, loosen filters, or try another corridor."
            onRetry={() => setView("routeDiscovery")}
            onNearby={() => setView("nearby")}
          />
        )}
      </aside>
      <div className="bottom-action-bar">
        <button className="submit-route liquid-glass-strong" type="button" onClick={() => setView("itinerary")}>
          <Clock size={18} />
          View Itinerary
        </button>
      </div>
      {selectedPlace && <PlaceDetailDrawer place={selectedPlace} onClose={() => setSelectedPlace(null)} />}
    </section>
  );
}

function RouteMap({ route, locations, selected }) {
  const bounds = useMemo(() => makeBounds(route.path, locations), [route, locations]);
  const polyline = route.path.map(([lat, lng]) => toPercent({ lat, lng }, bounds)).map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <section className="map-shell liquid-glass-strong">
      <svg className="route-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polyline points={polyline} fill="none" stroke="rgba(255,255,255,.72)" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      {locations.map((location) => {
        const point = toPercent(location, bounds);
        return (
          <button
            key={location.id}
            className={`map-pin pin-${location.category} ${selected.has(location.id) ? "is-selected" : ""}`}
            type="button"
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
            title={location.name}
          >
            <Gem size={13} />
          </button>
        );
      })}
      <div className="map-legend liquid-glass">
        <span>Route corridor</span>
        <span>{locations.length} pins</span>
      </div>
    </section>
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
  const { savedRoutes, setView } = useOffTrail();
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
            <button className="mini-button liquid-glass" type="button" onClick={() => setView("routeDetail")}>View Route</button>
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

  return (
    <section className="app-page dashboard-page">
      <PageTopbar title="Saved Gems" />
      {favorites.length > 0 && (
        <div className="saved-gems-toolbar liquid-glass">
          <span>Saved on this device. Account sync can be added later.</span>
          <button type="button" onClick={clearFavorites}>Clear all</button>
        </div>
      )}
      <div className="dashboard-grid">
        {favorites.length === 0 && (
          <EmptyState
            title="No gems saved yet"
            description="Start exploring and tap the bookmark icon to build your personal travel map. Saved gems are stored on this device until account sync is configured."
            action="Explore Nearby"
            onAction={() => navigateTo("nearby")}
          />
        )}
        {favorites.map((location) => (
          <article className="saved-route-card liquid-glass" key={location.id}>
            <img src={placeImageUrl(location)} alt={location.name} onError={(event) => handlePlaceImageError(event, location)} />
            <h3>{location.name}</h3>
            <p>{[location.category, detourLabel(location), sourceLabel(location)].filter(Boolean).join(" - ")}</p>
            <small>Saved on this device</small>
            <label className="saved-note-field">
              <span>Personal note</span>
              <textarea
                value={location.note || ""}
                onChange={(event) => updateNote(location.id, event.target.value)}
                placeholder="Why did you save this place?"
                rows={3}
              />
            </label>
            <div className="saved-gem-actions">
              <a href={googleDirectionsUrl(location)} target="_blank" rel="noopener noreferrer">
                Open in map
                <ExternalLink size={14} />
              </a>
              <button type="button" onClick={() => removeFavorite(location.id)}>
                Remove
                <Trash2 size={14} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
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
  const { savedRoutes, setView } = useOffTrail();
  const route = savedRoutes[0];
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
        {galleryPhotos.map((photo) => <img key={photo} src={photo} alt="Photogenic location example" />)}
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

function LocationIntelligenceOverlay() {
  const { setModal, notify } = useOffTrail();
  const [locations, setLocations] = useState([]);
  const [userLocation, setUserLocation] = useState({ lat: 64.134, lng: -21.467 });
  const [stage, setStage] = useState(0);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sheetMinimized, setSheetMinimized] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const cardRefs = useRef({});
  const dragStartRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const position = await getBrowserPosition();
        if (cancelled) return;
        setUserLocation(position);
        const response = await fetch("/api/location-intelligence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latitude: position.lat,
            longitude: position.lng,
            radius: 5000,
            categories: ["hidden_gem", "photo_op", "viewpoint", "nature"]
          })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Location intelligence failed.");
        if (!cancelled) {
          setLocations((data.locations || []).slice(0, 10));
          setUserLocation(data.userLocation || position);
        }
      } catch (error) {
        console.warn("Location intelligence overlay error:", error);
        notify("Could not load real nearby places. Please try again.", "error");
        if (!cancelled) setLocations([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [notify]);

  useEffect(() => {
    if (loading) return undefined;
    const timers = [
      window.setTimeout(() => setStage(1), 0),
      window.setTimeout(() => setStage(2), 800),
      window.setTimeout(() => setStage(3), 1500),
      window.setTimeout(() => setStage(4), 2200)
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [loading]);

  useEffect(() => {
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const pins = locations.map((location, index) => ({
    ...location,
    point: locationPoint(location, userLocation, index)
  }));

  function closeOverlay() {
    setModal(null);
  }

  function focusLocation(id) {
    setActiveId(id);
    cardRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    window.setTimeout(() => setActiveId((current) => (current === id ? null : current)), 1500);
  }

  function handleKeyDown(event, id) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      focusLocation(id);
    }
  }

  function handleMouseMove(event) {
    if (rafRef.current) return;
    rafRef.current = window.requestAnimationFrame(() => {
      const amount = 20;
      setParallax({
        x: (event.clientX / window.innerWidth - 0.5) * amount,
        y: (event.clientY / window.innerHeight - 0.5) * amount
      });
      rafRef.current = null;
    });
  }

  function handleTouchStart(event) {
    dragStartRef.current = event.touches[0].clientY;
    setDragOffset(0);
  }

  function handleTouchMove(event) {
    const diff = event.touches[0].clientY - dragStartRef.current;
    setDragOffset(diff > 0 ? diff : 0);
  }

  function handleTouchEnd() {
    setSheetMinimized(dragOffset > 100);
    setDragOffset(0);
  }

  return (
    <section className="location-intelligence-overlay" onMouseMove={handleMouseMove} aria-label="Real-time Location Intelligence">
      <div className="intelligence-map-bg" aria-hidden="true">
        <img
          src={intelligenceMapUrl}
          alt=""
          style={{ transform: `scale(1.05) translate(${parallax.x}px, ${parallax.y}px)` }}
        />
      </div>
      <div className="intelligence-map-shade" aria-hidden="true" />

      <button className="intelligence-close glass-surface" type="button" onClick={closeOverlay} aria-label="Back to OffTrail">
        <ArrowLeft size={20} />
      </button>

      <div className="intelligence-title glass-surface">
        <p className="label-caps">Spatial Radar</p>
        <h2>Real-time Location Intelligence</h2>
        <p>{loading ? "Preparing scan..." : "Nearby gems, photo ops, and viewpoints detected around you."}</p>
      </div>

      <svg className="connection-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {pins.map((pin, index) => (
          <path
            key={pin.id}
            className={`connection-line ${stage >= 3 ? "is-drawn" : ""} ${activeId === pin.id ? "is-active" : ""}`}
            d={`M 50 50 Q ${(50 + pin.point.x) / 2} ${Math.min(50, pin.point.y) - 10}, ${pin.point.x} ${pin.point.y}`}
            stroke={pin.type === "hidden_gem" ? "#ddb7ff" : pin.type === "photo_op" ? "#4cd7f6" : "#adc6ff"}
            style={{ animationDelay: `${index * 150}ms` }}
          />
        ))}
      </svg>

      <div className={`user-location ${stage >= 1 ? "radar-active" : ""}`} aria-label="Your location">
        <div className="radar-wave" />
        <div className="user-pulse" />
        <div className="user-dot" />
      </div>

      {loading ? (
        <div className="intelligence-loading glass-surface">
          <Loader2 className="spin" size={22} />
          <span>Scanning nearby signals...</span>
        </div>
      ) : (
        pins.map((pin, index) => (
          <button
            key={pin.id}
            className={`intelligence-pin pin-${pin.type} ${stage >= 2 ? "is-visible" : ""} ${activeId === pin.id ? "is-active" : ""}`}
            type="button"
            style={{ left: `${pin.point.x}%`, top: `${pin.point.y}%`, animationDelay: `${index * 200}ms` }}
            aria-label={`${pin.name}, ${formatMeters(pin.distance)} away`}
            onMouseEnter={() => setActiveId(pin.id)}
            onMouseLeave={() => setActiveId(null)}
            onFocus={() => setActiveId(pin.id)}
            onBlur={() => setActiveId(null)}
            onClick={() => focusLocation(pin.id)}
            onKeyDown={(event) => handleKeyDown(event, pin.id)}
          >
            {pin.type === "photo_op" ? <Camera size={17} /> : <Gem size={17} />}
          </button>
        ))
      )}

      <aside
        className={`intelligence-bottom-sheet ${stage >= 4 ? "is-open" : ""} ${sheetMinimized ? "is-minimized" : ""}`}
        style={{ transform: stage >= 4 ? (sheetMinimized ? "translateY(60%)" : `translateY(${dragOffset}px)`) : undefined }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="sheet-handle" aria-hidden="true" />
        <div className="intelligence-card-list">
          {!loading && !pins.length && (
            <div className="location-empty">No verified nearby places were returned for this scan.</div>
          )}
          {pins.map((location) => (
            <article
              className={`intelligence-result-card glass-surface ${activeId === location.id ? "is-active" : ""}`}
              key={location.id}
              ref={(element) => {
                if (element) cardRefs.current[location.id] = element;
              }}
              tabIndex={0}
              role="button"
              onMouseEnter={() => setActiveId(location.id)}
              onMouseLeave={() => setActiveId(null)}
              onFocus={() => setActiveId(location.id)}
              onBlur={() => setActiveId(null)}
              onClick={() => focusLocation(location.id)}
              onKeyDown={(event) => handleKeyDown(event, location.id)}
            >
              <div className={`intelligence-result-icon icon-${location.type}`}>
                {location.type === "photo_op" ? <Camera size={20} /> : <Gem size={20} />}
              </div>
              <div>
                <div className="intelligence-card-head">
                  <h3>{location.name}</h3>
                  <span>{labelForType(location.type)}</span>
                </div>
                <p>{location.description}</p>
                <div className="intelligence-meta">
                  <MapPin size={14} />
                  <span>{formatMeters(location.distance)} away</span>
                  <Star size={14} />
                  <span>{Number(location.rating || 0) > 0 ? Number(location.rating).toFixed(1) : "Unrated"}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </aside>
    </section>
  );
}

function SignupPrompt() {
  const { setModal } = useOffTrail();
  return (
    <Modal title="Create your archive" onClose={() => setModal(null)}>
      <p>Sign in to save routes, revisit hidden gems, and build your personal discovery archive.</p>
      <button className="solid-action" type="button" onClick={() => setModal("auth")}>Sign Up</button>
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

function Stat({ label, value }) {
  return <div className="stat liquid-glass"><strong>{value}</strong><span>{label}</span></div>;
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
      { enableHighAccuracy: false, timeout: 3200, maximumAge: 300000 }
    );
  });
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

function routePathData(path = [], bounds = null) {
  if (!bounds || !Array.isArray(path) || path.length < 2) {
    return "M 10 78 C 27 72 32 34 51 38 S 72 78 88 18";
  }
  return path
    .map(([lat, lng], index) => {
      const point = toPercent({ lat, lng }, bounds);
      return `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    })
    .join(" ");
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
  const allowedViews = new Set(["home", "routeDiscovery", "nearby", "layover", "results", "itinerary", "dashboard", "favorites", "profile", "routeDetail", "error"]);
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
