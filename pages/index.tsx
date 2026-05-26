import Head from "next/head";
import App from "../src/App.jsx";

const allowedViews = new Set([
  "home",
  "routeDiscovery",
  "nearby",
  "results",
  "itinerary",
  "dashboard",
  "favorites",
  "profile",
  "routeDetail",
  "error"
]);

const allowedContentPages = new Set(["how", "pricing", "community", "blog", "about", "settings"]);

type HomePageProps = {
  initialView?: string | null;
  initialContentPage?: string | null;
};

export default function HomePage({ initialView = null, initialContentPage = null }: HomePageProps) {
  return (
    <>
      <Head>
        <title>OffTrail</title>
        <meta
          name="description"
          content="OffTrail reveals hidden gardens, viewpoints, cafes, and local favorites along your route."
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
