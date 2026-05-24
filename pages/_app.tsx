import type { AppProps } from "next/app";
import "../src/styles.css";

export default function OffTrailPagesApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
