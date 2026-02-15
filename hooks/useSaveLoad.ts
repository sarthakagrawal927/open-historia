"use client";

import { useState, useEffect, useCallback } from "react";
import { GameConfig } from "@/components/GameSetup";
import { GameState, GameEvent, Province } from "@/lib/types";
import {
  saveGame,
  autoSave,
  LogEntry,
  SavedGame,
} from "@/lib/game-storage";

function uid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useSaveLoad(deps: {
  gameState: GameState | null;
  gameConfig: GameConfig | null;
  logs: LogEntry[];
  events: GameEvent[];
  storySoFar: string;
  addLog: (text: string, type?: LogEntry["type"]) => void;
  refreshSavedGames: () => Promise<void>;
  initialGameIdLoaded: string | null;
}) {
  const {
    gameState,
    gameConfig,
    logs,
    events,
    storySoFar,
    addLog,
    refreshSavedGames,
    initialGameIdLoaded,
  } = deps;

  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [lastSaveTime, setLastSaveTime] = useState<number | null>(null);
  const [showSaveNotif, setShowSaveNotif] = useState(false);
  const [showSavesPanel, setShowSavesPanel] = useState(false);
  const [showPromptSettings, setShowPromptSettings] = useState(false);

  // Initialize from URL-loaded game
  useEffect(() => {
    if (initialGameIdLoaded) {
      setCurrentGameId(initialGameIdLoaded);
    }
  }, [initialGameIdLoaded]);

  const handleSaveGame = useCallback(async () => {
    if (!gameState || !gameConfig) return;
    try {
      const id = currentGameId || uid();
      if (!currentGameId) {
        setCurrentGameId(id);
        window.history.replaceState(null, "", `/${id}`);
      }
      await saveGame(gameState, gameConfig, logs, id, events, storySoFar);
      setLastSaveTime(Date.now());
      setShowSaveNotif(true);
      setTimeout(() => setShowSaveNotif(false), 2000);
      await refreshSavedGames();
      addLog("Game saved.", "success");
    } catch (error) {
      addLog(
        `Save failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        "error"
      );
    }
  }, [gameState, gameConfig, logs, events, storySoFar, currentGameId, refreshSavedGames, addLog]);

  const handleSaveAndExit = useCallback(async (): Promise<void> => {
    if (!gameState || !gameConfig) return;
    await handleSaveGame();
    setCurrentGameId(null);
    window.history.replaceState(null, "", "/");
  }, [gameState, gameConfig, handleSaveGame]);

  // Set game ID when a new game starts
  const setGameId = useCallback((id: string) => {
    setCurrentGameId(id);
  }, []);

  // Load a save and set the current game ID
  const onLoadComplete = useCallback((saveId: string) => {
    setCurrentGameId(saveId);
    setShowSavesPanel(false);
  }, []);

  // Auto-save
  useEffect(() => {
    if (!gameState || !gameConfig) return;
    autoSave(gameState, gameConfig, logs, events, 2000, currentGameId || "autosave", storySoFar);
  }, [gameState, gameConfig, logs, events, currentGameId, storySoFar]);

  return {
    currentGameId,
    setGameId,
    lastSaveTime,
    showSaveNotif,
    showSavesPanel,
    setShowSavesPanel,
    showPromptSettings,
    setShowPromptSettings,
    handleSaveGame,
    handleSaveAndExit,
    onLoadComplete,
  };
}
