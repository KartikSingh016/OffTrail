import React, { useEffect, useRef, useState } from "react";

/* Cinematic top-down route flyover (Delhi -> Manali), ported from a Claude
   Design prototype. Presentation-only demo content, not wired to real
   search data - see the "Demo route" badge in the rendered output. */

/* ---- trimmed motion kernel (replaces the design tool's animations-v3.jsx) ---- */

const Easing = {
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
  easeOutQuart: (t) => 1 - (--t) * t * t * t,
  easeInOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t),
  easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  easeOutBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function animate({ from = 0, to = 1, start = 0, end = 1, ease = Easing.easeInOutCubic }) {
  return (t) => {
    if (t <= start) return from;
    if (t >= end) return to;
    return from + (to - from) * ease((t - start) / (end - start));
  };
}

/* authored scene durations from the source design (Origin 3s, Plains 4.5s,
   Foothills 4.5s, Gorge 4.5s, Summit 4s, Reveal 5s) */
const CUES = { Origin: 0, Plains: 3, Foothills: 7.5, Gorge: 12, Summit: 16.5, Reveal: 20.5 };
const TOTAL = 25.5;
const CAMERA_ZOOM = 0.95;
const REDUCED_MOTION_T = CUES.Reveal + 3;

function useFilmClock() {
  const [t, setT] = useState(0);
  const rafRef = useRef(null);
  const lastRef = useRef(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      setT(REDUCED_MOTION_T);
      return undefined;
    }

    function step(ts) {
      if (lastRef.current == null) lastRef.current = ts;
      const dt = (ts - lastRef.current) / 1000;
      lastRef.current = ts;
      setT((prev) => (prev + dt) % TOTAL);
      rafRef.current = requestAnimationFrame(step);
    }
    function play() {
      lastRef.current = null;
      rafRef.current = requestAnimationFrame(step);
    }
    function stop() {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    function onVisibility() {
      if (document.hidden) stop();
      else play();
    }

    document.addEventListener("visibilitychange", onVisibility);
    if (!document.hidden) play();

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, []);

  return t;
}

/* ---- art content, ported close to verbatim from offtrail-scene.jsx ---- */

const VB = { x0: -900, y0: -760, w: 5900, h: 3200 };
const FRAME_W = 1920, FRAME_H = 1080;

const C = {
  sand: "#dcd3c4",
  sandWarm: "#eee7db",
  dust: "#c0b6a5",
  field1: "#ccdbb2",
  field2: "#aebf92",
  field3: "#8fa073",
  forest: "#56633f",
  forestDeep: "#3d472b",
  forestLit: "#728157",
  rock: "#c0b6a5",
  rockLit: "#dcd3c4",
  rockDeep: "#645c50",
  scree: "#a19786",
  snow: "#f9f4ed",
  water: "#ccdbb2",
  waterDeep: "#8fa073",
  town: "#82796a",
  roof: "#ffc6a5",
  road: "#f9f4ed",
  route: "#c67139",
  routeLit: "#f6a06b",
  routeGlow: "#ffc6a5",
  ink: "#2e2b25",
  cream: "#f9f4ed",
  timber: "#8c491a",
  timberLit: "#b2622d",
  timberDeep: "#643312",
  gold: "#d67f48"
};

const CATS = {
  food: { label: "Food", color: C.routeLit },
  view: { label: "Views", color: C.routeGlow },
  nature: { label: "Nature", color: C.field2 },
  culture: { label: "Culture", color: C.gold }
};

const ROUTE = [
  [3900, 1560], [3720, 1452], [3548, 1392], [3352, 1300], [3186, 1214],
  [3010, 1166], [2842, 1052], [2648, 1012], [2478, 908], [2296, 872],
  [2118, 762], [1930, 736], [1762, 636], [1580, 596], [1404, 500],
  [1216, 494], [1042, 414], [862, 436], [676, 362], [470, 306], [360, 262]
];

function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function crPoint(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return [
    0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
    0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
  ];
}

function sampleCurve(pts, per) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let s = 0; s < per; s++) out.push(crPoint(p0, p1, p2, p3, s / per));
  }
  out.push(pts[pts.length - 1]);
  return out;
}

function toPath(samples, stride) {
  const st = stride || 3;
  let d = `M ${samples[0][0].toFixed(1)} ${samples[0][1].toFixed(1)}`;
  for (let i = 1; i < samples.length; i += st) d += ` L ${samples[i][0].toFixed(1)} ${samples[i][1].toFixed(1)}`;
  const last = samples[samples.length - 1];
  return d + ` L ${last[0].toFixed(1)} ${last[1].toFixed(1)}`;
}

function arcTable(samples) {
  const cum = [0];
  for (let i = 1; i < samples.length; i++) cum.push(cum[i - 1] + Math.hypot(samples[i][0] - samples[i - 1][0], samples[i][1] - samples[i - 1][1]));
  return { cum, total: cum[cum.length - 1], samples };
}

function along(table, u) {
  const target = clamp(u, 0, 1) * table.total;
  let lo = 0, hi = table.cum.length - 1;
  while (lo < hi - 1) { const mid = (lo + hi) >> 1; if (table.cum[mid] < target) lo = mid; else hi = mid; }
  const seg = table.cum[hi] - table.cum[lo] || 1;
  const f = (target - table.cum[lo]) / seg;
  const a = table.samples[lo], b = table.samples[hi];
  return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI };
}

const ROUTE_SAMPLES = sampleCurve(ROUTE, 26);
const ROUTE_D = toPath(ROUTE_SAMPLES);
const ROUTE_ARC = arcTable(ROUTE_SAMPLES);
const pointAt = (u) => along(ROUTE_ARC, u);

const STOPS = [
  { id: "murthal", u: 0.068, name: "Murthal Dhabas", place: "Sonipat", cat: "food", detour: "8 km", rating: "4.4", reviews: "12,480" },
  { id: "kurukshetra", u: 0.172, name: "Brahma Sarovar", place: "Kurukshetra", cat: "culture", detour: "6 km", rating: "4.5", reviews: "9,210" },
  { id: "sukhna", u: 0.318, name: "Sukhna Lake", place: "Chandigarh", cat: "view", detour: "11 km", rating: "4.6", reviews: "41,300" },
  { id: "anandpur", u: 0.442, name: "Anandpur Sahib", place: "Rupnagar", cat: "culture", detour: "14 km", rating: "4.7", reviews: "18,650" },
  { id: "gobind", u: 0.566, name: "Gobind Sagar", place: "Bilaspur", cat: "nature", detour: "9 km", rating: "4.4", reviews: "5,120" },
  { id: "prashar", u: 0.702, name: "Prashar Lake Trail", place: "Mandi", cat: "nature", detour: "32 km", rating: "4.7", reviews: "3,940" },
  { id: "pandoh", u: 0.806, name: "Pandoh Dam View", place: "Mandi", cat: "view", detour: "2 km", rating: "4.3", reviews: "6,870" },
  { id: "naggar", u: 0.908, name: "Naggar Castle", place: "Kullu", cat: "culture", detour: "7 km", rating: "4.5", reviews: "8,410" }
].map((s) => ({ ...s, pt: pointAt(s.u) }));

const ORIGIN = pointAt(0), DEST = pointAt(1);

const ART = (() => {
  const r = rng(20260817);
  const gauss = () => (r() + r() + r() - 1.5) * 0.8;

  const fields = [];
  for (let i = 0; i < 170; i++) {
    const x = 1750 + r() * 3200, y = VB.y0 + 200 + r() * (VB.h - 300);
    fields.push({ x, y, w: 110 + r() * 240, h: 70 + r() * 160, rot: -14 + r() * 28, fill: [C.field1, C.field2, C.field3, C.sandWarm, C.sandWarm][Math.floor(r() * 5)], o: 0.45 + r() * 0.45, furrow: r() > 0.55 });
  }

  const trees = [];
  for (let c = 0; c < 46; c++) {
    const cx = -700 + r() * 3500;
    const bandY = 180 + (cx / 3000) * 900;
    const cy = bandY - 700 + r() * 1900;
    const n = 7 + Math.floor(r() * 12);
    const spread = 90 + r() * 210;
    for (let i = 0; i < n; i++) {
      const s = 13 + r() * 18;
      trees.push({ x: cx + gauss() * spread, y: cy + gauss() * spread * 0.8, s, deep: r() > 0.5 });
    }
  }

  const RANGES = [
    { pts: [[-800, 1000], [-100, 780], [620, 600], [1340, 450], [2060, 360]], snow: false, scale: 1 },
    { pts: [[-800, 1720], [-40, 1500], [760, 1320], [1520, 1140], [2260, 980]], snow: false, scale: 1.1 },
    { pts: [[-820, 260], [-60, 90], [700, -60], [1500, -180], [2100, -240]], snow: true, scale: 1.15 },
    { pts: [[-860, 2380], [-40, 2200], [820, 2060], [1600, 1900]], snow: false, scale: 0.9 }
  ];
  const ridges = [];
  RANGES.forEach((rangeDef, ri) => {
    const table = arcTable(sampleCurve(rangeDef.pts, 20));
    const count = 15 + Math.floor(r() * 5);
    for (let i = 0; i < count; i++) {
      const u = i / (count - 1);
      const p = along(table, u);
      const edge = Math.sin(u * Math.PI);
      const w = (260 + r() * 420) * rangeDef.scale * (0.55 + edge * 0.6);
      const h = (170 + r() * 300) * rangeDef.scale * (0.5 + edge * 0.7);
      ridges.push({
        x: p.x + gauss() * 130, y: p.y + gauss() * 150 + h * 0.2,
        w, h, rot: p.ang + gauss() * 26 + (ri === 2 ? 4 : 0),
        snow: rangeDef.snow ? h > 220 : h > 380 && p.x < 900,
        o: 0.88 + r() * 0.12
      });
    }
  });
  ridges.sort((a, b) => a.y - b.y);

  const screes = [];
  for (let i = 0; i < 110; i++) {
    const x = -880 + r() * 3100, y = -700 + r() * 3000;
    screes.push({ x, y, rx: 26 + r() * 70, ry: 14 + r() * 34, rot: r() * 180, o: 0.12 + r() * 0.18 });
  }

  const towns = [];
  for (let i = 0; i < 22; i++) {
    const u = 0.03 + r() * 0.94, p = pointAt(u);
    const off = (r() > 0.5 ? 1 : -1) * (130 + r() * 300);
    const blocks = [];
    const n = 8 + Math.floor(r() * 12);
    for (let b = 0; b < n; b++) blocks.push({ dx: -80 + r() * 160, dy: -66 + r() * 132, w: 24 + r() * 34, h: 20 + r() * 26, roof: r() > 0.62 });
    towns.push({ x: p.x + off * 0.7, y: p.y + off, blocks });
  }

  const roads = [];
  for (let i = 0; i < 11; i++) {
    const u = 0.04 + i * 0.09, p = pointAt(u);
    const dir = i % 2 ? 1 : -1;
    roads.push(toPath(sampleCurve([[p.x, p.y], [p.x + dir * 280, p.y + dir * 200], [p.x + dir * 620, p.y + dir * 140], [p.x + dir * 1020, p.y + dir * 420]], 12), 2));
  }

  const ponds = [];
  for (let i = 0; i < 16; i++) {
    const x = VB.x0 + 300 + r() * (VB.w - 600), y = VB.y0 + 300 + r() * (VB.h - 600);
    ponds.push({ x, y, rx: 46 + r() * 110, ry: 28 + r() * 70, rot: r() * 180 });
  }

  const rivers = [
    toPath(sampleCurve([[820, -700], [1010, -160], [960, 420], [1150, 900], [1040, 1500], [1240, 2200], [1120, 2900]], 18), 2),
    toPath(sampleCurve([[2360, -740], [2520, -200], [2380, 400], [2600, 980], [2460, 1600], [2680, 2400]], 18), 2),
    toPath(sampleCurve([[3520, -700], [3300, -100], [3480, 600], [3320, 1300], [3520, 2100], [3400, 2900]], 18), 2)
  ];
  const gorge = toPath(sampleCurve([0.42, 0.5, 0.58, 0.66, 0.74, 0.82, 0.9, 0.97].map((u, i) => {
    const p = pointAt(u); const s = i % 2 ? 96 : -84;
    return [p.x + s, p.y + s * 0.7 + 70];
  }), 20), 2);

  const lake = toPath(sampleCurve([[1962, 700], [2110, 620], [2246, 686], [2286, 806], [2160, 900], [1996, 866], [1918, 782], [1962, 700]], 16), 2);

  const bridges = [0.146, 0.238, 0.404, 0.53, 0.664, 0.858].map((u) => {
    const p = pointAt(u);
    return { x: p.x, y: p.y, rot: p.ang };
  });
  const pylons = [];
  for (let i = 0; i < 22; i++) {
    const p = pointAt(0.02 + i * 0.045);
    const side = i % 2 ? 1 : -1;
    pylons.push({ x: p.x + side * 120, y: p.y + side * 92 });
  }
  return { fields, trees, ridges, screes, towns, roads, ponds, rivers, gorge, lake, bridges, pylons };
})();

function Ridge({ x, y, w, h, rot, snow, o }) {
  const crest = `M ${-w / 2} 0 C ${-w / 3} ${-h * 0.55}, ${-w / 5} ${-h}, 0 ${-h} C ${w / 5} ${-h}, ${w / 3} ${-h * 0.55}, ${w / 2} 0 Z`;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`} opacity={o}>
      <path d={crest} fill={C.rockDeep} opacity="0.28" transform={`translate(${h * 0.09} ${h * 0.11})`} />
      <path d={crest} fill={C.rock} />
      <path d={`M ${-w / 2} 0 C ${-w / 3} ${-h * 0.55}, ${-w / 5} ${-h}, 0 ${-h} C ${-w / 16} ${-h * 0.58}, ${-w / 5} ${-h * 0.18}, ${-w / 2} 0 Z`} fill={C.rockLit} />
      <path d={`M ${w / 2} 0 C ${w / 3} ${-h * 0.55}, ${w / 5} ${-h}, 0 ${-h} C ${w / 12} ${-h * 0.5}, ${w / 4} ${-h * 0.14}, ${w / 2} 0 Z`} fill={C.rockDeep} opacity="0.3" />
      {snow ? (
        <path d={`M ${-w * 0.22} ${-h * 0.58} C ${-w * 0.12} ${-h * 0.96}, ${w * 0.12} ${-h * 0.96}, ${w * 0.22} ${-h * 0.58} C ${w * 0.08} ${-h * 0.48}, ${-w * 0.08} ${-h * 0.5}, ${-w * 0.22} ${-h * 0.58} Z`} fill={C.snow} opacity="0.94" />
      ) : null}
    </g>
  );
}

const WorldArt = React.memo(function WorldArt() {
  return (
    <g>
      <rect x={VB.x0} y={VB.y0} width={VB.w} height={VB.h} fill="url(#groundGrad)" />
      {ART.fields.map((f, i) => (
        <g key={"f" + i} transform={`rotate(${f.rot} ${f.x + f.w / 2} ${f.y + f.h / 2})`}>
          <rect x={f.x} y={f.y} width={f.w} height={f.h} rx="22" fill={f.fill} opacity={f.o} />
          {f.furrow ? [0, 1, 2].map((k) => (
            <line key={k} x1={f.x + 14} y1={f.y + (f.h / 4) * (k + 1)} x2={f.x + f.w - 14} y2={f.y + (f.h / 4) * (k + 1)}
              stroke={C.forest} strokeWidth="3" opacity="0.16" />
          )) : null}
          <rect x={f.x} y={f.y} width={f.w} height={f.h} rx="22" fill="none" stroke={C.forest} strokeWidth="3" opacity="0.14" />
        </g>
      ))}
      {ART.screes.map((s, i) => (
        <ellipse key={"s" + i} cx={s.x} cy={s.y} rx={s.rx} ry={s.ry} fill={C.scree} opacity={s.o} transform={`rotate(${s.rot} ${s.x} ${s.y})`} />
      ))}
      {ART.ponds.map((p, i) => (
        <ellipse key={"p" + i} cx={p.x} cy={p.y} rx={p.rx} ry={p.ry} fill={C.water} opacity="0.72" transform={`rotate(${p.rot} ${p.x} ${p.y})`} />
      ))}
      {ART.rivers.concat([ART.gorge]).map((d, i) => (
        <g key={"r" + i}>
          <path d={d} fill="none" stroke={C.waterDeep} strokeWidth="30" strokeLinecap="round" opacity="0.32" />
          <path d={d} fill="none" stroke={C.water} strokeWidth="18" strokeLinecap="round" />
        </g>
      ))}
      <path d={ART.lake} fill={C.water} />
      <path d={ART.lake} fill="none" stroke={C.waterDeep} strokeWidth="12" opacity="0.45" />
      {ART.ridges.map((m, i) => <Ridge key={"m" + i} {...m} />)}
      {ART.trees.map((t, i) => (
        <circle key={"t" + i} cx={t.x} cy={t.y} r={t.s} fill={t.deep ? C.forest : C.forestLit} />
      ))}
      {ART.roads.map((d, i) => (
        <path key={"rd" + i} d={d} fill="none" stroke={C.road} strokeWidth="9" strokeLinecap="round" opacity="0.42" strokeDasharray="30 22" />
      ))}
      {ART.towns.map((t, i) => (
        <g key={"tw" + i}>
          {t.blocks.map((b, j) => (
            <rect key={j} x={t.x + b.dx} y={t.y + b.dy} width={b.w} height={b.h} rx="7"
              fill={b.roof ? C.roof : C.town} opacity={b.roof ? 0.9 : 0.72} />
          ))}
        </g>
      ))}
      {ART.pylons.map((p, i) => (
        <g key={"py" + i} opacity="0.4">
          <line x1={p.x - 11} y1={p.y - 11} x2={p.x + 11} y2={p.y + 11} stroke={C.rockDeep} strokeWidth="4" />
          <line x1={p.x + 11} y1={p.y - 11} x2={p.x - 11} y2={p.y + 11} stroke={C.rockDeep} strokeWidth="4" />
        </g>
      ))}
      {ART.bridges.map((b, i) => (
        <g key={"br" + i} transform={`translate(${b.x} ${b.y}) rotate(${b.rot})`}>
          <rect x="-52" y="-26" width="104" height="52" rx="10" fill={C.rockLit} />
          <rect x="-52" y="-26" width="104" height="52" rx="10" fill="none" stroke={C.cream} strokeWidth="5" opacity="0.7" />
        </g>
      ))}
    </g>
  );
});

function lmPos(u, dx, dy) { const p = pointAt(u); return { x: p.x + dx, y: p.y + dy }; }

function Plaza({ x, y, s }) {
  const spokes = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    spokes.push(<line key={i} x1={x + Math.cos(a) * s * 0.5} y1={y + Math.sin(a) * s * 0.5}
      x2={x + Math.cos(a) * s * 1.9} y2={y + Math.sin(a) * s * 1.9} stroke={C.road} strokeWidth={s * 0.14} opacity="0.5" strokeLinecap="round" />);
  }
  return (
    <g>
      {spokes}
      <circle cx={x} cy={y} r={s * 0.78} fill={C.field2} opacity="0.8" />
      <circle cx={x} cy={y} r={s * 0.62} fill={C.field1} opacity="0.9" />
      <circle cx={x} cy={y} r={s * 0.5} fill={C.sandWarm} />
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2 + 0.3;
        return <circle key={"w" + i} cx={x + Math.cos(a) * s * 0.38} cy={y + Math.sin(a) * s * 0.38} r={s * 0.055} fill={C.water} />;
      })}
      <path d={`M ${x + s * 0.16} ${y + s * 0.16} l ${s * 0.62} ${s * 0.5} l ${-s * 0.4} ${s * 0.12} Z`} fill={C.rockDeep} opacity="0.24" />
      <rect x={x - s * 0.23} y={y - s * 0.23} width={s * 0.46} height={s * 0.46} rx={s * 0.05} fill={C.rockLit} />
      <path d={`M ${x - s * 0.17} ${y + s * 0.17} L ${x - s * 0.17} ${y - s * 0.17} L ${x + s * 0.17} ${y - s * 0.17} L ${x + s * 0.17} ${y + s * 0.17} L ${x + s * 0.07} ${y + s * 0.17} L ${x + s * 0.07} ${y - s * 0.05} L ${x - s * 0.07} ${y - s * 0.05} L ${x - s * 0.07} ${y + s * 0.17} Z`} fill={C.rockDeep} opacity="0.5" />
      <rect x={x - s * 0.04} y={y - s * 0.04} width={s * 0.08} height={s * 0.08} rx={s * 0.02} fill={C.roof} />
    </g>
  );
}

function Tower({ x, y, s }) {
  const flutes = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    flutes.push(<circle key={i} cx={x + Math.cos(a) * s * 0.55} cy={y + Math.sin(a) * s * 0.55} r={s * 0.07} fill={C.rock} />);
  }
  return (
    <g>
      <rect x={x - s * 1.6} y={y - s * 1.4} width={s * 3.2} height={s * 2.8} rx={s * 0.3} fill={C.field1} opacity="0.66" />
      <rect x={x - s * 1.42} y={y - s * 1.22} width={s * 2.84} height={s * 2.44} rx={s * 0.24} fill="none" stroke={C.sandWarm} strokeWidth={s * 0.08} opacity="0.8" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <rect key={"r" + i} x={x - s * 1.3 + (i % 4) * s * 0.86} y={y + (i > 3 ? s * 0.86 : -s * 1.1)} width={s * 0.24} height={s * 0.24} rx={s * 0.05} fill={C.rock} opacity="0.7" />
      ))}
      <path d={`M ${x} ${y} l ${s * 2.2} ${s * 1.6} l ${-s * 0.66} ${s * 0.5} Z`} fill={C.rockDeep} opacity="0.26" />
      {flutes}
      <circle cx={x} cy={y} r={s * 0.5} fill={C.rockLit} />
      <circle cx={x} cy={y} r={s * 0.34} fill={C.rock} />
      <circle cx={x} cy={y} r={s * 0.2} fill={C.roof} />
      <circle cx={x} cy={y} r={s * 0.07} fill={C.timberDeep} opacity="0.7" />
    </g>
  );
}

function Sarovar({ x, y, w, h }) {
  return (
    <g>
      <rect x={x - w / 2 - 30} y={y - h / 2 - 30} width={w + 60} height={h + 60} rx="24" fill={C.sandWarm} />
      <rect x={x - w / 2 - 18} y={y - h / 2 - 18} width={w + 36} height={h + 36} rx="18" fill={C.rockLit} opacity="0.75" />
      <rect x={x - w / 2 - 9} y={y - h / 2 - 9} width={w + 18} height={h + 18} rx="14" fill="none" stroke={C.sandWarm} strokeWidth="7" opacity="0.9" />
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx="10" fill={C.waterDeep} />
      <rect x={x - w / 2 + 16} y={y - h / 2 + 16} width={w - 32} height={h - 32} rx="8" fill={C.water} />
      <path d={`M ${x - w / 2 + 30} ${y - h / 2 + 30} L ${x + w / 2 - 30} ${y + h / 2 - 30}`} stroke={C.sandWarm} strokeWidth="3" opacity="0.35" />
      <rect x={x - 6} y={y - h / 2} width="12" height={h / 2 - 30} fill={C.sandWarm} opacity="0.95" />
      <rect x={x - 38} y={y - 38} width="76" height="76" rx="10" fill={C.sandWarm} />
      <rect x={x - 24} y={y - 24} width="48" height="48" rx="8" fill={C.rockLit} />
      <circle cx={x} cy={y} r="15" fill={C.roof} />
      <circle cx={x} cy={y} r="6" fill={C.gold} />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy], i) => (
        <circle key={i} cx={x + sx * (w / 2 + 14)} cy={y + sy * (h / 2 + 14)} r="9" fill={C.roof} opacity="0.9" />
      ))}
    </g>
  );
}

function Gurudwara({ x, y, s }) {
  return (
    <g>
      <rect x={x - s * 1.15} y={y - s * 0.95} width={s * 2.3} height={s * 1.9} rx={s * 0.16} fill={C.sandWarm} />
      <rect x={x - s} y={y - s * 0.8} width={s * 2} height={s * 1.6} rx={s * 0.14} fill={C.rockLit} opacity="0.65" />
      <rect x={x - s * 0.8} y={y - s * 0.62} width={s * 1.6} height={s * 1.24} rx={s * 0.12} fill={C.cream} />
      <rect x={x + s * 0.86} y={y - s * 0.3} width={s * 0.6} height={s * 0.6} rx={s * 0.08} fill={C.water} />
      <path d={`M ${x + s * 0.22} ${y + s * 0.32} l ${s * 0.9} ${s * 0.62} l ${-s * 0.42} ${s * 0.16} Z`} fill={C.rockDeep} opacity="0.22" />
      <rect x={x - s * 0.5} y={y - s * 0.36} width={s} height={s * 0.72} rx={s * 0.1} fill={C.sandWarm} />
      <circle cx={x} cy={y} r={s * 0.34} fill={C.roof} />
      <circle cx={x} cy={y} r={s * 0.22} fill={C.gold} />
      <circle cx={x} cy={y} r={s * 0.07} fill={C.timberDeep} opacity="0.75" />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy], i) => (
        <g key={i}>
          <circle cx={x + sx * s * 0.64} cy={y + sy * s * 0.48} r={s * 0.13} fill={C.roof} />
          <circle cx={x + sx * s * 0.64} cy={y + sy * s * 0.48} r={s * 0.05} fill={C.gold} />
        </g>
      ))}
      <rect x={x - s * 0.16} y={y - s * 1.06} width={s * 0.32} height={s * 0.2} rx={s * 0.05} fill={C.roof} opacity="0.9" />
    </g>
  );
}

function Dam({ x, y, w, rot, label }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <path d={`M ${-w / 2} ${-w * 0.02} Q 0 ${-w * 0.26} ${w / 2} ${-w * 0.02} L ${w / 2} ${w * 0.05} Q 0 ${-w * 0.19} ${-w / 2} ${w * 0.05} Z`} fill={C.water} opacity="0.55" />
      <path d={`M ${-w / 2} 0 Q 0 ${-w * 0.22} ${w / 2} 0 L ${w / 2} ${w * 0.1} Q 0 ${-w * 0.12} ${-w / 2} ${w * 0.1} Z`} fill={C.rockLit} />
      <path d={`M ${-w / 2} 0 Q 0 ${-w * 0.22} ${w / 2} 0`} fill="none" stroke={C.cream} strokeWidth="9" opacity="0.85" />
      <path d={`M ${-w / 2} ${w * 0.055} Q 0 ${-w * 0.165} ${w / 2} ${w * 0.055}`} fill="none" stroke={C.rockDeep} strokeWidth="3" opacity="0.4" strokeDasharray="10 8" />
      {[-0.3, -0.15, 0, 0.15, 0.3].map((f, i) => (
        <rect key={i} x={f * w - 9} y={-w * 0.035} width="18" height={w * 0.15} rx="5" fill={C.rockDeep} opacity="0.32" />
      ))}
      {[-0.12, 0.06].map((f, i) => (
        <path key={"p" + i} d={`M ${f * w} ${w * 0.1} q ${w * 0.02} ${w * 0.12} ${-w * 0.01} ${w * 0.2}`} stroke={C.cream} strokeWidth="7" fill="none" opacity="0.6" strokeLinecap="round" />
      ))}
      {label ? (
        <g>
          <rect x={-w * 0.08} y={-w * 0.34} width={w * 0.16} height={w * 0.12} rx="6" fill={C.town} opacity="0.75" />
          <rect x={w * 0.2} y={w * 0.1} width={w * 0.16} height={w * 0.1} rx="5" fill={C.town} opacity="0.6" />
          <rect x={w * 0.28} y={w * 0.02} width={w * 0.1} height={w * 0.07} rx="4" fill={C.roof} opacity="0.75" />
        </g>
      ) : null}
    </g>
  );
}

function Dhaba({ x, y }) {
  return (
    <g>
      <rect x={x - 160} y={y - 66} width="320" height="132" rx="20" fill={C.sandWarm} opacity="0.92" />
      <rect x={x - 160} y={y + 52} width="320" height="18" rx="9" fill={C.rockLit} opacity="0.7" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={x - 132 + i * 68} y={y - 46} width="52" height="44" rx="8" fill={C.roof} opacity="0.92" />
          <rect x={x - 126 + i * 68} y={y - 40} width="40" height="14" rx="5" fill={C.timber} opacity="0.35" />
          <rect x={x - 126 + i * 68} y={y + 8} width="42" height="13" rx="6" fill={C.town} opacity="0.55" />
          <rect x={x - 126 + i * 68} y={y + 26} width="42" height="13" rx="6" fill={C.town} opacity="0.45" />
          <circle cx={x - 106 + i * 68} cy={y - 2} r="6" fill={C.route} opacity="0.55" />
        </g>
      ))}
      {[0, 1, 2].map((i) => (
        <g key={"t" + i}>
          <rect x={x - 126 + i * 100} y={y + 78} width="84" height="28" rx="7" fill={C.rockDeep} opacity="0.42" />
          <rect x={x - 126 + i * 100} y={y + 78} width="26" height="28" rx="7" fill={C.route} opacity="0.55" />
        </g>
      ))}
    </g>
  );
}

function Pagoda({ x, y, s }) {
  return (
    <g>
      <circle cx={x} cy={y} r={s * 1.5} fill={C.forestDeep} opacity="0.22" />
      <rect x={x - s * 1.05} y={y - s * 1.05} width={s * 2.1} height={s * 2.1} rx={s * 0.22} fill={C.rockLit} opacity="0.55" />
      <rect x={x - s * 1.05} y={y - s * 1.05} width={s * 2.1} height={s * 2.1} rx={s * 0.22} fill="none" stroke={C.rockDeep} strokeWidth={s * 0.06} opacity="0.3" />
      <path d={`M ${x + s * 0.5} ${y + s * 0.5} l ${s * 1.1} ${s * 0.72} l ${-s * 0.46} ${s * 0.22} Z`} fill={C.rockDeep} opacity="0.2" />
      <rect x={x - s * 0.78} y={y - s * 0.78} width={s * 1.56} height={s * 1.56} rx={s * 0.14} fill={C.timber} />
      <rect x={x - s * 0.72} y={y - s * 0.72} width={s * 1.44} height={s * 0.2} rx={s * 0.06} fill={C.timberDeep} opacity="0.45" />
      <rect x={x - s * 0.5} y={y - s * 0.5} width={s} height={s} rx={s * 0.12} fill={C.timberLit} />
      <rect x={x - s * 0.26} y={y - s * 0.26} width={s * 0.52} height={s * 0.52} rx={s * 0.08} fill={C.roof} />
      <circle cx={x} cy={y} r={s * 0.1} fill={C.gold} />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy], i) => (
        <circle key={i} cx={x + sx * s * 0.62} cy={y + sy * s * 0.62} r={s * 0.06} fill={C.gold} opacity="0.8" />
      ))}
    </g>
  );
}

function Castle({ x, y, s }) {
  return (
    <g>
      <path d={`M ${x + s * 0.6} ${y + s * 0.5} l ${s * 1.1} ${s * 0.76} l ${-s * 0.46} ${s * 0.22} Z`} fill={C.rockDeep} opacity="0.22" />
      {[0, 1, 2].map((i) => (
        <rect key={"tr" + i} x={x - s * 1.5} y={y + s * 0.9 + i * s * 0.3} width={s * 3} height={s * 0.22} rx={s * 0.08} fill={C.field2} opacity={0.5 - i * 0.1} />
      ))}
      <rect x={x - s * 1.06} y={y - s * 0.78} width={s * 2.12} height={s * 1.56} rx={s * 0.1} fill={C.timber} />
      <rect x={x - s} y={y - s * 0.72} width={s * 2} height={s * 1.44} rx={s * 0.09} fill={C.rock} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <line key={"sh" + i} x1={x - s * 0.94} y1={y - s * 0.6 + i * s * 0.24} x2={x + s * 0.94} y2={y - s * 0.6 + i * s * 0.24}
          stroke={C.timberDeep} strokeWidth={s * 0.035} opacity="0.28" />
      ))}
      <rect x={x - s * 0.44} y={y - s * 0.3} width={s * 0.88} height={s * 0.6} rx={s * 0.06} fill={C.sandWarm} />
      <rect x={x - s * 0.12} y={y - s * 0.1} width={s * 0.24} height={s * 0.2} rx={s * 0.04} fill={C.timberDeep} opacity="0.5" />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy], i) => (
        <g key={i}>
          <rect x={x + sx * s * 0.9 - s * 0.18} y={y + sy * s * 0.62 - s * 0.18} width={s * 0.36} height={s * 0.36} rx={s * 0.06} fill={C.timberDeep} />
          <rect x={x + sx * s * 0.9 - s * 0.1} y={y + sy * s * 0.62 - s * 0.1} width={s * 0.2} height={s * 0.2} rx={s * 0.04} fill={C.roof} opacity="0.85" />
        </g>
      ))}
    </g>
  );
}

function Boats({ x, y }) {
  return (
    <g>
      {[[0, 0], [70, 40], [-60, 54], [30, -50]].map(([dx, dy], i) => (
        <g key={i} transform={`translate(${x + dx} ${y + dy}) rotate(${i * 40})`}>
          <ellipse cx="0" cy="0" rx="22" ry="9" fill={C.cream} />
          <rect x="-2" y="-16" width="4" height="16" rx="2" fill={C.roof} />
        </g>
      ))}
    </g>
  );
}

const LANDMARKS = (() => {
  const delhi = pointAt(0.004);
  return {
    labels: [
      { text: "India Gate", u: 0.004, dx: -300, dy: 250 },
      { text: "Qutub Minar", u: 0.012, dx: 320, dy: -250 },
      { text: "Bhakra Dam", u: 0.586, dx: 250, dy: 190 },
      { text: "Hadimba Temple", u: 0.972, dx: -250, dy: 190 }
    ].map((l) => ({ ...l, pos: lmPos(l.u, l.dx, l.dy) })),
    delhi
  };
})();

const Landmarks = React.memo(function Landmarks() {
  const p = (u, dx, dy) => lmPos(u, dx, dy);
  const gate = p(0.004, -300, 250), qutub = p(0.012, 320, -250);
  const murthal = p(0.068, 120, 120), sarovar = p(0.172, -190, -170);
  const sukhna = p(0.318, 220, 170), anandpur = p(0.442, -200, -180);
  const bhakra = p(0.586, 250, 190), prashar = p(0.702, -230, -190);
  const pandoh = p(0.806, 150, 150), naggar = p(0.908, -210, -170);
  const hadimba = p(0.972, -250, 190), manali = pointAt(1);
  return (
    <g>
      <Plaza x={gate.x} y={gate.y} s={150} />
      <Tower x={qutub.x} y={qutub.y} s={110} />
      <Dhaba x={murthal.x} y={murthal.y} />
      <Sarovar x={sarovar.x} y={sarovar.y} w={330} h={230} />
      <g>
        <path d={toPath(sampleCurve([[sukhna.x - 210, sukhna.y - 80], [sukhna.x - 60, sukhna.y - 150], [sukhna.x + 120, sukhna.y - 100], [sukhna.x + 190, sukhna.y + 40], [sukhna.x + 40, sukhna.y + 130], [sukhna.x - 140, sukhna.y + 80], [sukhna.x - 210, sukhna.y - 80]], 14), 2)} fill={C.water} stroke={C.waterDeep} strokeWidth="10" />
        <path d={`M ${sukhna.x - 210} ${sukhna.y + 96} L ${sukhna.x + 60} ${sukhna.y + 168}`} stroke={C.sandWarm} strokeWidth="18" strokeLinecap="round" opacity="0.9" />
        <Boats x={sukhna.x} y={sukhna.y} />
      </g>
      <Gurudwara x={anandpur.x} y={anandpur.y} s={130} />
      <Dam x={bhakra.x} y={bhakra.y} w={360} rot={-24} label />
      <g>
        <ellipse cx={prashar.x} cy={prashar.y} rx="120" ry="86" fill={C.water} stroke={C.waterDeep} strokeWidth="9" />
        <Pagoda x={prashar.x + 150} y={prashar.y - 90} s={72} />
      </g>
      <Dam x={pandoh.x} y={pandoh.y} w={260} rot={38} />
      <Castle x={naggar.x} y={naggar.y} s={120} />
      <Pagoda x={hadimba.x} y={hadimba.y} s={90} />
      <g>
        {[[-140, 60], [-40, 120], [70, 70], [10, -60], [130, -20], [-110, -60]].map(([dx, dy], i) => (
          <rect key={i} x={manali.x + dx} y={manali.y + dy} width={54 + (i % 3) * 20} height={40 + (i % 2) * 18} rx="9"
            fill={i % 2 ? C.roof : C.town} opacity={i % 2 ? 0.9 : 0.72} />
        ))}
      </g>
    </g>
  );
});

const MOTION = {
  glide: (from, to, start, end, ease) => animate({ from, to, start, end, ease: ease || Easing.easeInOutCubic }),
  enter: (start, dur) => animate({ from: 0, to: 1, start, end: start + (dur || 0.7), ease: Easing.easeOutCubic || Easing.easeInOutCubic }),
  pop: (k) => Easing.easeOutBack(clamp(k, 0, 1))
};

function seq(T, legs) {
  for (let i = 0; i < legs.length; i++) {
    const [s, e, from, to, ease] = legs[i];
    if (T < e || i === legs.length - 1) return MOTION.glide(from, to, s, e, ease)(T);
  }
  return legs[legs.length - 1][3];
}

function Scene() {
  const T = useFilmClock();

  const tailK = clamp((T - (TOTAL - 0.8)) / 0.8, 0, 1);

  const uRaw = seq(T, [
    [CUES.Origin, CUES.Plains, 0, 0.03, Easing.easeInOutSine],
    [CUES.Plains, CUES.Foothills, 0.03, 0.222],
    [CUES.Foothills, CUES.Gorge, 0.222, 0.478],
    [CUES.Gorge, CUES.Summit, 0.478, 0.724],
    [CUES.Summit, CUES.Reveal, 0.724, 1],
    [CUES.Reveal, TOTAL, 1, 1]
  ]);
  const u = uRaw * (1 - tailK);

  const travelZ = seq(T, [
    [CUES.Origin, CUES.Origin + 2.2, 1.55, 1.1, Easing.easeOutQuart],
    [CUES.Origin + 2.2, CUES.Foothills, 1.1, 0.98],
    [CUES.Foothills, CUES.Gorge, 0.98, 1.06],
    [CUES.Gorge, CUES.Summit, 1.06, 0.96],
    [CUES.Summit, CUES.Reveal, 0.96, 1.12],
    [CUES.Reveal, CUES.Reveal + 2.8, 1.12, 0.4, Easing.easeInOutQuart],
    [CUES.Reveal + 2.8, TOTAL - 0.8, 0.4, 0.39],
    [TOTAL - 0.8, TOTAL, 0.39, 1.55, Easing.easeInOutQuart]
  ]);
  const z = travelZ * (1 + Math.sin(T * 0.55) * 0.012 * (1 - tailK)) * CAMERA_ZOOM;

  const rot = seq(T, [
    [CUES.Origin, CUES.Plains, -1.6, -2.4],
    [CUES.Plains, CUES.Foothills, -2.4, 1.4],
    [CUES.Foothills, CUES.Gorge, 1.4, -1.8],
    [CUES.Gorge, CUES.Summit, -1.8, 1.2],
    [CUES.Summit, CUES.Reveal, 1.2, 0],
    [CUES.Reveal, TOTAL - 0.8, 0, 0],
    [TOTAL - 0.8, TOTAL, 0, -1.6]
  ]);

  const head = pointAt(u);
  const fitK = clamp(MOTION.glide(0, 1, CUES.Reveal, CUES.Reveal + 2.8)(T), 0, 1) * (1 - tailK);
  const cx = head.x + (2020 - head.x) * fitK;
  const cy = head.y + (860 - head.y) * fitK;
  const inv = 1 / z;
  const cardFade = 1 - clamp(MOTION.glide(0, 1, CUES.Reveal + 0.2, CUES.Reveal + 1.4)(T), 0, 1);

  const worldTransform = `translate(${FRAME_W / 2}px, ${FRAME_H / 2}px) rotate(${rot}deg) scale(${z}) translate(${-(cx - VB.x0)}px, ${-(cy - VB.y0)}px)`;
  const km = Math.round(537 * u);
  const stopsFound = STOPS.filter((s) => u >= s.u - 0.004).length;

  const regions = [
    { label: "Haryana plains", x: 3200, y: 1000, from: 0.0, to: 0.25 },
    { label: "Shivalik foothills", x: 2260, y: 560, from: 0.25, to: 0.5 },
    { label: "Beas gorge", x: 1460, y: 940, from: 0.5, to: 0.76 },
    { label: "Kullu valley", x: 700, y: 700, from: 0.76, to: 1.02 }
  ];

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: C.dust, fontFamily: "Figtree, system-ui, sans-serif" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: VB.w, height: VB.h, transformOrigin: "0 0", transform: worldTransform, willChange: "transform" }}>
        <svg width={VB.w} height={VB.h} viewBox={`${VB.x0} ${VB.y0} ${VB.w} ${VB.h}`} shapeRendering="optimizeSpeed" style={{ position: "absolute", inset: 0, display: "block" }}>
          <defs>
            <linearGradient id="groundGrad" x1="1" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor={C.sandWarm} />
              <stop offset="42%" stopColor={C.sand} />
              <stop offset="100%" stopColor={C.dust} />
            </linearGradient>
            <radialGradient id="cloudShade" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={C.rockDeep} stopOpacity="0.26" />
              <stop offset="100%" stopColor={C.rockDeep} stopOpacity="0" />
            </radialGradient>
            <linearGradient id="routeGrad" x1="1" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor={C.route} />
              <stop offset="55%" stopColor={C.routeLit} />
              <stop offset="100%" stopColor={C.routeGlow} />
            </linearGradient>
          </defs>

          <WorldArt />
          <Landmarks />

          {LANDMARKS.labels.map((l) => {
            const k = clamp(1 - Math.abs(u - l.u) / 0.075, 0, 1) * (1 - fitK);
            if (k <= 0.01) return null;
            return (
              <g key={l.text} opacity={k}>
                <text x={l.pos.x} y={l.pos.y + (l.dy > 0 ? 250 : -230)} fill={C.ink} opacity="0.75"
                  fontFamily="Caprasimo, serif" fontSize="58" letterSpacing="2" textAnchor="middle">{l.text}</text>
                <line x1={l.pos.x} y1={l.pos.y + (l.dy > 0 ? 198 : -186)} x2={l.pos.x} y2={l.pos.y + (l.dy > 0 ? 150 : -140)}
                  stroke={C.ink} strokeWidth="4" opacity="0.35" />
              </g>
            );
          })}

          {[0, 1, 2, 3, 4, 5].map((i) => {
            const x = ((T * (24 + i * 11) + i * 1290) % (VB.w + 1600)) - 800 + VB.x0;
            return <ellipse key={"c" + i} cx={x} cy={VB.y0 + 320 + i * 480} rx={560 + i * 90} ry={250 + i * 44} fill="url(#cloudShade)" />;
          })}

          {regions.map((rg) => {
            const k = clamp(Math.min((u - rg.from) / 0.05, (rg.to - u) / 0.06), 0, 1);
            return (
              <text key={rg.label} x={rg.x} y={rg.y} fill={C.rockDeep} opacity={k * 0.34}
                fontFamily="Caprasimo, serif" fontSize="118" letterSpacing="16" textAnchor="middle">{rg.label}</text>
            );
          })}

          <path d={ROUTE_D} fill="none" stroke={C.ink} strokeWidth="28" strokeLinecap="round" opacity="0.10" />
          <path d={ROUTE_D} fill="none" stroke={C.cream} strokeWidth="12" strokeLinecap="round" opacity="0.34" strokeDasharray="36 28" />
          <path d={ROUTE_D} fill="none" stroke={C.routeGlow} strokeWidth="52" strokeLinecap="round" opacity="0.2"
            pathLength="1000" strokeDasharray="1000" strokeDashoffset={1000 * (1 - u)} />
          <path d={ROUTE_D} fill="none" stroke="url(#routeGrad)" strokeWidth="18" strokeLinecap="round"
            pathLength="1000" strokeDasharray="1000" strokeDashoffset={1000 * (1 - u)} />

          <circle cx={ORIGIN.x} cy={ORIGIN.y} r={30 * inv + 16} fill={C.cream} opacity="0.55" />
          <circle cx={ORIGIN.x} cy={ORIGIN.y} r={14 * inv + 9} fill={C.ink} />
          {(() => {
            const k = clamp((u - 0.982) / 0.018, 0, 1);
            return (
              <g opacity={k}>
                <circle cx={DEST.x} cy={DEST.y} r={(30 * inv + 16) * (1 + (1 - k) * 1.6)} fill={C.routeGlow} opacity="0.5" />
                <circle cx={DEST.x} cy={DEST.y} r={14 * inv + 9} fill={C.route} />
              </g>
            );
          })()}

          {[0.14, 0.32, 0.47, 0.63, 0.79, 0.93].map((seed, i) => {
            const dir = i % 2 ? -1 : 1;
            const cu = (seed + (T * 0.012 * dir) + 1) % 1;
            if (cu > u - 0.004) return null;
            const p = pointAt(cu);
            const n = pointAt(clamp(cu + 0.004 * dir, 0, 1));
            const ang = Math.atan2(n.y - p.y, n.x - p.x) * 180 / Math.PI;
            const lat = dir > 0 ? 9 : -9;
            return (
              <g key={"v" + i} transform={`translate(${p.x} ${p.y}) rotate(${ang}) translate(0 ${lat})`}>
                <rect x={-13 * inv} y={-5.5 * inv} width={26 * inv} height={11 * inv} rx={4 * inv}
                  fill={i % 3 === 0 ? C.cream : i % 3 === 1 ? C.timberDeep : C.town} opacity="0.9" />
              </g>
            );
          })}

          {u < 0.999 ? (
            <g>
              <circle cx={head.x} cy={head.y} r={(50 + Math.sin(T * 6) * 14) * inv} fill={C.routeGlow} opacity="0.3" />
              <circle cx={head.x} cy={head.y} r={15 * inv} fill={C.cream} />
              <circle cx={head.x} cy={head.y} r={7 * inv} fill={C.route} />
            </g>
          ) : null}
        </svg>

        {STOPS.map((s) => {
          const k = MOTION.pop(clamp((u - s.u) / 0.022, 0, 1));
          if (k <= 0.001) return null;
          const cat = CATS[s.cat];
          const above = s.pt.y > 700;
          return (
            <div key={s.id} style={{
              position: "absolute", left: s.pt.x - VB.x0, top: s.pt.y - VB.y0,
              transform: `translate(-50%, -50%) scale(${inv})`, transformOrigin: "50% 50%", pointerEvents: "none"
            }}>
              <div style={{
                position: "absolute", left: "50%", top: "50%", width: 28, height: 28, marginLeft: -14, marginTop: -14,
                borderRadius: 999, background: cat.color, transform: `scale(${clamp(k, 0, 1.1)})`,
                boxShadow: `0 0 0 ${9 * clamp(k, 0, 1)}px rgba(198,113,57,.2), 0 8px 20px rgba(46,43,37,.35)`,
                display: "grid", placeItems: "center"
              }}>
                <div style={{ width: 10, height: 10, borderRadius: 999, background: "rgba(46,43,37,.5)" }}></div>
              </div>
              <div style={{
                position: "absolute", left: "50%", [above ? "bottom" : "top"]: 30,
                transform: `translateX(-50%) scale(${clamp(k, 0, 1.06)})`,
                transformOrigin: `center ${above ? "bottom" : "top"}`,
                background: "rgba(32,30,29,.93)", color: C.cream, borderRadius: 22, padding: "13px 18px 15px",
                minWidth: 250, boxShadow: "0 20px 44px rgba(46,43,37,.4)", opacity: clamp(k * 1.4, 0, 1) * cardFade
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: cat.color }}></span>
                  <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: cat.color }}>{cat.label}</span>
                  <span style={{ fontSize: 13, opacity: .5, marginLeft: "auto" }}>{s.place}</span>
                </div>
                <div style={{ fontFamily: "Caprasimo, serif", fontSize: 26, lineHeight: 1.1, letterSpacing: "-.01em" }}>{s.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 9, fontSize: 15 }}>
                  <span style={{ fontWeight: 700 }}>★ {s.rating}<span style={{ opacity: .6, fontWeight: 400 }}> ({s.reviews})</span></span>
                  <span style={{ opacity: .3 }}>|</span>
                  <span style={{ color: C.routeGlow, fontWeight: 600 }}>{s.detour} off route</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 90% at 16% 6%, rgba(255,230,212,.34), rgba(255,230,212,0) 58%)", pointerEvents: "none" }}></div>
      <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 300px rgba(46,43,37,.42)", pointerEvents: "none" }}></div>

      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", left: 56, top: 44, display: "flex", alignItems: "center", gap: 14, opacity: MOTION.enter(0.2, 0.9)(T) * (1 - tailK) }}>
          <div style={{ width: 34, height: 34, borderRadius: 999, background: `linear-gradient(150deg, ${C.routeLit}, ${C.timberLit})` }}></div>
          <div style={{ fontFamily: "Caprasimo, serif", fontSize: 30, color: C.ink, letterSpacing: "-.02em" }}>OffTrail</div>
        </div>

        <div style={{ position: "absolute", right: 56, top: 40, textAlign: "right", opacity: MOTION.enter(0.5, 1)(T) * (1 - tailK) }}>
          <div style={{ fontSize: 15, letterSpacing: ".2em", textTransform: "uppercase", color: C.rockDeep }}>Route</div>
          <div style={{ fontFamily: "Caprasimo, serif", fontSize: 46, lineHeight: 1.05, color: C.ink }}>Delhi</div>
          <div style={{ fontFamily: "Caprasimo, serif", fontSize: 46, lineHeight: 1.05, color: C.timber }}>Manali</div>
        </div>

        <div style={{
          position: "absolute", left: 56, bottom: 48, display: "flex", alignItems: "center", gap: 20,
          background: "rgba(32,30,29,.9)", color: C.cream, borderRadius: 999, padding: "16px 30px",
          boxShadow: "0 22px 50px rgba(46,43,37,.35)", opacity: MOTION.enter(0.8, 1)(T) * (1 - tailK)
        }}>
          <span style={{ fontFamily: "Caprasimo, serif", fontSize: 30, minWidth: 136 }}>{km} km</span>
          <span style={{ width: 1, height: 24, background: "rgba(249,244,237,.22)" }}></span>
          <span style={{ fontSize: 17, opacity: .72 }}>12 hr 20 min</span>
          <span style={{ width: 1, height: 24, background: "rgba(249,244,237,.22)" }}></span>
          <span style={{ fontSize: 17, color: C.routeGlow, fontWeight: 700, minWidth: 172 }}>{stopsFound} verified stops</span>
        </div>

        <div style={{ position: "absolute", right: 56, bottom: 58, width: 320, height: 7, borderRadius: 999, background: "rgba(46,43,37,.2)", overflow: "hidden", opacity: 1 - tailK }}>
          <div style={{ width: `${u * 100}%`, height: "100%", background: `linear-gradient(90deg, ${C.route}, ${C.routeGlow})` }}></div>
        </div>

        <div style={{
          position: "absolute", left: "50%", top: "50%",
          transform: `translate(-50%,-50%) scale(${0.95 + MOTION.enter(CUES.Reveal + 1.9, 1.1)(T) * 0.05})`,
          textAlign: "center", width: 1240,
          opacity: clamp(MOTION.enter(CUES.Reveal + 1.9, 1.1)(T), 0, 1) * clamp((TOTAL - 0.2 - T) / 0.5, 0, 1)
        }}>
          <div style={{ position: "absolute", left: "50%", top: "50%", width: 1500, height: 620, marginLeft: -750, marginTop: -310, background: "radial-gradient(50% 50% at 50% 50%, rgba(238,231,219,.97), rgba(238,231,219,.72) 45%, rgba(238,231,219,0) 74%)" }}></div>
          <div style={{ position: "relative", fontFamily: "Caprasimo, serif", fontSize: 88, lineHeight: 1.06, color: C.ink, letterSpacing: "-.02em" }}>Eight stops worth the detour</div>
          <div style={{ position: "relative", fontSize: 25, color: C.ink, opacity: .72, marginTop: 12 }}>Every one map-verified, on the road you were driving anyway</div>
        </div>
      </div>
    </div>
  );
}

/* ---- responsive wrapper (replaces the design tool's Stage/CompositionStage) ---- */

function useContainerScale(ref) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => {
      const s = Math.min(el.clientWidth / FRAME_W, el.clientHeight / FRAME_H);
      setScale(Math.max(0.05, s));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return scale;
}

export default function RouteCinematic() {
  const containerRef = useRef(null);
  const scale = useContainerScale(containerRef);

  return (
    <div ref={containerRef} className="route-cinematic" aria-hidden="true">
      <div
        className="route-cinematic-frame"
        style={{ width: FRAME_W, height: FRAME_H, transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        <Scene />
      </div>
      <span className="route-cinematic-badge">Demo route</span>
    </div>
  );
}
