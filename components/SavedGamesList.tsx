"use client";

import React from "react";
import type { SavedGame } from "@/lib/game-storage";

interface SavedGamesListProps {
  savedGames: SavedGame[];
  onLoad: (saveId: string) => void;
  onDelete: (saveId: string) => void;
  getNationName?: (id: string) => string;
}

export default function SavedGamesList({
  savedGames,
  onLoad,
  onDelete,
  getNationName,
}: SavedGamesListProps) {
  if (savedGames.length === 0) return null;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
        <h2 className="text-xs uppercase tracking-widest text-slate-500 font-bold shrink-0">
          Continue Playing
        </h2>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
      </div>
      <div className="grid gap-2">
        {savedGames.map((save) => {
          const isAutosave = save.id === "autosave";
          const turn = "turn" in save.gameState ? save.gameState.turn : "?";
          const nation = getNationName
            ? getNationName(save.gameConfig.playerNationId)
            : save.gameConfig.playerNationId;
          const difficulty = save.gameConfig.difficulty;
          const date = new Date(save.timestamp).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div
              key={save.id}
              className="flex items-center justify-between gap-4 px-4 py-3 bg-slate-900/80 border border-slate-700/50 rounded-lg hover:border-amber-600/40 transition-colors group cursor-pointer"
              onClick={() => onLoad(save.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onLoad(save.id);
              }}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm text-slate-100">
                  <span className="font-medium">
                    {isAutosave ? "Autosave" : "Save"}
                  </span>
                  <span className="text-slate-600">&middot;</span>
                  <span className="text-amber-400/90 truncate">{nation}</span>
                  <span className="text-slate-600">&middot;</span>
                  <span className="text-slate-300">Year {turn}</span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5 truncate">
                  {difficulty} &middot; {date} &middot;{" "}
                  {save.gameConfig.scenario.slice(0, 80)}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(save.id);
                }}
                className="text-xs text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all px-2 py-1 rounded hover:bg-slate-800"
                title="Delete save"
              >
                &#x2715;
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
