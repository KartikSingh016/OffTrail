import Head from "next/head";
import App from "../src/App.jsx";

const allowedViews = new Set([
  "home",
  "routeDiscovery",
  "nearby",
  "layover",
  "results",
  "itinerary",
  "dashboard",
  "favorites",
  "profile",
  "routeDetail",
  "error"
]);

const allowedContentPages = new Set(["how"]);

type HomePageProps = {
  initialView?: string | null;
  initialContentPage?: string | null;
};

export default function HomePage({ initialView = null, initialContentPage = null }: HomePageProps) {
  return (
    <>
      <Head>
        <title>OffTrail | Verified Hidden-Gem Route Planner</title>
        <meta
          name="description"
          content="Discover verified hidden gems along your route using provider-backed map data, practical detour estimates, and clear source labels."
        />
        <link rel="canonical" href="https://off-trail-flax.vercel.app/" />
        <meta property="og:title" content="OffTrail | Verified Hidden-Gem Route Planner" />
        <meta
          property="og:description"
          content="Plan a route and find real, map-verified stops for food, views, nature, culture, nightlife, and layovers."
        />
        <meta property="og:url" content="https://off-trail-flax.vercel.app/" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://off-trail-flax.vercel.app/assets/og-card.webp" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="OffTrail | Verified Hidden-Gem Route Planner" />
        <meta
          name="twitter:description"
          content="Verified hidden gems along your route. Real provider data only."
        />
        <meta name="twitter:image" content="https://off-trail-flax.vercel.app/assets/og-card.webp" />
        <link rel="preload" as="image" href="/assets/hero-road.webp" type="image/webp" />
      </Head>
      <App {...({ initialView, initialContentPage } as any)} />
    </>
  );
}

export async function getServerSideProps({ query }: { query: Record<string, string | string[] | undefined> }) {
  const view = typeof query.view === "string" && allowedViews.has(query.view) ? query.view : null;
  const page = typeof query.page === "string" && allowedContentPages.has(query.page) ? query.page : null;

  return {
    props: {
      initialView: view,
      initialContentPage: page
    }
  };
}
