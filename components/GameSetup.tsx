"use client";

import React, { useState } from "react";
import { Province } from "@/lib/types";

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
}

const MODELS: Record<Provider, { id: string; name: string }[]> = {
  deepseek: [
    { id: "deepseek-reasoner", name: "DeepSeek R1 (Reasoning)" },
    { id: "deepseek-chat", name: "DeepSeek V3 (Fast)" },
  ],
  google: [
    { id: "gemini-2.0-pro-exp-02-05", name: "Gemini 2.0 Pro (Exp)" },
    { id: "gemini-2.0-flash-thinking-exp-01-21", name: "Gemini 2.0 Flash Thinking" },
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
  ],
  openai: [
    { id: "o1", name: "o1 (High Reasoning)" },
    { id: "o3-mini", name: "o3-mini (Fast Reasoning)" },
    { id: "gpt-4o", name: "GPT-4o (Versatile)" },
  ],
  anthropic: [
    { id: "claude-3-5-sonnet-latest", name: "Claude 3.5 Sonnet (New)" },
    { id: "claude-3-5-haiku-latest", name: "Claude 3.5 Haiku" },
    { id: "claude-3-opus-latest", name: "Claude 3 Opus" },
  ],
};

export default function GameSetup({ provinces, onStartGame }: GameSetupProps) {
  const [year, setYear] = useState(2026);
  const [scenario, setScenario] = useState("The global order is shifting. New alliances are forming...");
  const [playerNationId, setPlayerNationId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState<Provider>("deepseek");
  const [model, setModel] = useState(MODELS["deepseek"][0].id);

  // Update model when provider changes
  const handleProviderChange = (newProvider: Provider) => {
    setProvider(newProvider);
    setModel(MODELS[newProvider][0].id);
  };

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
    onStartGame({ year, scenario, playerNationId, apiKey, provider, model });
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
                    <p className="text-xs text-slate-500 mt-1">Keys are stored in memory only.</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-bold text-slate-400 mb-1">Starting Year</label>
                    <input 
                        type="number" 
                        value={year}
                        onChange={e => setYear(parseInt(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-100"
                    />
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
