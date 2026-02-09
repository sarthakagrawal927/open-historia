"use client";

import React, { useRef, useEffect, useState, useMemo } from "react";
import { Province, Player, MapTheme } from "@/lib/types";
import * as d3 from "d3-geo";
import Tooltip from "./Tooltip";

interface MapCanvasProps {
  provinces: Province[];
  players: Record<string, Player>;
  onSelectProvince: (provinceId: string | number | null) => void;
  selectedProvinceId: string | number | null;
  theme?: MapTheme;
}

const THEME_STYLES: Record<MapTheme, { sea: string; border: string; borderRef: string; highlight: string; bg: string }> = {
  classic: { sea: "#1e293b", border: "#0f172a", borderRef: "#ffffff", highlight: "#64748b", bg: "#1e293b" },
  cyberpunk: { sea: "#050505", border: "#00ffcc", borderRef: "#ff00ff", highlight: "rgba(0, 255, 204, 0.4)", bg: "#000000" },
  parchment: { sea: "#d4c5a9", border: "#5c4033", borderRef: "#8b4513", highlight: "rgba(92, 64, 51, 0.3)", bg: "#e6dcc8" },
  blueprint: { sea: "#003366", border: "#ffffff", borderRef: "#ffff00", highlight: "rgba(255, 255, 255, 0.2)", bg: "#002244" },
};

export default function MapCanvas({
  provinces,
  players,
  onSelectProvince,
  selectedProvinceId,
  theme = "classic",
}: MapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Camera State
  const [camera, setCamera] = useState({ x: 0, y: 0, k: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });

  // Tooltip State
  const [hoveredProvince, setHoveredProvince] = useState<Province | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const lastHoverCheck = useRef(0);

  // Calculate the scale needed to fit the world map to the screen width
  const minZoom = useMemo(() => {
    if (typeof window === "undefined") return 1;
    // World is roughly 960px wide at scale 150
    return Math.max(window.innerWidth / 960, window.innerHeight / 500);
  }, []);

  // Initialize camera k to minZoom
  useEffect(() => {
    setCamera(prev => ({ ...prev, k: minZoom }));
  }, [minZoom]);

  // Setup Projection
  const projection = useMemo(() => {
    return d3.geoMercator()
      .scale(150)
      .translate([window.innerWidth / 2, window.innerHeight / 2]);
  }, []);

  const pathGenerator = useMemo(() => {
    return d3.geoPath().projection(projection);
  }, [projection]);

  // Handle Wheel Event non-passively to prevent page scroll
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        const zoomSensitivity = 0.002;
        setCamera(prev => ({
            ...prev, 
            k: Math.max(minZoom, Math.min(prev.k - e.deltaY * zoomSensitivity, 20))
        }));
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    
    return () => {
        canvas.removeEventListener("wheel", handleWheel);
    };
  }, []);


  // Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    // Resize handling could be improved, but for now we sync with window
    if (canvas.width !== window.innerWidth * dpr) {
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        ctx.scale(dpr, dpr);
    }

    pathGenerator.context(ctx);

    const render = () => {
      const style = THEME_STYLES[theme];

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Sea
      ctx.fillStyle = style.sea; 
      ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);

      ctx.save();
      
      // Apply Camera
      // We want to zoom towards the center of the screen ideally, 
      // but simple scaling around top-left (0,0) with translation works for basic pan/zoom.
      // Standard 2D Camera transform:
      // Translate to center -> Scale -> Translate back? 
      // Simplified: Just translate then scale.
      
      // Center of screen
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;

      ctx.translate(cx, cy);
      ctx.scale(camera.k, camera.k);
      ctx.translate(-cx + camera.x, -cy + camera.y);


      provinces.forEach((province) => {
        ctx.beginPath();
        pathGenerator(province.feature);

        if (province.ownerId && players[province.ownerId]) {
          ctx.fillStyle = players[province.ownerId].color;
        } else {
          ctx.fillStyle = province.color; 
        }
        
        // Highlight logic
        if (province.id === selectedProvinceId) {
             ctx.fillStyle = style.highlight; 
        } else if (province.id === hoveredProvince?.id) {
             ctx.fillStyle = style.highlight; // Reusing highlight for hover too, or could be slightly different
             ctx.globalAlpha = 0.8;
        }
        
        ctx.fill();
        ctx.globalAlpha = 1.0;

        ctx.lineWidth = 0.5 / camera.k;
        ctx.strokeStyle = style.border;
        ctx.stroke();
      });

      if (selectedProvinceId) {
          const selected = provinces.find(p => p.id === selectedProvinceId);
          if (selected) {
              ctx.beginPath();
              pathGenerator(selected.feature);
              ctx.lineWidth = 1.5 / camera.k;
              ctx.strokeStyle = style.borderRef;
              ctx.stroke();
          }
      }

      ctx.restore();
    };

    render();
  }, [provinces, players, camera, selectedProvinceId, pathGenerator, theme, hoveredProvince]);

  const getProvinceAt = (clientX: number, clientY: number) => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    
    const worldX = ((clientX - cx) / camera.k) + cx - camera.x;
    const worldY = ((clientY - cy) / camera.k) + cy - camera.y;

    const invert = projection.invert?.([worldX, worldY]);

    if (invert) {
        const [lon, lat] = invert;
        return provinces.find(p => d3.geoContains(p.feature, [lon, lat]));
    }
    return null;
  };

  // Mouse Handlers (Pan & Click)
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastMouse({ x: e.clientX, y: e.clientY });
    setHoveredProvince(null); // Clear hover on drag start
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = (e.clientX - lastMouse.x) / camera.k;
      const dy = (e.clientY - lastMouse.y) / camera.k;
      
      setCamera((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      setLastMouse({ x: e.clientX, y: e.clientY });
    } else {
      // Throttled Hover Check
      const now = Date.now();
      if (now - lastHoverCheck.current > 40) { // Check every ~40ms
          lastHoverCheck.current = now;
          const p = getProvinceAt(e.clientX, e.clientY);
          setHoveredProvince(p || null);
          setTooltipPos({ x: e.clientX, y: e.clientY });
      } else if (hoveredProvince) {
          // If we already have a province, just update pos smoothly without re-calculating geo
          setTooltipPos({ x: e.clientX, y: e.clientY });
      }
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleClick = (e: React.MouseEvent) => {
    if (isDragging) return;
    
    // We can reuse getProvinceAt here
    const clicked = getProvinceAt(e.clientX, e.clientY);
    onSelectProvince(clicked ? clicked.id : null);
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-move bg-slate-900"
        style={{ width: "100%", height: "100%" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
            handleMouseUp();
            setHoveredProvince(null);
        }}
        onClick={handleClick}
      />
      {hoveredProvince && (
        <Tooltip 
          province={hoveredProvince}
          owner={hoveredProvince.ownerId ? players[hoveredProvince.ownerId] : undefined}
          position={tooltipPos}
        />
      )}
    </>
  );
}
