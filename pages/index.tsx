import Head from "next/head";
import App from "../src/App.jsx";

const allowedViews = new Set([
  "home",
  "routeDiscovery",
  "nearby",
  "layover",
  "countryJourney",
  "results",
  "itinerary",
  "dashboard",
  "favorites",
  "profile",
  "routeDetail"
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
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="OffTrail | Verified Hidden-Gem Route Planner" />
        <meta
          name="twitter:description"
          content="Verified hidden gems along your route. Real provider data only."
        />
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
