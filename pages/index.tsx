import Head from "next/head";
import App from "../src/App.jsx";

export default function HomePage() {
  return (
    <>
      <Head>
        <title>OffTrail</title>
        <meta
          name="description"
          content="OffTrail reveals hidden gardens, viewpoints, cafes, and local favorites along your route."
        />
      </Head>
      <App />
    </>
  );
}
