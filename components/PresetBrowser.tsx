"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { PRESETS, PRESET_CATEGORIES, getPresetsByCategory } from "@/lib/presets";
import type { Preset } from "@/lib/types";
import type { SavedGame } from "@/lib/game-storage";
import SavedGamesList from "./SavedGamesList";
import AuthModal from "./AuthModal";
import UserMenu from "./UserMenu";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface PresetBrowserProps {
  onSelectPreset: (preset: Preset) => void;
  onCustomScenario: () => void;
  savedGames?: SavedGame[];
  onLoadSavedGame?: (saveId: string) => void;
  onDeleteSavedGame?: (saveId: string) => void;
  getNationName?: (id: string) => string;
  authSession?: { user: { name: string; email: string } } | null;
  onRefreshSavedGames?: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const ICON_MAP: Record<string, string> = {
  globe: "\u{1F30D}",
  war: "\u2694\uFE0F",
  nuke: "\u2622\uFE0F",
  crown: "\u{1F451}",
  ship: "\u26F5",
  skull: "\u{1F480}",
  flag: "\u{1F3F4}",
  fire: "\u{1F525}",
  sword: "\u{1F5E1}\uFE0F",
  rocket: "\u{1F680}",
};

const DIFFICULTY_STYLES: Record<
  string,
  { bg: string; text: string; border: string; glow: string }
> = {
  Sandbox: {
    bg: "bg-slate-700/60",
    text: "text-slate-300",
    border: "border-slate-600",
    glow: "shadow-slate-700/30",
  },
  Easy: {
    bg: "bg-emerald-900/50",
    text: "text-emerald-300",
    border: "border-emerald-700/60",
    glow: "shadow-emerald-700/30",
  },
  Realistic: {
    bg: "bg-amber-900/50",
    text: "text-amber-300",
    border: "border-amber-700/60",
    glow: "shadow-amber-700/30",
  },
  Hardcore: {
    bg: "bg-red-900/50",
    text: "text-red-300",
    border: "border-red-700/60",
    glow: "shadow-red-700/30",
  },
  Impossible: {
    bg: "bg-purple-900/50",
    text: "text-purple-300",
    border: "border-purple-700/60",
    glow: "shadow-purple-700/30",
  },
};

// ---------------------------------------------------------------------------
// Tiny star-field canvas (purely cosmetic, no deps)
// ---------------------------------------------------------------------------
function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let w = 0;
    let h = 0;

    interface Star {
      x: number;
      y: number;
      r: number;
      speed: number;
      opacity: number;
      phase: number;
    }

    const stars: Star[] = [];

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      if (stars.length === 0) {
        const count = Math.min(Math.floor((w * h) / 4000), 300);
        for (let i = 0; i < count; i++) {
          stars.push({
            x: Math.random() * w,
            y: Math.random() * h,
            r: Math.random() * 1.4 + 0.3,
            speed: Math.random() * 0.15 + 0.02,
            opacity: Math.random() * 0.6 + 0.2,
            phase: Math.random() * Math.PI * 2,
          });
        }
      }
    };

    resize();
    window.addEventListener("resize", resize);

    let t = 0;
    const draw = () => {
      t += 0.008;
      ctx.clearRect(0, 0, w, h);

      for (const s of stars) {
        const flicker = Math.sin(t * s.speed * 30 + s.phase) * 0.25 + 0.75;
        ctx.globalAlpha = s.opacity * flicker;
        ctx.fillStyle = "#f5e6c8";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}

// ---------------------------------------------------------------------------
// Individual preset card
// ---------------------------------------------------------------------------
interface PresetCardProps {
  preset: Preset;
  index: number;
  onSelect: (preset: Preset) => void;
}

function PresetCard({ preset, index, onSelect }: PresetCardProps) {
  const [visible, setVisible] = useState(false);
  const diff = DIFFICULTY_STYLES[preset.difficulty] ?? DIFFICULTY_STYLES.Realistic;

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 80 + index * 70);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <button
      type="button"
      onClick={() => onSelect(preset)}
      className={`group relative flex flex-col text-left bg-slate-900/80 border border-slate-700/60 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-amber-600/50 hover:shadow-lg hover:shadow-amber-900/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      style={{
        transitionProperty: "opacity, transform, border-color, box-shadow",
        transitionDuration: "500ms, 500ms, 300ms, 300ms",
      }}
    >
      {/* Glow overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-500/0 via-amber-500/0 to-amber-500/0 group-hover:from-amber-500/5 group-hover:via-transparent group-hover:to-amber-500/5 transition-all duration-300 pointer-events-none" />

      {/* Header band */}
      <div className="relative px-5 pt-5 pb-3 flex items-start gap-3">
        {/* Icon */}
        <span
          className="text-3xl leading-none shrink-0 drop-shadow-md select-none"
          role="img"
          aria-label={preset.icon}
        >
          {ICON_MAP[preset.icon] ?? ICON_MAP.globe}
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-serif font-bold text-slate-100 leading-tight group-hover:text-amber-200 transition-colors duration-200 truncate">
            {preset.name}
          </h3>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            {/* Year badge */}
            <span className="inline-flex items-center text-xs font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
              {preset.year < 0
                ? `${Math.abs(preset.year)} BC`
                : preset.year <= 100
                  ? `${preset.year} AD`
                  : preset.year}
            </span>
            {/* Difficulty badge */}
            <span
              className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded border ${diff.bg} ${diff.text} ${diff.border}`}
            >
              {preset.difficulty}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="px-5 pb-3 flex-1">
        <p className="text-sm text-slate-400 leading-relaxed line-clamp-3">
          {preset.description}
        </p>
      </div>

      {/* Suggested nations */}
      <div className="px-5 pb-5">
        <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-1.5 font-bold">
          Suggested Nations
        </p>
        <div className="flex flex-wrap gap-1.5">
          {preset.suggestedNations.slice(0, 5).map((nation) => (
            <span
              key={nation}
              className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/50 text-slate-400 group-hover:text-slate-300 group-hover:border-slate-600 transition-colors duration-200"
            >
              {nation}
            </span>
          ))}
          {preset.suggestedNations.length > 5 && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800/40 text-slate-500">
              +{preset.suggestedNations.length - 5}
            </span>
          )}
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-slate-700 to-transparent group-hover:via-amber-600/60 transition-all duration-500" />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function PresetBrowser({
  onSelectPreset,
  onCustomScenario,
  savedGames,
  onLoadSavedGame,
  onDeleteSavedGame,
  getNationName,
  authSession,
  onRefreshSavedGames,
}: PresetBrowserProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [headerVisible, setHeaderVisible] = useState(false);
  const [tabsVisible, setTabsVisible] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Staggered mount animation
  useEffect(() => {
    const t1 = setTimeout(() => setHeaderVisible(true), 100);
    const t2 = setTimeout(() => setTabsVisible(true), 350);
    const t3 = setTimeout(() => setFooterVisible(true), 550);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  // Derive displayed presets
  const filteredPresets = useCallback(() => {
    if (activeCategory === "all") return PRESETS;
    return getPresetsByCategory(activeCategory);
  }, [activeCategory]);

  const presets = filteredPresets();

  // Reset scroll when category changes
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeCategory]);

  // All category tabs (built-in + "All")
  const tabs = [
    { id: "all", name: "All", description: "Browse every available scenario" },
    ...PRESET_CATEGORIES,
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Star field background */}
      <StarField />

      {/* Radial gradient overlay for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(180,130,50,0.06) 0%, transparent 60%), radial-gradient(ellipse at 50% 100%, rgba(15,23,42,0.8) 0%, transparent 50%)",
          zIndex: 1,
        }}
        aria-hidden="true"
      />

      {/* Auth Modal */}
      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => onRefreshSavedGames?.()}
      />

      {/* Content wrapper */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Auth bar (top-right) */}
        <div className="absolute top-4 right-6 z-20">
          {authSession?.user ? (
            <UserMenu user={authSession.user} onRefreshSaves={onRefreshSavedGames} />
          ) : (
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="text-xs uppercase font-bold px-3 py-1.5 bg-amber-800/60 hover:bg-amber-700/70 text-amber-300 border border-amber-700/50 rounded-lg transition-colors"
            >
              Sign In
            </button>
          )}
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Header                                                            */}
        {/* ----------------------------------------------------------------- */}
        <header
          className={`shrink-0 pt-10 sm:pt-14 pb-4 px-6 text-center select-none transition-all duration-700 ease-out ${headerVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-6"}`}
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold tracking-wide text-amber-500 drop-shadow-lg">
            OPEN HISTORIA
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-400 tracking-widest uppercase">
            Choose Your Timeline
          </p>
          {/* Decorative rule */}
          <div className="mx-auto mt-5 w-48 h-px bg-gradient-to-r from-transparent via-amber-700/60 to-transparent" />
        </header>

        {/* ----------------------------------------------------------------- */}
        {/* Category tabs                                                     */}
        {/* ----------------------------------------------------------------- */}
        <nav
          className={`shrink-0 px-4 sm:px-6 pb-4 transition-all duration-600 ease-out ${tabsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        >
          <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap">
            {tabs.map((tab) => {
              const isActive = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCategory(tab.id)}
                  title={tab.description}
                  className={`relative px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-lg transition-all duration-250 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${isActive ? "text-amber-300 bg-amber-900/30 border border-amber-700/50" : "text-slate-500 hover:text-slate-300 border border-transparent hover:border-slate-700/40 hover:bg-slate-800/30"}`}
                >
                  {tab.name}
                  {/* Active underline accent */}
                  {isActive && (
                    <span className="absolute -bottom-px left-1/2 -translate-x-1/2 w-8 h-0.5 bg-amber-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Subtle category description */}
          <p className="text-center text-xs text-slate-600 mt-2 h-4">
            {tabs.find((t) => t.id === activeCategory)?.description ?? ""}
          </p>
        </nav>

        {/* ----------------------------------------------------------------- */}
        {/* Scrollable preset grid                                            */}
        {/* ----------------------------------------------------------------- */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-8 md:px-12 lg:px-20 pb-4 scroll-smooth"
          style={{
            maskImage: "linear-gradient(to bottom, transparent 0px, black 24px, black calc(100% - 80px), transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0px, black 24px, black calc(100% - 80px), transparent 100%)",
          }}
        >
          {presets.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-600 text-sm">
              No presets in this category yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 max-w-6xl mx-auto pt-2 pb-6">
              {presets.map((preset, i) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  index={i}
                  onSelect={onSelectPreset}
                />
              ))}
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Footer: Custom scenario button                                    */}
        {/* ----------------------------------------------------------------- */}
        <footer
          className={`shrink-0 px-6 pt-3 pb-8 flex flex-col items-center gap-3 transition-all duration-600 ease-out ${footerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        >
          {/* Saved games */}
          {savedGames && savedGames.length > 0 && onLoadSavedGame && onDeleteSavedGame && (
            <div className="w-full mb-4">
              <SavedGamesList
                savedGames={savedGames}
                onLoad={onLoadSavedGame}
                onDelete={onDeleteSavedGame}
                getNationName={getNationName}
              />
            </div>
          )}

          {/* Decorative rule */}
          <div className="w-64 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent mb-1" />

          <button
            type="button"
            onClick={onCustomScenario}
            className="group relative inline-flex items-center gap-3 px-8 py-3.5 text-sm sm:text-base font-bold uppercase tracking-widest text-slate-400 hover:text-amber-300 border border-slate-700/60 hover:border-amber-600/50 rounded-xl bg-slate-900/40 hover:bg-slate-900/70 transition-all duration-300 ease-out hover:shadow-lg hover:shadow-amber-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            {/* Pen icon */}
            <svg
              className="w-5 h-5 text-slate-500 group-hover:text-amber-400 transition-colors duration-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
              />
            </svg>
            Write Your Own Scenario
          </button>

          <p className="text-[11px] text-slate-600">
            Craft a custom scenario with your own rules, year, and world context
          </p>
        </footer>
      </div>
    </div>
  );
}
