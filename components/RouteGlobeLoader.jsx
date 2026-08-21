import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Lightbulb, RefreshCw } from "lucide-react";

/* Route-search loading visual, ported from a Claude Design / Stitch
   prototype ("OffTrail Multi-Color Global Connections"). The source design
   is a Three.js globe with a self-incrementing fake progress counter; here
   the globe/arcs stay as decorative motion (this is a "syncing with a
   global network" metaphor, not a literal map of the user's route - that's
   what RouteLoadingMap is for), but progress is driven by the real search's
   scanStage instead of a fake timer, same reasoning as RouteLoadingMap. */

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

const TIPS = [
  "Hidden gems are ranked by how far off your route they sit, not just how popular they are.",
  "A wider search radius finds more stops, but adds more detour time to your trip.",
  "Every stop shown here is checked against live map providers before it's added.",
  "Save a route to revisit it later from your dashboard without searching again."
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

function latLongToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

const VERTEX_SHADER = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Simplex/fbm noise gives a toy-globe of continents without any texture
// assets to load - same reasoning as the schematic route curve in
// RouteLoadingMap: no network dependency for a decorative background.
const FRAGMENT_SHADER = `
  uniform vec3 colorOcean;
  uniform vec3 colorSand;
  uniform vec3 colorGreen;
  varying vec3 vNormal;
  varying vec3 vPosition;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }

  float fbm(vec3 p) {
    float f = 0.0;
    f += 0.5000 * snoise(p); p *= 2.01;
    f += 0.2500 * snoise(p); p *= 2.02;
    f += 0.1250 * snoise(p); p *= 2.03;
    f += 0.0625 * snoise(p);
    return f;
  }

  void main() {
    float n = fbm(vPosition * 0.025);
    float landMask = smoothstep(0.0, 0.015, n - 0.05);
    float biomeNoise = fbm(vPosition * 0.04 + vec3(100.0));
    float greenMask = smoothstep(-0.05, 0.05, biomeNoise);
    vec3 landColor = mix(colorSand, colorGreen, greenMask);
    float shadowMask = smoothstep(-0.03, 0.0, n - 0.05) - landMask;
    vec3 baseColor = colorOcean;
    if (shadowMask > 0.0) {
      baseColor = mix(colorOcean, colorOcean * 0.4, shadowMask);
    }
    baseColor = mix(baseColor, landColor, landMask);
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
    float diff = max(dot(normal, lightDir), 0.0);
    float ambient = 0.5;
    float spec = 0.0;
    if (landMask == 0.0) {
      vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0));
      vec3 halfDir = normalize(lightDir + viewDir);
      spec = pow(max(dot(normal, halfDir), 0.0), 48.0) * 0.6;
    }
    vec3 finalColor = baseColor * (diff * 0.7 + ambient) + vec3(spec);
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

const ARC_ROUTES = [
  [51.5, -0.1, 40.7, -74.0, 0x2fd9f4],
  [35.6, 139.6, -33.8, 151.2, 0x4edea3],
  [48.8, 2.3, -22.9, -43.1, 0xffd700],
  [37.7, -122.4, 1.3, 103.8, 0xff5c8a],
  [-26.2, 28.0, 25.2, 55.2, 0x8a7bff]
];

function useGlobeScene(containerRef) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    // WebGL can be unavailable (disabled by the user, blocked by an
    // extension, older hardware) - fall back to the CSS-only console/tip
    // cards over a plain background rather than throwing.
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return undefined;
    }
    if (!renderer.getContext()) {
      renderer.dispose();
      return undefined;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 1, 2000);
    camera.position.set(0, 0, 400);

    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(200, 200, 200);
    scene.add(directional);

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const earthMaterial = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: {
        colorOcean: { value: new THREE.Color("#22d3ee") },
        colorSand: { value: new THREE.Color("#e2c792") },
        colorGreen: { value: new THREE.Color("#4edea3") }
      }
    });
    const radius = 120;
    const earth = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 64), earthMaterial);
    globeGroup.add(earth);

    const arcGroup = new THREE.Group();
    globeGroup.add(arcGroup);

    const arcs = ARC_ROUTES.map(([startLat, startLon, endLat, endLon, colorHex]) => {
      const startNode = latLongToVector3(startLat, startLon, radius);
      const endNode = latLongToVector3(endLat, endLon, radius);
      const distance = startNode.distanceTo(endNode);
      const midNode = startNode.clone().lerp(endNode, 0.5).normalize().multiplyScalar(radius + distance * 0.3);
      const curve = new THREE.QuadraticBezierCurve3(startNode, midNode, endNode);
      const tubeGeometry = new THREE.TubeGeometry(curve, 50, 1.5, 8, false);
      const material = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.9,
        roughness: 0.2,
        metalness: 0.8
      });
      const tube = new THREE.Mesh(tubeGeometry, material);
      tube.geometry.setDrawRange(0, 0);
      arcGroup.add(tube);
      const totalIndices = 50 * 8 * 6;
      return { mesh: tube, currentDraw: 0, maxDraw: totalIndices, increment: Math.floor(totalIndices / 50) };
    });

    globeGroup.position.x = container.clientWidth > 768 ? 90 : 0;
    globeGroup.position.y = 10;

    function handleResize() {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
      globeGroup.position.x = container.clientWidth > 768 ? 90 : 0;
    }
    window.addEventListener("resize", handleResize);

    let progressPercent = 8;
    let frameCount = 0;
    let rafId;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      globeGroup.rotation.y += 0.0018;
      frameCount += 1;
      if (frameCount % 6 === 0 && progressPercent < 96) progressPercent += 0.4;
      arcs.forEach((arc) => {
        const targetDraw = Math.floor(arc.maxDraw * (progressPercent / 100));
        if (arc.currentDraw < targetDraw) {
          arc.currentDraw = Math.min(arc.currentDraw + arc.increment * 2, targetDraw);
          arc.mesh.geometry.setDrawRange(0, arc.currentDraw);
        } else if (progressPercent >= 96 && Math.random() < 0.01) {
          arc.currentDraw = 0;
        }
      });
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
      arcs.forEach((arc) => {
        arc.mesh.geometry.dispose();
        arc.mesh.material.dispose();
      });
      earth.geometry.dispose();
      earthMaterial.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
    };
  }, [containerRef]);
}

export default function RouteGlobeLoader({ originLabel, destLabel, scanStage = "geocoding" }) {
  const containerRef = useRef(null);
  const t = useProgressClock(scanStage);
  const [tipIndex] = useState(() => Math.floor(Math.random() * TIPS.length));
  useGlobeScene(containerRef);

  let stageIndex = 0;
  for (let i = 0; i < STAGES.length; i += 1) if (t >= STAGES[i][0]) stageIndex = i;
  const stageLabel = STAGES[stageIndex][1];
  const complete = t >= 0.92;
  const pct = Math.round(Math.min(t, 1) * 100);

  const shorten = (value) => String(value || "").split(",")[0].trim();

  return (
    <div className="rgl">
      <div ref={containerRef} className="rgl-canvas" aria-hidden="true" />

      <div className="rgl-tip">
        <div className="rgl-tip-head">
          <Lightbulb size={15} />
          <span>Travel tip</span>
        </div>
        <p>{TIPS[tipIndex]}</p>
      </div>

      <div className="rgl-console">
        <div className="rgl-console-head">
          <div>
            <div className="rgl-console-title">
              <RefreshCw size={16} className={complete ? "" : "spin"} />
              <span>{stageLabel}</span>
            </div>
            <div className="rgl-console-sub">
              <span className="rgl-dot" />
              searching verified providers
            </div>
          </div>
          <div className="rgl-console-pct">
            <strong>{pct}%</strong>
            <span>real-time search</span>
          </div>
        </div>

        <div className="rgl-track">
          <div className="rgl-track-fill" style={{ width: `${pct}%` }} />
          <div className="rgl-node is-start">
            <span />
            <em>{shorten(originLabel) || "Origin"}</em>
          </div>
          <div className="rgl-node is-end">
            <span />
            <em>{shorten(destLabel) || "Destination"}</em>
          </div>
        </div>
      </div>
    </div>
  );
}
