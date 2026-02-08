"use client";

import React, { useState, useEffect } from "react";
import { Province } from "@/lib/types";
import { encryptKey, decryptKey } from "@/lib/crypto";

interface GameSetupProps {
  provinces: Province[];
  onStartGame: (config: GameConfig) => void;
}

export type Provider = "google" | "openai" | "anthropic" | "deepseek";

export interface GameConfig {
  year: number;
  scenario: string;
  playerNationId: string;
  apiKey: string;
  provider: Provider;
  model: string;
  difficulty: "Sandbox" | "Easy" | "Realistic" | "Hardcore";
}

const MODELS: Record<Provider, { id: string; name: string }[]> = {
  deepseek: [
    { id: "deepseek-reasoner", name: "DeepSeek R1 (Reasoning)" },
    { id: "deepseek-chat", name: "DeepSeek V3 (Fast)" },
  ],
  google: [
    { id: "gemini-3.0-flash", name: "Gemini 3.0 Flash" },
    { id: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash (Exp)" },
    { id: "gemini-1.5-pro-001", name: "Gemini 1.5 Pro (Stable)" },
    { id: "gemini-1.5-flash-001", name: "Gemini 1.5 Flash (Fast)" },
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

export default function GameSetup({ provinces, onStartGame }: GameSetupProps) {
  const [year, setYear] = useState(2026);
  const [scenario, setScenario] = useState("The global order is shifting. New alliances are forming...");
  const [playerNationId, setPlayerNationId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [rememberKey, setRememberKey] = useState(false);
  const [provider, setProvider] = useState<Provider>("google");
  const [model, setModel] = useState(MODELS["google"][0].id);
  const [difficulty, setDifficulty] = useState<GameConfig["difficulty"]>("Realistic");

  // Load key from storage
  useEffect(() => {
    const saved = localStorage.getItem(`oh_key_${provider}`);
    if (saved) {
      const decrypted = decryptKey(saved);
      if (decrypted) {
        setApiKey(decrypted);
        setRememberKey(true);
      }
    } else {
        setApiKey("");
        setRememberKey(false);
    }
  }, [provider]);

  // Update model when provider changes
  const handleProviderChange = (newProvider: Provider) => {
    setProvider(newProvider);
    setModel(MODELS[newProvider][0].id);
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
    if (!playerNationId || !apiKey) {
        alert("Please select a nation and provide an API Key.");
        return;
    }

    if (rememberKey) {
        localStorage.setItem(`oh_key_${provider}`, encryptKey(apiKey));
    } else {
        localStorage.removeItem(`oh_key_${provider}`);
    }

    onStartGame({ year, scenario, playerNationId, apiKey, provider, model, difficulty });
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
                        onChange={e => setApiKey(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-600 rounded p-2 text-slate-100 focus:border-amber-500 outline-none"
                        placeholder={`Enter your ${getProviderName(provider)} API Key`}
                    />
                    <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-slate-500">Keys are stored in memory only unless saved.</p>
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 hover:text-slate-300">
                            <input 
                                type="checkbox" 
                                checked={rememberKey}
                                onChange={e => setRememberKey(e.target.checked)}
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
                        onChange={e => setDifficulty(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-100"
                    >
                        <option value="Sandbox">Sandbox (Creative Freedom)</option>
                        <option value="Easy">Easy (Forgiving)</option>
                        <option value="Realistic">Realistic (Standard)</option>
                        <option value="Hardcore">Hardcore (Unforgiving)</option>
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
        </form>
      </div>
    </div>
  );
}
