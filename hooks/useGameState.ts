"use client";

import { useState, useEffect, useCallback } from "react";
import { GameConfig } from "@/components/GameSetup";
import { Province, GameState, MapTheme, Preset } from "@/lib/types";
import { loadWorldData } from "@/lib/world-loader";
import { INITIAL_PLAYERS } from "@/lib/map-generator";
import {
  listSavedGames,
  loadGame,
  deleteGame,
  restoreSavedGameState,
  setAuthenticated,
  SavedGame,
  LogEntry,
} from "@/lib/game-storage";
import { authClient } from "@/lib/auth-client";

function uid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useGameState(initialGameId?: string) {
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [provincesCache, setProvincesCache] = useState<Province[]>([]);
  const [showPresets, setShowPresets] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);
  const [savesLoading, setSavesLoading] = useState(false);

  // Auth
  const { data: authSession } = authClient.useSession();

  const refreshSavedGames = useCallback(async () => {
    if (typeof window === "undefined") return;
    setSavesLoading(true);
    try {
      const saves = await listSavedGames();
      setSavedGames(saves);
    } finally {
      setSavesLoading(false);
    }
  }, []);

  // Sync auth state + re-fetch saves when session changes
  useEffect(() => {
    setAuthenticated(!!authSession?.user);
    refreshSavedGames();
  }, [authSession, refreshSavedGames]);

  // Initial data load + optional game restore from URL
  const [initialLogs, setInitialLogs] = useState<LogEntry[]>([]);
  const [initialEvents, setInitialEvents] = useState<import("@/lib/types").GameEvent[]>([]);
  const [initialStorySoFar, setInitialStorySoFar] = useState("");
  const [initialGameIdLoaded, setInitialGameIdLoaded] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const data = await loadWorldData();
      setProvincesCache(data);
      await refreshSavedGames();

      if (initialGameId) {
        const saved = await loadGame(initialGameId);
        if (saved && data.length > 0) {
          const restoredState = restoreSavedGameState(saved, data);
          setGameConfig(saved.gameConfig);
          setGameState(restoredState);
          setProvincesCache(restoredState.provinces);
          setInitialEvents(saved.events || []);
          setInitialStorySoFar(saved.storySoFar || "");
          setShowPresets(false);
          setInitialGameIdLoaded(initialGameId);
          const restoredLogs = saved.logs?.length ? saved.logs : [];
          setInitialLogs([
            ...restoredLogs,
            { id: uid(), type: "success", text: `Resumed game from ${new Date(saved.timestamp).toLocaleString()}.` },
          ]);
        }
      }

      setLoading(false);
    }
    load();
  }, [refreshSavedGames]);

  // Preset selection
  const handleSelectPreset = useCallback((preset: Preset) => {
    setSelectedPreset(preset);
    setShowPresets(false);
  }, []);

  const handleCustomScenario = useCallback(() => {
    setSelectedPreset(null);
    setShowPresets(false);
  }, []);

  // Province selection
  const handleSelectProvince = useCallback((provinceId: string | number | null) => {
    setGameState((prev) => {
      if (!prev) return null;
      return { ...prev, selectedProvinceId: provinceId };
    });
  }, []);

  // Game start
  const handleStartGame = useCallback(
    (config: GameConfig) => {
      const gameId = uid();
      window.history.replaceState(null, "", `/${gameId}`);

      setGameConfig(config);

      let theme: MapTheme = "classic";
      const s = config.scenario.toLowerCase();
      if (s.includes("cyber") || s.includes("future") || s.includes("robot") || s.includes("neon")) {
        theme = "cyberpunk";
      } else if (
        s.includes("rome") || s.includes("ancient") || s.includes("medieval") ||
        s.includes("king") || s.includes("empire") || s.includes("kingdom")
      ) {
        theme = "parchment";
      } else if (
        s.includes("cold war") || s.includes("plan") || s.includes("blueprint") ||
        s.includes("space") || s.includes("modern")
      ) {
        theme = "blueprint";
      }

      const initialPlayers = { ...INITIAL_PLAYERS };
      const nation = provincesCache.find((p) => p.id === config.playerNationId);

      let provinces = provincesCache;
      if (nation) {
        initialPlayers["player"].name = nation.parentCountryName || nation.name;
        const parentId = nation.parentCountryId || String(nation.id);
        provinces = provincesCache.map((p) => {
          const pParent = p.parentCountryId || String(p.id);
          return pParent === parentId ? { ...p, ownerId: "player" } : p;
        });
        setProvincesCache(provinces);
      }

      const newState: GameState = {
        turn: config.year,
        players: initialPlayers,
        provinces,
        selectedProvinceId: null,
        theme,
        events: [],
        relations: [],
        chatThreads: [],
        timeline: [],
        advisorHistory: [],
      };

      setGameState(newState);

      return gameId;
    },
    [provincesCache]
  );

  // Delete saved game
  const handleDeleteSavedGame = useCallback(
    async (saveId: string) => {
      await deleteGame(saveId);
      await refreshSavedGames();
    },
    [refreshSavedGames]
  );

  // Load saved game — returns restored data for the caller to apply
  const handleLoadSavedGame = useCallback(
    async (saveId: string): Promise<{
      config: GameConfig;
      state: GameState;
      provinces: Province[];
      events: import("@/lib/types").GameEvent[];
      storySoFar: string;
      logs: LogEntry[];
    } | null> => {
      const saved = await loadGame(saveId);
      if (!saved) {
        await refreshSavedGames();
        return null;
      }
      if (provincesCache.length === 0) return null;

      const restoredState = restoreSavedGameState(saved, provincesCache);
      setGameConfig(saved.gameConfig);
      setGameState(restoredState);
      setProvincesCache(restoredState.provinces);
      setShowPresets(false);
      window.history.replaceState(null, "", `/${saveId}`);

      return {
        config: saved.gameConfig,
        state: restoredState,
        provinces: restoredState.provinces,
        events: saved.events || [],
        storySoFar: saved.storySoFar || "",
        logs: saved.logs?.length ? saved.logs : [],
      };
    },
    [provincesCache, refreshSavedGames]
  );

  // Nation label helper
  const getNationLabel = useCallback(
    (nationId: string) => {
      return provincesCache.find((p) => String(p.id) === String(nationId))?.name || nationId;
    },
    [provincesCache]
  );

  return {
    // State
    gameConfig,
    setGameConfig,
    gameState,
    setGameState,
    loading,
    provincesCache,
    setProvincesCache,
    showPresets,
    setShowPresets,
    selectedPreset,
    setSelectedPreset,
    savedGames,
    savesLoading,
    authSession,

    // Initial restore data
    initialLogs,
    initialEvents,
    initialStorySoFar,
    initialGameIdLoaded,

    // Actions
    refreshSavedGames,
    handleSelectPreset,
    handleCustomScenario,
    handleSelectProvince,
    handleStartGame,
    handleLoadSavedGame,
    handleDeleteSavedGame,
    getNationLabel,
  };
}
