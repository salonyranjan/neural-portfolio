"use client";

import {
  useRef, useState, useEffect, useCallback,
} from "react";
import Graph, { GraphHandle, SimNode, CATEGORIES, getCat } from "./Graph";

// ─── Types ────────────────────────────────────────────────────────────────────
export type NodeData = {
  name: string;
  url: string;
  category: string;
  description?: string;
  tags?: string[];
  index?: number;
  complexity?: number;
  demoUrl?: string;  // Explicitly allowing the new property
  demo_url?: string;
};
export type HoveredNode = NodeData & { screenX: number; screenY: number };

const CAT_KEYS = Object.keys(CATEGORIES).filter(k => k !== "default");

// ─── Tooltip ──────────────────────────────────────────────────────────────────
function NodeTooltip({
  node, x, y,
}: { node: HoveredNode; x: number; y: number }) {
  const color = getCat(node.category).color;
  const ref   = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);

  useEffect(() => {
    if (ref.current) setW(ref.current.offsetWidth);
  }, [node.name]);

  const left = x + 20 + w > window.innerWidth - 16 ? x - w - 20 : x + 20;
  const top  = Math.max(10, Math.min(y - 70, window.innerHeight - 180));

  return (
    <div
      ref={ref}
      style={{
        position: "fixed", left, top,
        pointerEvents: "none", zIndex: 60,
        animation: "ttIn 0.14s cubic-bezier(.16,1,.3,1) forwards",
        fontFamily: "'JetBrains Mono','Fira Code',monospace",
      }}
    >
      <div style={{
        background:     "rgba(6,5,26,0.97)",
        border:         `1px solid ${color}22`,
        borderLeft:     `3px solid ${color}`,
        borderRadius:   10,
        padding:        "14px 18px",
        minWidth:       230,
        maxWidth:       290,
        backdropFilter: "blur(32px)",
        boxShadow:      `0 0 48px ${color}1a, 0 12px 48px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)`,
      }}>
        {/* Category badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontSize: 9, color: color, letterSpacing: "0.36em",
          textTransform: "uppercase", marginBottom: 8,
          padding: "3px 8px", borderRadius: 3,
          background: color + "12",
          border: `1px solid ${color}25`,
        }}>
          <div style={{ width: 4, height: 4, borderRadius: "50%", background: color }} />
          {node.category}
        </div>

        {/* Name */}
        <div style={{
          fontSize: 14, color: "#f5f5ff", fontWeight: 600,
          marginBottom: 6, lineHeight: 1.3, letterSpacing: "-0.01em",
        }}>
          {node.name}
        </div>

        {/* Description */}
        {node.description && (
          <div style={{
            fontSize: 10, color: "rgba(255,255,255,0.38)",
            lineHeight: 1.65, marginBottom: 9,
          }}>
            {node.description}
          </div>
        )}

        {/* Tags */}
        {node.tags?.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 9 }}>
            {node.tags.slice(0, 4).map((t) => (
              <span key={t} style={{
                fontSize: 9, color: color + "70",
                border: `1px solid ${color}20`,
                padding: "2px 7px", borderRadius: 3,
                letterSpacing: "0.08em",
              }}>{t}</span>
            ))}
          </div>
        ) : null}

        {/* Smart Click Indicator */}
        <div style={{
          fontSize: 9, 
          color: node.demoUrl ? "#00ffcc" : "rgba(255,255,255,0.3)",
          letterSpacing: "0.1em",
          fontWeight: node.demoUrl ? 600 : 400
        }}>
          {node.demoUrl ? "↗ LIVE DEMO AVAILABLE" : "↗ CLICK FOR DETAILS"}
        </div>
      </div>
      <style>{`
        @keyframes ttIn {
          from { opacity:0; transform:translateY(6px) scale(0.97); }
          to   { opacity:1; transform:translateY(0)  scale(1); }
        }
      `}</style>
    </div>
  );
}

// ─── Node Detail Sidebar ──────────────────────────────────────────────────────
function NodeDetail({
  node, onClose,
}: { node: SimNode; onClose: () => void }) {
  const color = getCat(node.category).color;
  const pct   = Math.min(100, ((node.complexity ?? 0) / 400000) * 100);

  return (
    <div style={{
      position: "fixed", right: 0, top: 0, bottom: 0,
      width: 320, zIndex: 40,
      background:     "rgba(4,4,20,0.97)",
      borderLeft:     `1px solid ${color}28`,
      backdropFilter: "blur(40px)",
      fontFamily:     "'JetBrains Mono','Fira Code',monospace",
      display:        "flex", flexDirection: "column",
      animation:      "sideIn 0.28s cubic-bezier(.16,1,.3,1) forwards",
    }}>
      {/* Header */}
      <div style={{
        padding: "28px 24px 20px",
        borderBottom: `1px solid ${color}18`,
        position: "relative",
      }}>
        {/* Category tag */}
        <div style={{
          fontSize: 8, color: color, letterSpacing: "0.42em",
          textTransform: "uppercase", marginBottom: 12,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}` }} />
          {node.category}
        </div>

        <div style={{
          fontSize: 19, fontWeight: 700, color: "#f5f5ff",
          lineHeight: 1.25, letterSpacing: "-0.02em", marginBottom: 8,
          fontFamily: "'Space Grotesk','DM Sans',sans-serif",
        }}>
          {node.name}
        </div>

        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", lineHeight: 1.6 }}>
          {node.description}
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 22, right: 20,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "50%", width: 30, height: 30,
            color: "rgba(255,255,255,0.5)", cursor: "pointer",
            fontSize: 14, display: "flex", alignItems: "center",
            justifyContent: "center", transition: "all 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
        >×</button>
      </div>

      {/* Stats */}
      <div style={{ padding: "20px 24px", borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", letterSpacing: "0.32em", textTransform: "uppercase", marginBottom: 14 }}>
          Complexity Score
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, color: color, fontFamily: "'Space Grotesk',sans-serif", letterSpacing: "-0.02em", marginBottom: 12 }}>
          {(node.complexity ?? 0).toLocaleString()}
        </div>
        {/* Bar */}
        <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}44, ${color})`,
            borderRadius: 2,
            transition: "width 0.8s cubic-bezier(.16,1,.3,1)",
          }} />
        </div>
      </div>

      {/* Tags */}
      {node.tags?.length ? (
        <div style={{ padding: "20px 24px", borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", letterSpacing: "0.32em", textTransform: "uppercase", marginBottom: 12 }}>
            Tags
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {node.tags.map(t => (
              <span key={t} style={{
                fontSize: 10, color: color + "80",
                background: color + "0d",
                border: `1px solid ${color}20`,
                padding: "4px 10px", borderRadius: 4,
                letterSpacing: "0.06em",
              }}>{t}</span>
            ))}
          </div>
        </div>
      ) : null}

      {/* ─── Dual CTA Buttons ─── */}
      <div style={{ padding: "20px 24px", marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
        
        {/* Primary Button: Live Demo */}
        {node.demoUrl && (
          <a
            href={node.demoUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              width: "100%", padding: "12px 0",
              background: `linear-gradient(135deg, ${color}22, ${color}0a)`,
              border: `1px solid ${color}40`,
              borderRadius: 8, color: color,
              textDecoration: "none", fontSize: 11,
              fontFamily: "'JetBrains Mono',monospace",
              letterSpacing: "0.18em", textTransform: "uppercase",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = `linear-gradient(135deg, ${color}35, ${color}18)`)}
            onMouseLeave={e => (e.currentTarget.style.background = `linear-gradient(135deg, ${color}22, ${color}0a)`)}
          >
            Launch Live Demo ↗
          </a>
        )}

        {/* Secondary Button: GitHub Repo */}
        {node.url && node.url !== "#" && (
          <a
            href={node.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              width: "100%", padding: "12px 0",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, color: "rgba(255,255,255,0.7)",
              textDecoration: "none", fontSize: 11,
              fontFamily: "'JetBrains Mono',monospace",
              letterSpacing: "0.18em", textTransform: "uppercase",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "rgba(255,255,255,0.08)";
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "rgba(255,255,255,0.03)";
              e.currentTarget.style.color = "rgba(255,255,255,0.7)";
            }}
          >
            GitHub Repository ↗
          </a>
        )}
      </div>

      <style>{`
        @keyframes sideIn {
          from { transform: translateX(100%); opacity:0; }
          to   { transform: translateX(0);   opacity:1; }
        }
      `}</style>
    </div>
  );
}

// ─── Search Panel ──────────────────────────────────────────────────────────────
function SearchPanel({
  nodes, onSelect, onClose,
}: {
  nodes: SimNode[];
  onSelect: (idx: number) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = q.trim().length > 0
    ? nodes.filter(n =>
        n.name.toLowerCase().includes(q.toLowerCase()) ||
        n.category.toLowerCase().includes(q.toLowerCase())
      ).slice(0, 8)
    : nodes.slice(0, 8);

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(2,2,12,0.88)",
      backdropFilter: "blur(20px)",
      zIndex: 80, display: "flex", alignItems: "flex-start",
      justifyContent: "center", paddingTop: "12vh",
      animation: "fadeIn 0.15s ease forwards",
      fontFamily: "'JetBrains Mono','Fira Code',monospace",
    }} onClick={onClose}>
      <div
        style={{ width: 520, maxWidth: "90vw" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          background: "rgba(8,8,32,0.98)",
          border: "1px solid rgba(0,245,196,0.3)",
          borderRadius: 12, padding: "14px 18px",
          boxShadow: "0 0 48px rgba(0,245,196,0.08), 0 24px 64px rgba(0,0,0,0.7)",
          marginBottom: 8,
        }}>
          <span style={{ color: "rgba(0,245,196,0.6)", fontSize: 16 }}>⌕</span>
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search nodes..."
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              color: "#f5f5ff", fontSize: 15, fontFamily: "'JetBrains Mono',monospace",
              caretColor: "#00f5c4",
            }}
          />
          <kbd style={{
            fontSize: 10, color: "rgba(255,255,255,0.22)",
            border: "1px solid rgba(255,255,255,0.1)",
            padding: "3px 8px", borderRadius: 4,
          }}>ESC</kbd>
        </div>

        {/* Results */}
        <div style={{
          background: "rgba(8,8,32,0.98)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        }}>
          {results.length === 0 ? (
            <div style={{ padding: "20px 18px", color: "rgba(255,255,255,0.28)", fontSize: 12 }}>
              No results for "{q}"
            </div>
          ) : results.map((nd, i) => {
            const color = getCat(nd.category).color;
            return (
              <div
                key={nd.index ?? i}
                onClick={() => { onSelect(nd.index ?? i); onClose(); }}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 18px",
                  borderBottom: i < results.length - 1
                    ? "1px solid rgba(255,255,255,0.05)" : "none",
                  cursor: "pointer", transition: "background 0.1s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: color, flexShrink: 0,
                  boxShadow: `0 0 8px ${color}88`,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                 <div style={{ 
  fontSize: 13, 
  color: "#f0f0f8", 
  fontWeight: 500, 
  whiteSpace: "nowrap", 
  overflow: "hidden", 
  textOverflow: "ellipsis" 
}}>
  {nd.name}
</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                    {nd.category} · {(nd.complexity ?? 0).toLocaleString()}
                  </div>
                </div>
                <div style={{
                  fontSize: 10, color: color + "60",
                  background: color + "0d",
                  border: `1px solid ${color}20`,
                  padding: "2px 8px", borderRadius: 3,
                  letterSpacing: "0.06em",
                }}>
                  {nd.category}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{
          marginTop: 12, textAlign: "center",
          fontSize: 10, color: "rgba(255,255,255,0.2)",
          letterSpacing: "0.12em",
        }}>
          ↑↓ Navigate · Enter Select · Esc Close
        </div>
      </div>
      <style>{`@keyframes fadeIn { from{opacity:0} to{opacity:1} }`}</style>
    </div>
  );
}

// ─── HUD ──────────────────────────────────────────────────────────────────────
function HUD({
  nodeCount, fps, filterCat, onFilter, onSearch,
}: {
  nodeCount: number;
  fps: number;
  filterCat: string | null;
  onFilter: (cat: string | null) => void;
  onSearch: () => void;
}) {
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-US", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      {/* ── Top-left title ── */}
      <div style={{
        position: "fixed", top: 26, left: 30,
        fontFamily: "'JetBrains Mono','Fira Code',monospace",
        pointerEvents: "none", zIndex: 20,
      }}>
        <div style={{
          fontSize: 8, letterSpacing: "0.44em",
          color: "rgba(0,245,196,0.55)", marginBottom: 5,
          textTransform: "uppercase",
        }}>Neural Portfolio</div>
        <div style={{
          fontSize: 26, fontWeight: 800, color: "#f5f5ff",
          letterSpacing: "-0.025em",
          fontFamily: "'Space Grotesk','DM Sans',sans-serif",
          lineHeight: 1,
        }}>
          Knowledge Graph
        </div>
        <div style={{
          fontSize: 10, color: "rgba(255,255,255,0.22)",
          marginTop: 6, letterSpacing: "0.14em",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#00f5c4", boxShadow: "0 0 6px #00f5c4" }} />
          {nodeCount} nodes · force-directed · 3D
        </div>
      </div>

      {/* ── Top-right controls bar ── */}
      <div style={{
        position: "fixed", top: 22, right: 28,
        fontFamily: "'JetBrains Mono','Fira Code',monospace",
        zIndex: 20, display: "flex", flexDirection: "column",
        alignItems: "flex-end", gap: 10,
      }}>
        {/* Time + FPS */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, pointerEvents: "none" }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", letterSpacing: "0.18em" }}>
            {time}
          </div>
          <div style={{
            fontSize: 9, letterSpacing: "0.22em",
            color: fps > 50 ? "#00f5c488" : fps > 30 ? "#ffd16688" : "#ff6b6b88",
            padding: "2px 8px",
            border: `1px solid ${fps > 50 ? "#00f5c420" : fps > 30 ? "#ffd16620" : "#ff6b6b20"}`,
            borderRadius: 4,
          }}>
            {fps} FPS
          </div>
        </div>

        {/* Search button */}
        <button
          onClick={onSearch}
          style={{
            background:   "rgba(0,245,196,0.07)",
            border:       "1px solid rgba(0,245,196,0.25)",
            borderRadius: 8, padding: "8px 14px",
            color:        "#00f5c4", cursor: "pointer",
            fontSize:     10, letterSpacing: "0.2em",
            fontFamily:   "'JetBrains Mono',monospace",
            textTransform: "uppercase",
            display:      "flex", alignItems: "center", gap: 7,
            transition:   "all 0.18s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,245,196,0.14)")}
          onMouseLeave={e => (e.currentTarget.style.background = "rgba(0,245,196,0.07)")}
        >
          <span style={{ fontSize: 14 }}>⌕</span>
          Search
          <kbd style={{
            fontSize: 9, color: "rgba(0,245,196,0.45)",
            border: "1px solid rgba(0,245,196,0.2)",
            padding: "1px 6px", borderRadius: 3,
          }}>⌘K</kbd>
        </button>
      </div>

      {/* ── Bottom-left: Category filters ── */}
      <div style={{
        position: "fixed", bottom: 30, left: 30,
        fontFamily: "'JetBrains Mono','Fira Code',monospace",
        zIndex: 20,
      }}>
        <div style={{
          fontSize: 8, color: "rgba(255,255,255,0.2)",
          letterSpacing: "0.34em", marginBottom: 14,
          textTransform: "uppercase",
        }}>Categories</div>

        {/* "All" chip */}
        <div
          onClick={() => onFilter(null)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            marginBottom: 8, cursor: "pointer",
            opacity: filterCat === null ? 1 : 0.45,
            transition: "opacity 0.15s",
          }}
        >
          <div style={{
            width: 20, height: 20, borderRadius: 5,
            background: filterCat === null
              ? "rgba(255,255,255,0.12)"
              : "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 9, color: "rgba(255,255,255,0.6)",
            transition: "all 0.15s",
          }}>✦</div>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em" }}>
            All nodes
          </span>
        </div>

        {CAT_KEYS.map((cat) => {
          const cfg     = getCat(cat);
          const active  = filterCat === cat;
          return (
            <div
              key={cat}
              onClick={() => onFilter(active ? null : cat)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                marginBottom: 7, cursor: "pointer",
                opacity: filterCat !== null && !active ? 0.35 : 1,
                transition: "opacity 0.15s",
              }}
            >
              <div style={{
                width: 9, height: 9, borderRadius: "50%",
                background: cfg.color,
                boxShadow: active ? `0 0 10px ${cfg.color}` : `0 0 4px ${cfg.color}44`,
                transition: "box-shadow 0.2s",
              }} />
              <span style={{
                fontSize: 10,
                color: active ? cfg.color : "rgba(255,255,255,0.38)",
                letterSpacing: "0.1em", textTransform: "capitalize",
                transition: "color 0.15s",
                fontWeight: active ? 500 : 400,
              }}>{cat}</span>
              {active && (
                <div style={{
                  fontSize: 8, color: cfg.color + "70",
                  background: cfg.color + "10",
                  border: `1px solid ${cfg.color}25`,
                  padding: "1px 5px", borderRadius: 3,
                }}>active</div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Bottom-right: Controls ── */}
      <div style={{
        position: "fixed", bottom: 30, right: 30,
        fontFamily: "'JetBrains Mono','Fira Code',monospace",
        textAlign: "right", zIndex: 20, pointerEvents: "none",
      }}>
        <div style={{
          fontSize: 8, color: "rgba(255,255,255,0.2)",
          letterSpacing: "0.34em", marginBottom: 14, textTransform: "uppercase",
        }}>Controls</div>
        {[
          ["Drag",     "Rotate"],
          ["Scroll",   "Zoom"],
          ["Click",    "Open node"],
          ["⌘K",       "Search"],
        ].map(([key, action]) => (
          <div key={key} style={{
            display: "flex", alignItems: "center",
            justifyContent: "flex-end", gap: 10, marginBottom: 6,
          }}>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.22)" }}>{action}</span>
            <span style={{
              fontSize: 9, color: "#00f5c466",
              border: "1px solid #00f5c420",
              padding: "2px 8px", borderRadius: 3,
              letterSpacing: "0.08em",
            }}>{key}</span>
          </div>
        ))}
      </div>

      {/* ── Scanlines ── */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 5,
        background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.018) 2px,rgba(0,0,0,0.018) 4px)",
      }} />

      {/* ── Vignette ── */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 4,
        background: "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 50%, rgba(2,2,14,0.55) 100%)",
      }} />

      {/* ── Centre radial glow ── */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1,
        background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(0,245,196,0.03) 0%, transparent 68%)",
      }} />

      {/* ── Corner brackets ── */}
      {[
        { top: 0, left:  0, borderTop:    "1px solid #00f5c428", borderLeft:   "1px solid #00f5c428" },
        { top: 0, right: 0, borderTop:    "1px solid #00f5c428", borderRight:  "1px solid #00f5c428" },
        { bottom:0, left:  0, borderBottom:"1px solid #00f5c428", borderLeft:   "1px solid #00f5c428" },
        { bottom:0, right: 0, borderBottom:"1px solid #00f5c428", borderRight:  "1px solid #00f5c428" },
      ].map((s, i) => (
        <div key={i} style={{ position:"fixed", width:36, height:36, pointerEvents:"none", zIndex:20, ...s as any }} />
      ))}
    </>
  );
}

// ─── Mini stats strip ─────────────────────────────────────────────────────────
function StatsStrip({ nodes }: { nodes: SimNode[] }) {
  if (!nodes.length) return null;
  const byCat = CAT_KEYS.map(cat => ({
    cat, count: nodes.filter(n => n.category === cat).length,
    color: getCat(cat).color,
  })).filter(x => x.count > 0);

  return (
    <div style={{
      position: "fixed", bottom: 30, left: "50%", transform: "translateX(-50%)",
      fontFamily: "'JetBrains Mono',monospace",
      display: "flex", gap: 1, zIndex: 20, pointerEvents: "none",
      background: "rgba(4,4,22,0.7)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 8, overflow: "hidden",
      backdropFilter: "blur(20px)",
    }}>
      {byCat.map(({ cat, count, color }) => (
        <div key={cat} style={{ padding: "8px 14px", textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color, letterSpacing: "-0.01em" }}>
            {count}
          </div>
          <div style={{ fontSize: 8, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.2em", marginTop: 2 }}>
            {cat}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Scene ────────────────────────────────────────────────────────────────────
export default function Scene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
  const graphRef  = useRef<GraphHandle>(null);

  const mousePos  = useRef({ x: -9999, y: -9999 });
  const dragState = useRef({ active: false, moved: false });
  const camera    = useRef({
    rotX: 0.28, rotY: 0, zoom: 1.0,
    targetRotX: 0.28, targetRotY: 0, targetZoom: 1.0,
  }).current;

  const [hovered,    setHovered]    = useState<HoveredNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [selected,   setSelected]   = useState<SimNode | null>(null);
  const [fps,        setFps]        = useState(60);
  const [nodeCount,  setNodeCount]  = useState(0);
  const [filterCat,  setFilterCat]  = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchIdx,  setSearchIdx]  = useState<number | null>(null);
  const [allNodes,   setAllNodes]   = useState<SimNode[]>([]);

  useEffect(() => {
    if (canvasRef.current) setCanvasEl(canvasRef.current);
  }, []);

  // Canvas resize + DPR
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = window.innerWidth  * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width  = window.innerWidth  + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setSelected(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Input handlers ──────────────────────────────────────────────────────────
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    mousePos.current = { x: e.clientX, y: e.clientY };
    setTooltipPos({ x: e.clientX, y: e.clientY });
    if (dragState.current.active) {
      const dx = e.clientX - (dragState.current as any).lastX;
      const dy = e.clientY - (dragState.current as any).lastY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragState.current.moved = true;
      camera.targetRotY += dx * 0.006;
      camera.targetRotX  = Math.max(-1.2, Math.min(1.2, camera.targetRotX + dy * 0.006));
      (dragState.current as any).lastX = e.clientX;
      (dragState.current as any).lastY = e.clientY;
    }
  }, [camera]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    (dragState.current as any).lastX = e.clientX;
    (dragState.current as any).lastY = e.clientY;
    dragState.current.active = true;
    dragState.current.moved  = false;
  }, []);

  const onMouseUp = useCallback(() => {
    const wasDrag = dragState.current.moved;
    dragState.current.active = false;
    dragState.current.moved  = false;
    if (!wasDrag) {
      const nd = graphRef.current?.getHovered();
      if (nd) {
        // Select node → open sidebar
        setSelected(nd as SimNode);
        graphRef.current?.focusNode(nd.index ?? 0);
      }
    }
  }, []);

  const onMouseLeave = useCallback(() => {
    mousePos.current = { x: -9999, y: -9999 };
    dragState.current.active = false;
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    camera.targetZoom = Math.max(0.28, Math.min(3.8, camera.targetZoom - e.deltaY * 0.001));
  }, [camera]);

  const touchRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY, moved: false };
    mousePos.current = { x: t.clientX, y: t.clientY };
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    mousePos.current = { x: t.clientX, y: t.clientY };
    if (touchRef.current) {
      const dx = t.clientX - touchRef.current.x;
      const dy = t.clientY - touchRef.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) touchRef.current.moved = true;
      camera.targetRotY += dx * 0.007;
      camera.targetRotX  = Math.max(-1.2, Math.min(1.2, camera.targetRotX + dy * 0.007));
      touchRef.current.x = t.clientX;
      touchRef.current.y = t.clientY;
    }
  }, [camera]);

  const onTouchEnd = useCallback(() => {
    if (touchRef.current && !touchRef.current.moved) {
      const nd = graphRef.current?.getHovered();
      if (nd) setSelected(nd as SimNode);
    }
    touchRef.current    = null;
    mousePos.current    = { x: -9999, y: -9999 };
  }, []);

  const onHover = useCallback((node: HoveredNode | null) => {
    setHovered(node);
  }, []);

  const onSelect = useCallback((node: SimNode | null) => {
    setSelected(node);
    if (node) setAllNodes(graphRef.current?.getNodes() ?? []);
  }, []);

  const handleNodeCountChange = useCallback((n: number) => {
    setNodeCount(n);
    // Grab refs after first build
    setTimeout(() => setAllNodes(graphRef.current?.getNodes() ?? []), 200);
  }, []);

  const handleSearch = useCallback((idx: number) => {
    setSearchIdx(idx);
    setAllNodes(graphRef.current?.getNodes() ?? []);
  }, []);

  return (
    <div style={{
      width: "100vw", height: "100vh",
      position: "fixed", inset: 0,
      background: "#030310",
      overflow: "hidden",
    }}>
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, display: "block" }}
        onMouseMove={onMouseMove}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      />

      <Graph
        ref={graphRef}
        canvas={canvasEl}
        onHover={onHover}
        onSelect={onSelect}
        onNodeCount={handleNodeCountChange}
        camera={camera}
        dragState={dragState}
        mousePos={mousePos}
        onFps={setFps}
        filterCat={filterCat}
        searchIdx={searchIdx}
      />

      <HUD
        nodeCount={nodeCount}
        fps={fps}
        filterCat={filterCat}
        onFilter={setFilterCat}
        onSearch={() => setSearchOpen(true)}
      />

      <StatsStrip nodes={allNodes} />

      {hovered && !selected && (
        <NodeTooltip node={hovered} x={tooltipPos.x} y={tooltipPos.y} />
      )}

      {selected && (
        <NodeDetail
          node={selected}
          onClose={() => {
            setSelected(null);
            // Deselect in simulation
            if (graphRef.current) {
              const ns = graphRef.current.getNodes();
              ns.forEach(n => { (n as SimNode).selected = false; });
            }
          }}
        />
      )}

      {searchOpen && (
        <SearchPanel
          nodes={allNodes}
          onSelect={handleSearch}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </div>
  );
}