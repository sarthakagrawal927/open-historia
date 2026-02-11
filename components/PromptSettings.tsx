"use client";

import React, { useState, useEffect } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PromptOverrides {
  gameMasterPreamble: string;
  adjudicationRules: string;
  diplomacyInstructions: string;
  advisorPersonality: string;
}

const STORAGE_KEY = "open-historia-prompt-overrides";

// ---------------------------------------------------------------------------
// Default prompt fragments (must stay in sync with ai-prompts.ts)
// ---------------------------------------------------------------------------

const DEFAULTS: PromptOverrides = {
  gameMasterPreamble: `You are the GAME MASTER of "Open Historia", a grand strategy simulation. You simulate the world -- adjudicating actions, voicing nations, and driving consequences. The world is alive: nations pursue their own agendas independently of the player.`,

  adjudicationRules: `- Military: assess balance realistically (army size, tech, terrain, supply, morale, alliances). Wars take time -- report progress, not instant victory. Other nations REACT to military moves. LARGE NATIONS (China, Russia, USA, India, Brazil, etc.) CANNOT be conquered in a single action — require multi-step regional campaigns over many turns. Narrate partial territorial gains, resistance, and ongoing fronts.
- Diplomacy: roleplay as target nation's leader with their own personality, fears, interests, and leverage. Treaties need mutual benefit. Historical grievances and cultural alignment matter.
- Political: coups need military/intelligence groundwork. Sanctions take months to bite. Espionage can fail catastrophically. Domestic politics constrain leaders.
- Economy: has inertia. Infrastructure takes years. Resource and geographic constraints apply. Spillover effects on trade partners.
- Impossible actions: reject with wry narrative. Implausible actions: narrate the realistic failure. Well-planned actions: succeed proportionally to quality and difficulty.
- DO NOT advance time -- the player controls the clock. Never emit "time" updates.`,

  diplomacyInstructions: `Before responding, consider: What does the target nation WANT? What does it FEAR? What LEVERAGE does it have? Respond from the nation's authentic interests, culture, and strategic position. Match formality/style to the era (medieval king vs. modern president). Advance your own agenda -- propose counter-offers, make demands.

Only change relations for SIGNIFICANT shifts (treaty agreed, threat made, trust broken) -- not minor pleasantries.`,

  advisorPersonality: `You are the Grand Advisor to the ruler. Loyal, blunt, strategically brilliant. Address the ruler appropriately for the era ("my liege", "your majesty", "sir/madam", etc.).

Think in terms of grand strategy across military, diplomatic, economic, and domestic dimensions. Consider second-order effects ("if we do X, then Y happens, making Z possible"). Reference specific nations and events. Give concrete, actionable recommendations.`,
};

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

export function loadPromptOverrides(): PromptOverrides {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<PromptOverrides>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

export function savePromptOverrides(overrides: PromptOverrides): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  open: boolean;
  onClose: () => void;
}

const FIELDS: { key: keyof PromptOverrides; label: string; rows: number }[] = [
  { key: "gameMasterPreamble", label: "Game Master Preamble", rows: 4 },
  { key: "adjudicationRules", label: "Adjudication Rules", rows: 10 },
  { key: "diplomacyInstructions", label: "Diplomacy Instructions", rows: 5 },
  { key: "advisorPersonality", label: "Advisor Personality", rows: 5 },
];

export default function PromptSettings({ open, onClose }: Props) {
  const [overrides, setOverrides] = useState<PromptOverrides>(DEFAULTS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) setOverrides(loadPromptOverrides());
  }, [open]);

  if (!open) return null;

  const handleChange = (key: keyof PromptOverrides, value: string) => {
    setOverrides((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    savePromptOverrides(overrides);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setOverrides(DEFAULTS);
    savePromptOverrides(DEFAULTS);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0">
          <h2 className="text-sm uppercase tracking-wide text-slate-200 font-bold">
            Prompt Settings
          </h2>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="text-emerald-400 text-xs">Saved</span>
            )}
            <button
              onClick={handleReset}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded"
            >
              Reset Defaults
            </button>
            <button
              onClick={handleSave}
              className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-3 py-1 rounded uppercase"
            >
              Save
            </button>
            <button
              onClick={onClose}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded"
            >
              Close
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <p className="text-xs text-slate-400">
            Customize the AI prompt templates used by the Game Master, Diplomacy, and Advisor systems.
            Changes apply to all future AI calls. Reset to restore original prompts.
          </p>

          {FIELDS.map(({ key, label, rows }) => (
            <div key={key}>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide mb-1">
                {label}
              </label>
              <textarea
                value={overrides[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                rows={rows}
                className="w-full bg-slate-800 text-slate-100 text-xs font-mono border border-slate-700 rounded px-3 py-2 outline-none focus:border-amber-600 resize-y"
                spellCheck={false}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
