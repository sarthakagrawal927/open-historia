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

const DIFFICULTY_OPTIONS: { value: GameConfig["difficulty"]; label: string; icon: string }[] = [
  { value: "Sandbox", label: "Sandbox", icon: "\u{1F3D6}\uFE0F" },
  { value: "Easy", label: "Easy", icon: "\u{1F33F}" },
  { value: "Realistic", label: "Realistic", icon: "\u2696\uFE0F" },
  { value: "Hardcore", label: "Hardcore", icon: "\u2694\uFE0F" },
  { value: "Impossible", label: "Impossible", icon: "\u{1F480}" },
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
    if (!decrypted) { localStorage.removeItem(storageKey); return { apiKey: "", remember: false }; }
    return { apiKey: decrypted, remember: true };
  } catch { return { apiKey: "", remember: false }; }
};

const persistProviderKey = (provider: Provider, rawApiKey: string, remember: boolean) => {
  if (typeof window === "undefined") return;
  const storageKey = getProviderStorageKey(provider);
  try {
    if (!remember) { localStorage.removeItem(storageKey); return; }
    const normalizedApiKey = rawApiKey.trim();
    if (!normalizedApiKey) { localStorage.removeItem(storageKey); return; }
    const encrypted = encryptKey(normalizedApiKey);
    if (encrypted) localStorage.setItem(storageKey, encrypted);
  } catch { /* ignore */ }
};

/* -------------------------------------------------------------------------- */
/* SVG Icons (inline to avoid Material Symbols dep)                           */
/* -------------------------------------------------------------------------- */
const IconBack = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
);
const IconAI = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" /></svg>
);
const IconBook = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" /></svg>
);
const IconFlag = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" /></svg>
);
const IconGlobe = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A8.966 8.966 0 0 1 3 12c0-1.264.26-2.467.73-3.558" /></svg>
);
const IconCheck = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75" /></svg>
);
const IconPlay = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" /></svg>
);
const IconChevron = () => (
  <svg className="w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
);

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function GameSetup({ provinces, onStartGame, onBack, preset }: GameSetupProps) {
  const [year, setYear] = useState(preset?.year ?? 2026);
  const [scenario, setScenario] = useState(preset?.scenario ?? "The global order is shifting. New alliances are forming...");
  const [playerNationId, setPlayerNationId] = useState("");
  const [provider, setProvider] = useState<Provider>(DEFAULT_PROVIDER);
  const [apiKey, setApiKey] = useState(() => loadProviderKey(DEFAULT_PROVIDER).apiKey);
  const [rememberKey, setRememberKey] = useState(() => loadProviderKey(DEFAULT_PROVIDER).remember);
  const [model, setModel] = useState(MODELS[DEFAULT_PROVIDER][0].id);
  const [difficulty, setDifficulty] = useState<GameConfig["difficulty"]>((preset?.difficulty as GameConfig["difficulty"]) || "Realistic");
  const [editingScenario, setEditingScenario] = useState(false);

  const handleProviderChange = (newProvider: Provider) => {
    setProvider(newProvider);
    setModel(MODELS[newProvider][0].id);
    const { apiKey: savedApiKey, remember } = loadProviderKey(newProvider);
    setApiKey(savedApiKey);
    setRememberKey(remember);
  };
  const handleApiKeyChange = (v: string) => { setApiKey(v); if (rememberKey) persistProviderKey(provider, v, true); };
  const handleRememberKeyChange = (v: boolean) => { setRememberKey(v); persistProviderKey(provider, apiKey, v); };

  // Show only top-level countries in the picker (one entry per country, not sub-provinces)
  const majorNations = useMemo(() => {
    const seen = new Set<string>();
    return provinces
      .filter(p => p.name !== "Antarctica" && !p.name.startsWith("Region"))
      .filter(p => {
        // For sub-national provinces, deduplicate by parent country
        const key = p.parentCountryId || String(p.id);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(p => ({
        ...p,
        // Show parent country name for subdivided nations
        name: p.parentCountryName || p.name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [provinces]);

  const suggestedNationPicks = useMemo(() =>
    (preset?.suggestedNations || [])
      .map(name => {
        // Try matching by parent country name first, then by province name
        const m = provinces.find(p =>
          (p.parentCountryName || p.name).toLowerCase() === name.toLowerCase()
        );
        return m ? { id: m.id, name: m.parentCountryName || m.name } : null;
      })
      .filter((n): n is { id: string | number; name: string } => n !== null)
      // Deduplicate
      .filter((n, i, arr) => arr.findIndex(x => x.name === n.name) === i)
      .slice(0, 8),
    [preset?.suggestedNations, provinces]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const k = apiKey.trim();
    if (!playerNationId || (provider !== "local" && !k)) { alert("Please select a nation and provide an API Key."); return; }
    persistProviderKey(provider, k, rememberKey);
    onStartGame({ year, scenario, playerNationId, apiKey: k, provider, model, difficulty });
  };

  const providerLabel = provider === "local" ? "Local CLI Bridge (No Key)" : provider === "deepseek" ? "DeepSeek" : provider === "google" ? "Google Gemini" : provider === "openai" ? "OpenAI" : "Anthropic Claude";

  /* ---- card wrapper: matches the reference design exactly ---- */
  const Card = ({ children, glowFrom, glowTo }: { children: React.ReactNode; glowFrom: string; glowTo: string }) => (
    <section className="relative group bg-[#151B2B] rounded-2xl p-5 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.4)] border border-gray-800">
      <div className={`absolute -inset-0.5 bg-gradient-to-r ${glowFrom} ${glowTo} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
      <div className="relative">{children}</div>
    </section>
  );

  const SelectWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="relative">
      {children}
      <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"><IconChevron /></span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0F19] overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
      </div>

      <main className="relative w-full max-w-3xl mx-auto h-full sm:h-auto sm:max-h-[92vh] sm:my-4 bg-[#0B0F19] sm:rounded-3xl sm:border sm:border-gray-800/60 sm:shadow-2xl overflow-hidden flex flex-col animate-scale-in">
        {/* Sticky header */}
        <header className="px-6 py-5 flex items-center justify-between sticky top-0 z-10 bg-[#0B0F19]/80 backdrop-blur-md border-b border-gray-800/50">
          {onBack ? (
            <button type="button" onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-800 transition-colors text-gray-400">
              <IconBack />
            </button>
          ) : <div className="w-10" />}
          <div className="flex flex-col items-center">
            <h1 className="font-[var(--font-playfair)] text-2xl font-bold text-white tracking-wide">
              {preset?.scenarioName || "Custom Scenario"}
            </h1>
            <span className="text-[10px] uppercase tracking-widest text-amber-500 font-bold mt-0.5">Configure</span>
          </div>
          <div className="px-2 py-1 bg-amber-500/10 rounded text-[10px] font-mono text-amber-500 border border-amber-500/20">
            v2026.2
          </div>
        </header>

        {/* Scrollable content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 pb-28 pt-5 setup-scroll">

          {/* Top row: AI + Nation side by side on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">

            {/* ============================================================ */}
            {/* AI Neural Core Card                                          */}
            {/* ============================================================ */}
            <Card glowFrom="from-blue-500/20" glowTo="to-purple-500/20">
              <div className="flex items-center space-x-2 mb-4">
                <span className="text-blue-400"><IconAI /></span>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">AI Neural Core</h2>
              </div>

              <div className="space-y-4">
                {/* Provider */}
                <div>
                  <label className="text-xs text-gray-400 ml-1 mb-1 block">Provider</label>
                  <SelectWrapper>
                    <select
                      value={provider}
                      onChange={e => handleProviderChange(e.target.value as Provider)}
                      className="w-full bg-[#1E2538] border-none rounded-xl py-3 pl-4 pr-10 text-sm text-gray-200 shadow-inner appearance-none focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                    >
                      {isLocalhost && <option value="local">Local CLI Bridge (No Key)</option>}
                      <option value="deepseek">DeepSeek</option>
                      <option value="google">Google Gemini</option>
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic Claude</option>
                    </select>
                  </SelectWrapper>
                </div>

                {/* Model */}
                <div>
                  <label className="text-xs text-gray-400 ml-1 mb-1 block">Model</label>
                  <SelectWrapper>
                    <select
                      value={model}
                      onChange={e => setModel(e.target.value)}
                      className="w-full bg-[#1E2538] border-none rounded-xl py-3 pl-4 pr-10 text-sm text-gray-200 shadow-inner appearance-none focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                    >
                      {MODELS[provider].map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </SelectWrapper>
                </div>

                {/* Status / API Key */}
                {provider === "local" ? (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start space-x-3">
                    <span className="text-emerald-500 mt-0.5"><IconCheck /></span>
                    <p className="text-xs text-emerald-400 leading-relaxed">
                      Using local CLI bridge at <span className="font-mono">localhost:3456</span>. No API key needed.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 ml-1 mb-1 block">API Key</label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={e => handleApiKeyChange(e.target.value)}
                      className="w-full bg-[#1E2538] border-none rounded-xl py-3 px-4 text-sm text-gray-200 shadow-inner placeholder-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder={`Enter your ${providerLabel} API key`}
                    />
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] text-gray-600">Stored in memory only unless saved</span>
                      <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-gray-500 hover:text-gray-400 transition-colors">
                        <input type="checkbox" checked={rememberKey} onChange={e => handleRememberKeyChange(e.target.checked)} className="accent-amber-600 w-3 h-3" />
                        Remember (encrypted)
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* ============================================================ */}
            {/* Nation Card                                                   */}
            {/* ============================================================ */}
            <Card glowFrom="from-indigo-500/20" glowTo="to-cyan-500/20">
              <div className="flex items-center space-x-2 mb-4">
                <span className="text-indigo-400"><IconFlag /></span>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Nation</h2>
              </div>

              {/* Suggested nations */}
              {suggestedNationPicks.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2">Suggested for this scenario:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedNationPicks.map(n => {
                      const sel = String(playerNationId) === String(n.id);
                      return (
                        <button
                          key={String(n.id)}
                          type="button"
                          onClick={() => setPlayerNationId(String(n.id))}
                          className={`px-3 py-1.5 rounded-lg text-xs transition-all duration-200 border ${
                            sel
                              ? "bg-indigo-900/40 border-indigo-500/40 text-indigo-300 shadow-sm"
                              : "bg-gray-800 border-transparent text-gray-300 hover:bg-indigo-900/20 hover:border-indigo-500/30"
                          }`}
                        >
                          {n.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Play As select */}
              <div>
                <label className="text-xs text-gray-400 ml-1 mb-1 block">Play As</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-indigo-400"><IconGlobe /></span>
                  </div>
                  <select
                    value={playerNationId}
                    onChange={e => setPlayerNationId(e.target.value)}
                    className="w-full bg-[#1E2538] border-none rounded-xl py-3 pl-10 pr-10 text-sm text-gray-200 shadow-inner appearance-none focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                  >
                    <option value="">-- Select a Nation --</option>
                    {majorNations.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"><IconChevron /></span>
                </div>
              </div>

              {/* Year */}
              <div className="mt-4">
                <label className="text-xs text-gray-400 ml-1 mb-1 block">Start Year</label>
                <input
                  type="number"
                  value={isNaN(year) ? "" : year}
                  onChange={e => setYear(parseInt(e.target.value))}
                  className="w-full bg-[#1E2538] border-none rounded-xl py-3 px-4 text-sm font-mono font-bold text-white shadow-inner focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              {/* Difficulty */}
              <div className="mt-4">
                <label className="text-xs text-gray-400 ml-1 mb-1 block">Difficulty</label>
                <div className="grid grid-cols-5 bg-[#1E2538] rounded-xl p-1 shadow-inner gap-1">
                  {DIFFICULTY_OPTIONS.map(opt => {
                    const isActive = difficulty === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDifficulty(opt.value)}
                        className={`rounded-lg py-2 text-[11px] font-medium flex flex-col items-center justify-center transition-all duration-200 ${
                          isActive
                            ? "bg-gray-700 shadow-sm text-white"
                            : "text-gray-500 hover:text-gray-300"
                        }`}
                        title={opt.label}
                      >
                        <span className="text-base leading-none">{opt.icon}</span>
                        <span className="mt-0.5">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </Card>
          </div>

          {/* ================================================================ */}
          {/* Scenario Card — full width below                                 */}
          {/* ================================================================ */}
          <Card glowFrom="from-orange-500/20" glowTo="to-red-500/20">
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-orange-400"><IconBook /></span>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Scenario</h2>
            </div>

            {/* Historical Context */}
            <div>
              <label className="text-xs text-gray-400 ml-1 mb-1 block">Historical Context</label>
              {editingScenario ? (
                <textarea
                  value={scenario}
                  onChange={e => setScenario(e.target.value)}
                  onBlur={() => setEditingScenario(false)}
                  autoFocus
                  className="w-full h-28 bg-[#1E2538] border border-gray-700/50 rounded-xl px-4 py-3 text-sm text-gray-300 leading-relaxed resize-none shadow-inner focus:ring-2 focus:ring-orange-500 outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingScenario(true)}
                  className="w-full text-left bg-[#1E2538] p-4 rounded-xl border border-gray-700/50 hover:border-gray-600 transition-colors cursor-text group"
                >
                  <p className="text-sm text-gray-300 leading-relaxed font-serif italic line-clamp-3">
                    &ldquo;{scenario}&rdquo;
                  </p>
                  <span className="text-[10px] text-gray-600 mt-2 block group-hover:text-gray-500 transition-colors">Click to edit</span>
                </button>
              )}
              <p className="text-[10px] text-gray-500 mt-2 ml-1">The AI will use this context to set the initial mood and logic.</p>
            </div>
          </Card>
        </form>

        {/* Sticky bottom CTA */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-5 pt-10 bg-gradient-to-t from-[#0B0F19] via-[#0B0F19] to-transparent z-20">
          <button
            type="submit"
            disabled={!playerNationId}
            onClick={handleSubmit}
            className="w-full max-w-md mx-auto block relative overflow-hidden rounded-xl shadow-lg shadow-orange-900/20 group transform active:scale-[0.97] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-700 group-hover:brightness-110 transition-all" />
            <div className="relative py-4 px-6 flex items-center justify-center space-x-2">
              <span className="text-white animate-pulse"><IconPlay /></span>
              <span className="text-white font-semibold tracking-wide">
                {playerNationId ? "Initialize Simulation" : "Select a Nation"}
              </span>
            </div>
          </button>
        </div>
      </main>
    </div>
  );
}
