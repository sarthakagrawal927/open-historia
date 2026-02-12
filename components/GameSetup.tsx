"use client";

import React, { useState, useMemo } from "react";
import { Province } from "@/lib/types";
import { encryptKey, decryptKey } from "@/lib/crypto";

interface GameSetupProps {
  provinces: Province[];
  onStartGame: (config: GameConfig) => void;
  onBack?: () => void;
  preset?: { year: number; scenario: string; difficulty: string; suggestedNations: string[]; scenarioName?: string } | null;
}

export type Provider = "local" | "google" | "openai" | "anthropic" | "deepseek";

export interface GameConfig {
  year: number;
  scenario: string;
  playerNationId: string;
  apiKey: string;
  provider: Provider;
  model: string;
  difficulty: "Sandbox" | "Easy" | "Realistic" | "Hardcore" | "Impossible";
}

const MODELS: Record<Provider, { id: string; name: string }[]> = {
  local: [
    { id: "claude", name: "Claude (via CLI)" },
    { id: "codex", name: "Codex (via CLI)" },
    { id: "gemini", name: "Gemini (via CLI)" },
  ],
  deepseek: [
    { id: "deepseek-reasoner", name: "DeepSeek R1 (Reasoning)" },
    { id: "deepseek-chat", name: "DeepSeek V3 (Fast)" },
  ],
  google: [
    { id: "gemini-3-flash-preview", name: "Gemini 3 Flash (Preview)" },
    { id: "gemini-3-pro-preview", name: "Gemini 3 Pro (Preview)" },
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash (Stable)" },
  ],
  openai: [
    { id: "o1-preview", name: "o1 Preview (Reasoning)" },
    { id: "o1-mini", name: "o1 Mini (Fast Reasoning)" },
    { id: "gpt-4o", name: "GPT-4o (Standard)" },
  ],
  anthropic: [
    { id: "claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5" },
    { id: "claude-opus-4-6", name: "Claude Opus 4.6" },
    { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5" },
  ],
};

const DIFFICULTY_OPTIONS: { value: GameConfig["difficulty"]; label: string; desc: string; icon: string; gradient: string; ring: string; textActive: string; bgActive: string }[] = [
  { value: "Sandbox", label: "Sandbox", desc: "Creative freedom", icon: "\u{1F3A8}", gradient: "from-slate-600 to-slate-500", ring: "ring-slate-400", textActive: "text-slate-100", bgActive: "bg-gradient-to-br from-slate-700/80 to-slate-600/60" },
  { value: "Easy", label: "Easy", desc: "Forgiving", icon: "\u{1F33F}", gradient: "from-emerald-600 to-emerald-500", ring: "ring-emerald-400", textActive: "text-emerald-100", bgActive: "bg-gradient-to-br from-emerald-900/60 to-emerald-800/40" },
  { value: "Realistic", label: "Realistic", desc: "Standard", icon: "\u2696\uFE0F", gradient: "from-amber-600 to-amber-500", ring: "ring-amber-400", textActive: "text-amber-100", bgActive: "bg-gradient-to-br from-amber-900/60 to-amber-800/40" },
  { value: "Hardcore", label: "Hardcore", desc: "Unforgiving", icon: "\u{1F525}", gradient: "from-red-600 to-red-500", ring: "ring-red-400", textActive: "text-red-100", bgActive: "bg-gradient-to-br from-red-900/60 to-red-800/40" },
  { value: "Impossible", label: "Impossible", desc: "Brutal", icon: "\u{1F480}", gradient: "from-purple-600 to-purple-500", ring: "ring-purple-400", textActive: "text-purple-100", bgActive: "bg-gradient-to-br from-purple-900/60 to-purple-800/40" },
];

const isLocalhost = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
const DEFAULT_PROVIDER: Provider = isLocalhost ? "local" : "deepseek";

const getProviderStorageKey = (provider: Provider) => `oh_key_${provider}`;

const loadProviderKey = (provider: Provider) => {
  if (typeof window === "undefined") return { apiKey: "", remember: false };
  const storageKey = getProviderStorageKey(provider);

  try {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return { apiKey: "", remember: false };

    const decrypted = decryptKey(saved);
    if (!decrypted) {
      localStorage.removeItem(storageKey);
      return { apiKey: "", remember: false };
    }

    return { apiKey: decrypted, remember: true };
  } catch (error) {
    console.error("Failed to load saved API key", error);
    return { apiKey: "", remember: false };
  }
};

const persistProviderKey = (provider: Provider, rawApiKey: string, remember: boolean) => {
  if (typeof window === "undefined") return;
  const storageKey = getProviderStorageKey(provider);

  try {
    if (!remember) {
      localStorage.removeItem(storageKey);
      return;
    }

    const normalizedApiKey = rawApiKey.trim();
    if (!normalizedApiKey) {
      localStorage.removeItem(storageKey);
      return;
    }

    const encrypted = encryptKey(normalizedApiKey);
    if (encrypted) {
      localStorage.setItem(storageKey, encrypted);
    }
  } catch (error) {
    console.error("Failed to persist API key", error);
  }
};

const PROVIDER_INFO: Record<Provider, { name: string; icon: React.ReactNode; color: string }> = {
  local: {
    name: "Local CLI Bridge",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>,
    color: "text-emerald-400",
  },
  deepseek: {
    name: "DeepSeek",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" /></svg>,
    color: "text-blue-400",
  },
  google: {
    name: "Gemini",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" /></svg>,
    color: "text-sky-400",
  },
  openai: {
    name: "OpenAI",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>,
    color: "text-green-400",
  },
  anthropic: {
    name: "Anthropic",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" /></svg>,
    color: "text-orange-400",
  },
};

export default function GameSetup({
  provinces,
  onStartGame,
  onBack,
  preset,
}: GameSetupProps) {
  const [year, setYear] = useState(preset?.year ?? 2026);
  const [scenario, setScenario] = useState(preset?.scenario ?? "The global order is shifting. New alliances are forming...");
  const [playerNationId, setPlayerNationId] = useState("");
  const [nationSearch, setNationSearch] = useState("");

  const [provider, setProvider] = useState<Provider>(DEFAULT_PROVIDER);
  const [apiKey, setApiKey] = useState(() => loadProviderKey(DEFAULT_PROVIDER).apiKey);
  const [rememberKey, setRememberKey] = useState(() => loadProviderKey(DEFAULT_PROVIDER).remember);
  const [model, setModel] = useState(MODELS[DEFAULT_PROVIDER][0].id);
  const [difficulty, setDifficulty] = useState<GameConfig["difficulty"]>((preset?.difficulty as GameConfig["difficulty"]) || "Realistic");
  const [showProviderPanel, setShowProviderPanel] = useState(false);

  const handleProviderChange = (newProvider: Provider) => {
    setProvider(newProvider);
    setModel(MODELS[newProvider][0].id);
    const { apiKey: savedApiKey, remember } = loadProviderKey(newProvider);
    setApiKey(savedApiKey);
    setRememberKey(remember);
  };

  const handleApiKeyChange = (nextApiKey: string) => {
    setApiKey(nextApiKey);
    if (rememberKey) {
      persistProviderKey(provider, nextApiKey, true);
    }
  };

  const handleRememberKeyChange = (nextRemember: boolean) => {
    setRememberKey(nextRemember);
    persistProviderKey(provider, apiKey, nextRemember);
  };

  const majorNations = useMemo(() =>
    provinces
      .filter(p => p.name !== "Antarctica" && !p.name.startsWith("Region"))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [provinces]
  );

  const filteredNations = useMemo(() => {
    if (!nationSearch.trim()) return majorNations;
    const q = nationSearch.toLowerCase();
    return majorNations.filter(p => p.name.toLowerCase().includes(q));
  }, [majorNations, nationSearch]);

  const suggestedNationPicks = useMemo(() =>
    (preset?.suggestedNations || [])
      .map(name => {
        const match = provinces.find(p => p.name.toLowerCase() === name.toLowerCase());
        return match ? { id: match.id, name: match.name } : null;
      })
      .filter((n): n is { id: string | number; name: string } => n !== null)
      .slice(0, 8),
    [preset?.suggestedNations, provinces]
  );

  const selectedNationName = useMemo(() => {
    if (!playerNationId) return null;
    return provinces.find(p => String(p.id) === String(playerNationId))?.name || null;
  }, [playerNationId, provinces]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedApiKey = apiKey.trim();

    if (!playerNationId || (provider !== "local" && !normalizedApiKey)) {
      alert("Please select a nation and provide an API Key.");
      return;
    }

    persistProviderKey(provider, normalizedApiKey, rememberKey);
    onStartGame({ year, scenario, playerNationId, apiKey: normalizedApiKey, provider, model, difficulty });
  };

  const providerInfo = PROVIDER_INFO[provider];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-4 overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full bg-amber-900/8 blur-[120px]" />
        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 rounded-full bg-indigo-900/8 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full rounded-full bg-slate-800/5 blur-[80px]" />
      </div>

      <div className="relative w-full max-w-[680px] animate-scale-in">
        {/* Main card */}
        <div className="relative bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden flex flex-col max-h-[92vh]">
          {/* Top accent line */}
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />

          {/* Header */}
          <div className="relative px-8 pt-7 pb-5 flex items-center gap-4">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-100 hover:bg-slate-800/80 transition-all duration-200 shrink-0"
                title="Back to scenarios"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
              </button>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600 leading-tight truncate">
                {preset?.scenarioName || "Custom Scenario"}
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">Configure your simulation</p>
            </div>
            {/* Provider indicator */}
            <button
              type="button"
              onClick={() => setShowProviderPanel(!showProviderPanel)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-200 shrink-0 ${
                showProviderPanel
                  ? "bg-slate-800 border-amber-600/50 text-slate-200"
                  : "bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-600"
              }`}
              title="AI Provider Settings"
            >
              <span className={providerInfo.color}>{providerInfo.icon}</span>
              <span className="text-xs font-medium hidden sm:inline">{providerInfo.name}</span>
              <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${showProviderPanel ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          </div>

          {/* Scrollable content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 pb-8 space-y-5 setup-scroll">

            {/* AI Provider Panel (collapsible) */}
            {showProviderPanel && (
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5 space-y-4 animate-slide-down">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                  <h3 className="text-sm font-semibold text-slate-300">AI Provider</h3>
                </div>

                {/* Provider buttons */}
                <div className="flex flex-wrap gap-2">
                  {(isLocalhost ? ["local", "deepseek", "google", "openai", "anthropic"] as Provider[] : ["deepseek", "google", "openai", "anthropic"] as Provider[]).map(p => {
                    const info = PROVIDER_INFO[p];
                    const isActive = provider === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handleProviderChange(p)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all duration-200 ${
                          isActive
                            ? "bg-slate-700/60 border-amber-600/50 text-slate-100 shadow-sm"
                            : "bg-slate-800/40 border-slate-700/40 text-slate-500 hover:text-slate-300 hover:border-slate-600"
                        }`}
                      >
                        <span className={isActive ? info.color : ""}>{info.icon}</span>
                        {info.name}
                      </button>
                    );
                  })}
                </div>

                {/* Model select */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Model</label>
                  <select
                    value={model}
                    onChange={e => setModel(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 outline-none transition-all appearance-none cursor-pointer"
                  >
                    {MODELS[provider].map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                {/* API Key or Local info */}
                {provider === "local" ? (
                  <div className="flex items-start gap-3 p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-lg">
                    <svg className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                    </svg>
                    <div>
                      <p className="text-sm text-emerald-300">No API key needed</p>
                      <p className="text-xs text-emerald-500/80 mt-0.5">Using local CLI bridge at <code className="text-emerald-400">localhost:3456</code></p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">API Key</label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={e => handleApiKeyChange(e.target.value)}
                      className="w-full bg-slate-900/80 border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 outline-none transition-all"
                      placeholder={`Enter your ${providerInfo.name} API key`}
                    />
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-slate-600">Stored in memory only unless saved</p>
                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-500 hover:text-slate-400 transition-colors">
                        <input
                          type="checkbox"
                          checked={rememberKey}
                          onChange={e => handleRememberKeyChange(e.target.checked)}
                          className="accent-amber-600 w-3.5 h-3.5"
                        />
                        Remember (encrypted)
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ---- SCENARIO SECTION ---- */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-900/30 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                  </svg>
                </div>
                <h2 className="text-sm font-semibold text-slate-300">Scenario</h2>
              </div>

              {/* Year & Difficulty Row */}
              <div className="flex gap-4">
                <div className="w-32 shrink-0">
                  <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Year</label>
                  <input
                    type="number"
                    value={isNaN(year) ? "" : year}
                    onChange={e => setYear(parseInt(e.target.value))}
                    className="w-full bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2.5 text-slate-100 text-lg font-mono font-bold text-center focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 outline-none transition-all"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">Difficulty</label>
                  <div className="flex gap-1.5">
                    {DIFFICULTY_OPTIONS.map(opt => {
                      const isActive = difficulty === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setDifficulty(opt.value)}
                          className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg border transition-all duration-200 ${
                            isActive
                              ? `${opt.bgActive} border-current/20 ${opt.textActive} ring-1 ${opt.ring}/30 ring-offset-1 ring-offset-slate-900`
                              : "bg-slate-800/40 border-slate-700/30 text-slate-500 hover:text-slate-400 hover:bg-slate-800/60 hover:border-slate-600/50"
                          }`}
                        >
                          <span className="text-base leading-none">{opt.icon}</span>
                          <span className="text-[10px] font-bold leading-tight tracking-wide">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Scenario Context */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wide">World Context</label>
                <textarea
                  value={scenario}
                  onChange={e => setScenario(e.target.value)}
                  className="w-full h-28 bg-slate-800/40 border border-slate-700/40 rounded-xl px-4 py-3 text-sm text-slate-200 leading-relaxed resize-none placeholder-slate-600 focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/15 outline-none transition-all"
                  placeholder="Describe the state of the world..."
                />
                <p className="text-[11px] text-slate-600 mt-1">Sets the initial mood and logic for the AI Game Master</p>
              </div>
            </div>

            {/* Decorative divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-slate-700/60 to-transparent" />

            {/* ---- NATION SECTION ---- */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-900/30 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
                  </svg>
                </div>
                <h2 className="text-sm font-semibold text-slate-300">Choose Your Nation</h2>
                {selectedNationName && (
                  <span className="ml-auto text-xs font-bold text-amber-400 bg-amber-900/30 px-2.5 py-1 rounded-lg border border-amber-700/30">
                    {selectedNationName}
                  </span>
                )}
              </div>

              {/* Suggested nations */}
              {suggestedNationPicks.length > 0 && (
                <div>
                  <p className="text-[11px] text-slate-600 mb-2 uppercase tracking-wider font-medium">Recommended for this scenario</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedNationPicks.map(n => {
                      const isSelected = String(playerNationId) === String(n.id);
                      return (
                        <button
                          key={String(n.id)}
                          type="button"
                          onClick={() => setPlayerNationId(String(n.id))}
                          className={`text-sm px-4 py-2 rounded-xl border transition-all duration-200 font-medium ${
                            isSelected
                              ? "bg-amber-900/40 border-amber-600/50 text-amber-300 shadow-sm shadow-amber-900/20 ring-1 ring-amber-500/20"
                              : "bg-slate-800/50 border-slate-700/40 text-slate-400 hover:text-slate-200 hover:border-slate-500/60 hover:bg-slate-800/70"
                          }`}
                        >
                          {n.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Search & Select */}
              <div className="relative">
                <div className="flex items-center gap-2 bg-slate-800/40 border border-slate-700/40 rounded-xl px-3 focus-within:border-amber-500/40 focus-within:ring-1 focus-within:ring-amber-500/15 transition-all">
                  <svg className="w-4 h-4 text-slate-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  </svg>
                  <input
                    type="text"
                    value={nationSearch}
                    onChange={e => setNationSearch(e.target.value)}
                    placeholder="Search all nations..."
                    className="flex-1 bg-transparent border-none py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none"
                  />
                  {nationSearch && (
                    <button
                      type="button"
                      onClick={() => setNationSearch("")}
                      className="text-slate-600 hover:text-slate-400 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Nation grid (shown when searching or no suggestion picked) */}
                {nationSearch.trim() && (
                  <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-slate-700/40 bg-slate-900/90 backdrop-blur-sm divide-y divide-slate-800/50">
                    {filteredNations.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-slate-600">No nations found</div>
                    ) : (
                      filteredNations.map(p => {
                        const isSelected = String(playerNationId) === String(p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => { setPlayerNationId(String(p.id)); setNationSearch(""); }}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                              isSelected
                                ? "bg-amber-900/30 text-amber-300"
                                : "text-slate-300 hover:bg-slate-800/60"
                            }`}
                          >
                            {p.name}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Fallback select for non-search users */}
              {!nationSearch.trim() && (
                <select
                  value={playerNationId}
                  onChange={e => setPlayerNationId(e.target.value)}
                  className="w-full bg-slate-800/40 border border-slate-700/40 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/15 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="">Browse all nations...</option>
                  {majorNations.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={!playerNationId}
              className="w-full py-4 mt-2 bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white font-bold rounded-xl shadow-lg transition-all duration-300 flex items-center justify-center gap-3 hover:shadow-xl hover:shadow-amber-900/30 hover:-translate-y-0.5 active:translate-y-0 disabled:hover:translate-y-0 disabled:hover:shadow-lg disabled:cursor-not-allowed group"
            >
              <svg className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
              </svg>
              {playerNationId ? "Begin Simulation" : "Select a Nation to Begin"}
            </button>
          </form>

          {/* Bottom accent line */}
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
        </div>
      </div>
    </div>
  );
}
