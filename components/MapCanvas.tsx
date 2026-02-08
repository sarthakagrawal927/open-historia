"use client";

import React, { useRef, useEffect, useState, useMemo } from "react";
import { Province, Player } from "@/lib/types";
import * as d3 from "d3-geo";

interface MapCanvasProps {
  provinces: Province[];
  players: Record<string, Player>;
  onSelectProvince: (provinceId: string | number | null) => void;
  selectedProvinceId: string | number | null;
}

export default function MapCanvas({
  provinces,
  players,
  onSelectProvince,
  selectedProvinceId,
}: MapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Camera State
  const [camera, setCamera] = useState({ x: 0, y: 0, k: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });

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
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Sea
      ctx.fillStyle = "#1e293b"; 
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
        
        if (province.id === selectedProvinceId) {
             ctx.fillStyle = "#64748b"; // Highlight color
        }
        
        ctx.fill();

        ctx.lineWidth = 0.5 / camera.k;
        ctx.strokeStyle = "#0f172a";
        ctx.stroke();
      });

      if (selectedProvinceId) {
          const selected = provinces.find(p => p.id === selectedProvinceId);
          if (selected) {
              ctx.beginPath();
              pathGenerator(selected.feature);
              ctx.lineWidth = 1.5 / camera.k;
              ctx.strokeStyle = "#ffffff";
              ctx.stroke();
          }
      }

      ctx.restore();
    };

    render();
  }, [provinces, players, camera, selectedProvinceId, pathGenerator]);

  // Mouse Handlers (Pan & Click)
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setLastMouse({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      // Adjust drag speed by zoom level (slower when zoomed in)
      // Actually standard pan is 1:1 with mouse movement, but since we scale context, 
      // we need to divide delta by scale to keep it 1:1 visually?
      // No, if we translate *before* scale, we divide. If we translate *after* scale (as usually done in simple cams), it's 1:1.
      // In our render transform: translate(cx, cy) -> scale(k) -> translate(offset)
      // So the offset is being scaled. Thus we need to divide dx/dy by k to make mouse tracking 1:1.
      
      const dx = (e.clientX - lastMouse.x) / camera.k;
      const dy = (e.clientY - lastMouse.y) / camera.k;
      
      setCamera((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      setLastMouse({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleClick = (e: React.MouseEvent) => {
    if (isDragging) return;

    // Inverse projection math is complex with custom camera transforms.
    // Simpler approach: Iterate features and check d3.geoContains?
    // But we need to transform the mouse point into [Lon, Lat].
    
    // 1. Screen (Pixel) -> World (Pixel at k=1)
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    
    // Reversing the render transform:
    // ScreenX = (WorldX - cx + camX) * k + cx
    // ScreenX - cx = (WorldX - cx + camX) * k
    // (ScreenX - cx) / k = WorldX - cx + camX
    // WorldX = ((ScreenX - cx) / k) + cx - camX
    
    const worldX = ((e.clientX - cx) / camera.k) + cx - camera.x;
    const worldY = ((e.clientY - cy) / camera.k) + cy - camera.y;

    // 2. World (Pixel) -> Lat/Long
    // projection.invert expects [x, y] relative to the projection's translation/scale defaults.
    const invert = projection.invert?.([worldX, worldY]);

    if (invert) {
        const [lon, lat] = invert;
        // Optimization: rough bounds check or use spatial index
        // For <200 countries, find() is fine (<2ms).
        const clicked = provinces.find(p => d3.geoContains(p.feature, [lon, lat]));
        onSelectProvince(clicked ? clicked.id : null);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-full cursor-move bg-slate-900"
      style={{ width: "100%", height: "100%" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
    />
  );
}
