import { GameEvent, GameState, MapTheme, Player, Province } from "./types";
import { GameConfig } from "@/components/GameSetup";

export interface LogEntry {
  id: string;
  type: "command" | "info" | "error" | "success" | "capture" | "war" | "diplomacy" | "economy" | "crisis" | "event-summary";
  text: string;
}

type ProvinceOwnerSnapshot = {
  id: string | number;
  ownerId: string | null;
};

type GameStateSnapshot = {
  turn: number;
  players: Record<string, Player>;
  selectedProvinceId: string | number | null;
  theme: MapTheme;
  provinceOwners: ProvinceOwnerSnapshot[];
};

type PersistedGameState = GameStateSnapshot | GameState;

export interface SavedGame {
  id: string;
  timestamp: number;
  gameState: PersistedGameState;
  gameConfig: GameConfig;
  logs: LogEntry[];
  events: GameEvent[];
  version: string;
}

const STORAGE_KEY = "open_historia_saves";
const VERSION = "2.0.0";

const toProvinceKey = (id: string | number) => String(id);

const createSaveId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `save_${crypto.randomUUID()}`;
  }
  return `save_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const isLegacyGameState = (state: PersistedGameState): state is GameState => {
  return Array.isArray((state as GameState).provinces);
};

const toSnapshot = (gameState: GameState): GameStateSnapshot => ({
  turn: gameState.turn,
  players: gameState.players,
  selectedProvinceId: gameState.selectedProvinceId,
  theme: gameState.theme,
  provinceOwners: gameState.provinces.map((province) => ({
    id: province.id,
    ownerId: province.ownerId,
  })),
});

export function restoreSavedGameState(savedGame: SavedGame, baseProvinces: Province[]): GameState {
  const persistedState = savedGame.gameState;
  if (isLegacyGameState(persistedState)) {
    return persistedState;
  }

  const ownership = new Map<string, string | null>();
  persistedState.provinceOwners.forEach((entry) => {
    ownership.set(toProvinceKey(entry.id), entry.ownerId);
  });

  const provinces = baseProvinces.map((province) => {
    const nextOwner = ownership.get(toProvinceKey(province.id));
    return {
      ...province,
      ownerId: nextOwner === undefined ? province.ownerId : nextOwner,
    };
  });

  return {
    turn: persistedState.turn,
    players: persistedState.players,
    provinces,
    selectedProvinceId: persistedState.selectedProvinceId,
    theme: persistedState.theme,
  };
}

export function saveGame(
  gameState: GameState,
  gameConfig: GameConfig,
  logs: LogEntry[],
  saveName?: string,
  events: GameEvent[] = []
): string {
  try {
    const saves = listSavedGames();
    const id = saveName || createSaveId();
    const filtered = saves.filter((save) => save.id !== id);

    const newSave: SavedGame = {
      id,
      timestamp: Date.now(),
      gameState: toSnapshot(gameState),
      gameConfig,
      logs: logs.slice(-50),
      events: events.slice(-100),
      version: VERSION,
    };

    filtered.push(newSave);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
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

    const parsed = JSON.parse(data) as Partial<SavedGame>[];
    const saves: SavedGame[] = parsed
      .filter((save): save is Partial<SavedGame> => {
        return !!save && typeof save.id === "string" && !!save.gameState && !!save.gameConfig;
      })
      .map((save) => ({
        id: save.id as string,
        timestamp: typeof save.timestamp === "number" ? save.timestamp : Date.now(),
        gameState: save.gameState as PersistedGameState,
        gameConfig: save.gameConfig as GameConfig,
        logs: Array.isArray(save.logs) ? (save.logs as LogEntry[]) : [],
        events: Array.isArray(save.events) ? (save.events as GameEvent[]) : [],
        version: typeof save.version === "string" ? save.version : "1.0.0",
      }));

    saves.sort((a, b) => b.timestamp - a.timestamp);

    // Keep the latest snapshot per save id (important for legacy duplicate autosaves).
    const uniqueById: SavedGame[] = [];
    const seen = new Set<string>();
    saves.forEach((save) => {
      if (seen.has(save.id)) return;
      seen.add(save.id);
      uniqueById.push(save);
    });

    return uniqueById;
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

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

export function autoSave(
  gameState: GameState,
  gameConfig: GameConfig,
  logs: LogEntry[],
  events: GameEvent[],
  delay: number = 2000
): void {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }

  autoSaveTimer = setTimeout(() => {
    try {
      saveGame(gameState, gameConfig, logs, "autosave", events);
    } catch (error) {
      console.error("Auto-save failed:", error);
    }
  }, delay);
}
