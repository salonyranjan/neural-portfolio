"use client";

import {
  useEffect, useRef, useCallback, forwardRef,
  useImperativeHandle,
} from "react";
import type { NodeData, HoveredNode } from "./Scene";
import portfolioData from "../data/portfolio-data.json";
import unavailableDemoUrls from "../data/unavailable-demo-urls.json";

// Live Demo Mapping
const DEMO_MAP: Record<string, string> = {
  "roast-my-code": "https://roast-my-code-delta.vercel.app",
  "resqplate": "https://resqplate-tan.vercel.app",
  "ecocompute-urban-heat-island-optimizer": "https://eco-compute-olive.vercel.app",
  "neural-portfolio": "https://neural-portfolio.vercel.app",
  "rewind": "https://rewind-pied.vercel.app",
  "rxscan-ai": "https://rx-scan-ai.vercel.app",
  "resqpla8": "https://res-q-plate.vercel.app",
  "bitflow": "https://bit-flow-two.vercel.app",
  "vertexflow": "https://vertex-flow-phi.vercel.app",
  "salony-s-fitness-club": "https://salony-s-fitness-club.vercel.app",
  "anime-grid": "https://anime-grid-nine.vercel.app",
  "neural-map": "https://salonyranjan.github.io/neural-map/",
  "gta-vi": "https://gta-vi-woad.vercel.app",
  "mocktail": "https://mocktail-seven.vercel.app",
  "pagewhisper": "https://page-whisper.vercel.app",
  "sonic-prep": "https://sonic-prep.vercel.app",
  "z-axis-cloud": "https://z-axis-cloud.vercel.app",
  "ct-patient-data-dashboard": "https://ct-patient-data-dashboard.vercel.app",
  "skillbridge-ai": "https://skill-bridge-ai-orpin.vercel.app",
  "quickcart": "https://quick-cart-blush-alpha.vercel.app",
  "mediquery.ai": "https://mediquery-ai.streamlit.app",
  "openshelf-e2e": "https://openshelf-e2e.streamlit.app",
  "roleradar": "https://roleradarz.streamlit.app",
};

// Helpers

// Normalize both project names and demo keys so punctuation does not affect lookup.
const slugify = (s: string): string =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-+|-+$)/g, "");

const DEMO_MAP_SLUGGED: Record<string, string> = Object.fromEntries(
  Object.entries(DEMO_MAP).map(([key, url]) => [slugify(key), url]),
);

// Verified unavailable during the 2026-10-05 link audit. Original URLs remain
// in portfolio-data.json; remove an entry from this list after service recovery.
const unavailableDemos = new Set(unavailableDemoUrls.map(url => url.replace(/\/+$/, "")));
function resolveDemoUrl(name: string, fallback?: string): string | undefined {
  const url = fallback ?? DEMO_MAP_SLUGGED[slugify(name)];
  return url && !unavailableDemos.has(url.replace(/\/+$/, "")) ? url : undefined;
}

interface PortfolioItem {
  name?: string;
  url?: string;
  demo_url?: string;
  demoUrl?: string;
  complexity_score?: number;
  tags?: string[];
}

const getNormalizedData = (data: unknown): PortfolioItem[] => {
  if (Array.isArray(data)) return data as PortfolioItem[];
  if (data && typeof data === "object") {
    const entries = Object.values(data as Record<string, unknown>);
    const arr = entries.find((v): v is PortfolioItem[] => Array.isArray(v));
    return arr ?? [];
  }
  return [];
};

// Category config
export const CATEGORIES: Record<
  string,
  { color: string; glow: string; radius: number }
> = {
  project:  { color: "#00ffd5", glow: "rgba(0,255,213,",   radius: 5.5 },
  writing:  { color: "#ff2ebc", glow: "rgba(255,46,188,",  radius: 4.5 },
  research: { color: "#bf5cff", glow: "rgba(191,92,255,",  radius: 7 },
  tool:     { color: "#ffe838", glow: "rgba(255,232,56,",  radius: 5 },
  design:   { color: "#00e5ff", glow: "rgba(0,229,255,",   radius: 5.5 },
  default:  { color: "#4c9fff", glow: "rgba(76,159,255,",  radius: 5 },
};

export const getCat = (cat?: string) =>
  CATEGORIES[cat?.toLowerCase() ?? ""] ?? CATEGORIES.default;

export function categorize(name: string, score: number): string {
  const n = name.toLowerCase();
  if (n.includes("rag") || n.includes(".ai") || n.includes("mediquery") || score > 250000)
    return "research";
  if (n.includes("dashboard") || n.includes("scan") || n.includes("radar"))
    return "tool";
  if (n.includes("grid") || n.includes("flow") || n.includes("vertex"))
    return "design";
  if (n.includes("whisper") || n.includes("rewind") || n.includes("salony"))
    return "writing";
  return "project";
}

// Internal node type
export interface SimNode extends NodeData {
  x: number; y: number; z: number;
  orbitIndex: number; orbitAngle: number;
  sx: number; sy: number; projScale: number;
  projDepth: number;
  radius: number;
  hovered: boolean;
  selected: boolean;
  filtered: boolean;
  hoverScale: number;
  pulsePhase: number;
  complexity: number;
  demoUrl?: string;
}

// Category lanes stay fixed even when a filter is active. The most populated
// category has the outer orbit, giving its nodes the greatest circumference.
const ORBITS = [
  { category: "design", radius: 0.20, inclination: 0.08 },
  { category: "tool", radius: 0.39, inclination: -0.05 },
  { category: "writing", radius: 0.59, inclination: 0.06 },
  { category: "research", radius: 0.79, inclination: -0.04 },
  { category: "project", radius: 1.00, inclination: 0.02 },
];

export interface Camera { rotX: number; rotY: number; zoom: number }

function orbitalPoint(orbit: typeof ORBITS[number], angle: number) {
  return {
    x: Math.cos(angle) * orbit.radius,
    y: Math.sin(angle) * orbit.radius * Math.sin(orbit.inclination),
    z: Math.sin(angle) * orbit.radius * Math.cos(orbit.inclination),
  };
}

// Rotate the 3D orbital plane, then project through a perspective camera.
// Near-side planets grow naturally; far-side planets shrink with depth.
function projectPoint(point: { x: number; y: number; z: number }, camera: Camera, roll = 0) {
  const x = point.x * Math.cos(camera.rotY) - point.z * Math.sin(camera.rotY);
  const z = point.x * Math.sin(camera.rotY) + point.z * Math.cos(camera.rotY);
  const y = -point.y * Math.cos(camera.rotX) - z * Math.sin(camera.rotX);
  const depth = -point.y * Math.sin(camera.rotX) + z * Math.cos(camera.rotX);
  const perspective = 3.2 / (3.2 + depth);
  return {
    x: (x * Math.cos(roll) - y * Math.sin(roll)) * perspective,
    y: (x * Math.sin(roll) + y * Math.cos(roll)) * perspective,
    depth, perspective,
  };
}

function orbitalLayout(W: number, H: number, camera: Camera) {
  const compact = W <= 768 || H < 500;
  const top = compact ? 154 : 100;
  const bottom = H < 500 ? 88 : compact ? 140 : 88;
  const height = Math.max(80, H - top - bottom);
  // Use the available portrait height for the inclined system. Head-on views
  // return to a horizontal orientation; top/bottom retain a circular frame.
  const roll = W <= 768 && (height - 52) / (W - 48) > 1.3
    ? Math.PI / 2 * Math.min(1, Math.abs(camera.rotX) / 0.5) : 0;
  let minX = -0.1, maxX = 0.1, minY = -0.1, maxY = 0.1;
  for (const orbit of ORBITS) {
    for (let i = 0; i < 64; i++) {
      const p = projectPoint(orbitalPoint(orbit, i * Math.PI / 32), camera, roll);
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    }
  }
  const fitScale = Math.max(24, Math.min((W - (compact ? 48 : 144)) / (maxX - minX), (height - (compact ? 52 : 112)) / (maxY - minY)));
  const scale = fitScale * camera.zoom;
  return {
    cx: W / 2 - (maxX + minX) * scale / 2,
    cy: top + height / 2 - (maxY + minY) * scale / 2,
    scale, roll, compact,
    nodeScale: (compact
      ? Math.max(0.55, Math.min(1.18, fitScale / 420))
      : Math.max(1.25, Math.min(2.0, fitScale / 270))) * camera.zoom,
  };
}

// Background particles
const BG_COUNT    = 120;
const bgParticles = Array.from({ length: BG_COUNT }, () => ({
  x:  Math.random(), y: Math.random(),
  vx: (Math.random() - 0.5) * 0.00012,
  vy: (Math.random() - 0.5) * 0.00012,
  size:    Math.random() * 1.5 + 0.2,
  opacity: Math.random() * 0.55 + 0.08,
  hue:     Math.random() > 0.5 ? "#00f5c4" : "#a78bfa",
}));

const NEBULAE = Array.from({ length: 5 }, (_, i) => ({
  x: 0.1 + i * 0.22, y: 0.2 + (i % 2) * 0.55,
  r: 120 + Math.random() * 140,
  color: ["#00f5c4","#a78bfa","#ff6bbd","#ffd166","#06d6a0"][i],
  opacity: 0.022 + Math.random() * 0.018,
}));

// Exported handle
export interface GraphHandle {
  getNodes(): SimNode[];
  getNodeAt(x: number, y: number): SimNode | null;
  focusNode(idx: number): void;
}

// Graph props
export interface GraphProps {
  canvas:    HTMLCanvasElement | null;
  onHover:   (node: HoveredNode | null) => void;
  onSelect:  (node: SimNode | null) => void;
  onNodeCount: (n: number) => void;
  camera:    Camera & { targetRotX: number; targetRotY: number; targetZoom: number };
  dragState: React.MutableRefObject<{ active: boolean; moved: boolean }>;
  mousePos:  React.MutableRefObject<{ x: number; y: number }>;
  onFps:     (fps: number) => void;
  filterCat: string | null;
}

// Cross-browser rounded rect (Safari < 16 has no ctx.roundRect)
function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  const rad = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

// Pill label renderer
/**
 * Draws a compact, clean label pill above a node.
 *
 * Design decisions:
 * - Font size is clamped to [9, 13] px and scales with projScale + hoverScale
 *   with collision checks keeping the labels readable on smaller screens.
 * - LIVE nodes get a small teal dot badge instead of " ↗ LIVE" suffix so the
 *   pill stays short.
 * - Pill width is driven by the *name only*, keeping things tidy.
 */
function drawLabel(
  ctx: CanvasRenderingContext2D,
  nd: SimNode,
  now: number,
  dimAlpha: number,
  reducedMotion: boolean,
  occupied: { x: number; y: number; w: number; h: number }[],
) {
  const cfg = getCat(nd.category);

  const labelAlpha = Math.min(1, dimAlpha);
  if (labelAlpha <= 0.02) return;

  const r = nd.radius * nd.projScale * NODE_SCALE * nd.hoverScale;
  const { sx, sy } = nd;

  // Font — scale smoothly but clamp tightly
  const baseFont = 10.5;
  const fontSize = Math.max(9, Math.min(13, Math.round(baseFont * nd.projScale * (nd.hovered ? 1.1 : 1))));
  ctx.font = `500 ${fontSize}px 'JetBrains Mono','Fira Code',monospace`;
  ctx.textAlign   = "center";
  ctx.textBaseline = "middle";

  let nameText = nd.name;
  const maxTextWidth = Math.min(210, window.innerWidth - 76);
  while (nameText.length > 1 && ctx.measureText(nameText).width > maxTextWidth) {
    nameText = nameText.replace(/…$/, "").slice(0, -1) + "…";
  }
  const tw   = ctx.measureText(nameText).width;
  const px   = 10, py = 3.5;
  // Extra right padding for the live dot
  const extraRight = nd.demoUrl ? px + 10 : 0;
  const pw   = tw + px * 2 + extraRight + 8;
  const ph   = fontSize + py * 2;
  const gap  = 6;
  const plx  = Math.max(8, Math.min(window.innerWidth - pw - 8, sx - pw / 2));
  const ply  = sy - r - ph - gap;

  if (!nd.hovered && !nd.selected && occupied.some(box =>
    plx < box.x + box.w + 4 && plx + pw + 4 > box.x &&
    ply < box.y + box.h + 4 && ply + ph + 4 > box.y
  )) return;
  occupied.push({ x: plx, y: ply, w: pw, h: ph });

  ctx.save();
  ctx.globalAlpha = labelAlpha;

  // Pill background
  ctx.fillStyle   = "rgba(4,5,20,0.88)";
  ctx.strokeStyle = nd.hovered || nd.selected
    ? cfg.color + "99"
    : cfg.color + "40";
  ctx.lineWidth   = nd.hovered || nd.selected ? 1.0 : 0.6;
  roundedRectPath(ctx, plx, ply, pw, ph, ph / 2);
  ctx.fill();
  ctx.stroke();

  // Category dot (left)
  ctx.fillStyle = cfg.color;
  ctx.globalAlpha = labelAlpha * 0.9;
  ctx.beginPath();
  ctx.arc(plx + px * 0.85, ply + ph / 2, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Name text
  ctx.globalAlpha = labelAlpha;
  ctx.fillStyle   = "#e8eeff";
  ctx.shadowColor = "rgba(0,0,0,0.9)";
  ctx.shadowBlur  = 4;
  // Shift text left when live badge present
  const textOffsetX = (8 - extraRight) / 2;
  ctx.fillText(nameText, plx + pw / 2 + textOffsetX, ply + ph / 2);
  ctx.shadowBlur = 0;

  // LIVE badge — small pulsing dot on the right (static dot if reduced motion)
  if (nd.demoUrl) {
    const pulse = reducedMotion ? 0 : (now * 0.0025 + nd.pulsePhase) % (Math.PI * 2);
    const dotR  = reducedMotion ? 3 : 3 + Math.sin(pulse) * 0.6;
    const dotX  = plx + pw - px * 0.85;
    const dotY  = ply + ph / 2;

    // Glow halo
    const g = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, dotR * 3.5);
    g.addColorStop(0,   "rgba(0,245,196,0.35)");
    g.addColorStop(1,   "rgba(0,245,196,0)");
    ctx.fillStyle = g;
    ctx.globalAlpha = labelAlpha * (reducedMotion ? 0.5 : 0.5 + Math.sin(pulse) * 0.3);
    ctx.beginPath();
    ctx.arc(dotX, dotY, dotR * 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Solid dot
    ctx.globalAlpha = labelAlpha;
    ctx.fillStyle   = "#00f5c4";
    ctx.shadowColor = "#00f5c4";
    ctx.shadowBlur  = 6;
    ctx.beginPath();
    ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

// Core node scale multiplier
// Keep the luminous core compact so the glow and orbit have breathing room.
const NODE_SCALE = 3.0;

function hitTest(nodes: SimNode[], x: number, y: number): SimNode | null {
  let hit: SimNode | null = null;
  let nearby: SimNode | null = null, nearest = Infinity;
  for (const nd of nodes) {
    const core = nd.radius * nd.projScale * NODE_SCALE * nd.hoverScale;
    const radius = Math.max(12, core * 1.3);
    const distance = Math.hypot(nd.sx - x, nd.sy - y);
    if (distance < core && (!hit || nd.projDepth < hit.projDepth)) hit = nd;
    if (distance < radius && distance < nearest) { nearby = nd; nearest = distance; }
  }
  return hit ?? nearby;
}

// Graph
const Graph = forwardRef<GraphHandle, GraphProps>(function Graph(
  { canvas, onHover, onSelect, onNodeCount, camera, dragState, mousePos,
    onFps, filterCat },
  ref
) {
  const nodesRef    = useRef<SimNode[]>([]);
  const hoveredRef  = useRef<SimNode | null>(null);
  const rafRef      = useRef<number>(0);
  const fpsRef      = useRef({ frames: 0, last: performance.now() });
  const orbitalTimeRef = useRef(0);
  const reducedMotionRef = useRef(false);

  // Cached visibility (only depends on filterCat, not on every animation
  // frame) — avoids rebuilding filter()/Set()/filter() 60x/sec.
  const visNodesRef = useRef<SimNode[]>([]);

  const recomputeVisibility = useCallback(() => {
    const nodes = nodesRef.current;
    const vis = nodes.filter(n => n.filtered);
    visNodesRef.current = vis;
  }, []);

  useImperativeHandle(ref, () => ({
    getNodes:   () => nodesRef.current,
    getNodeAt:  (x, y) => hitTest(visNodesRef.current, x, y),
    focusNode:  (idx: number) => {
      const nd = nodesRef.current[idx];
      if (!nd) return;
      nodesRef.current.forEach(n => n.selected = false);
      nd.selected = true;
      onSelect(nd);
    },
  }));

  // Keep orbital motion and energy pulses still when reduced motion is requested.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = mq.matches;
    const handler = (e: MediaQueryListEvent) => { reducedMotionRef.current = e.matches; };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Space each category evenly around its own orbital lane.
  useEffect(() => {
    const raw = getNormalizedData(portfolioData);
    const categories = raw.map(d => categorize(d.name ?? "", d.complexity_score ?? 0));
    const counts = categories.reduce<Record<string, number>>((acc, cat) => {
      acc[cat] = (acc[cat] ?? 0) + 1;
      return acc;
    }, {});
    const slots: Record<string, number> = {};
    const nodes: SimNode[] = raw.map((d, i) => {
      const name = d.name ?? `Project ${i}`;
      const cat = categorize(name, d.complexity_score ?? 0);
      const cfg = getCat(cat);
      const orbitIndex = ORBITS.findIndex(orbit => orbit.category === cat);
      const slot = slots[cat] ?? 0;
      slots[cat] = slot + 1;
      const orbitAngle = -Math.PI / 2 + orbitIndex * 0.32 + slot * Math.PI * 2 / counts[cat];

      return {
        name,
        url:         d.url ?? "#",
        demoUrl:     resolveDemoUrl(name, d.demoUrl ?? d.demo_url),
        category:    cat,
        description: `Complexity score: ${Math.round(d.complexity_score ?? 0).toLocaleString()}`,
        tags:        d.tags ?? [],
        index:       i,
        complexity:  d.complexity_score ?? 0,
        x: 0, y: 0, z: 0,
        orbitIndex, orbitAngle,
        sx: 0, sy: 0, projScale: 1, projDepth: 0,
        radius:      cfg.radius,
        hovered:     false, selected: false, filtered: true,
        hoverScale: 1,
        pulsePhase: Math.random() * Math.PI * 2,
      };
    });

    nodesRef.current = nodes;
    onNodeCount(nodes.length);
    recomputeVisibility();
  }, [onNodeCount, recomputeVisibility]);

  useEffect(() => {
    nodesRef.current.forEach(nd => {
      nd.filtered = filterCat === null || nd.category === filterCat;
    });
    recomputeVisibility();
  }, [filterCat, recomputeVisibility]);

  // Render loop
  useEffect(() => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastFrame = 0;
    const draw = (now: number) => {
      const W = window.innerWidth, H = window.innerHeight;
      const nodes = nodesRef.current;
      const reducedMotion = reducedMotionRef.current;

      fpsRef.current.frames++;
      if (now - fpsRef.current.last >= 1000) {
        onFps(fpsRef.current.frames);
        fpsRef.current = { frames: 0, last: now };
      }

      const dt = lastFrame ? Math.min(0.05, (now - lastFrame) / 1000) : 0;
      lastFrame = now;
      if (!dragState.current.active && !reducedMotion && !hoveredRef.current && !nodes.some(nd => nd.selected)) {
        orbitalTimeRef.current += dt;
      }
      const ease = reducedMotion ? 1 : 1 - Math.exp(-dt * 9);
      camera.rotX += (camera.targetRotX - camera.rotX) * ease;
      camera.rotY += (camera.targetRotY - camera.rotY) * ease;
      camera.zoom += (camera.targetZoom - camera.zoom) * ease;
      const layout = orbitalLayout(W, H, camera);
      for (const nd of nodes) {
        const orbit = ORBITS[nd.orbitIndex];
        // Kepler-inspired motion: outer lanes move more slowly. One angular
        // speed per lane preserves the separation of every pair of nodes.
        const angle = nd.orbitAngle + orbitalTimeRef.current * 0.025 / Math.pow(orbit.radius, 1.5);
        const point = orbitalPoint(orbit, angle);
        nd.x = point.x; nd.y = point.y; nd.z = point.z;
        const p = projectPoint(point, camera, layout.roll);
        nd.sx = layout.cx + p.x * layout.scale;
        nd.sy = layout.cy + p.y * layout.scale;
        nd.projScale = layout.nodeScale * p.perspective;
        nd.projDepth = p.depth;
        const targetScale = nd.hovered ? 1.25 : nd.selected ? 1.18 : 1;
        nd.hoverScale += (targetScale - nd.hoverScale) * 0.13;
      }

      ctx.clearRect(0, 0, W, H);

      // Nebula atmosphere
      for (const nb of NEBULAE) {
        const hex = nb.color.slice(1);
        const r = parseInt(hex.slice(0,2),16);
        const g = parseInt(hex.slice(2,4),16);
        const b = parseInt(hex.slice(4,6),16);
        const grd = ctx.createRadialGradient(nb.x*W, nb.y*H, 0, nb.x*W, nb.y*H, nb.r);
        grd.addColorStop(0,   `rgba(${r},${g},${b},${Math.min(1, nb.opacity*1.5)})`);
        grd.addColorStop(0.5, `rgba(${r},${g},${b},${Math.min(1, nb.opacity)})`);
        grd.addColorStop(1,   `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(nb.x*W, nb.y*H, nb.r, 0, Math.PI*2);
        ctx.fill();
      }

      // Background particles
      for (const p of bgParticles) {
        if (!reducedMotion) { p.x += p.vx * dt * 60; p.y += p.vy * dt * 60; }
        if (p.x < 0) p.x = 1; if (p.x > 1) p.x = 0;
        if (p.y < 0) p.y = 1; if (p.y > 1) p.y = 0;
      }
      ctx.save();
      for (const p of bgParticles) {
        ctx.globalAlpha = p.opacity * 0.5;
        ctx.fillStyle   = p.hue;
        ctx.beginPath();
        ctx.arc(p.x*W, p.y*H, p.size, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.restore();

      const visNodes = visNodesRef.current;
      ctx.save();
      for (const orbit of ORBITS) {
        const laneNodes = nodes.filter(nd => nd.category === orbit.category);
        if (!laneNodes.length) continue;
        const active = laneNodes.some(nd => nd.filtered);
        const highlighted = laneNodes.some(nd => nd.hovered || nd.selected);
        const path = Array.from({ length: 129 }, (_, i) =>
          projectPoint(orbitalPoint(orbit, i * Math.PI / 64), camera, layout.roll)
        );
        // Fainter far arcs and sharper foreground arcs reveal the orbital plane.
        for (const front of [false, true]) {
          ctx.strokeStyle = getCat(orbit.category).color;
          ctx.globalAlpha = active ? (highlighted ? 0.7 : front ? 0.46 : 0.16) : 0.05;
          ctx.lineWidth = front ? 1.25 : 0.8;
          ctx.beginPath();
          for (let i = 1; i < path.length; i++) {
            const a = path[i - 1], b = path[i];
            if (((a.depth + b.depth) < 0) !== front) continue;
            ctx.moveTo(layout.cx + a.x * layout.scale, layout.cy + a.y * layout.scale);
            ctx.lineTo(layout.cx + b.x * layout.scale, layout.cy + b.y * layout.scale);
          }
          ctx.stroke();
        }
      }
      ctx.restore();

      const drawCenter = () => {
        const r = Math.min(layout.nodeScale * (layout.compact ? 40 : 38), layout.scale * 0.13);
        const heat = reducedMotion ? 0 : Math.sin(now * 0.0012) * 0.04;
        ctx.save();
        const halo = ctx.createRadialGradient(layout.cx, layout.cy, r * 0.6, layout.cx, layout.cy, r * 5);
        halo.addColorStop(0, `rgba(255,210,45,${0.38 + heat})`);
        halo.addColorStop(0.25, "rgba(255,174,20,0.15)");
        halo.addColorStop(0.65, "rgba(255,145,12,0.035)");
        halo.addColorStop(1, "rgba(255,145,12,0)");
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(layout.cx, layout.cy, r * 5, 0, Math.PI * 2);
        ctx.fill();
        // A soft corona radiates outward without obscuring the orbital lanes.
        const wave = reducedMotion ? 0.2 : (now * 0.00022) % 1;
        ctx.strokeStyle = "#ffd94a";
        ctx.globalAlpha = reducedMotion ? 0.08 : 0.16 * (1 - wave) ** 2;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(layout.cx, layout.cy, r * (1.25 + wave * 2.5), 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        const sphere = ctx.createRadialGradient(layout.cx-r*0.35, layout.cy-r*0.4, 0, layout.cx, layout.cy, r);
        sphere.addColorStop(0, "#fffbd4");
        sphere.addColorStop(0.20, "#ffe86b");
        sphere.addColorStop(0.55, "#ffd21c");
        sphere.addColorStop(0.82, "#f5a409");
        sphere.addColorStop(1, "#ba5b06");
        ctx.fillStyle = sphere;
        ctx.shadowColor = "#ffcf33";
        ctx.shadowBlur = r * 0.7;
        ctx.beginPath();
        ctx.arc(layout.cx, layout.cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        if (W > 768 && H > 500) {
          ctx.font = "500 10px 'JetBrains Mono',monospace";
          ctx.textAlign = "center";
          ctx.fillStyle = "rgba(255,233,167,0.8)";
          ctx.fillText("ENGINEERING JOURNEY", layout.cx, layout.cy + r + 24);
        }
        ctx.restore();
      };

      // Nodes (back to front)
      const sortedNodes = [...visNodes].sort((a, b) => b.projDepth - a.projDepth);

      let centerDrawn = false;
      for (const nd of sortedNodes) {
        if (!centerDrawn && nd.projDepth <= 0) { drawCenter(); centerDrawn = true; }
        const cfg  = getCat(nd.category);
        // Core render radius — NODE_SCALE is the global tuning knob
        const r    = nd.radius * nd.projScale * NODE_SCALE * nd.hoverScale;
        const { sx, sy } = nd;
        if (sx < -r*5 || sx > W+r*5 || sy < -r*5 || sy > H+r*5) continue;

        const alpha    = Math.max(0.72, Math.min(1, 1 - nd.projDepth * 0.18));
        const dimAlpha = nd.filtered ? alpha : alpha * 0.12;

        ctx.save();
        ctx.globalAlpha = dimAlpha;

        if (nd.hovered || nd.selected) {
          ctx.strokeStyle = cfg.color;
          ctx.globalAlpha = 0.75;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(sx, sy, r + 5, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = dimAlpha;

        // Outer glow
        const energy = reducedMotion ? 0.2 : (now * 0.00025 + nd.pulsePhase / (Math.PI * 2)) % 1;
        const glowR = r * 3.5;
        const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
        grd.addColorStop(0,   cfg.glow + "0.38)");
        grd.addColorStop(0.30, cfg.glow + "0.16)");
        grd.addColorStop(0.65, cfg.glow + "0.025)");
        grd.addColorStop(1,   cfg.glow + "0)");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(sx, sy, glowR, 0, Math.PI*2);
        ctx.fill();

        ctx.globalAlpha = dimAlpha * (reducedMotion ? 0.06 : 0.12 * (1 - energy) ** 2);
        ctx.strokeStyle = cfg.color;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(sx, sy, r * (1.25 + energy * 1.5), 0, Math.PI * 2);
        ctx.stroke();

        // Core sphere
        ctx.globalAlpha = dimAlpha;
        const coreGrd = ctx.createRadialGradient(sx - r*0.35, sy - r*0.35, 0, sx, sy, r);
        coreGrd.addColorStop(0,    "#ffffff");
        coreGrd.addColorStop(0.18, cfg.color);
        coreGrd.addColorStop(0.55, cfg.color);
        coreGrd.addColorStop(0.82, cfg.color + "bb");
        coreGrd.addColorStop(1,    cfg.color + "65");
        ctx.fillStyle = "#08131e";
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle   = coreGrd;
        ctx.shadowColor = cfg.color;
        ctx.shadowBlur  = r * 1.4;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Specular highlight
        const specGrd = ctx.createRadialGradient(
          sx - r*0.3, sy - r*0.35, 0,
          sx - r*0.25, sy - r*0.25, r*0.48
        );
        specGrd.addColorStop(0, "rgba(255,255,255,0.7)");
        specGrd.addColorStop(1, "rgba(255,255,255,0)");
        ctx.globalAlpha = dimAlpha * 0.55;
        ctx.fillStyle   = specGrd;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI*2);
        ctx.fill();

        ctx.restore();

      }

      if (!centerDrawn) drawCenter();

      // Draw labels last, prioritizing the active node and avoiding other
      // labels and sphere cores on narrow screens.
      const occupied = visNodes.map(nd => {
        const r = nd.radius * nd.projScale * NODE_SCALE * nd.hoverScale;
        return { x: nd.sx - r, y: nd.sy - r, w: r * 2, h: r * 2 };
      });
      const labelNodes = [...sortedNodes].sort((a, b) =>
        Number(b.hovered || b.selected) - Number(a.hovered || a.selected) || b.projScale - a.projScale
      );
      for (const nd of labelNodes) {
        if (W <= 768 && !nd.hovered && !nd.selected) continue;
        drawLabel(ctx, nd, now, Math.min(1, nd.projScale * 1.5), reducedMotion, occupied);
      }

      // Hover hit-test
      const mx = mousePos.current.x, my = mousePos.current.y;
      const hit = hitTest(visNodes, mx, my);
      for (const nd of nodes) nd.hovered = nd === hit;

      if (hit !== hoveredRef.current) {
        hoveredRef.current = hit;
        canvas.style.cursor = hit ? "pointer" : "default";
        onHover(hit ? { ...hit, screenX: mx, screenY: my } : null);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [canvas, camera, dragState, mousePos, onHover, onFps]);

  return null;
});

export default Graph;
