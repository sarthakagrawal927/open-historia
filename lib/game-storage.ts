import { GameState } from "./types";
import { GameConfig } from "@/components/GameSetup";

interface LogEntry {
  id: string;
  type: "command" | "info" | "error" | "success";
  text: string;
}

export interface SavedGame {
  id: string;
  timestamp: number;
  gameState: GameState;
  gameConfig: GameConfig;
  logs: LogEntry[];
  version: string;
}

const STORAGE_KEY = "open_historia_saves";
const VERSION = "1.0.0";
const MAX_SAVES = 10;

export function saveGame(
  gameState: GameState,
  gameConfig: GameConfig,
  logs: LogEntry[],
  saveName?: string
): string {
  try {
    const saves = listSavedGames();
    const id = saveName || `save_${Date.now()}`;

    const newSave: SavedGame = {
      id,
      timestamp: Date.now(),
      gameState,
      gameConfig,
      logs: logs.slice(-50), // Keep last 50 logs only
      version: VERSION,
    };

    // Remove oldest save if at max capacity
    if (saves.length >= MAX_SAVES) {
      saves.sort((a, b) => a.timestamp - b.timestamp);
      saves.shift();
    }

    saves.push(newSave);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saves));
    return id;
  } catch (error) {
    if (error instanceof Error && error.name === "QuotaExceededError") {
      throw new Error("Storage quota exceeded. Please delete some saves.");
    }
    throw error;
  }
}

export function loadGame(id: string): SavedGame | null {
  try {
    const saves = listSavedGames();
    return saves.find((save) => save.id === id) || null;
  } catch (error) {
    console.error("Failed to load game:", error);
    return null;
  }
}

export function listSavedGames(): SavedGame[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    const saves = JSON.parse(data) as SavedGame[];
    // Sort by timestamp, newest first
    return saves.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error("Failed to list saves:", error);
    return [];
  }
}

export function deleteGame(id: string): void {
  try {
    const saves = listSavedGames();
    const filtered = saves.filter((save) => save.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to delete game:", error);
  }
}

export function getLatestSave(): SavedGame | null {
  const saves = listSavedGames();
  return saves.length > 0 ? saves[0] : null;
}

// Auto-save helper with debouncing
let autoSaveTimer: NodeJS.Timeout | null = null;

export function autoSave(
  gameState: GameState,
  gameConfig: GameConfig,
  logs: LogEntry[],
  delay: number = 2000
): void {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }

  autoSaveTimer = setTimeout(() => {
    try {
      saveGame(gameState, gameConfig, logs, "autosave");
    } catch (error) {
      console.error("Auto-save failed:", error);
    }
  }, delay);
}
