"use client";

import {
  useEffect, useRef, useCallback, forwardRef,
  useImperativeHandle,
} from "react";
import type { NodeData, HoveredNode } from "./Scene";
import portfolioData from "../data/portfolio-data.json";

// ─── Live Demo Mapping ────────────────────────────────────────────────────────
const DEMO_MAP: Record<string, string> = {
  "anime-grid": "https://anime-grid-nine.vercel.app",
  "bitflow": "https://bit-flow-two.vercel.app",
  "ct-patient-data-dashboard": "https://ct-patient-data-dashboard.vercel.app",
  "frontend-resqplate-": "https://res-q-plate.vercel.app",
  "resqplate": "https://res-q-plate.vercel.app",
  "gta-vi": "https://gta-vi-woad.vercel.app",
  "mediquery.ai": "https://mediquery-ai.streamlit.app",
  "mocktail": "https://mocktail-seven.vercel.app",
  "openshelf-e2e": "https://openshelf-e2e.streamlit.app",
  "pagewhisper": "https://page-whisper.vercel.app",
  "rewind": "https://rewind-pied.vercel.app",
  "roleradar": "https://roleradarz.streamlit.app",
  "rxscan-ai": "https://rx-scan-ai.vercel.app",
  "salony-s-fitness-club": "https://salony-s-fitness-club.vercel.app",
  "skillbridge-ai": "https://skill-bridge-ai-orpin.vercel.app",
  "sonic-prep": "https://sonic-prep.vercel.app",
  "vertexflow": "https://vertex-flow-phi.vercel.app",
  "z-axis-cloud": "https://z-axis-cloud.vercel.app"
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getNormalizedData = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const k = Object.keys(data).find((key) => Array.isArray(data[key]));
    return k ? data[k] : [];
  }
  return [];
};

// ─── Category config ──────────────────────────────────────────────────────────
export const CATEGORIES: Record<
  string,
  { color: string; glow: string; radius: number; hex: string }
> = {
  project:  { color: "#00f5c4", glow: "rgba(0,245,196,",   radius: 5.5, hex: "#00f5c4" },
  writing:  { color: "#ff6bbd", glow: "rgba(255,107,189,", radius: 4.5, hex: "#ff6bbd" },
  research: { color: "#a78bfa", glow: "rgba(167,139,250,", radius: 7,   hex: "#a78bfa" },
  tool:     { color: "#ffd166", glow: "rgba(255,209,102,", radius: 5,   hex: "#ffd166" },
  design:   { color: "#06d6a0", glow: "rgba(6,214,160,",   radius: 5.5, hex: "#06d6a0" },
  default:  { color: "#74b3fe", glow: "rgba(116,179,254,", radius: 5,   hex: "#74b3fe" },
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

// ─── Internal node type ───────────────────────────────────────────────────────
export interface SimNode extends NodeData {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  sx: number; sy: number; projScale: number;
  projDepth: number;
  radius: number;
  hovered: boolean;
  selected: boolean;
  filtered: boolean;
  hoverScale: number;
  pulsePhase: number;
  trailX: number[]; trailY: number[];
  complexity: number;
  demoUrl?: string;
}

export interface Edge { a: number; b: number }

// ─── 3D Force simulation ──────────────────────────────────────────────────────
const REPEL      = 3200;
const SPRING_LEN = 100;
const SPRING_K   = 0.016;
const DAMP       = 0.86;
const CENTER_K   = 0.003;
const ATTRACT_K  = 0.0008;

function tickSimulation(nodes: SimNode[], edges: Edge[], selectedIdx: number) {
  const n = nodes.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = nodes[j].x - nodes[i].x;
      const dy = nodes[j].y - nodes[i].y;
      const dz = nodes[j].z - nodes[i].z;
      const dist2 = dx*dx + dy*dy + dz*dz + 0.01;
      const dist  = Math.sqrt(dist2);
      const f     = REPEL / dist2;
      const ix = (f*dx)/dist, iy = (f*dy)/dist, iz = (f*dz)/dist;
      nodes[i].vx -= ix; nodes[i].vy -= iy; nodes[i].vz -= iz;
      nodes[j].vx += ix; nodes[j].vy += iy; nodes[j].vz += iz;
    }
  }
  for (const e of edges) {
    const a = nodes[e.a], b = nodes[e.b];
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1;
    const f    = (dist - SPRING_LEN) * SPRING_K;
    a.vx += (f*dx)/dist; a.vy += (f*dy)/dist; a.vz += (f*dz)/dist;
    b.vx -= (f*dx)/dist; b.vy -= (f*dy)/dist; b.vz -= (f*dz)/dist;
  }
  if (selectedIdx >= 0) {
    const sel = nodes[selectedIdx];
    for (const e of edges) {
      const other = e.a === selectedIdx ? nodes[e.b] : e.b === selectedIdx ? nodes[e.a] : null;
      if (!other) continue;
      other.vx += (sel.x - other.x) * ATTRACT_K;
      other.vy += (sel.y - other.y) * ATTRACT_K;
      other.vz += (sel.z - other.z) * ATTRACT_K;
    }
  }
  for (const nd of nodes) {
    nd.vx = (nd.vx - nd.x * CENTER_K) * DAMP;
    nd.vy = (nd.vy - nd.y * CENTER_K) * DAMP;
    nd.vz = (nd.vz - nd.z * CENTER_K) * DAMP;
    nd.x += nd.vx; nd.y += nd.vy; nd.z += nd.vz;
  }
}

// ─── 3D → 2D projection ───────────────────────────────────────────────────────
export interface Camera { rotX: number; rotY: number; zoom: number }

function project(
  x: number, y: number, z: number,
  cam: Camera, W: number, H: number
) {
  const cosY = Math.cos(cam.rotY), sinY = Math.sin(cam.rotY);
  const x1 = x*cosY - z*sinY, z1 = x*sinY + z*cosY;
  const cosX = Math.cos(cam.rotX), sinX = Math.sin(cam.rotX);
  const y2 =  y*cosX - z1*sinX, z2 = y*sinX + z1*cosX;
  const fov   = 420 * cam.zoom;
  const depth = fov + z2;
  const scale = depth > 10 ? fov / depth : 0.01;
  return { sx: W/2 + x1*scale, sy: H/2 + y2*scale, scale, depth: z2 };
}

// ─── Background particles ─────────────────────────────────────────────────────
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

// ─── Exported handle ──────────────────────────────────────────────────────────
export interface GraphHandle {
  getHovered(): SimNode | null;
  getNodes(): SimNode[];
  focusNode(idx: number): void;
}

// ─── Graph props ──────────────────────────────────────────────────────────────
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
  searchIdx: number | null;
}

// ─── Pill label renderer ──────────────────────────────────────────────────────
/**
 * Draws a compact, clean label pill above a node.
 *
 * Design decisions:
 * - Font size is clamped to [9, 13] px and scales with projScale + hoverScale
 *   but only when the node is large enough to read (projScale > 0.55).
 * - LIVE nodes get a small teal dot badge instead of " ↗ LIVE" suffix so the
 *   pill stays short.
 * - Pill width is driven by the *name only*, keeping things tidy.
 */
function drawLabel(
  ctx: CanvasRenderingContext2D,
  nd: SimNode,
  now: number,
  dimAlpha: number,
) {
  const cfg = getCat(nd.category);

  // Only show label when node is readable
  const labelAlpha = Math.min(1, dimAlpha * (nd.projScale > 0.55 ? 1.0 : nd.hovered ? 0.8 : 0));
  if (labelAlpha <= 0.02) return;

  const r = nd.radius * nd.projScale * NODE_SCALE * nd.hoverScale;
  const { sx, sy } = nd;

  // Font — scale smoothly but clamp tightly
  const baseFont = 10.5;
  const fontSize = Math.max(9, Math.min(13, Math.round(baseFont * nd.projScale * (nd.hovered ? 1.1 : 1))));
  ctx.font = `500 ${fontSize}px 'JetBrains Mono','Fira Code',monospace`;
  ctx.textAlign   = "center";
  ctx.textBaseline = "middle";

  const nameText = nd.name;
  const tw   = ctx.measureText(nameText).width;
  const px   = 7, py = 3.5;
  // Extra right padding for the live dot
  const extraRight = nd.demoUrl ? px + 10 : 0;
  const pw   = tw + px * 2 + extraRight;
  const ph   = fontSize + py * 2;
  const gap  = 6;
  const plx  = sx - pw / 2;
  const ply  = sy - r - ph - gap;

  ctx.save();
  ctx.globalAlpha = labelAlpha;

  // Pill background
  ctx.fillStyle   = "rgba(4,5,20,0.88)";
  ctx.strokeStyle = nd.hovered || nd.selected
    ? cfg.color + "99"
    : cfg.color + "40";
  ctx.lineWidth   = nd.hovered || nd.selected ? 1.0 : 0.6;
  ctx.beginPath();
  ctx.roundRect(plx, ply, pw, ph, ph / 2);
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
  const textOffsetX = nd.demoUrl ? -5 : 0;
  ctx.fillText(nameText, sx + textOffsetX, ply + ph / 2);
  ctx.shadowBlur = 0;

  // LIVE badge — small pulsing dot on the right
  if (nd.demoUrl) {
    const pulse = (now * 0.0025 + nd.pulsePhase) % (Math.PI * 2);
    const dotR  = 3 + Math.sin(pulse) * 0.6;
    const dotX  = plx + pw - px * 0.85;
    const dotY  = ply + ph / 2;

    // Glow halo
    const g = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, dotR * 3.5);
    g.addColorStop(0,   "rgba(0,245,196,0.35)");
    g.addColorStop(1,   "rgba(0,245,196,0)");
    ctx.fillStyle = g;
    ctx.globalAlpha = labelAlpha * (0.5 + Math.sin(pulse) * 0.3);
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

// ─── Core node scale multiplier ───────────────────────────────────────────────
// Was 18 — reduced to 12 for tighter, cleaner nodes.
// Adjust this single constant to resize all nodes globally.
const NODE_SCALE = 12;

// ─── Graph ────────────────────────────────────────────────────────────────────
const Graph = forwardRef<GraphHandle, GraphProps>(function Graph(
  { canvas, onHover, onSelect, onNodeCount, camera, dragState, mousePos,
    onFps, filterCat, searchIdx },
  ref
) {
  const nodesRef    = useRef<SimNode[]>([]);
  const edgesRef    = useRef<Edge[]>([]);
  const hoveredRef  = useRef<SimNode | null>(null);
  const selectedRef = useRef<SimNode | null>(null);
  const rafRef      = useRef<number>(0);
  const fpsRef      = useRef({ frames: 0, last: performance.now() });
  const autoRotRef  = useRef(0);
  const selectedIdx = useRef(-1);

  useImperativeHandle(ref, () => ({
    getHovered: () => hoveredRef.current,
    getNodes:   () => nodesRef.current,
    focusNode:  (idx: number) => {
      const nd = nodesRef.current[idx];
      if (!nd) return;
      selectedRef.current = nd;
      selectedIdx.current = idx;
      nodesRef.current.forEach(n => n.selected = false);
      nd.selected = true;
      onSelect(nd);
      camera.targetRotX = 0.1;
      camera.targetRotY += 0.3;
      camera.targetZoom  = 1.4;
    },
  }));

  // Build nodes & edges
  useEffect(() => {
    const raw = getNormalizedData(portfolioData);
    const nodes: SimNode[] = raw.map((d: any, i: number) => {
      const cat = categorize(d.name ?? "", d.complexity_score ?? 0);
      const cfg = getCat(cat);
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 90 + Math.random() * 70;
      const safeName = (d.name ?? `Project ${i}`).toLowerCase();

      return {
        name:        d.name ?? `Project ${i}`,
        url:         d.url  ?? "#",
        demoUrl:     DEMO_MAP[safeName] || d.demo_url,
        category:    cat,
        description: `Complexity score: ${Math.round(d.complexity_score ?? 0).toLocaleString()}`,
        tags:        d.tags ?? ["AI", "Development"],
        index:       i,
        complexity:  d.complexity_score ?? 0,
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi),
        vx: 0, vy: 0, vz: 0,
        sx: 0, sy: 0, projScale: 1, projDepth: 0,
        radius:      cfg.radius,
        hovered:     false, selected: false, filtered: true,
        hoverScale: 1,
        pulsePhase: Math.random() * Math.PI * 2,
        trailX:      [], trailY: [],
      };
    });

    const edges: Edge[] = [];
    for (let i = 0; i < nodes.length; i++)
      for (let j = i + 1; j < nodes.length; j++) {
        const same = nodes[i].category === nodes[j].category;
        if (same || Math.random() < 0.05)
          edges.push({ a: i, b: j });
      }

    for (let t = 0; t < 160; t++) tickSimulation(nodes, edges, -1);
    nodesRef.current = nodes;
    edgesRef.current = edges;
    onNodeCount(nodes.length);
  }, [onNodeCount]);

  useEffect(() => {
    nodesRef.current.forEach(nd => {
      nd.filtered = filterCat === null || nd.category === filterCat;
    });
  }, [filterCat]);

  useEffect(() => {
    if (searchIdx !== null) {
      const nd = nodesRef.current[searchIdx];
      if (nd) {
        nodesRef.current.forEach(n => { n.selected = false; });
        nd.selected = true;
        selectedRef.current = nd;
        selectedIdx.current = searchIdx;
        onSelect(nd);
        camera.targetZoom  = 1.5;
        camera.targetRotY += 0.4;
      }
    }
  }, [searchIdx, camera, onSelect]);

  // Render loop
  useEffect(() => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = (now: number) => {
      const W = window.innerWidth, H = window.innerHeight;
      const nodes = nodesRef.current;
      const edges = edgesRef.current;

      fpsRef.current.frames++;
      if (now - fpsRef.current.last >= 1000) {
        onFps(fpsRef.current.frames);
        fpsRef.current = { frames: 0, last: now };
      }

      if (!dragState.current.active) autoRotRef.current += 0.00055;
      camera.rotX += (camera.targetRotX - camera.rotX)                      * 0.08;
      camera.rotY += (camera.targetRotY + autoRotRef.current - camera.rotY) * 0.06;
      camera.zoom += (camera.targetZoom - camera.zoom)                      * 0.10;

      tickSimulation(nodes, edges, selectedIdx.current);

      for (const nd of nodes) {
        const p = project(nd.x, nd.y, nd.z, camera, W, H);
        nd.trailX.unshift(nd.sx); nd.trailY.unshift(nd.sy);
        if (nd.trailX.length > 8) { nd.trailX.pop(); nd.trailY.pop(); }
        nd.sx = p.sx; nd.sy = p.sy; nd.projScale = p.scale; nd.projDepth = p.depth;
        const targetScale = nd.hovered ? 1.55 : nd.selected ? 1.38 : 1.0;
        nd.hoverScale += (targetScale - nd.hoverScale) * 0.13;
      }

      ctx.clearRect(0, 0, W, H);

      // ── Nebula atmosphere ─────────────────────────────────────────────────
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

      // ── Background particles ───────────────────────────────────────────────
      for (const p of bgParticles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = 1; if (p.x > 1) p.x = 0;
        if (p.y < 0) p.y = 1; if (p.y > 1) p.y = 0;
      }
      ctx.save();
      for (let i = 0; i < bgParticles.length; i++) {
        const pi = bgParticles[i];
        for (let j = i + 1; j < bgParticles.length; j++) {
          const pj = bgParticles[j];
          const dx = (pi.x - pj.x) * W, dy = (pi.y - pj.y) * H;
          const d  = Math.sqrt(dx*dx + dy*dy);
          if (d < 90) {
            ctx.globalAlpha = (1 - d/90) * 0.07;
            ctx.strokeStyle = "#a78bfa";
            ctx.lineWidth   = 0.4;
            ctx.beginPath();
            ctx.moveTo(pi.x*W, pi.y*H);
            ctx.lineTo(pj.x*W, pj.y*H);
            ctx.stroke();
          }
        }
      }
      for (const p of bgParticles) {
        ctx.globalAlpha = p.opacity * 0.5;
        ctx.fillStyle   = p.hue;
        ctx.beginPath();
        ctx.arc(p.x*W, p.y*H, p.size, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.restore();

      // ── Edges ─────────────────────────────────────────────────────────────
      const visNodes = nodes.filter(n => n.filtered);
      const visSet   = new Set(visNodes.map(n => n.index ?? 0));
      const visEdges = edges.filter(e => visSet.has(e.a) && visSet.has(e.b));
      const sortedEdges = [...visEdges].sort((e1, e2) =>
          (nodes[e1.a].projScale + nodes[e1.b].projScale) -
          (nodes[e2.a].projScale + nodes[e2.b].projScale)
      );

      ctx.save();
      for (const e of sortedEdges) {
        const na = nodes[e.a], nb = nodes[e.b];
        const avg  = (na.projScale + nb.projScale) / 2;
        const isHl = na.hovered || nb.hovered || na.selected || nb.selected;
        const isSel = (na.selected || nb.selected);
        const dx = na.sx - nb.sx, dy = na.sy - nb.sy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = window.innerWidth * 0.4;
        const minDist = window.innerWidth * 0.1;
        let edgeOpacity = 1 - (dist - minDist) / (maxDist - minDist);
        edgeOpacity = Math.max(0, Math.min(1, edgeOpacity));

        if (isSel) {
          const selNd = na.selected ? na : nb;
          const cfg   = getCat(selNd.category);
          const grad  = ctx.createLinearGradient(na.sx, na.sy, nb.sx, nb.sy);
          grad.addColorStop(0, cfg.glow + "0.6)");
          grad.addColorStop(1, cfg.glow + "0.06)");
          ctx.globalAlpha = 0.55 * edgeOpacity;
          ctx.strokeStyle = grad;
          ctx.lineWidth   = 1.4;
        } else {
          const baseOpacity = Math.min(0.15, avg * 0.18) * (isHl ? 4 : 1);
          ctx.globalAlpha = baseOpacity * edgeOpacity;
          ctx.strokeStyle = isHl ? getCat(na.hovered ? na.category : nb.category).color : "#00f5c4";
          ctx.lineWidth   = isHl ? 1.1 : 0.8;
        }
        ctx.beginPath();
        ctx.moveTo(na.sx, na.sy);
        ctx.lineTo(nb.sx, nb.sy);
        ctx.stroke();
      }
      ctx.restore();

      // ── Node trails ───────────────────────────────────────────────────────
      ctx.save();
      for (const nd of visNodes) {
        if (!nd.hovered && !nd.selected) continue;
        const cfg = getCat(nd.category);
        for (let t = 0; t < nd.trailX.length; t++) {
          const a = (1 - t / nd.trailX.length) * 0.18;
          ctx.globalAlpha = a;
          ctx.fillStyle   = cfg.color;
          ctx.beginPath();
          const tr = nd.radius * nd.projScale * NODE_SCALE * (1 - t * 0.1);
          ctx.arc(nd.trailX[t], nd.trailY[t], Math.max(1, tr), 0, Math.PI*2);
          ctx.fill();
        }
      }
      ctx.restore();

      // ── Nodes (back to front) ─────────────────────────────────────────────
      const sortedNodes = [...visNodes].sort((a, b) => a.projScale - b.projScale);

      for (const nd of sortedNodes) {
        const cfg  = getCat(nd.category);
        // Core render radius — NODE_SCALE is the global tuning knob
        const r    = nd.radius * nd.projScale * NODE_SCALE * nd.hoverScale;
        const { sx, sy } = nd;
        if (sx < -r*5 || sx > W+r*5 || sy < -r*5 || sy > H+r*5) continue;

        const alpha    = Math.min(1, nd.projScale * 1.5);
        const dimAlpha = nd.filtered ? alpha : alpha * 0.12;

        ctx.save();
        ctx.globalAlpha = dimAlpha;

        // ── Selection dashed ring ──────────────────────────────────────────
        if (nd.selected) {
          const t = now * 0.001;
          const pulseR = r * (2.6 + Math.sin(t * 2.5) * 0.35);
          ctx.globalAlpha = dimAlpha * (0.45 + Math.sin(t * 2.5) * 0.2);
          ctx.strokeStyle = cfg.color;
          ctx.lineWidth   = 1.2;
          ctx.setLineDash([5, 4]);
          ctx.lineDashOffset = -t * 12;
          ctx.beginPath();
          ctx.arc(sx, sy, pulseR, 0, Math.PI*2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.globalAlpha = dimAlpha;

        // ── Outer glow ────────────────────────────────────────────────────
        const glowR = r * 3.8;
        const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
        grd.addColorStop(0,   cfg.glow + "0.18)");
        grd.addColorStop(0.45, cfg.glow + "0.06)");
        grd.addColorStop(1,   cfg.glow + "0)");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(sx, sy, glowR, 0, Math.PI*2);
        ctx.fill();

        // ── LIVE orbit ring ───────────────────────────────────────────────
        if (nd.demoUrl) {
          const orbitAngle = (now * 0.0012 + nd.pulsePhase) % (Math.PI * 2);
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(orbitAngle);
          ctx.globalAlpha = dimAlpha * 0.55;
          ctx.strokeStyle = "#00f5c4";
          ctx.lineWidth   = 0.9;
          ctx.setLineDash([6, 5, 2, 5]);
          ctx.beginPath();
          ctx.arc(0, 0, r * 2.1, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }

        // ── Pulse ring ────────────────────────────────────────────────────
        const pulse  = (now * 0.001 + nd.pulsePhase) % (Math.PI * 2);
        const ringR  = r * (1.9 + Math.sin(pulse * 0.9) * 0.22);
        const ringA  = dimAlpha * (0.14 + Math.sin(pulse * 0.9) * 0.07) *
          (nd.hovered ? 2.0 : nd.selected ? 2.6 : 1);
        ctx.globalAlpha = ringA;
        ctx.strokeStyle = cfg.color;
        ctx.lineWidth   = 0.6;
        ctx.beginPath();
        ctx.arc(sx, sy, ringR, 0, Math.PI*2);
        ctx.stroke();

        // Inner ring
        ctx.globalAlpha = dimAlpha * (0.09 + Math.sin(pulse * 1.3 + 1) * 0.04);
        ctx.beginPath();
        ctx.arc(sx, sy, r * 1.4 + Math.sin(pulse * 1.5) * 1.5, 0, Math.PI*2);
        ctx.stroke();

        // ── Core sphere ───────────────────────────────────────────────────
        ctx.globalAlpha = dimAlpha;
        const coreGrd = ctx.createRadialGradient(sx - r*0.35, sy - r*0.35, 0, sx, sy, r);
        coreGrd.addColorStop(0,    "#ffffff");
        coreGrd.addColorStop(0.25, cfg.color + "ee");
        coreGrd.addColorStop(0.7,  cfg.color + "88");
        coreGrd.addColorStop(1,    cfg.glow + "0.15)");
        ctx.fillStyle   = coreGrd;
        ctx.shadowColor = cfg.color;
        ctx.shadowBlur  = r * 3.0;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // ── Specular highlight ────────────────────────────────────────────
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

        // ── Label ─────────────────────────────────────────────────────────
        drawLabel(ctx, nd, now, dimAlpha);
      }

      // ── Hover hit-test ─────────────────────────────────────────────────────
      const mx = mousePos.current.x, my = mousePos.current.y;
      let hit: SimNode | null = null, hitDist = Infinity;
      for (const nd of visNodes) {
        const r  = nd.radius * nd.projScale * NODE_SCALE * nd.hoverScale * 1.5;
        const dx = nd.sx - mx, dy = nd.sy - my;
        const d  = Math.sqrt(dx*dx + dy*dy);
        if (d < r && d < hitDist) { hitDist = d; hit = nd; }
      }
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