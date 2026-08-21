import React, { useEffect, useRef, useState } from "react";

/* Route-search loading visual, ported from a Claude Design prototype
   ("OffTrail Route Loading"). The source design drives its animation off a
   fixed local timer (for demo purposes) and projects real world geography
   with d3 + topojson. Here `t` is driven by the real search's scanStage
   instead (geocoding/routing/places/complete) since a live request has no
   fixed duration, and the route curve is the design's own schematic
   fallback path rather than pulling in d3/topojson just for faint
   background country outlines. */

// Schematic curve control points, matching the source design's own
// no-geodata fallback (quadratic bezier in a 1124x900 viewBox).
const ORIGIN_PT = [840, 322];
const CONTROL_PT = [566, 118];
const DEST_PT = [286, 470];
const STOP_FRACTIONS = [0.09, 0.19, 0.29, 0.39, 0.48, 0.58, 0.68, 0.78, 0.88];

const STAGES = [
  [0.0, "READING COORDINATES", "Locking both endpoints"],
  [0.24, "FETCHING REAL ROUTES", "Tracing the verified corridor"],
  [0.5, "MATCHING STOPS", "Matching provider-verified stops"],
  [0.78, "SCORING CORRIDOR", "Ranking stops inside the corridor"],
  [0.9, "ROUTE READY", "Route ready to explore"]
];

// scanStage -> how far `t` is allowed to creep toward before the real
// search actually advances to the next phase. "places" covers both
// matching and scoring in the real backend, so its ceiling spans both of
// those stage labels above.
const STAGE_CEILING = {
  idle: 0.05,
  geocoding: 0.2,
  routing: 0.46,
  places: 0.86,
  complete: 1,
  empty: 1
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function quadPoint(t, a, c, b) {
  const mt = 1 - t;
  return [mt * mt * a[0] + 2 * mt * t * c[0] + t * t * b[0], mt * mt * a[1] + 2 * mt * t * c[1] + t * t * b[1]];
}

function useLoadingClock(scanStage) {
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
      // Snap quickly once the real result is in, otherwise creep slowly -
      // a search can legitimately take anywhere from ~1s to ~20s.
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

export default function RouteLoadingMap({ originLabel, destLabel, scanStage = "geocoding", radiusKm }) {
  const t = useLoadingClock(scanStage);

  const out = (x) => 1 - Math.pow(1 - x, 3);
  const seg = (a, b) => clamp((t - a) / (b - a), 0, 1);

  const mo = out(seg(0.02, 0.14));
  const md = out(seg(0.09, 0.22));
  const arc = out(seg(0.26, 0.68));
  const done = seg(0.9, 1);

  const [dotX, dotY] = quadPoint(arc, ORIGIN_PT, CONTROL_PT, DEST_PT);
  const arcPath = `M${ORIGIN_PT[0]},${ORIGIN_PT[1]} Q${CONTROL_PT[0]},${CONTROL_PT[1]} ${DEST_PT[0]},${DEST_PT[1]}`;

  const stops = STOP_FRACTIONS.map((f) => {
    const [x, y] = quadPoint(f, ORIGIN_PT, CONTROL_PT, DEST_PT);
    const born = clamp((arc - f - 0.015) * 22, 0, 1);
    const verified = t > 0.72 + STOP_FRACTIONS.indexOf(f) * 0.018;
    return { f, x, y, born, verified };
  });
  const foundCount = stops.filter((s) => s.born > 0.5).length;
  const verifiedCount = t < 0.72 ? 0 : stops.filter((s) => s.verified).length;

  let stageIndex = 0;
  for (let i = 0; i < STAGES.length; i += 1) if (t >= STAGES[i][0]) stageIndex = i;
  const [, phaseLabel, stageTitle] = STAGES[stageIndex];
  const complete = t >= 0.9;

  const shorten = (value) => String(value || "").split(",")[0].trim();
  const originShort = (shorten(originLabel) || "Origin").toUpperCase();
  const destShort = (shorten(destLabel) || "Destination").toUpperCase();
  const destLabelOnLeft = DEST_PT[0] < ORIGIN_PT[0];

  const steps = ["COORDINATES", "ROUTES", "STOPS", "SCORING"].map((label, i) => ({
    label,
    opacity: i < stageIndex ? 0.55 : i === stageIndex ? 1 : 0.22,
    active: i <= stageIndex
  }));

  return (
    <div className="rlm">
      <svg className="rlm-svg" viewBox="0 0 1124 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <path d={arcPath} className="rlm-arc-glow" pathLength="1" style={{ strokeDashoffset: 1 - arc }} />
        <path d={arcPath} className="rlm-arc-line" pathLength="1" style={{ strokeDashoffset: 1 - arc }} />
        {stops.map((stop) => (
          <g key={stop.f} transform={`translate(${stop.x.toFixed(1)} ${stop.y.toFixed(1)}) scale(${(stop.born * (stop.verified ? 1.15 : 0.9)).toFixed(3)})`} style={{ opacity: stop.born }}>
            <rect x="-4.5" y="-4.5" width="9" height="9" transform="rotate(45)" className={stop.verified ? "rlm-stop is-verified" : "rlm-stop"} />
          </g>
        ))}
      </svg>

      <div className="rlm-sweep" style={{ opacity: 1 - done }} />

      <div className="rlm-marker rlm-marker-origin" style={{ left: `${(ORIGIN_PT[0] / 1124) * 100}%`, top: `${(ORIGIN_PT[1] / 900) * 100}%`, transform: `translate(-50%, -50%) scale(${(0.6 + mo * 0.4).toFixed(3)})`, opacity: mo }}>
        <span className="rlm-ring" />
        <span className="rlm-dot" />
        <strong className="rlm-marker-label">{originShort}</strong>
      </div>

      <div className="rlm-marker rlm-marker-dest" style={{ left: `${(DEST_PT[0] / 1124) * 100}%`, top: `${(DEST_PT[1] / 900) * 100}%`, transform: `translate(-50%, -50%) scale(${(0.6 + md * 0.4).toFixed(3)})`, opacity: md }}>
        <span className="rlm-ring is-dest" />
        <span className="rlm-dot is-dest" />
        <strong className={`rlm-marker-label is-dest ${destLabelOnLeft ? "is-left" : ""}`}>{destShort}</strong>
      </div>

      {arc > 0 && arc < 0.999 && (
        <div className="rlm-travel-dot" style={{ left: `${(dotX / 1124) * 100}%`, top: `${(dotY / 900) * 100}%` }} />
      )}

      <div className="rlm-coord-readout">
        <span className="rlm-coord-label">VERIFIED COORDINATES</span>
        <span className="rlm-coord-value">
          {shorten(originLabel) || "—"} <span className="rlm-blink">_</span>
        </span>
      </div>

      <div className="rlm-card">
        <div className="rlm-card-head">
          <span className="rlm-card-icon">
            <span className="rlm-spinner" style={{ opacity: complete ? 0 : 1 }} />
            <span className="rlm-check" style={{ opacity: done, transform: `scale(${0.5 + done * 0.5})` }}>✓</span>
          </span>
          <span className="rlm-phase-label">{phaseLabel}</span>
          <span className="rlm-pct">{Math.round(t * 100)}%</span>
        </div>

        <div className="rlm-stage-title">{stageTitle}</div>

        <div className="rlm-progress-track">
          <div className="rlm-progress-fill" style={{ width: `${t * 100}%` }} />
        </div>

        <div className="rlm-steps">
          {steps.map((step) => (
            <div key={step.label} className="rlm-step" style={{ opacity: step.opacity }}>
              <span className={`rlm-step-dot ${step.active ? "is-active" : ""}`} />
              <span>{step.label}</span>
            </div>
          ))}
        </div>

        <div className="rlm-stats-row">
          <strong>{complete ? verifiedCount : foundCount}</strong>
          <span>{complete ? `verified stops on this route` : "candidate stops found so far"}</span>
          <span className="rlm-corridor-tag">{radiusKm || 5} KM CORRIDOR</span>
        </div>
      </div>
    </div>
  );
}
