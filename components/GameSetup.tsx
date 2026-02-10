"use client";

import React, { useState } from "react";
import { Province } from "@/lib/types";
import { encryptKey, decryptKey } from "@/lib/crypto";
import type { SavedGame } from "@/lib/game-storage";

interface GameSetupProps {
  provinces: Province[];
  onStartGame: (config: GameConfig) => void;
  savedGames?: SavedGame[];
  onLoadSavedGame?: (saveId: string) => void;
  onDeleteSavedGame?: (saveId: string) => void;
  onRefreshSavedGames?: () => void;
  preset?: { year: number; scenario: string; difficulty: string; suggestedNations: string[] } | null;
}

export type Provider = "google" | "openai" | "anthropic" | "deepseek";

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
    { id: "claude-3-5-sonnet-20240620", name: "Claude 3.5 Sonnet" },
    { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku" },
  ],
};

const DEFAULT_PROVIDER: Provider = "google";

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

export default function GameSetup({
  provinces,
  onStartGame,
  savedGames = [],
  onLoadSavedGame,
  onDeleteSavedGame,
  onRefreshSavedGames,
  preset,
}: GameSetupProps) {
  const [year, setYear] = useState(preset?.year ?? 2026);
  const [scenario, setScenario] = useState(preset?.scenario ?? "The global order is shifting. New alliances are forming...");
  const [playerNationId, setPlayerNationId] = useState("");

  const [provider, setProvider] = useState<Provider>(DEFAULT_PROVIDER);
  
  const [apiKey, setApiKey] = useState(() => loadProviderKey(DEFAULT_PROVIDER).apiKey);
  
  const [rememberKey, setRememberKey] = useState(() => loadProviderKey(DEFAULT_PROVIDER).remember);

  const [model, setModel] = useState(MODELS[DEFAULT_PROVIDER][0].id);
  const [difficulty, setDifficulty] = useState<GameConfig["difficulty"]>((preset?.difficulty as GameConfig["difficulty"]) || "Realistic");

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

  const majorNations = provinces
    .filter(p => p.name !== "Antarctica" && !p.name.startsWith("Region"))
    .sort((a, b) => a.name.localeCompare(b.name));

  const getProviderName = (p: Provider) => {
    switch (p) {
      case "google": return "Gemini";
      case "deepseek": return "DeepSeek";
      case "openai": return "OpenAI";
      case "anthropic": return "Anthropic";
      default: return "AI";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedApiKey = apiKey.trim();

    if (!playerNationId || !normalizedApiKey) {
        alert("Please select a nation and provide an API Key.");
        return;
    }

    persistProviderKey(provider, normalizedApiKey, rememberKey);
    onStartGame({ year, scenario, playerNationId, apiKey: normalizedApiKey, provider, model, difficulty });
  };

	  return (
	    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4">
	      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-serif text-amber-500 mb-2">Open Historia</h1>
                <p className="text-slate-400">Generative Grand Strategy Engine</p>
            </div>
            <div className="px-3 py-1 bg-amber-900/50 text-amber-300 text-xs font-mono rounded border border-amber-800">
                v2026.2.8
            </div>
        </div>
        
	        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
            
            {/* API Key Section */}
            <div className="p-4 bg-slate-800/50 rounded border border-slate-700 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-300 mb-2">AI Provider</label>
                        <select 
                            value={provider}
                            onChange={e => handleProviderChange(e.target.value as Provider)}
                            className="w-full bg-slate-950 border border-slate-600 rounded p-2 text-slate-100 focus:border-amber-500 outline-none"
                        >
                            <option value="deepseek">DeepSeek (New)</option>
                            <option value="google">Google Gemini</option>
                            <option value="openai">OpenAI</option>
                            <option value="anthropic">Anthropic Claude</option>
                        </select>
                    </div>
                    <div>
                         <label className="block text-sm font-bold text-slate-300 mb-2">Model</label>
                         <select 
                            value={model}
                            onChange={e => setModel(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-600 rounded p-2 text-slate-100 focus:border-amber-500 outline-none"
                        >
                            {MODELS[provider].map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2">API Key</label>
                    <input 
                        type="password" 
                        value={apiKey}
                        onChange={e => handleApiKeyChange(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-600 rounded p-2 text-slate-100 focus:border-amber-500 outline-none"
                        placeholder={`Enter your ${getProviderName(provider)} API Key`}
                    />
                    <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-slate-500">Keys are stored in memory only unless saved.</p>
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 hover:text-slate-300">
                            <input 
                                type="checkbox" 
                                checked={rememberKey}
                                onChange={e => handleRememberKeyChange(e.target.checked)}
                                className="accent-amber-600 bg-slate-900 border-slate-600 rounded focus:ring-amber-500"
                            />
                            Remember Key (Encrypted)
                        </label>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-bold text-slate-400 mb-1">Starting Year</label>
                    <input 
                        type="number" 
                        value={isNaN(year) ? "" : year}
                        onChange={e => setYear(parseInt(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-100"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-400 mb-1">Difficulty</label>
                    <select 
                        value={difficulty}
                        onChange={e => setDifficulty(e.target.value as GameConfig["difficulty"])}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-100"
                    >
                        <option value="Sandbox">Sandbox (Creative Freedom)</option>
                        <option value="Easy">Easy (Forgiving)</option>
                        <option value="Realistic">Realistic (Standard)</option>
                        <option value="Hardcore">Hardcore (Unforgiving)</option>
                        <option value="Impossible">Impossible (Brutal)</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-400 mb-1">Play As</label>
                <select 
                    value={playerNationId}
                        onChange={e => setPlayerNationId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-100"
                    >
                        <option value="">-- Select a Nation --</option>
                        {majorNations.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-400 mb-1">Scenario Context</label>
                <textarea 
                    value={scenario}
                    onChange={e => setScenario(e.target.value)}
                    className="w-full h-32 bg-slate-950 border border-slate-700 rounded p-2 text-slate-100 resize-none"
                    placeholder="Describe the state of the world..."
                />
                <p className="text-xs text-slate-500 mt-1">The AI will use this to set the initial mood and logic.</p>
            </div>

	            <button 
	                type="submit"
	                className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded shadow-lg transition-colors"
	            >
	                Initialize Simulation
	            </button>

              <div className="pt-4 border-t border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-slate-300">Saved Games</h2>
                  <button
                    type="button"
                    onClick={() => onRefreshSavedGames?.()}
                    className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-200"
                  >
                    Refresh
                  </button>
                </div>

                {savedGames.length === 0 && (
                  <p className="text-xs text-slate-500">No saves found in local storage yet.</p>
                )}

                {savedGames.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {savedGames.map((save) => (
                      <div key={save.id} className="flex items-center justify-between gap-3 p-2 rounded border border-slate-700 bg-slate-800/40">
                        <div className="min-w-0">
                          <div className="text-xs text-slate-200 truncate">
                            {save.id === "autosave" ? "Autosave" : "Manual Save"}
                            {" · "}
                            {new Date(save.timestamp).toLocaleString()}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            Turn {save.gameState.turn} · {save.gameConfig.provider}/{save.gameConfig.model}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => onLoadSavedGame?.(save.id)}
                            className="text-[11px] uppercase bg-amber-700 hover:bg-amber-600 text-white font-bold px-2 py-1 rounded"
                          >
                            Load
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteSavedGame?.(save.id)}
                            className="text-[11px] uppercase bg-rose-700 hover:bg-rose-600 text-white font-bold px-2 py-1 rounded"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
	        </form>
	      </div>
	    </div>
	  );
	}
