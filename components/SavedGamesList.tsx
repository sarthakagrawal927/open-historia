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
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700/40 to-transparent" />
        <h2 className="text-xs uppercase tracking-widest text-slate-600 font-bold shrink-0">
          Continue Playing
        </h2>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-700/40 to-transparent" />
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
              className="flex items-center justify-between gap-4 px-4 py-3 bg-slate-900/60 border border-slate-700/30 rounded-xl hover:border-amber-600/30 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-900/10 transition-all duration-200 group cursor-pointer"
              onClick={() => onLoad(save.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onLoad(save.id);
              }}
            >
              <div className="min-w-0 flex-1 flex items-center gap-3">
                <div className="shrink-0 w-8 h-8 rounded-xl bg-slate-800/60 border border-slate-700/30 flex items-center justify-center">
                  {isAutosave ? (
                    <svg className="w-4 h-4 text-sky-400/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-amber-400/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                    </svg>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm text-slate-200">
                    <span className="font-medium">
                      {isAutosave ? "Autosave" : "Save"}
                    </span>
                    <span className="text-slate-700">&middot;</span>
                    <span className="text-amber-400/80 truncate">{nation}</span>
                    <span className="text-slate-700">&middot;</span>
                    <span className="text-slate-400">Year {turn}</span>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5 truncate">
                    {difficulty} &middot; {date} &middot;{" "}
                    {save.gameConfig.scenario.slice(0, 80)}
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(save.id);
                }}
                className="text-xs text-slate-700 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all px-2 py-1 rounded-lg hover:bg-slate-800/60"
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
