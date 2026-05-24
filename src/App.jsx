import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
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

const thumbnailUrl =
  "https://images.pexels.com/photos/36807312/pexels-photo-36807312.jpeg?auto=compress&cs=tinysrgb&w=192&h=128&fit=crop";

const intelligenceMapUrl =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBVVfXTx2UjZoOxJMZ_5ZkNzIULqzAq5a1NoLZo5CFDPeBpqbbYlpoLhK6Cc3p9mSLCbFyA_b7xucpNZRsXMIuJiovOeHaHgMRGAPWM86G8eRQ0y-HXyDXyDGZQ-4j7EMDBo7P4uDOg4aa1rtj_riFt8dxhGJ_cCOYr7wMzK0jdal9XJj_ACUPeCSYf5RL5ftjt9ygyDiBvOUJMloj9yEyreDFSvaLBr_Jc-c-ti1Z2pIX3jnvGwLUniNM5bwkz6SgyhN2liW4BaHE";

const intelligencePreviewUrl =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDO14rPiGqat7AjcxGLybdovNh4qdz6eCt9z3UUzODXNeu7QQ3vn4LSpNmVffTX6VQsyUnUeL_7DWvtFrP-AqnAnPGsWIEzBMedhz84LAIpqhd-QWO_YnOm1iv9RtHIo8bzT2bIfjk28R6MVD4JtR0Ui6ZmA8BsmK7Z-_pAlsv_o649fLeVJB35aN_83j8X1ipxln__NHYnzwAQhvGDLmE-N5MqYkiIduHyuUPxc_YT6Mg2vwJ1Sq6eubjDpeocNo1oSbi9KRgbC3M";

const wildernessHeroUrl =
  "https://lh3.googleusercontent.com/aida/ADBb0ugqoUNpQugzJpma1M2DK6oAFeZJN8oXmgpwmxg2r4FYLHMhsl_9gK0suuJRMrrAgL1gwAT_YQjYbQOlFttZPUNTdETDP5FCEN2vzf1RgrKkoGX4N6bWaSIxOF7QUf-_a2Gtd1_GbQAygcymqSyhytT7e2X59c-uUyhJnGu2SxgVjFcPye-iuVY7dbkk0qb1Hzd2_Ty_Q-fqI77XOspUcJI0Yxk68NAihbrV-DuWClOJC_sGm9OwUhkihQ";

const stationNightUrl =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCFSjuNaBBEFIXwofy21U_kouAWevXSRHNP-GLOsUTjoJD9KjKCoquNWu8h6AoHVgKAW-ICvWqdRGobYct55vEIyQVTQr4J9MyVkCTI13ZaHYkYUmf46qOs-eJvKhPJSEm_g3Ipzu2z8EqHR1IslCVfRZP1DVymJhxRiD_M9hi7hoGqfMafIAfGGwbeMX03UUO7X-CSwjpAO-ELh7cfO0VR_ssZnUtWRC0Nz8QEzpIm_hKru-0nZqMIl6APnYvkU95dtdDahxCOyeI";

const galleryPhotos = [
  "https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg?auto=compress&cs=tinysrgb&w=640",
  "https://images.pexels.com/photos/2516409/pexels-photo-2516409.jpeg?auto=compress&cs=tinysrgb&w=640",
  "https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=640",
  "https://images.pexels.com/photos/2901209/pexels-photo-2901209.jpeg?auto=compress&cs=tinysrgb&w=640"
];

const wildernessMockPlaces = [
  {
    id: "wild-emerald-hollow",
    name: "Emerald Hollow",
    category: "nature",
    type: "hidden_gem",
    rating: 4.9,
    ratingCount: 42,
    photo: galleryPhotos[0],
    photos: [galleryPhotos[0]],
    description: "Mossy forest pocket where fog gathers under old-growth cedar arches.",
    detourDistance: "2.4 km",
    distance: 2400,
    estimatedTime: 35,
    walkingTime: 18,
    isHiddenGem: true,
    isOpenAtArrival: true,
    is24Hours: true,
    todaysHours: "Open access trail",
    bestTime: "Blue hour after sunrise",
    safetyNote: "Marked trail, steady footing, best with a headlamp after dark.",
    crowdLevel: "Quiet",
    photoScore: 98,
    tags: ["Quiet", "Misty", "Forest"],
    safeForNighttime: true,
    point: { x: 34, y: 58 }
  },
  {
    id: "wild-misty-falls",
    name: "Misty Falls",
    category: "viewpoint",
    type: "viewpoint",
    rating: 4.8,
    ratingCount: 87,
    photo: galleryPhotos[1],
    photos: [galleryPhotos[1]],
    description: "A short detour to layered cascades with a clean overlook above the spray.",
    detourDistance: "5.1 km",
    distance: 5100,
    estimatedTime: 45,
    walkingTime: 31,
    isHiddenGem: true,
    isOpenAtArrival: true,
    todaysHours: "Open 24 hours",
    bestTime: "Late afternoon mist",
    safetyNote: "Guardrail at the main lookout; avoid the lower stones when wet.",
    crowdLevel: "Low",
    photoScore: 95,
    tags: ["Waterfall", "Photo spot", "Short hike"],
    point: { x: 58, y: 38 }
  },
  {
    id: "wild-obsidian-path",
    name: "Obsidian Path",
    category: "photo-op",
    type: "photo_op",
    rating: 4.7,
    ratingCount: 63,
    photo: galleryPhotos[2],
    photos: [galleryPhotos[2]],
    description: "Dark stone footpath with reflected light and a dramatic forest canopy.",
    detourDistance: "3.8 km",
    distance: 3800,
    estimatedTime: 25,
    walkingTime: 22,
    isHiddenGem: false,
    isOpenAtArrival: true,
    todaysHours: "Open access",
    bestTime: "After rain",
    safetyNote: "Can be slippery; stay on the stone path.",
    crowdLevel: "Moderate",
    photoScore: 92,
    tags: ["Textures", "Rain", "Moody"],
    point: { x: 72, y: 64 }
  },
  {
    id: "wild-orchard-court",
    name: "Orchard Court",
    category: "garden",
    type: "hidden_gem",
    rating: 4.6,
    ratingCount: 29,
    photo: galleryPhotos[3],
    photos: [galleryPhotos[3]],
    description: "Tucked-away walled garden beside a quiet lane and old stone steps.",
    detourDistance: "1.6 km",
    distance: 1600,
    estimatedTime: 20,
    walkingTime: 12,
    isHiddenGem: true,
    isOpenAtArrival: false,
    nextOpenTime: "08:00",
    todaysHours: "08:00 - 20:00",
    bestTime: "Morning shade",
    safetyNote: "Residential area, well lit near the entrance.",
    crowdLevel: "Very quiet",
    photoScore: 88,
    tags: ["Garden", "Local", "Calm"],
    point: { x: 45, y: 28 }
  }
];

const layoverSuggestions = [
  {
    id: "layover-night-cafe",
    name: "Eiswerk Nightly",
    category: "cafe",
    photo: stationNightUrl,
    photos: [stationNightUrl],
    description: "Warm 24-hour counter inside the station perimeter with breakfast and charging seats.",
    rating: 4.5,
    ratingCount: 118,
    distanceFromStationLabel: "450 m",
    detourDistance: "450 m",
    walkingTime: 6,
    estimatedTime: 35,
    isOpenAtArrival: true,
    is24Hours: true,
    todaysHours: "24 hours",
    safeForNighttime: true,
    fitsInLayover: true,
    layoverWindow: "03:00 - 07:00",
    layoverName: "Nuremberg Hbf",
    bestTime: "03:30 for quiet seating",
    safetyNote: "Inside a staffed transit zone with cameras and late-night foot traffic.",
    crowdLevel: "Low",
    photoScore: 74,
    tags: ["24h", "Safe zone", "Coffee"]
  },
  {
    id: "layover-opera-deck",
    name: "Opera Deck",
    category: "viewpoint",
    photo: galleryPhotos[1],
    photos: [galleryPhotos[1]],
    description: "A compact, well-lit urban view deck for dawn photos within easy walking range.",
    rating: 4.4,
    ratingCount: 51,
    distanceFromStationLabel: "900 m",
    detourDistance: "900 m",
    walkingTime: 12,
    estimatedTime: 25,
    isOpenAtArrival: true,
    todaysHours: "Open access",
    safeForNighttime: true,
    fitsInLayover: true,
    layoverWindow: "03:00 - 07:00",
    layoverName: "Nuremberg Hbf",
    bestTime: "Blue hour",
    safetyNote: "Stay on the main boulevard and return before the 06:30 commuter rush.",
    crowdLevel: "Quiet",
    photoScore: 86,
    tags: ["Night view", "Walkable", "Open"]
  }
];

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

const pageContent = {
  how: {
    title: "How It Works",
    subtitle: "OffTrail samples your route, searches the corridor, scores hidden gems, and turns the best stops into an itinerary.",
    cards: ["Enter a route", "Pick your travel vibe", "Discover nearby gems", "Save or share the itinerary"]
  },
  pricing: {
    title: "Pricing",
    subtitle: "Choose the discovery depth that fits your travel style.",
    cards: ["Free: 3 route searches/month", "Explorer $9/mo: unlimited route searches", "Pro $19/mo: team sharing and exports"]
  },
  community: {
    title: "Community",
    subtitle: "A feed of user-submitted gems from travelers who look beyond the obvious.",
    cards: ["Mossy canal steps in Bruges", "Sunset wall above Lyon", "Tiny courtyard cafe near Munich"]
  },
  blog: {
    title: "Blog",
    subtitle: "Travel tips, destination guides, and ways to build more serendipity into every route.",
    cards: ["How to plan a scenic detour", "The best photo stops are often 10 minutes away", "Local markets worth timing your route around"]
  },
  about: {
    title: "About Us",
    subtitle: "OffTrail exists to make travel feel more curious, local, and alive.",
    cards: ["We combine map data with AI curation", "We surface both famous stops and quiet corners", "We help travelers choose their own kind of wonder"]
  },
  settings: {
    title: "Settings",
    subtitle: "Tune OffTrail around your favorite categories and route defaults.",
    cards: ["Default radius: 5 km", "Preferred pace: relaxed", "Saved filters: nature, viewpoints, hidden gems"]
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

function App() {
  return (
    <OffTrailProvider>
      <OffTrailApp />
    </OffTrailProvider>
  );
}

function OffTrailProvider({ children }) {
  const [view, setView] = useState("home");
  const [contentPage, setContentPage] = useState("how");
  const [modal, setModal] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
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

  function signIn(user) {
    const nextUser = { ...user, token: user.token || `demo-token-${Date.now()}` };
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
    openContent
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function OffTrailApp() {
  const { view, modal, toast, closeOverlay, notify } = useOffTrail();
  const usesFoundationShell = view === "home" || view === "routeDiscovery" || view === "nearby";

  return (
    <main className={`app-shell ${usesFoundationShell ? "uses-foundation-shell" : ""}`}>
      {!usesFoundationShell && (
        <>
          <video className="background-video" src={videoUrl} autoPlay loop muted playsInline poster={thumbnailUrl} aria-hidden="true" />
          <div className="video-shade" aria-hidden="true" />
        </>
      )}
      {view === "home" && <LandingPage />}
      {view === "routeDiscovery" && (
        <FoundationPage
          active="routes"
          eyebrow="Routes"
          title="Plan a route with hidden stops"
          description="Build a journey with scenic detours, local favorites, photo spots, and time-aware stops along the way."
          action="Plan My Route"
          onAction="planner"
        />
      )}
      {view === "nearby" && (
        <FoundationPage
          active="nearby"
          eyebrow="Nearby"
          title="Explore hidden gems nearby"
          description="Open the radar view to scan your surroundings for hidden gems, viewpoints, nature spots, and photo locations."
          action="Explore Around You"
          onAction="exploreAround"
        />
      )}
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
  const { setModal, setView, auth } = useOffTrail();
  const openArchive = () => {
    if (auth.isAuthenticated) {
      setView("dashboard");
    } else {
      setModal("signupPrompt");
    }
  };

  return (
    <AppShell active="explore" className="landing-page">
      <section className="gf-foundation-hero">
        <div className="gf-hero-copy">
          <div className="gf-hero-gem" aria-hidden="true">
            <Gem size={42} />
          </div>
          <p className="gf-eyebrow">AI route discovery</p>
          <h1>
            Discover every <span className="gf-italic">hidden gem</span> on your path
          </h1>
          <p>
            AI-powered journey discovery for routes, layovers, and nearby exploration - uncover hidden gems,
            viewpoints, gardens, local favorites, and photogenic places most travelers miss.
          </p>
          <div className="gf-hero-actions">
            <button className="gf-primary-button" type="button" onClick={() => setModal("planner")}>
              <Route size={18} />
              Plan My Route
            </button>
            <button className="gf-secondary-button" type="button" onClick={() => setModal("exploreAround")}>
              <Compass size={18} />
              Explore Around You
            </button>
          </div>
          <div className="gf-chip-row" aria-label="Feature categories">
            <span><Gem size={14} /> Hidden gems</span>
            <span><Camera size={14} /> Photo spots</span>
            <span><Compass size={14} /> Local favorites</span>
          </div>
        </div>
        <div className="gf-hero-side">
          <div className="gf-bento-grid">
            <button className="gf-feature-card gf-feature-card-large" type="button" onClick={() => setModal("exploreAround")}>
              <span className="gf-feature-icon cyan"><Compass size={25} /></span>
              <span className="gf-feature-copy">
                <strong>Explore Around You</strong>
                <small>Use radar to find nearby gems based on time and mood</small>
              </span>
              <ArrowRight size={20} className="gf-feature-arrow" />
            </button>
            <button className="gf-feature-card" type="button" onClick={() => setModal("planner")}>
              <span className="gf-feature-icon blue"><Navigation size={24} /></span>
              <strong>AI Route Planning</strong>
              <small>Smart algorithms find every POI along your path</small>
            </button>
            <button className="gf-feature-card" type="button" onClick={openArchive}>
              <span className="gf-feature-icon purple"><MapIcon size={24} /></span>
              <strong>Discovery Archive</strong>
              <small>Save and revisit favorite hidden spots</small>
            </button>
          </div>
          <div className="gf-visual-card" aria-hidden="true">
            <svg className="gf-route-preview" viewBox="0 0 560 360" role="img">
              <defs>
                <linearGradient id="gfPreviewGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#adc6ff" />
                  <stop offset="50%" stopColor="#ddb7ff" />
                  <stop offset="100%" stopColor="#4cd7f6" />
                </linearGradient>
              </defs>
              <path className="gf-route-base" d="M52 294 C130 258 158 128 260 154 S394 292 505 68" />
              <path className="gf-route-line" d="M52 294 C130 258 158 128 260 154 S394 292 505 68" />
              <path className="gf-route-branch branch-one" d="M180 190 C154 150 126 120 92 98" />
              <path className="gf-route-branch branch-two" d="M330 210 C352 176 386 152 424 142" />
              <circle className="gf-endpoint" cx="52" cy="294" r="8" />
              <circle className="gf-endpoint end" cx="505" cy="68" r="8" />
            </svg>
            {[
              ["Hidden garden", "18%", "27%", Gem],
              ["Photo overlook", "74%", "40%", Camera],
              ["Local cafe", "48%", "68%", Compass]
            ].map(([label, left, top, Icon], index) => (
              <span className="gf-preview-pin" style={{ left, top, animationDelay: `${index * 180}ms` }} key={label}>
                <Icon size={15} />
                <small>{label}</small>
              </span>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function AppShell({ active = "explore", className = "", children }) {
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const frameRef = useRef(null);

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
      <WildernessNavbar active={active} />
      <main className="gf-main">{children}</main>
    </section>
  );
}

function WildernessBackdrop() {
  return (
    <div className="gf-background" aria-hidden="true">
      <img src={wildernessHeroUrl} alt="" />
      <div className="gf-background-shade" />
    </div>
  );
}

function WildernessNavbar({ active }) {
  const { setView, setModal, setMenuOpen, auth, accountOpen, setAccountOpen } = useOffTrail();
  const links = [
    ["explore", "Explore", "home"],
    ["routes", "Routes", "routeDiscovery"],
    ["nearby", "Nearby", "nearby"],
    ["saved", "Saved Gems", "favorites"]
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
    ["routes", "Routes", "routeDiscovery", Route],
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
        <SectionHeader eyebrow="Next-gen discovery" title="Discover every hidden gem on your path" />
        <p>
          AI-powered journey discovery for routes, layovers, and nearby exploration - uncover hidden gems,
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
      if (!response.ok) throw new Error(result.error || "Route discovery failed.");

      setRouteState({
        origin: originPlace,
        destination: destinationPlace,
        layovers: layoverPlaces,
        preferences: Array.from(preferences),
        radius,
        departureTime,
        date: departureTime.slice(0, 10),
        results: result,
        selectedLocationIds: result.locations.slice(0, 3).map((location) => location.id)
      });
      dismissOverlay();
      setView("results");
      notify(`Found ${result.total} places along your route.`);
    } catch (error) {
      console.error("Discovery error:", error);
      const message = error instanceof Error ? error.message : "Failed to discover route.";
      setError(message);
      notify("Failed to load. Please try again.", "error", discoverRoute);
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
      {error && <p className="form-error helper-text">{error}</p>}
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

function PlaceInput({ label, value, onChange, placeholder, error = "", valid = false, disabled = false }) {
  const [suggestions, setSuggestions] = useState([]);

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
    }, 220);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  return (
    <label className={`field place-field ${error ? "is-invalid" : valid ? "is-valid" : ""}`}>
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} autoComplete="off" aria-invalid={Boolean(error)} disabled={disabled} />
      {error && <span className="field-error">{error}</span>}
      {suggestions.length > 0 && (
        <div className="suggestion-list liquid-glass">
          {suggestions.map((suggestion) => (
            <button key={suggestion.id} type="button" onClick={() => onChange(suggestion.label)}>
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
  const [origin, setOrigin] = useState(routeState.origin?.label || routeState.origin?.name || "Bad Honnef");
  const [destination, setDestination] = useState(routeState.destination?.label || routeState.destination?.name || "Munich");
  const [departureTime, setDepartureTime] = useState(routeState.departureTime || toDatetimeLocal(new Date(Date.now() + 86400000)));
  const [travelMode, setTravelMode] = useState("Train");
  const [radius, setRadius] = useState(routeState.radius || 5);
  const [preferences, setPreferences] = useState(new Set(routeState.preferences || ["nature", "viewpoint", "hidden", "photo-op"]));
  const [layovers, setLayovers] = useState(routeState.layovers?.length ? routeState.layovers : [
    {
      id: "default-nuremberg",
      label: "Nuremberg Hbf",
      arrivalTime: "03:00",
      departureTime: "07:00",
      maxDistance: 2,
      timeAvailable: 240
    }
  ]);
  const [results, setResults] = useState(routeState.results);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const visibleLocations = results?.locations?.length ? results.locations : wildernessMockPlaces;
  const selected = new Set(routeState.selectedLocationIds || []);

  async function discoverRoute(event) {
    event.preventDefault();
    setSubmitted(true);
    if (!origin.trim() || !destination.trim()) {
      notify("From and To locations are required.", "error");
      return;
    }

    setLoading(true);
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
      if (!response.ok) throw new Error(result.error || "Route discovery failed.");

      setResults(result);
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
        selectedLocationIds: result.locations.slice(0, 3).map((location) => location.id)
      });
      notify(`Found ${result.total} places along your route.`);
    } catch (error) {
      console.error("Journey discovery error:", error);
      notify("Failed to load. Please try again.", "error", discoverRoute);
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
    <AppShell active="routes" className="journey-page">
      <section className="journey-grid">
        <aside className="journey-left">
          <RoutePlannerCard
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
          />
          <JourneySummaryCard
            origin={origin}
            destination={destination}
            radius={radius}
            results={results}
            selectedCount={selected.size}
          />
        </aside>

        <section className="journey-map-stage">
          <div className="coordinate-strip">SCAN ALPHA-74 // ROUTE CORRIDOR // LIVE GEM SIGNALS</div>
          <AnimatedRouteMap
            route={results?.route}
            locations={visibleLocations}
            selected={selected}
            onSelectPlace={setSelectedPlace}
            variant="journey"
          />
        </section>

        <aside className="journey-right">
          <SectionHeader eyebrow="Discovered Places" title={results ? `${visibleLocations.length} route matches` : "Preview discovery stream"} compact />
          <div className="wilderness-card-list">
            {visibleLocations.map((location, index) => (
              <HiddenGemCard
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
            ))}
          </div>
        </aside>
      </section>

      <LayoverDiscoveryPanel suggestions={layoverSuggestions} onSelect={setSelectedPlace} />

      <div className="route-page-actions">
        <button className="wilderness-secondary" type="button" onClick={() => setView("results")}>
          <MapIcon size={17} />
          Open Full Results
        </button>
        <button className="wilderness-primary" type="button" onClick={() => setView("itinerary")}>
          <Clock size={17} />
          View Itinerary
        </button>
      </div>

      {selectedPlace && <PlaceDetailDrawer place={selectedPlace} onClose={() => setSelectedPlace(null)} />}
    </AppShell>
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
        <Stat label="Gems found" value={results?.total || wildernessMockPlaces.length} />
        <Stat label="Radius" value={`${radius} km`} />
        <Stat label="Added" value={selectedCount || 0} />
      </div>
    </section>
  );
}

function ExploreAroundYouPage() {
  const { notify, favorites, setFavorites } = useOffTrail();
  const [location, setLocation] = useState("Current location");
  const [radius, setRadius] = useState(5);
  const [timeWindow, setTimeWindow] = useState("2 hours");
  const [filters, setFilters] = useState(new Set(["hidden", "nature", "viewpoint", "open-now"]));
  const [openNow, setOpenNow] = useState(true);
  const [safeLate, setSafeLate] = useState(false);
  const [userLocation, setUserLocation] = useState({ lat: 64.134, lng: -21.467 });
  const [places, setPlaces] = useState(fallbackIntelligenceLocations({ lat: 64.134, lng: -21.467 }));
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(false);

  async function runNearbyScan(event) {
    event?.preventDefault();
    setLoading(true);
    try {
      const position = location.trim() && location !== "Current location" ? await geocode(location) : await getBrowserPosition();
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
      notify("Failed to load. Please try again.", "error", runNearbyScan);
      const fallback = fallbackIntelligenceLocations(userLocation).map(normalizeIntelligencePlace);
      setPlaces(fallback);
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
    <AppShell active="nearby" className="nearby-page">
      <section className="nearby-layout">
        <aside className="nearby-controls wilderness-glass shimmer-border">
          <SectionHeader eyebrow="Explore Around You" title="Nearby radar" compact />
          <form className="nearby-form" onSubmit={runNearbyScan}>
            <PlaceInput label="Location" value={location} onChange={setLocation} placeholder="Current location or city" disabled={loading} />
            <RadiusSelector min={2} max={10} value={radius} onChange={setRadius} label="Scan radius" />
            <div className="time-selector" role="group" aria-label="Available time">
              {["30 min", "1 hour", "2 hours", "4 hours"].map((option) => (
                <button key={option} className={timeWindow === option ? "is-active" : ""} type="button" onClick={() => setTimeWindow(option)}>
                  {option}
                </button>
              ))}
            </div>
            <FilterChips
              options={[
                { key: "hidden", label: "Hidden gems" },
                { key: "nature", label: "Nature" },
                { key: "viewpoint", label: "Viewpoints" },
                { key: "photo_op", label: "Photo spots" },
                { key: "local", label: "Local favorites" },
                { key: "garden", label: "Gardens" },
                { key: "open-now", label: "Open now" },
                { key: "safe-night", label: "Safe at night" },
                { key: "food", label: "Food" },
                { key: "quiet", label: "Quiet places" }
              ]}
              selected={filters}
              onToggle={(key) => toggleSet(filters, setFilters, key)}
            />
            <div className="toggle-grid">
              <label className="toggle-row">
                <input type="checkbox" checked={openNow} onChange={() => setOpenNow(!openNow)} />
                <span>Open now</span>
              </label>
              <label className="toggle-row">
                <input type="checkbox" checked={safeLate} onChange={() => setSafeLate(!safeLate)} />
                <span>Safe late-night</span>
              </label>
            </div>
            <button className="wilderness-primary full-width" type="submit" disabled={loading}>
              {loading ? <Loader2 className="spin" size={18} /> : <Navigation size={18} />}
              {loading ? "Scanning..." : "Scan Nearby"}
            </button>
          </form>
        </aside>

        <ExploreAroundYouRadar
          userLocation={userLocation}
          locations={filteredPlaces}
          radius={radius}
          activeId={activeId}
          setActiveId={setActiveId}
          onSelect={setSelectedPlace}
        />

        <aside className="nearby-results">
          <SectionHeader eyebrow={`${timeWindow} available`} title={`${filteredPlaces.length} matches near you`} compact />
          <div className="wilderness-card-list">
            {filteredPlaces.map((place, index) => (
              <HiddenGemCard
                key={place.id}
                place={place}
                index={index}
                active={activeId === place.id}
                saved={favorites.some((favorite) => favorite.id === place.id)}
                onSelect={() => setSelectedPlace(place)}
                onSave={() => {
                  setFavorites(toggleFavorite(favorites, place));
                  notify("Favorite updated.");
                }}
                onHover={(active) => setActiveId(active ? place.id : null)}
              />
            ))}
          </div>
        </aside>
      </section>
      {selectedPlace && <PlaceDetailDrawer place={selectedPlace} onClose={() => setSelectedPlace(null)} />}
    </AppShell>
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
          onClick={() => onToggle(option.key)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function AnimatedRouteMap({ route, locations = [], selected = new Set(), onSelectPlace, variant = "journey" }) {
  const pins = locations.map((location, index) => ({
    ...location,
    point: location.point || routeLocationPoint(location, index)
  }));
  const startLabel = route?.segments?.[0]?.from || "Origin";
  const endLabel = route?.segments?.at?.(-1)?.to || "Destination";

  return (
    <section className={`animated-route-map ${variant}`} aria-label="Animated route map">
      <div className="map-atmosphere" />
      <svg className="animated-map-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={`routeGradient-${variant}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#b4cbc6" />
            <stop offset="100%" stopColor="#7cd5d5" />
          </linearGradient>
        </defs>
        <path className="route-shadow-line" d="M 10 78 C 27 72 32 34 51 38 S 72 78 88 18" />
        <path className="route-active-line" d="M 10 78 C 27 72 32 34 51 38 S 72 78 88 18" stroke={`url(#routeGradient-${variant})`} />
        {pins.slice(0, 10).map((pin) => (
          <path
            key={`line-${pin.id}`}
            className="route-branch-line"
            d={`M ${pin.point.routeX || pin.point.x} ${pin.point.routeY || 50} Q ${(pin.point.x + (pin.point.routeX || pin.point.x)) / 2} ${pin.point.y - 12}, ${pin.point.x} ${pin.point.y}`}
          />
        ))}
      </svg>
      <div className="map-endpoint is-start" style={{ left: "10%", top: "78%" }}>
        <span />
        <strong>{startLabel}</strong>
      </div>
      <div className="map-endpoint is-end" style={{ left: "88%", top: "18%" }}>
        <span />
        <strong>{endLabel}</strong>
      </div>
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
      <div className="map-hud top-left">LAT 49.4478 // LON 11.0814</div>
      <div className="map-hud bottom-right">SIGNALS: {pins.length} // STATUS: OPTIMAL</div>
    </section>
  );
}

function HiddenGemCard({ place, index = 0, selected = false, saved = false, active = false, onSelect, onToggle, onSave, onHover }) {
  const image = place.photo || place.photos?.[0] || thumbnailUrl;
  const distance = place.distanceFromStationLabel || place.detourDistance || formatMeters(place.distance);
  const open = place.isOpenAtArrival ?? place.isOpen ?? true;

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
        if (event.target.closest("button")) return;
        onSelect?.();
      }}
      onKeyDown={handleCardKeyDown}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      onFocus={() => onHover?.(true)}
      onBlur={() => onHover?.(false)}
    >
      <img src={image} alt={place.name} />
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
          <span><Star size={13} /> {Number(place.rating || 4.6).toFixed(1)}</span>
        </div>
        <div className="tag-strip">
          <span>{labelForType(place.type) || place.category}</span>
          {place.isHiddenGem && <span>Hidden Gem</span>}
          {place.safeForNighttime && <span>Safe late</span>}
        </div>
        <div className="card-actions-row">
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
  return (
    <span className={`status-badge ${open ? "is-open" : "is-closed"}`}>
      {open ? <CheckCircle size={13} /> : <XCircle size={13} />}
      {open ? (is24Hours ? "24h open" : "Open now") : `Closed${nextOpenTime ? ` until ${nextOpenTime}` : ""}`}
    </span>
  );
}

function PlaceDetailDrawer({ place, onClose }) {
  const { routeState, setRouteState, setView, notify, favorites, setFavorites } = useOffTrail();
  const image = place.photo || place.photos?.[0] || thumbnailUrl;
  const saved = favorites.some((favorite) => favorite.id === place.id);

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
    <div className="place-detail-layer">
      <button className="place-detail-backdrop" type="button" aria-label="Close detail" onClick={onClose} />
      <aside className="place-detail-drawer wilderness-glass" role="dialog" aria-modal="true" aria-label={place.name}>
        <button className="drawer-back-button" type="button" onClick={onClose} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <img className="drawer-hero-image" src={image} alt={place.name} />
        <div className="drawer-content">
          <div className="drawer-kicker">
            <span>{labelForType(place.type) || place.category}</span>
            <strong><Star size={15} /> {Number(place.rating || 4.7).toFixed(1)}</strong>
          </div>
          <h2>{place.name}</h2>
          <p>{place.description}</p>
          <div className="detail-metric-grid">
            <Stat label="Distance" value={place.distanceFromStationLabel || place.detourDistance || formatMeters(place.distance)} />
            <Stat label="Travel time" value={`${place.walkingTime || place.estimatedTime || 20} min`} />
            <Stat label="Photo score" value={`${place.photoScore || 91}%`} />
            <Stat label="Crowd level" value={place.crowdLevel || "Low"} />
          </div>
          <div className="detail-note-grid">
            <article>
              <span>Best time</span>
              <p>{place.bestTime || place.todaysHours || "Golden hour"}</p>
            </article>
            <article>
              <span>Why it is special</span>
              <p>{place.isHiddenGem ? "Low review density with high signal, strong local character, and a short detour." : "Strong route fit with visual payoff and practical timing."}</p>
            </article>
            <article>
              <span>Safety note</span>
              <p>{place.safetyNote || (place.safeForNighttime ? "Verified as practical for late-night movement." : "Use normal travel awareness and check access before leaving the route.")}</p>
            </article>
          </div>
          <div className="tag-strip drawer-tags">
            {(place.tags || [place.category, place.safeForNighttime ? "Safe late-night" : "Route fit"]).map((tag) => <span key={tag}>{tag}</span>)}
          </div>
          <div className="drawer-action-grid">
            <button className="wilderness-primary" type="button" onClick={addToItinerary}><Plus size={17} /> Add to itinerary</button>
            <button className="wilderness-secondary" type="button" onClick={() => {
              setFavorites(toggleFavorite(favorites, place));
              notify("Favorite updated.");
            }}>
              <Heart size={17} fill={saved ? "currentColor" : "none"} />
              {saved ? "Saved" : "Save gem"}
            </button>
            <button className="wilderness-secondary" type="button" onClick={() => setView(routeState.results ? "results" : "routeDiscovery")}><Navigation size={17} /> View route</button>
            <button className="wilderness-secondary" type="button" onClick={sharePlace}><Share2 size={17} /> Share</button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function LayoverDiscoveryPanel({ suggestions, onSelect }) {
  return (
    <section className="layover-discovery-panel wilderness-glass">
      <img src={stationNightUrl} alt="" />
      <div className="layover-panel-copy">
        <SectionHeader eyebrow="Layover Discovery" title="Nuremberg Hbf, 03:00 - 07:00" compact />
        <p>Prioritized by open-now status, short walking distance, practical safety, and realistic fit inside a 4-hour overnight window.</p>
        <div className="layover-safety-tags">
          <span><CheckCircle size={14} /> Safe late-night</span>
          <span><Clock size={14} /> Open now first</span>
          <span><MapPin size={14} /> Under 2 km</span>
        </div>
      </div>
      <div className="layover-suggestion-grid">
        {suggestions.map((place) => (
          <button className="layover-suggestion" type="button" key={place.id} onClick={() => onSelect(place)}>
            <strong>{place.name}</strong>
            <span>{place.distanceFromStationLabel} · {place.walkingTime} min walk</span>
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
      // Local authenticated fallback keeps the UX complete in demo mode.
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
        <p>{results.route.distance} · {results.route.duration}</p>
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
        {results.locations.map((location) => (
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
        ))}
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
            <img src={route.thumbnail || thumbnailUrl} alt="" />
            <h3>{route.origin?.name || "Origin"} → {route.destination?.name || "Destination"}</h3>
            <p>{route.date} · {route.spotsFound} spots found</p>
            <button className="mini-button liquid-glass" type="button" onClick={() => setView("routeDetail")}>View Route</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function FavoritesPage() {
  const { favorites } = useOffTrail();
  return (
    <section className="app-page dashboard-page">
      <PageTopbar title="My Favorites" />
      <div className="dashboard-grid">
        {favorites.length === 0 && <EmptyState title="No favorites yet" action="Back home" />}
        {favorites.map((location) => (
          <article className="saved-route-card liquid-glass" key={location.id}>
            <img src={location.photos?.[0] || thumbnailUrl} alt={location.name} />
            <h3>{location.name}</h3>
            <p>{location.category} · {location.detourDistance}</p>
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
  const { menuOpen, setMenuOpen, openContent, auth, signOut } = useOffTrail();
  return (
    <div className={`menu-overlay ${menuOpen ? "is-open" : ""}`} aria-hidden={!menuOpen}>
      <button className="menu-backdrop" type="button" aria-label="Back" onClick={() => setMenuOpen(false)} />
      <aside className="slide-menu liquid-glass-strong">
        <button className="back-button liquid-glass" type="button" onClick={() => setMenuOpen(false)} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <h2>Menu</h2>
        {[
          ["how", "How It Works"],
          ["pricing", "Pricing"],
          ["community", "Community"],
          ["blog", "Blog"],
          ["about", "About Us"],
          ["settings", "Settings"]
        ].map(([key, label]) => (
          <button className="menu-link" type="button" key={key} onClick={() => openContent(key)}>
            {label}
            <ArrowRight size={16} />
          </button>
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
  const { setView, signOut } = useOffTrail();
  return (
    <div className="account-dropdown liquid-glass">
      <button type="button" onClick={() => setView("dashboard")}><History size={15} /> My Saved Routes</button>
      <button type="button" onClick={() => setView("favorites")}><Heart size={15} /> My Favorites</button>
      <button type="button" onClick={() => setView("profile")}><Settings size={15} /> Account Settings</button>
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
      const position = await getBrowserPosition();
      if (cancelled) return;
      setUserLocation(position);
      try {
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
        notify("Location intelligence is using demo data.", "error");
        if (!cancelled) setLocations(fallbackIntelligenceLocations(position));
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
                  <span>{Number(location.rating || 4.6).toFixed(1)}</span>
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
      signIn({ id: "google-demo", email: "traveler@offtrail.demo", name: "Google Traveler" });
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
  const messages = ["Mapping your route...", "Finding hidden gems...", "Analyzing 250+ locations..."];
  return (
    <div className="loading-route">
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
        {image && <img src={image} alt="" />}
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
    <div className={`toast liquid-glass-strong toast-${tone} ${tone === "error" ? "error-toast" : ""}`}>
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
  const fallback = { lat: 64.134, lng: -21.467 };
  if (typeof navigator === "undefined" || !navigator.geolocation) return Promise.resolve(fallback);

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }),
      () => resolve(fallback),
      { enableHighAccuracy: false, timeout: 3200, maximumAge: 300000 }
    );
  });
}

function fallbackIntelligenceLocations(userLocation) {
  return [
    {
      id: "fallback-obsidian",
      name: "Obsidian Gorge",
      type: "hidden_gem",
      coordinates: { lat: userLocation.lat + 0.0108, lng: userLocation.lng - 0.0176 },
      distance: 1200,
      description: "Rare geological formation with deep teal water veins.",
      photo: intelligencePreviewUrl,
      rating: 4.8,
      isOpen: true,
      category: "nature"
    },
    {
      id: "fallback-twilight",
      name: "Twilight Crest",
      type: "photo_op",
      coordinates: { lat: userLocation.lat - 0.0162, lng: userLocation.lng + 0.0282 },
      distance: 2800,
      description: "Perfect elevation for celestial long-exposure shots.",
      photo: galleryPhotos[0],
      rating: 4.9,
      isOpen: true,
      category: "viewpoint"
    }
  ];
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
  const latDelta = location.coordinates?.lat - userLocation.lat;
  const lngDelta = location.coordinates?.lng - userLocation.lng;
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

function normalizeIntelligencePlace(location, index = 0) {
  const distance = Number(location.distance || location.distanceFromStation || 1200 + index * 500);
  return {
    ...location,
    lat: location.coordinates?.lat ?? location.lat,
    lng: location.coordinates?.lng ?? location.lng,
    photo: location.photo || location.photos?.[0] || galleryPhotos[index % galleryPhotos.length],
    photos: location.photos || [location.photo || galleryPhotos[index % galleryPhotos.length]],
    category: location.category || labelForType(location.type).toLowerCase(),
    type: location.type || (location.category === "photo-op" ? "photo_op" : "hidden_gem"),
    description: location.description || "A quiet nearby discovery with strong route fit.",
    rating: location.rating || 4.6,
    distance,
    detourDistance: location.detourDistance || formatMeters(distance),
    estimatedTime: location.estimatedTime || Math.max(20, Math.round(distance / 90)),
    walkingTime: location.walkingTime || Math.max(4, Math.round(distance / 80)),
    isOpenAtArrival: location.isOpenAtArrival ?? location.isOpen ?? true,
    safeForNighttime: location.safeForNighttime ?? distance <= 2500,
    photoScore: location.photoScore || Math.min(99, 82 + index * 3),
    bestTime: location.bestTime || (location.type === "photo_op" ? "Golden hour" : "Quiet morning"),
    crowdLevel: location.crowdLevel || (index < 2 ? "Low" : "Moderate"),
    tags: location.tags || [labelForType(location.type), formatMeters(distance), location.isOpen ? "Open now" : "Check hours"],
    point: location.point || routeLocationPoint(location, index)
  };
}

function routeLocationPoint(location, index = 0) {
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
  }
  const method = mode === "replace" ? "replaceState" : "pushState";
  window.history[method]({ offtrail: true }, "", `${url.pathname}${url.search}${url.hash}`);
}

function parseUrlState() {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const modalParam = params.get("modal");
  const pageParam = params.get("page");
  return {
    modal: modalParam ? modalFromUrlMap[modalParam] || null : null,
    menuOpen: params.get("menu") === "main",
    contentPage: pageParam && pageContent[pageParam] ? pageParam : null
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
