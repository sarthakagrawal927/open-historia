"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import * as d3 from "d3-geo";
import { Province, Player, MapTheme, DiplomaticRelation } from "@/lib/types";
import GlobeTooltip from "./GlobeTooltip";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GlobeMapProps {
  provinces: Province[];
  players: Record<string, Player>;
  onSelectProvince: (provinceId: string | number | null) => void;
  selectedProvinceId: string | number | null;
  theme?: MapTheme;
  relations?: DiplomaticRelation[];
}

// ---------------------------------------------------------------------------
// Theme configurations
// ---------------------------------------------------------------------------

interface ThemeConfig {
  ocean: string;
  border: string;
  selectedBorder: string;
  hoverBright: number;
  neutralTint: string;
  atmosphereColor: THREE.Color;
  atmosphereIntensity: number;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  starColor: string;
  ambientIntensity: number;
  directionalIntensity: number;
  bgColor: string;
}

const THEME_CONFIGS: Record<MapTheme, ThemeConfig> = {
  classic: {
    ocean: "#0a1628",
    border: "rgba(255,255,255,0.35)",
    selectedBorder: "#fbbf24",
    hoverBright: 30,
    neutralTint: "#3b4a5a",
    atmosphereColor: new THREE.Color(0.3, 0.6, 1.0),
    atmosphereIntensity: 0.7,
    bloomStrength: 0.4,
    bloomRadius: 0.5,
    bloomThreshold: 0.85,
    starColor: "#ffffff",
    ambientIntensity: 0.4,
    directionalIntensity: 1.0,
    bgColor: "#020510",
  },
  cyberpunk: {
    ocean: "#020008",
    border: "rgba(0,255,204,0.6)",
    selectedBorder: "#ff00ff",
    hoverBright: 50,
    neutralTint: "#1a0a2e",
    atmosphereColor: new THREE.Color(0.0, 1.0, 0.8),
    atmosphereIntensity: 1.0,
    bloomStrength: 0.9,
    bloomRadius: 0.6,
    bloomThreshold: 0.6,
    starColor: "#00ffcc",
    ambientIntensity: 0.3,
    directionalIntensity: 0.8,
    bgColor: "#000005",
  },
  parchment: {
    ocean: "#8b7355",
    border: "rgba(92,64,51,0.6)",
    selectedBorder: "#d4a574",
    hoverBright: 20,
    neutralTint: "#a89070",
    atmosphereColor: new THREE.Color(0.9, 0.75, 0.5),
    atmosphereIntensity: 0.4,
    bloomStrength: 0.15,
    bloomRadius: 0.3,
    bloomThreshold: 0.9,
    starColor: "#d4c5a9",
    ambientIntensity: 0.6,
    directionalIntensity: 0.8,
    bgColor: "#1a1208",
  },
  blueprint: {
    ocean: "#001833",
    border: "rgba(255,255,255,0.45)",
    selectedBorder: "#ffff00",
    hoverBright: 35,
    neutralTint: "#0d2b4a",
    atmosphereColor: new THREE.Color(0.2, 0.5, 1.0),
    atmosphereIntensity: 0.6,
    bloomStrength: 0.5,
    bloomRadius: 0.4,
    bloomThreshold: 0.8,
    starColor: "#4488ff",
    ambientIntensity: 0.35,
    directionalIntensity: 0.9,
    bgColor: "#000814",
  },
};

// ---------------------------------------------------------------------------
// Helper: parse any CSS color to an {r,g,b} object (0-255)
// ---------------------------------------------------------------------------

function parseColor(colorStr: string): { r: number; g: number; b: number } {
  // HSL format
  const hslMatch = colorStr.match(
    /hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*\)/i
  );
  if (hslMatch) {
    const h = parseFloat(hslMatch[1]) / 360;
    const s = parseFloat(hslMatch[2]) / 100;
    const l = parseFloat(hslMatch[3]) / 100;
    return hslToRgb(h, s, l);
  }
  // Hex format
  if (colorStr.startsWith("#")) {
    const hex = colorStr.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
      };
    }
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    };
  }
  // rgb() format
  const rgbMatch = colorStr.match(
    /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i
  );
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3]),
    };
  }
  return { r: 100, g: 100, b: 100 };
}

function hslToRgb(
  h: number,
  s: number,
  l: number
): { r: number; g: number; b: number } {
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
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

function brightenColor(
  color: { r: number; g: number; b: number },
  amount: number
): string {
  return `rgb(${Math.min(255, color.r + amount)},${Math.min(
    255,
    color.g + amount
  )},${Math.min(255, color.b + amount)})`;
}

function darkenColor(
  color: { r: number; g: number; b: number },
  amount: number
): string {
  return `rgb(${Math.max(0, color.r - amount)},${Math.max(
    0,
    color.g - amount
  )},${Math.max(0, color.b - amount)})`;
}

function rgbToString(color: { r: number; g: number; b: number }): string {
  return `rgb(${color.r},${color.g},${color.b})`;
}

// ---------------------------------------------------------------------------
// Atmosphere Shader (Fresnel glow)
// ---------------------------------------------------------------------------

const atmosphereVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const atmosphereFragmentShader = `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vec3 viewDir = normalize(-vPosition);
    float fresnel = 1.0 - dot(viewDir, vNormal);
    fresnel = pow(fresnel, 3.0) * uIntensity;
    gl_FragColor = vec4(uColor, fresnel * 0.8);
  }
`;

// ---------------------------------------------------------------------------
// Globe Map Component
// ---------------------------------------------------------------------------

const TEX_WIDTH = 2048;
const TEX_HEIGHT = 1024;
const GLOBE_RADIUS = 2;
const GLOBE_SEGMENTS = 96;
const STAR_COUNT = 6000;
const IDLE_TIMEOUT = 5000; // 5s before auto-rotation resumes
const AUTO_ROTATE_SPEED = 0.15;

export default function GlobeMap({
  provinces,
  players,
  onSelectProvince,
  selectedProvinceId,
  theme = "classic",
  relations = [],
}: GlobeMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Mutable refs that persist across renders without causing re-renders
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const globeMeshRef = useRef<THREE.Mesh | null>(null);
  const atmosphereMeshRef = useRef<THREE.Mesh | null>(null);
  const starFieldRef = useRef<THREE.Points | null>(null);
  const bloomPassRef = useRef<UnrealBloomPass | null>(null);

  const textureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const texProjectionRef = useRef<d3.GeoProjection | null>(null);
  const texPathRef = useRef<d3.GeoPath | null>(null);

  const animFrameRef = useRef<number>(0);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());

  // Interaction state in refs to avoid re-render loops
  const lastInteractionRef = useRef<number>(Date.now());
  const hoveredProvinceRef = useRef<Province | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const isDraggingRef = useRef(false);
  const mouseDownPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // React state for tooltip (needs re-render)
  const [tooltipData, setTooltipData] = useState<{
    province: Province | null;
    owner?: Player;
    position: { x: number; y: number };
    visible: boolean;
  }>({ province: null, position: { x: 0, y: 0 }, visible: false });

  // Store latest props in refs so animation loop can read them
  const provincesRef = useRef(provinces);
  const playersRef = useRef(players);
  const selectedProvinceIdRef = useRef(selectedProvinceId);
  const themeRef = useRef(theme);
  const relationsRef = useRef(relations);

  provincesRef.current = provinces;
  playersRef.current = players;
  selectedProvinceIdRef.current = selectedProvinceId;
  themeRef.current = theme;
  relationsRef.current = relations;

  // -------------------------------------------------------------------------
  // Province color logic
  // -------------------------------------------------------------------------

  const getProvinceColor = useCallback(
    (
      province: Province,
      themeConfig: ThemeConfig,
      hovered: boolean,
      selected: boolean,
      time: number
    ): string => {
      const provPlayers = playersRef.current;
      const provRelations = relationsRef.current;

      let baseColor: { r: number; g: number; b: number };

      if (province.ownerId && provPlayers[province.ownerId]) {
        const player = provPlayers[province.ownerId];
        baseColor = parseColor(player.color);

        // Player-owned: bright blue glow
        if (province.ownerId === "player") {
          baseColor = {
            r: Math.min(255, baseColor.r + 20),
            g: Math.min(255, baseColor.g + 20),
            b: Math.min(255, baseColor.b + 40),
          };
        } else {
          // AI/enemy: slight darkening
          baseColor = {
            r: Math.max(0, baseColor.r - 15),
            g: Math.max(0, baseColor.g - 15),
            b: Math.max(0, baseColor.b - 15),
          };
        }

        // War zone pulsing (check if this province's owner is at war with player)
        const isWarZone = provRelations.some(
          (rel) =>
            rel.type === "war" &&
            ((rel.nationA === province.ownerId && rel.nationB === "player") ||
              (rel.nationB === province.ownerId && rel.nationA === "player"))
        );
        if (isWarZone) {
          const pulse = Math.sin(time * 3) * 0.5 + 0.5;
          const warTint = Math.round(pulse * 40);
          baseColor = {
            r: Math.min(255, baseColor.r + warTint),
            g: Math.max(0, baseColor.g - warTint * 0.3),
            b: Math.max(0, baseColor.b - warTint * 0.3),
          };
        }

        // Allied: subtle green tint
        const isAllied = provRelations.some(
          (rel) =>
            (rel.type === "allied" || rel.type === "friendly") &&
            ((rel.nationA === province.ownerId && rel.nationB === "player") ||
              (rel.nationB === province.ownerId && rel.nationA === "player"))
        );
        if (isAllied && province.ownerId !== "player") {
          baseColor = {
            r: baseColor.r,
            g: Math.min(255, baseColor.g + 25),
            b: baseColor.b,
          };
        }
      } else {
        // Neutral territory: muted earth tones
        const neutralBase = parseColor(province.color);
        baseColor = {
          r: Math.round(neutralBase.r * 0.5 + parseColor(themeConfig.neutralTint).r * 0.5),
          g: Math.round(neutralBase.g * 0.5 + parseColor(themeConfig.neutralTint).g * 0.5),
          b: Math.round(neutralBase.b * 0.5 + parseColor(themeConfig.neutralTint).b * 0.5),
        };
      }

      // Hover brightening
      if (hovered && !selected) {
        return brightenColor(baseColor, themeConfig.hoverBright);
      }

      // Selected: bright pulsing
      if (selected) {
        const pulse = Math.sin(time * 4) * 0.5 + 0.5;
        const bright = Math.round(pulse * 40 + 20);
        return brightenColor(baseColor, bright);
      }

      return rgbToString(baseColor);
    },
    []
  );

  // -------------------------------------------------------------------------
  // Draw texture onto offscreen canvas
  // -------------------------------------------------------------------------

  const drawTexture = useCallback(
    (time: number) => {
      const canvas = textureCanvasRef.current;
      const ctx = canvas?.getContext("2d");
      const texPath = texPathRef.current;
      if (!canvas || !ctx || !texPath) return;

      const cfg = THEME_CONFIGS[themeRef.current];
      const provs = provincesRef.current;
      const hovered = hoveredProvinceRef.current;
      const selected = selectedProvinceIdRef.current;

      // Clear with ocean color
      ctx.fillStyle = cfg.ocean;
      ctx.fillRect(0, 0, TEX_WIDTH, TEX_HEIGHT);

      // Draw graticule for visual appeal
      const graticule = d3.geoGraticule10();
      ctx.beginPath();
      texPath(graticule);
      ctx.strokeStyle =
        themeRef.current === "cyberpunk"
          ? "rgba(0,255,204,0.06)"
          : themeRef.current === "blueprint"
          ? "rgba(100,150,255,0.08)"
          : themeRef.current === "parchment"
          ? "rgba(92,64,51,0.1)"
          : "rgba(255,255,255,0.04)";
      ctx.lineWidth = 0.3;
      ctx.stroke();

      // Draw each province polygon
      for (let i = 0; i < provs.length; i++) {
        const p = provs[i];
        if (!p.feature || !p.feature.geometry) continue;

        const isHovered = hovered?.id === p.id;
        const isSelected = p.id === selected;

        ctx.beginPath();
        texPath(p.feature);

        ctx.fillStyle = getProvinceColor(p, cfg, isHovered, isSelected, time);
        ctx.fill();

        // Border
        ctx.strokeStyle = cfg.border;
        ctx.lineWidth = isSelected ? 2.0 : isHovered ? 1.2 : 0.4;
        ctx.stroke();
      }

      // Draw selected province highlight border (thick glowing)
      if (selected !== null) {
        const selectedProv = provs.find((p) => p.id === selected);
        if (selectedProv?.feature) {
          const pulse = Math.sin(time * 4) * 0.5 + 0.5;

          // Outer glow
          ctx.beginPath();
          texPath(selectedProv.feature);
          ctx.strokeStyle = cfg.selectedBorder;
          ctx.lineWidth = 3.0 + pulse * 2.0;
          ctx.globalAlpha = 0.3 + pulse * 0.3;
          ctx.stroke();
          ctx.globalAlpha = 1.0;

          // Inner sharp border
          ctx.beginPath();
          texPath(selectedProv.feature);
          ctx.strokeStyle = cfg.selectedBorder;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // War zone border pulsing (draw red border between warring nations)
      const rels = relationsRef.current;
      const warRelations = rels.filter((r) => r.type === "war");
      if (warRelations.length > 0) {
        const pulse = Math.sin(time * 2.5) * 0.5 + 0.5;
        ctx.globalAlpha = 0.2 + pulse * 0.25;
        ctx.strokeStyle = `rgba(255, 60, 60, ${0.4 + pulse * 0.4})`;
        ctx.lineWidth = 1.5 + pulse;

        for (const rel of warRelations) {
          // Draw borders of provinces owned by warring parties
          for (const p of provs) {
            if (p.ownerId === rel.nationA || p.ownerId === rel.nationB) {
              // Check if province borders the enemy
              const hasEnemyNeighbor = p.neighbors.some((nId) => {
                const neighbor = provs.find((np) => np.id === nId);
                if (!neighbor) return false;
                return (
                  (p.ownerId === rel.nationA && neighbor.ownerId === rel.nationB) ||
                  (p.ownerId === rel.nationB && neighbor.ownerId === rel.nationA)
                );
              });
              if (hasEnemyNeighbor && p.feature) {
                ctx.beginPath();
                texPath(p.feature);
                ctx.stroke();
              }
            }
          }
        }
        ctx.globalAlpha = 1.0;
      }

      // Update Three.js texture
      if (textureRef.current) {
        textureRef.current.needsUpdate = true;
      }
    },
    [getProvinceColor]
  );

  // -------------------------------------------------------------------------
  // UV to lon/lat conversion and province lookup
  // -------------------------------------------------------------------------

  const uvToLonLat = useCallback(
    (u: number, v: number): [number, number] => {
      const lon = u * 360 - 180;
      const lat = 90 - v * 180;
      return [lon, lat];
    },
    []
  );

  const findProvinceAtLonLat = useCallback(
    (lon: number, lat: number): Province | null => {
      const provs = provincesRef.current;
      for (let i = 0; i < provs.length; i++) {
        const p = provs[i];
        if (p.feature && d3.geoContains(p.feature, [lon, lat])) {
          return p;
        }
      }
      return null;
    },
    []
  );

  // -------------------------------------------------------------------------
  // Raycast from screen point to globe and find province
  // -------------------------------------------------------------------------

  const raycastToProvince = useCallback(
    (clientX: number, clientY: number): Province | null => {
      const renderer = rendererRef.current;
      const camera = cameraRef.current;
      const globe = globeMeshRef.current;
      if (!renderer || !camera || !globe) return null;

      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObject(globe);

      if (intersects.length > 0) {
        const uv = intersects[0].uv;
        if (uv) {
          const [lon, lat] = uvToLonLat(uv.x, uv.y);
          return findProvinceAtLonLat(lon, lat);
        }
      }
      return null;
    },
    [uvToLonLat, findProvinceAtLonLat]
  );

  // -------------------------------------------------------------------------
  // Create star field
  // -------------------------------------------------------------------------

  const createStarField = useCallback((themeConfig: ThemeConfig): THREE.Points => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(STAR_COUNT * 3);
    const sizes = new Float32Array(STAR_COUNT);
    const colors = new Float32Array(STAR_COUNT * 3);

    const starCol = parseColor(themeConfig.starColor);

    for (let i = 0; i < STAR_COUNT; i++) {
      // Distribute stars in a large sphere around the scene
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 30 + Math.random() * 70;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      sizes[i] = 0.5 + Math.random() * 2.0;

      // Slight color variation
      const variation = 0.8 + Math.random() * 0.4;
      colors[i * 3] = (starCol.r / 255) * variation;
      colors[i * 3 + 1] = (starCol.g / 255) * variation;
      colors[i * 3 + 2] = (starCol.b / 255) * variation;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return new THREE.Points(geometry, material);
  }, []);

  // -------------------------------------------------------------------------
  // Initialize Three.js scene (runs once)
  // -------------------------------------------------------------------------

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const cfg = THEME_CONFIGS[theme];

    // --- Scene ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(cfg.bgColor);
    sceneRef.current = scene;

    // --- Camera ---
    const width = container.clientWidth;
    const height = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 200);
    camera.position.set(0, 0, 5.5);
    cameraRef.current = camera;

    // --- Renderer ---
    const dpr = Math.min(window.devicePixelRatio, 2);
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(dpr);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // --- Post-processing ---
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      cfg.bloomStrength,
      cfg.bloomRadius,
      cfg.bloomThreshold
    );
    composer.addPass(bloomPass);
    bloomPassRef.current = bloomPass;

    const outputPass = new OutputPass();
    composer.addPass(outputPass);
    composerRef.current = composer;

    // --- Orbit Controls ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 0.8;
    controls.minDistance = 2.8;
    controls.maxDistance = 12;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = AUTO_ROTATE_SPEED;
    controlsRef.current = controls;

    // Track user interaction for auto-rotation idle resume
    const onInteractionStart = () => {
      lastInteractionRef.current = Date.now();
      controls.autoRotate = false;
    };
    renderer.domElement.addEventListener("pointerdown", onInteractionStart);
    renderer.domElement.addEventListener("wheel", onInteractionStart);

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, cfg.ambientIntensity);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(
      0xffffff,
      cfg.directionalIntensity
    );
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    // Subtle fill light from behind
    const fillLight = new THREE.DirectionalLight(0x4466aa, 0.2);
    fillLight.position.set(-5, -2, -5);
    scene.add(fillLight);

    // --- Offscreen texture canvas ---
    const textureCanvas = document.createElement("canvas");
    textureCanvas.width = TEX_WIDTH;
    textureCanvas.height = TEX_HEIGHT;
    textureCanvasRef.current = textureCanvas;

    const texProjection = d3
      .geoEquirectangular()
      .scale(TEX_WIDTH / (2 * Math.PI))
      .translate([TEX_WIDTH / 2, TEX_HEIGHT / 2]);
    texProjectionRef.current = texProjection;

    const texCtx = textureCanvas.getContext("2d")!;
    const texPath = d3.geoPath().projection(texProjection).context(texCtx);
    texPathRef.current = texPath;

    // --- Globe sphere ---
    const globeGeometry = new THREE.SphereGeometry(
      GLOBE_RADIUS,
      GLOBE_SEGMENTS,
      GLOBE_SEGMENTS
    );
    const globeTexture = new THREE.CanvasTexture(textureCanvas);
    globeTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    textureRef.current = globeTexture;

    const globeMaterial = new THREE.MeshPhongMaterial({
      map: globeTexture,
      specular: new THREE.Color(0x222233),
      shininess: 15,
      bumpScale: 0.005,
    });

    const globeMesh = new THREE.Mesh(globeGeometry, globeMaterial);
    scene.add(globeMesh);
    globeMeshRef.current = globeMesh;

    // --- Atmosphere (Fresnel glow) ---
    const atmosphereGeometry = new THREE.SphereGeometry(
      GLOBE_RADIUS * 1.04,
      64,
      64
    );
    const atmosphereMaterial = new THREE.ShaderMaterial({
      vertexShader: atmosphereVertexShader,
      fragmentShader: atmosphereFragmentShader,
      uniforms: {
        uColor: { value: cfg.atmosphereColor },
        uIntensity: { value: cfg.atmosphereIntensity },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const atmosphereMesh = new THREE.Mesh(
      atmosphereGeometry,
      atmosphereMaterial
    );
    scene.add(atmosphereMesh);
    atmosphereMeshRef.current = atmosphereMesh;

    // --- Inner atmosphere haze (front-facing for subtle edge glow) ---
    const innerAtmoGeometry = new THREE.SphereGeometry(
      GLOBE_RADIUS * 1.005,
      64,
      64
    );
    const innerAtmoMaterial = new THREE.ShaderMaterial({
      vertexShader: atmosphereVertexShader,
      fragmentShader: atmosphereFragmentShader,
      uniforms: {
        uColor: { value: cfg.atmosphereColor.clone().multiplyScalar(0.6) },
        uIntensity: { value: cfg.atmosphereIntensity * 0.4 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      depthWrite: false,
    });
    const innerAtmoMesh = new THREE.Mesh(innerAtmoGeometry, innerAtmoMaterial);
    scene.add(innerAtmoMesh);

    // --- Star Field ---
    const stars = createStarField(cfg);
    scene.add(stars);
    starFieldRef.current = stars;

    // --- Animation Loop ---
    const clock = clockRef.current;
    clock.start();

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      const elapsed = clock.getElapsedTime();

      // Resume auto-rotation after idle timeout
      if (
        !controls.autoRotate &&
        Date.now() - lastInteractionRef.current > IDLE_TIMEOUT
      ) {
        controls.autoRotate = true;
      }

      controls.update();

      // Slowly rotate star field
      if (starFieldRef.current) {
        starFieldRef.current.rotation.y = elapsed * 0.005;
        starFieldRef.current.rotation.x = Math.sin(elapsed * 0.002) * 0.01;
      }

      // Redraw the texture canvas with animation (pulsing effects)
      drawTexture(elapsed);

      // Render via post-processing composer
      composer.render();
    };

    animate();

    // --- Resize handler ---
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
      bloomPass.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // --- Cleanup ---
    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("pointerdown", onInteractionStart);
      renderer.domElement.removeEventListener("wheel", onInteractionStart);
      cancelAnimationFrame(animFrameRef.current);
      controls.dispose();
      renderer.dispose();
      composer.dispose();
      globeGeometry.dispose();
      globeMaterial.dispose();
      globeTexture.dispose();
      atmosphereGeometry.dispose();
      atmosphereMaterial.dispose();
      innerAtmoGeometry.dispose();
      innerAtmoMaterial.dispose();
      if (starFieldRef.current) {
        (starFieldRef.current.geometry as THREE.BufferGeometry).dispose();
        (starFieldRef.current.material as THREE.Material).dispose();
      }
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      composerRef.current = null;
      controlsRef.current = null;
      globeMeshRef.current = null;
      atmosphereMeshRef.current = null;
      starFieldRef.current = null;
      bloomPassRef.current = null;
      textureCanvasRef.current = null;
      textureRef.current = null;
      texProjectionRef.current = null;
      texPathRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Initialize once

  // -------------------------------------------------------------------------
  // Update theme-related visuals when theme changes (without full recreate)
  // -------------------------------------------------------------------------

  useEffect(() => {
    const cfg = THEME_CONFIGS[theme];
    const scene = sceneRef.current;
    const bloomPass = bloomPassRef.current;
    const atmosphere = atmosphereMeshRef.current;

    if (scene) {
      scene.background = new THREE.Color(cfg.bgColor);

      // Update ambient light
      scene.traverse((child) => {
        if (child instanceof THREE.AmbientLight) {
          child.intensity = cfg.ambientIntensity;
        }
        if (child instanceof THREE.DirectionalLight && child.position.x > 0) {
          child.intensity = cfg.directionalIntensity;
        }
      });
    }

    if (bloomPass) {
      bloomPass.strength = cfg.bloomStrength;
      bloomPass.radius = cfg.bloomRadius;
      bloomPass.threshold = cfg.bloomThreshold;
    }

    if (atmosphere) {
      const mat = atmosphere.material as THREE.ShaderMaterial;
      mat.uniforms.uColor.value = cfg.atmosphereColor;
      mat.uniforms.uIntensity.value = cfg.atmosphereIntensity;
    }

    // Rebuild star field with new color
    if (starFieldRef.current && sceneRef.current) {
      const oldStars = starFieldRef.current;
      sceneRef.current.remove(oldStars);
      (oldStars.geometry as THREE.BufferGeometry).dispose();
      (oldStars.material as THREE.Material).dispose();

      const newStars = createStarField(cfg);
      sceneRef.current.add(newStars);
      starFieldRef.current = newStars;
    }
  }, [theme, createStarField]);

  // -------------------------------------------------------------------------
  // Mouse / pointer event handlers
  // -------------------------------------------------------------------------

  const lastHoverCheckRef = useRef(0);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = false;
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
    lastInteractionRef.current = Date.now();
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const dx = e.clientX - mouseDownPosRef.current.x;
      const dy = e.clientY - mouseDownPosRef.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        isDraggingRef.current = true;
      }

      // Throttled hover detection
      const now = Date.now();
      if (now - lastHoverCheckRef.current < 50) {
        // Still update tooltip position if we have a hovered province
        if (hoveredProvinceRef.current) {
          setTooltipData((prev) => ({
            ...prev,
            position: { x: e.clientX, y: e.clientY },
          }));
        }
        return;
      }
      lastHoverCheckRef.current = now;

      if (isDraggingRef.current) {
        if (hoveredProvinceRef.current) {
          hoveredProvinceRef.current = null;
          setTooltipData((prev) => ({ ...prev, visible: false, province: null }));
        }
        return;
      }

      const province = raycastToProvince(e.clientX, e.clientY);
      const prevHovered = hoveredProvinceRef.current;

      if (province !== prevHovered) {
        hoveredProvinceRef.current = province;
        if (province) {
          const owner = province.ownerId
            ? playersRef.current[province.ownerId]
            : undefined;
          setTooltipData({
            province,
            owner,
            position: { x: e.clientX, y: e.clientY },
            visible: true,
          });
        } else {
          setTooltipData((prev) => ({
            ...prev,
            visible: false,
            province: null,
          }));
        }
      } else if (province) {
        setTooltipData((prev) => ({
          ...prev,
          position: { x: e.clientX, y: e.clientY },
        }));
      }

      // Set cursor
      if (containerRef.current) {
        containerRef.current.style.cursor = province ? "pointer" : "grab";
      }
    },
    [raycastToProvince]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current) {
        // This was a click, not a drag
        const province = raycastToProvince(e.clientX, e.clientY);
        onSelectProvince(province ? province.id : null);
      }
      isDraggingRef.current = false;
    },
    [raycastToProvince, onSelectProvince]
  );

  const handlePointerLeave = useCallback(() => {
    hoveredProvinceRef.current = null;
    setTooltipData((prev) => ({ ...prev, visible: false, province: null }));
    if (containerRef.current) {
      containerRef.current.style.cursor = "grab";
    }
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full overflow-hidden"
      style={{ cursor: "grab" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
    >
      <GlobeTooltip
        province={tooltipData.province}
        owner={tooltipData.owner}
        position={tooltipData.position}
        visible={tooltipData.visible}
      />
    </div>
  );
}
