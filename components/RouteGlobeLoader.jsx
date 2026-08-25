import React, { useEffect, useRef, useState } from "react";
import { Compass } from "lucide-react";

/* Route-search loading visual, ported from the Stitch "Loading Discovery"
   screen (part of the "Elevated Explorer" redesign): a centered compass
   mark, wordmark, and a single cycling status line over a thin progress
   bar - no literal globe. Progress is still driven by the real search's
   scanStage instead of a fake timer, same reasoning the previous (Three.js
   globe) version used. */

const STAGE_CEILING = {
  idle: 0.05,
  geocoding: 0.22,
  routing: 0.48,
  places: 0.92,
  complete: 1,
  empty: 1
};

const STAGES = [
  [0, "Reading coordinates"],
  [0.22, "Fetching real routes"],
  [0.48, "Matching verified stops"],
  [0.92, "Route ready"]
];

function useProgressClock(scanStage) {
  const [t, setT] = useState(0.02);
  const tRef = useRef(0.02);
  const rafRef = useRef(null);
  const lastRef = useRef(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      setT(STAGE_CEILING[scanStage] ?? 0.3);
      return undefined;
    }
    function step(ts) {
      if (lastRef.current == null) lastRef.current = ts;
      const dt = Math.min(0.1, (ts - lastRef.current) / 1000);
      lastRef.current = ts;
      const ceiling = STAGE_CEILING[scanStage] ?? 0.3;
      const tau = ceiling >= 1 ? 0.35 : 5;
      const next = tRef.current + (ceiling - tRef.current) * (1 - Math.exp(-dt / tau));
      tRef.current = next;
      setT(next);
      rafRef.current = requestAnimationFrame(step);
    }
    lastRef.current = null;
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [scanStage]);

  return t;
}

export default function RouteGlobeLoader({ originLabel, destLabel, scanStage = "geocoding" }) {
  const t = useProgressClock(scanStage);

  let stageIndex = 0;
  for (let i = 0; i < STAGES.length; i += 1) if (t >= STAGES[i][0]) stageIndex = i;
  const stageLabel = STAGES[stageIndex][1];
  const pct = Math.round(Math.min(t, 1) * 100);

  const shorten = (value) => String(value || "").split(",")[0].trim();
  const route = shorten(originLabel) && shorten(destLabel) ? `${shorten(originLabel)} → ${shorten(destLabel)}` : "";

  return (
    <div className="rgl">
      <div className="rgl-mark">
        <Compass size={64} className="rgl-mark-icon" aria-hidden="true" />
        <h1 className="rgl-wordmark">OffTrail</h1>
      </div>
      <div className="rgl-progress">
        <p className="rgl-message">{stageLabel}</p>
        <div className="rgl-track">
          <div className="rgl-track-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="rgl-meta">{route || "Elevating Exploration"}</div>
      </div>
    </div>
  );
}
