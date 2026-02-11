"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import * as d3 from "d3-geo";
import { Province, Player, MapTheme, DiplomaticRelation } from "@/lib/types";
import Tooltip from "./Tooltip";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FlatMapProps {
  provinces: Province[];
  players: Record<string, Player>;
  onSelectProvince: (provinceId: string | number | null) => void;
  selectedProvinceId: string | number | null;
  theme?: MapTheme;
  relations?: DiplomaticRelation[];
}

// ---------------------------------------------------------------------------
// Theme Styles
// ---------------------------------------------------------------------------

const THEMES: Record<MapTheme, { sea: string; land: string; border: string; selected: string; hover: string; text: string; grid: string }> = {
  classic:   { sea: "#0f172a", land: "#1e293b", border: "#334155", selected: "#f59e0b", hover: "#475569", text: "#e2e8f0", grid: "#1e293b" },
  cyberpunk: { sea: "#030712", land: "#111827", border: "#06b6d4", selected: "#e879f9", hover: "#164e63", text: "#22d3ee", grid: "#0e2433" },
  parchment: { sea: "#a8956e", land: "#c4aa78", border: "#5c4033", selected: "#b45309", hover: "#a0865a", text: "#3f2305", grid: "#b8a07a" },
  blueprint: { sea: "#0c1f3d", land: "#152a4a", border: "#3b82f6", selected: "#facc15", hover: "#1e3a5f", text: "#93c5fd", grid: "#1a3050" },
};

// ---------------------------------------------------------------------------
// Color Utilities
// ---------------------------------------------------------------------------

function hslToRgbValues(h: number, s: number, l: number): [number, number, number] {
  h = h / 360;
  s = s / 100;
  l = l / 100;
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function parseColor(color: string): [number, number, number] {
  if (!color) return [100, 100, 100];

  // HSL format: hsl(200, 60%, 50%) or hsl(200,60%,50%)
  const hslMatch = color.match(/hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*\)/i);
  if (hslMatch) {
    return hslToRgbValues(parseFloat(hslMatch[1]), parseFloat(hslMatch[2]), parseFloat(hslMatch[3]));
  }

  // Hex format
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      return [
        parseInt(hex[0] + hex[0], 16),
        parseInt(hex[1] + hex[1], 16),
        parseInt(hex[2] + hex[2], 16),
      ];
    }
    if (hex.length >= 6) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
      ];
    }
  }

  // rgb() format
  const rgbMatch = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (rgbMatch) {
    return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])];
  }

  return [100, 100, 100];
}

function lerpRGB(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  const ct = Math.max(0, Math.min(1, t));
  return [
    Math.round(a[0] + (b[0] - a[0]) * ct),
    Math.round(a[1] + (b[1] - a[1]) * ct),
    Math.round(a[2] + (b[2] - a[2]) * ct),
  ];
}

function rgbToCSS(r: number, g: number, b: number, a?: number): string {
  if (a !== undefined && a < 1) {
    return `rgba(${r},${g},${b},${a.toFixed(3)})`;
  }
  return `rgb(${r},${g},${b})`;
}

function brighten(color: string, amount: number): string {
  const [r, g, b] = parseColor(color);
  const factor = 1 + amount;
  return rgbToCSS(
    Math.min(255, Math.round(r * factor)),
    Math.min(255, Math.round(g * factor)),
    Math.min(255, Math.round(b * factor)),
  );
}

function mute(color: string, amount: number): string {
  const [r, g, b] = parseColor(color);
  const gray = (r + g + b) / 3;
  const t = amount;
  return rgbToCSS(
    Math.round(r + (gray - r) * t),
    Math.round(g + (gray - g) * t),
    Math.round(b + (gray - b) * t),
  );
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ---------------------------------------------------------------------------
// Acquisition Animation State
// ---------------------------------------------------------------------------

interface AcquisitionAnim {
  provinceId: string | number;
  startTime: number;
  oldColor: [number, number, number];
  newColor: [number, number, number];
  centerX: number;
  centerY: number;
}

// ---------------------------------------------------------------------------
// Camera State
// ---------------------------------------------------------------------------

interface CameraState {
  x: number;
  y: number;
  zoom: number;
  targetX: number;
  targetY: number;
  targetZoom: number;
}

// ---------------------------------------------------------------------------
// Hover State
// ---------------------------------------------------------------------------

interface HoverState {
  provinceId: string | number | null;
  brightness: number; // 0 to 1, lerps smoothly
  targetBrightness: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FlatMap({
  provinces,
  players,
  onSelectProvince,
  selectedProvinceId,
  theme = "classic",
  relations = [],
}: FlatMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // React state only for tooltip (needs DOM re-render)
  const [tooltipData, setTooltipData] = useState<{
    province: Province | null;
    owner?: Player;
    position: { x: number; y: number };
  } | null>(null);

  // ---- All mutable render state in refs ----
  const projectionRef = useRef<d3.GeoProjection | null>(null);
  const pathGeneratorRef = useRef<d3.GeoPath | null>(null);
  const pathCacheRef = useRef<Map<string | number, Path2D>>(new Map());

  const cameraRef = useRef<CameraState>({ x: 0, y: 0, zoom: 1, targetX: 0, targetY: 0, targetZoom: 1 });
  const hoverRef = useRef<HoverState>({ provinceId: null, brightness: 0, targetBrightness: 0 });
  const acquisitionsRef = useRef<AcquisitionAnim[]>([]);
  const prevOwnersRef = useRef<Map<string | number, string | null>>(new Map());
  const rafIdRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Interaction refs
  const isPointerDownRef = useRef(false);
  const isDraggingRef = useRef(false);
  const mouseDownPosRef = useRef({ x: 0, y: 0 });
  const mousePosRef = useRef({ x: 0, y: 0 });
  const lastHoverCheckRef = useRef(0);

  // Canvas size ref
  const sizeRef = useRef({ width: 960, height: 600 });
  const dprRef = useRef(1);

  // Store latest props in refs so render loop reads them without re-render
  const provincesRef = useRef(provinces);
  const playersRef = useRef(players);
  const selectedIdRef = useRef(selectedProvinceId);
  const themeRef = useRef(theme);
  const relationsRef = useRef(relations);
  const onSelectRef = useRef(onSelectProvince);

  provincesRef.current = provinces;
  playersRef.current = players;
  selectedIdRef.current = selectedProvinceId;
  themeRef.current = theme;
  relationsRef.current = relations;
  onSelectRef.current = onSelectProvince;

  // ---------------------------------------------------------------------------
  // Projection Setup & Path2D Cache
  // ---------------------------------------------------------------------------

  const buildProjectionAndCache = useCallback(() => {
    const w = sizeRef.current.width;
    const h = sizeRef.current.height;

    const projection = d3.geoNaturalEarth1()
      .scale(180)
      .translate([w / 2, h / 2]);

    projectionRef.current = projection;

    // We need a non-context path generator for Path2D construction
    const svgPath = d3.geoPath().projection(projection);
    pathGeneratorRef.current = svgPath;

    // Rebuild Path2D cache
    const cache = new Map<string | number, Path2D>();
    const provs = provincesRef.current;
    for (let i = 0; i < provs.length; i++) {
      const p = provs[i];
      if (!p.feature || !p.feature.geometry) continue;
      const pathStr = svgPath(p.feature);
      if (pathStr) {
        cache.set(p.id, new Path2D(pathStr));
      }
    }
    pathCacheRef.current = cache;
  }, []);

  // Rebuild cache when provinces change
  useEffect(() => {
    buildProjectionAndCache();
  }, [provinces, buildProjectionAndCache]);

  // ---------------------------------------------------------------------------
  // Track Previous Owners & Detect Acquisitions
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const prevOwners = prevOwnersRef.current;
    const projection = projectionRef.current;

    for (const p of provinces) {
      const prevOwner = prevOwners.get(p.id);
      if (prevOwner !== undefined && prevOwner !== p.ownerId) {
        // Ownership changed! Start acquisition animation
        const oldColor = prevOwner && players[prevOwner]
          ? parseColor(players[prevOwner].color)
          : parseColor(mute(p.color, 0.5));
        const newColor = p.ownerId && players[p.ownerId]
          ? parseColor(players[p.ownerId].color)
          : parseColor(mute(p.color, 0.5));

        let centerX = sizeRef.current.width / 2;
        let centerY = sizeRef.current.height / 2;
        if (projection && p.center) {
          const projected = projection(p.center);
          if (projected) {
            centerX = projected[0];
            centerY = projected[1];
          }
        }

        acquisitionsRef.current.push({
          provinceId: p.id,
          startTime: performance.now(),
          oldColor,
          newColor,
          centerX,
          centerY,
        });
      }
      prevOwners.set(p.id, p.ownerId);
    }
  }, [provinces, players]);

  // ---------------------------------------------------------------------------
  // Smooth Pan to Selected Province
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (selectedProvinceId === null) return;
    const province = provinces.find((p) => p.id === selectedProvinceId);
    if (!province || !projectionRef.current) return;

    const projected = projectionRef.current(province.center);
    if (!projected) return;

    const cam = cameraRef.current;
    const w = sizeRef.current.width;
    const h = sizeRef.current.height;

    // If zoomed out too far, zoom in first so position calc uses final zoom
    if (cam.targetZoom < 2.5) {
      cam.targetZoom = 2.5;
    }

    // Target: center the province on screen (using the target zoom)
    cam.targetX = w / 2 - projected[0] * cam.targetZoom;
    cam.targetY = h / 2 - projected[1] * cam.targetZoom;
  }, [selectedProvinceId, provinces]);

  // ---------------------------------------------------------------------------
  // Province hit-testing
  // ---------------------------------------------------------------------------

  const findProvinceAtScreen = useCallback((screenX: number, screenY: number): Province | null => {
    const projection = projectionRef.current;
    if (!projection) return null;

    const cam = cameraRef.current;

    // Convert screen coords to map coords (undo camera transform)
    const mapX = (screenX - cam.x) / cam.zoom;
    const mapY = (screenY - cam.y) / cam.zoom;

    // Invert projection to get [lon, lat]
    const lonLat = projection.invert?.([mapX, mapY]);
    if (!lonLat) return null;

    const provs = provincesRef.current;
    for (let i = 0; i < provs.length; i++) {
      if (provs[i].feature && d3.geoContains(provs[i].feature, lonLat)) {
        return provs[i];
      }
    }
    return null;
  }, []);

  // ---------------------------------------------------------------------------
  // Build war/allied border lookup
  // ---------------------------------------------------------------------------

  const getWarPairs = useCallback((): Set<string> => {
    const pairs = new Set<string>();
    const rels = relationsRef.current;
    for (const rel of rels) {
      if (rel.type === "war") {
        pairs.add(`${rel.nationA}|${rel.nationB}`);
        pairs.add(`${rel.nationB}|${rel.nationA}`);
      }
    }
    return pairs;
  }, []);

  const getAlliedPairs = useCallback((): Set<string> => {
    const pairs = new Set<string>();
    const rels = relationsRef.current;
    for (const rel of rels) {
      if (rel.type === "allied") {
        pairs.add(`${rel.nationA}|${rel.nationB}`);
        pairs.add(`${rel.nationB}|${rel.nationA}`);
      }
    }
    return pairs;
  }, []);

  // ---------------------------------------------------------------------------
  // Main Render Loop (requestAnimationFrame)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    // Initial size setup
    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      dprRef.current = dpr;
      sizeRef.current = { width: w, height: h };

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      // Recompute min zoom to fill viewport
      const minZoom = Math.max(w / 960, h / 600, 1);
      const cam = cameraRef.current;
      if (cam.zoom < minZoom) {
        cam.zoom = minZoom;
        cam.targetZoom = minZoom;
      }

      buildProjectionAndCache();
    };

    updateSize();

    const handleResize = () => {
      updateSize();
    };
    window.addEventListener("resize", handleResize);

    // Graticule (pre-compute once)
    const graticule = d3.geoGraticule10();

    // ---------------------------------------------------------------------------
    // The Render Frame
    // ---------------------------------------------------------------------------

    const render = (timestamp: number) => {
      rafIdRef.current = requestAnimationFrame(render);

      const dt = lastTimeRef.current ? (timestamp - lastTimeRef.current) / 1000 : 0.016;
      lastTimeRef.current = timestamp;

      const w = sizeRef.current.width;
      const h = sizeRef.current.height;
      const dpr = dprRef.current;
      const provs = provincesRef.current;
      const plrs = playersRef.current;
      const selId = selectedIdRef.current;
      const th = THEMES[themeRef.current];
      const cam = cameraRef.current;
      const hover = hoverRef.current;
      const projection = projectionRef.current;
      const pathCache = pathCacheRef.current;

      if (!projection) return;

      // ---- Smooth camera interpolation ----
      const camSpeed = 1 - Math.pow(0.001, dt);
      cam.x = lerp(cam.x, cam.targetX, camSpeed);
      cam.y = lerp(cam.y, cam.targetY, camSpeed);
      cam.zoom = lerp(cam.zoom, cam.targetZoom, camSpeed);

      // ---- Smooth hover brightness ----
      const hoverSpeed = 1 - Math.pow(0.00001, dt); // ~100ms transition
      hover.brightness = lerp(hover.brightness, hover.targetBrightness, hoverSpeed);

      // ---- Prepare context ----
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // ---- 1. Ocean Background with gradient ----
      const seaRgb = parseColor(th.sea);
      ctx.fillStyle = rgbToCSS(seaRgb[0], seaRgb[1], seaRgb[2]);
      ctx.fillRect(0, 0, w, h);

      // ---- Apply camera transform ----
      ctx.save();
      ctx.translate(cam.x, cam.y);
      ctx.scale(cam.zoom, cam.zoom);

      // ---- 2. Graticule (subtle grid lines) ----
      const svgPath = pathGeneratorRef.current;
      if (svgPath) {
        const gratPathStr = svgPath(graticule);
        if (gratPathStr) {
          const gratPath = new Path2D(gratPathStr);
          ctx.strokeStyle = th.grid;
          ctx.lineWidth = 0.3 / cam.zoom;
          ctx.globalAlpha = 0.3;
          ctx.stroke(gratPath);
          ctx.globalAlpha = 1;
        }
      }

      // ---- Build war/allied pairs ----
      const warPairs = getWarPairs();
      const alliedPairs = getAlliedPairs();

      // ---- 3. Province Rendering ----
      const now = performance.now();
      const acquisitions = acquisitionsRef.current;

      // Find acquisition anim for a province
      const getAcquisition = (pid: string | number): AcquisitionAnim | null => {
        for (let i = acquisitions.length - 1; i >= 0; i--) {
          if (acquisitions[i].provinceId === pid) {
            const elapsed = now - acquisitions[i].startTime;
            if (elapsed < 1000) return acquisitions[i];
          }
        }
        return null;
      };

      for (let i = 0; i < provs.length; i++) {
        const p = provs[i];
        const path2d = pathCache.get(p.id);
        if (!path2d) continue;

        const isSelected = p.id === selId;
        const isHovered = p.id === hover.provinceId;

        // Determine base color
        let fillRgb: [number, number, number];
        if (p.ownerId && plrs[p.ownerId]) {
          fillRgb = parseColor(plrs[p.ownerId].color);
        } else {
          // Neutral: muted version of province color
          const raw = parseColor(p.color);
          const gray = Math.round((raw[0] + raw[1] + raw[2]) / 3);
          fillRgb = [
            Math.round(raw[0] * 0.4 + gray * 0.3 + seaRgb[0] * 0.3),
            Math.round(raw[1] * 0.4 + gray * 0.3 + seaRgb[1] * 0.3),
            Math.round(raw[2] * 0.4 + gray * 0.3 + seaRgb[2] * 0.3),
          ];
        }

        // Acquisition animation override
        const acq = getAcquisition(p.id);
        let flashAlpha = 0;
        if (acq) {
          const elapsed = now - acq.startTime;
          // Phase 2 (300-800ms): color lerp from old to new
          if (elapsed < 300) {
            fillRgb = acq.oldColor;
          } else if (elapsed < 800) {
            const t = (elapsed - 300) / 500;
            fillRgb = lerpRGB(acq.oldColor, acq.newColor, t);
          }
          // Phase 1 (0-300ms): white flash overlay
          if (elapsed < 300) {
            const t = elapsed / 300;
            flashAlpha = t < 0.5 ? t * 2 * 0.7 : (1 - t) * 2 * 0.7;
          }
        }

        // Hover brightening (subtle, just enough to notice)
        if (isHovered && !isSelected && hover.brightness > 0.01) {
          const b = hover.brightness * 0.12;
          fillRgb = [
            Math.min(255, Math.round(fillRgb[0] + (255 - fillRgb[0]) * b)),
            Math.min(255, Math.round(fillRgb[1] + (255 - fillRgb[1]) * b)),
            Math.min(255, Math.round(fillRgb[2] + (255 - fillRgb[2]) * b)),
          ];
        }

        // Selected brightening
        if (isSelected) {
          const pulse = Math.sin(now * 0.004) * 0.5 + 0.5;
          const b = 0.15 + pulse * 0.1;
          fillRgb = [
            Math.min(255, Math.round(fillRgb[0] + (255 - fillRgb[0]) * b)),
            Math.min(255, Math.round(fillRgb[1] + (255 - fillRgb[1]) * b)),
            Math.min(255, Math.round(fillRgb[2] + (255 - fillRgb[2]) * b)),
          ];
        }

        // Fill province
        ctx.fillStyle = rgbToCSS(fillRgb[0], fillRgb[1], fillRgb[2]);
        ctx.fill(path2d);

        // White flash overlay for acquisition
        if (flashAlpha > 0.01) {
          ctx.globalAlpha = flashAlpha;
          ctx.fillStyle = "#ffffff";
          ctx.fill(path2d);
          ctx.globalAlpha = 1;
        }

        // Inner glow for player territories (subtle)
        if (p.ownerId && plrs[p.ownerId]) {
          ctx.save();
          ctx.clip(path2d);
          const ownerRgb = parseColor(plrs[p.ownerId].color);
          ctx.strokeStyle = rgbToCSS(
            Math.min(255, ownerRgb[0] + 60),
            Math.min(255, ownerRgb[1] + 60),
            Math.min(255, ownerRgb[2] + 60),
            0.15
          );
          ctx.lineWidth = 6 / cam.zoom;
          ctx.stroke(path2d);
          ctx.restore();
        }

        // Player-owned territory: distinct bright border
        if (p.ownerId === "player") {
          ctx.strokeStyle = "rgba(245,158,11,0.6)";
          ctx.lineWidth = 1.5 / cam.zoom;
          ctx.stroke(path2d);
        } else {
          // Border (hovered provinces get a brighter border)
          ctx.strokeStyle = isHovered && !isSelected ? brighten(th.border, 0.5) : th.border;
          ctx.lineWidth = (isHovered && !isSelected ? 1.0 : 0.5) / cam.zoom;
          ctx.stroke(path2d);
        }
      }

      // ---- 4. War Zone Borders (pulsing red) ----
      if (warPairs.size > 0) {
        const warPulse = Math.sin(now * 0.003) * 0.5 + 0.5;
        ctx.strokeStyle = `rgba(255,60,60,${(0.4 + warPulse * 0.5).toFixed(3)})`;
        ctx.lineWidth = (1.5 + warPulse) / cam.zoom;

        for (let i = 0; i < provs.length; i++) {
          const p = provs[i];
          if (!p.ownerId) continue;
          const path2d = pathCache.get(p.id);
          if (!path2d) continue;

          // Check if this province borders an enemy
          let hasWarBorder = false;
          for (const nId of p.neighbors) {
            const neighbor = provs.find((np) => np.id === nId);
            if (neighbor && neighbor.ownerId && neighbor.ownerId !== p.ownerId) {
              if (warPairs.has(`${p.ownerId}|${neighbor.ownerId}`)) {
                hasWarBorder = true;
                break;
              }
            }
          }

          if (hasWarBorder) {
            ctx.stroke(path2d);
          }
        }
      }

      // ---- 5. Allied Borders (subtle green) ----
      if (alliedPairs.size > 0) {
        ctx.strokeStyle = "rgba(74,222,128,0.3)";
        ctx.lineWidth = 0.8 / cam.zoom;

        for (let i = 0; i < provs.length; i++) {
          const p = provs[i];
          if (!p.ownerId) continue;
          const path2d = pathCache.get(p.id);
          if (!path2d) continue;

          let hasAlliedBorder = false;
          for (const nId of p.neighbors) {
            const neighbor = provs.find((np) => np.id === nId);
            if (neighbor && neighbor.ownerId && neighbor.ownerId !== p.ownerId) {
              if (alliedPairs.has(`${p.ownerId}|${neighbor.ownerId}`)) {
                hasAlliedBorder = true;
                break;
              }
            }
          }

          if (hasAlliedBorder) {
            ctx.stroke(path2d);
          }
        }
      }

      // ---- 6. Selected Province Glow Border ----
      if (selId !== null) {
        const selPath = pathCache.get(selId);
        if (selPath) {
          const pulse = Math.sin(now * 0.005) * 0.5 + 0.5;
          const selRgb = parseColor(th.selected);

          // Outer glow
          ctx.strokeStyle = rgbToCSS(selRgb[0], selRgb[1], selRgb[2], 0.3 + pulse * 0.4);
          ctx.lineWidth = (4 + pulse * 3) / cam.zoom;
          ctx.stroke(selPath);

          // Inner sharp border
          ctx.strokeStyle = th.selected;
          ctx.lineWidth = 1.5 / cam.zoom;
          ctx.stroke(selPath);
        }
      }

      // ---- 7. Acquisition Ripple Effects ----
      // Clean up old animations
      while (acquisitions.length > 0 && now - acquisitions[0].startTime > 1200) {
        acquisitions.shift();
      }

      for (const acq of acquisitions) {
        const elapsed = now - acq.startTime;
        // Phase 3 (200-1000ms): expanding ring
        if (elapsed >= 200 && elapsed < 1000) {
          const ringT = (elapsed - 200) / 800;
          const radius = ringT * 80;
          const opacity = 0.6 * (1 - ringT);
          const strokeWidth = Math.max(0.5, 3 * (1 - ringT));

          ctx.beginPath();
          ctx.arc(acq.centerX, acq.centerY, radius, 0, Math.PI * 2);
          ctx.strokeStyle = rgbToCSS(acq.newColor[0], acq.newColor[1], acq.newColor[2], opacity);
          ctx.lineWidth = strokeWidth / cam.zoom;
          ctx.stroke();
        }
      }

      // ---- 8. Country Labels (at high zoom) ----
      if (cam.zoom > 2.5) {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        for (let i = 0; i < provs.length; i++) {
          const p = provs[i];
          if (p.resources.population <= 30) continue;

          const proj = projection(p.center);
          if (!proj) continue;

          const isPlayer = p.ownerId === "player";

          ctx.font = `${isPlayer ? "bold " : ""}${10 / cam.zoom}px monospace`;
          ctx.fillStyle = isPlayer ? "#ffffff" : "rgba(160,160,180,0.5)";

          // Text shadow for readability
          if (isPlayer) {
            ctx.save();
            ctx.shadowColor = "rgba(0,0,0,0.8)";
            ctx.shadowBlur = 3 / cam.zoom;
            ctx.fillText(p.name, proj[0], proj[1]);
            ctx.restore();
          } else {
            ctx.fillText(p.name, proj[0], proj[1]);
          }
        }
      }

      // Restore (un-camera)
      ctx.restore();

      // ---- 9. Vignette Overlay (post-camera, in screen space) ----
      const vignetteGrad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
      vignetteGrad.addColorStop(0, "rgba(0,0,0,0)");
      vignetteGrad.addColorStop(1, "rgba(0,0,0,0.4)");
      ctx.fillStyle = vignetteGrad;
      ctx.fillRect(0, 0, w, h);

      // ---- 10. Canvas Hover Label (near mouse, rendered on canvas) ----
      if (hover.provinceId !== null && hover.brightness > 0.1) {
        const hovProv = provs.find((p) => p.id === hover.provinceId);
        if (hovProv) {
          const mx = mousePosRef.current.x;
          const my = mousePosRef.current.y;

          ctx.save();
          ctx.font = "bold 12px monospace";
          const textWidth = ctx.measureText(hovProv.name).width;
          const padding = 6;
          const labelX = mx + 16;
          const labelY = my - 8;

          // Background pill
          ctx.fillStyle = "rgba(15,23,42,0.85)";
          ctx.beginPath();
          const rx = labelX - padding;
          const ry = labelY - 12;
          const rw = textWidth + padding * 2;
          const rh = 20;
          const cornerR = 4;
          ctx.moveTo(rx + cornerR, ry);
          ctx.lineTo(rx + rw - cornerR, ry);
          ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + cornerR);
          ctx.lineTo(rx + rw, ry + rh - cornerR);
          ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - cornerR, ry + rh);
          ctx.lineTo(rx + cornerR, ry + rh);
          ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - cornerR);
          ctx.lineTo(rx, ry + cornerR);
          ctx.quadraticCurveTo(rx, ry, rx + cornerR, ry);
          ctx.closePath();
          ctx.fill();

          // Border
          ctx.strokeStyle = th.border;
          ctx.lineWidth = 0.5;
          ctx.stroke();

          // Text
          ctx.fillStyle = th.text;
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.globalAlpha = Math.min(1, hover.brightness * 2);
          ctx.fillText(hovProv.name, labelX, labelY);
          ctx.globalAlpha = 1;
          ctx.restore();
        }
      }
    };

    rafIdRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafIdRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, [buildProjectionAndCache, getWarPairs, getAlliedPairs]);

  // ---------------------------------------------------------------------------
  // Wheel Event (non-passive, separate useEffect)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const cam = cameraRef.current;
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const minZoom = Math.max(sizeRef.current.width / 960, sizeRef.current.height / 600, 1);
      const maxZoom = 15;

      const newZoom = clamp(cam.targetZoom * zoomFactor, minZoom, maxZoom);

      // Zoom toward cursor position
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      // Adjust target offset so the point under cursor stays put
      const scale = newZoom / cam.targetZoom;
      cam.targetX = mx - (mx - cam.targetX) * scale;
      cam.targetY = my - (my - cam.targetY) * scale;
      cam.targetZoom = newZoom;
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Pointer Event Handlers
  // ---------------------------------------------------------------------------

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isPointerDownRef.current = true;
    isDraggingRef.current = false;
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
    mousePosRef.current = { x: e.clientX - (containerRef.current?.getBoundingClientRect().left || 0), y: e.clientY - (containerRef.current?.getBoundingClientRect().top || 0) };
    (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    const offsetX = rect ? e.clientX - rect.left : e.clientX;
    const offsetY = rect ? e.clientY - rect.top : e.clientY;
    mousePosRef.current = { x: offsetX, y: offsetY };

    // Only start drag detection when a button is held down
    if (isPointerDownRef.current) {
      const dx = e.clientX - mouseDownPosRef.current.x;
      const dy = e.clientY - mouseDownPosRef.current.y;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        if (!isDraggingRef.current) {
          isDraggingRef.current = true;
          hoverRef.current.provinceId = null;
          hoverRef.current.targetBrightness = 0;
          setTooltipData(null);
        }
      }

      if (isDraggingRef.current) {
        const cam = cameraRef.current;
        cam.targetX += e.movementX;
        cam.targetY += e.movementY;
        cam.x += e.movementX;
        cam.y += e.movementY;
        return;
      }
    }

    // Throttled hover detection
    const now = Date.now();
    if (now - lastHoverCheckRef.current < 40) {
      return;
    }
    lastHoverCheckRef.current = now;

    const province = findProvinceAtScreen(offsetX, offsetY);
    const prevHoverId = hoverRef.current.provinceId;

    if (province) {
      if (province.id !== prevHoverId) {
        // New hover target
        hoverRef.current.provinceId = province.id;
        hoverRef.current.brightness = 0; // Start from 0 for smooth fade in
        hoverRef.current.targetBrightness = 1;
      }

      const owner = province.ownerId ? playersRef.current[province.ownerId] : undefined;
      setTooltipData({
        province,
        owner,
        position: { x: e.clientX, y: e.clientY },
      });
    } else {
      if (prevHoverId !== null) {
        hoverRef.current.provinceId = null;
        hoverRef.current.targetBrightness = 0;
        setTooltipData(null);
      }
    }
  }, [findProvinceAtScreen]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (isPointerDownRef.current && !isDraggingRef.current) {
      const rect = containerRef.current?.getBoundingClientRect();
      const offsetX = rect ? e.clientX - rect.left : e.clientX;
      const offsetY = rect ? e.clientY - rect.top : e.clientY;
      const province = findProvinceAtScreen(offsetX, offsetY);
      if (province && province.id === selectedIdRef.current) {
        onSelectRef.current(null);
      } else {
        onSelectRef.current(province ? province.id : null);
      }
    }
    isPointerDownRef.current = false;
    isDraggingRef.current = false;
  }, [findProvinceAtScreen]);

  const handlePointerLeave = useCallback(() => {
    isPointerDownRef.current = false;
    isDraggingRef.current = false;
    hoverRef.current.provinceId = null;
    hoverRef.current.targetBrightness = 0;
    setTooltipData(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      <div ref={containerRef} className="absolute inset-0 w-full h-full overflow-hidden" style={{ cursor: isDraggingRef.current ? "grabbing" : "grab" }}>
        <canvas ref={canvasRef} className="block w-full h-full" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerLeave} />
      </div>
      {tooltipData && tooltipData.province && (
        <Tooltip province={tooltipData.province} owner={tooltipData.owner} position={tooltipData.position} />
      )}
    </>
  );
}
