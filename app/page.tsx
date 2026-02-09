"use client";

import React, { useState, useEffect, useCallback } from "react";
import MapCanvas from "@/components/MapCanvas";
import Sidebar from "@/components/Sidebar";
import CommandTerminal from "@/components/CommandTerminal";
import GameSetup, { GameConfig } from "@/components/GameSetup";
import { loadWorldData } from "@/lib/world-loader";
import { INITIAL_PLAYERS } from "@/lib/map-generator";
import { Province, GameState, MapTheme, GameEvent } from "@/lib/types";
import {
  saveGame,
  autoSave,
  listSavedGames,
  loadGame,
  deleteGame,
  restoreSavedGameState,
  SavedGame,
} from "@/lib/game-storage";

interface LogEntry {
  id: string;
  type: "command" | "info" | "error" | "success";
  text: string;
}

export default function GamePage() {
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingTurn, setProcessingTurn] = useState(false);
  const [provincesCache, setProvincesCache] = useState<Province[]>([]);
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);

  // Time Skip State
  const [timeStep, setTimeStep] = useState("1m");
  const [customTime, setCustomTime] = useState("");

  // Save/Load State
  const [lastSaveTime, setLastSaveTime] = useState<number | null>(null);
  const [showSaveNotif, setShowSaveNotif] = useState(false);
  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);
  const [showSavesPanel, setShowSavesPanel] = useState(false);

  const refreshSavedGames = useCallback(() => {
    if (typeof window === "undefined") return;
    setSavedGames(listSavedGames());
  }, []);

  useEffect(() => {
    async function load() {
        const data = await loadWorldData();
        setProvincesCache(data);
        refreshSavedGames();
        setLoading(false);
    }
    load();
  }, [refreshSavedGames]);

  const createLogId = () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `log-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  };

  const addLog = (text: string, type: LogEntry["type"] = "info") => {
    setLogs((prev) => [...prev, { id: createLogId(), type, text }]);
  };

  const handleStartGame = (config: GameConfig) => {
    setGameConfig(config);
    
    // Theme Logic
    let theme: MapTheme = "classic";
    const s = config.scenario.toLowerCase();
    if (s.includes("cyber") || s.includes("future") || s.includes("robot") || s.includes("neon")) {
        theme = "cyberpunk";
    } else if (s.includes("rome") || s.includes("ancient") || s.includes("medieval") || s.includes("king") || s.includes("empire")) {
        theme = "parchment";
    } else if (s.includes("cold war") || s.includes("plan") || s.includes("blueprint") || s.includes("modern")) {
        theme = "blueprint";
    }

    const initialPlayers = { ...INITIAL_PLAYERS };
    const nation = provincesCache.find(p => p.id === config.playerNationId);
    
    // Setup Player
    if (nation) {
        initialPlayers["player"].name = nation.name;
        const newProvinces = provincesCache.map(p => 
            p.id === config.playerNationId ? { ...p, ownerId: "player" } : p
        );
        setProvincesCache(newProvinces); 
        
        setGameState({
            turn: config.year,
            players: initialPlayers,
            provinces: newProvinces,
            selectedProvinceId: null,
            theme,
        });
    } else {
        setGameState({
            turn: config.year,
            players: initialPlayers,
            provinces: provincesCache,
            selectedProvinceId: null,
            theme,
        });
    }

    setLogs([
        { id: createLogId(), type: "info", text: "Welcome to Open Historia." },
        { id: createLogId(), type: "info", text: `Scenario: ${config.scenario}` },
        { id: createLogId(), type: "info", text: `Difficulty: ${config.difficulty}` },
        { id: createLogId(), type: "info", text: "The AI Game Master is listening..." },
    ]);
    setEvents([]);
  };

  const handleSelectProvince = useCallback((provinceId: string | number | null) => {
    setGameState((prev) => {
        if (!prev) return null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { ...prev, selectedProvinceId: provinceId as any };
    });
  }, []);

  const handleSendMessage = (provinceId: string | number, message: string) => {
      const target = gameState?.provinces.find(p => p.id === provinceId);
      if (!target) return;
      const command = `Diplomatic Message to ${target.name}: "${message}"`;
      processCommand(command);
  };

  const handleNextTurn = () => {
      const period = timeStep === "custom" ? customTime : timeStep;
      processCommand(`Wait / Advance Time by ${period || "1 month"}`);
  };

  const processCommand = async (cmd: string) => {
    if (!gameState || !gameConfig || processingTurn) return;

    addLog(cmd, "command");
    setProcessingTurn(true);

    try {
        const simplifiedState = {
            turn: gameState.turn,
            players: gameState.players,
            provinces: gameState.provinces
                .filter(p => p.ownerId !== null)
                .map(p => ({ name: p.name, ownerId: p.ownerId }))
        };

        const res = await fetch("/api/turn", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                command: cmd,
                gameState: simplifiedState,
                config: gameConfig,
                history: logs.slice(-25),
                events: events.slice(-10)
            })
        });

        const data = await res.json();

        if (data.message) {
            addLog(data.message, "info");
        }

        if (data.updates) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data.updates.forEach((update: any) => {
                if (update.type === "owner") {
                    setGameState(prev => {
                        if (!prev) return null;
                        const target = prev.provinces.find(p => p.name.toLowerCase() === update.provinceName.toLowerCase());
                        if (target) {
                             const newProvinces = prev.provinces.map(p => 
                                p.id === target.id ? { ...p, ownerId: update.newOwnerId } : p
                             );
                             return { ...prev, provinces: newProvinces };
                        }
                        return prev;
                    });
                }
                // Handle Time Advancement
                if (update.type === "time") {
                    setGameState(prev => prev ? ({ ...prev, turn: prev.turn + (update.amount || 1) }) : null);
                }
                // Handle New Events
                if (update.type === "event") {
                    const newEvent: GameEvent = {
                        id: `evt-${Date.now()}-${Math.random()}`,
                        year: update.year || gameState.turn,
                        description: update.description,
                        type: update.eventType || "flavor"
                    };
                    setEvents(prev => [...prev, newEvent]);
                    // Optional: Log major events to the terminal too
                    if (update.eventType === "war" || update.eventType === "diplomacy") {
                        addLog(`[EVENT] ${update.description}`, "info");
                    }
                }
            });
        }

    } catch (err) {
        console.error(err);
        addLog("Communication with HQ lost (Network Error).", "error");
    } finally {
        setProcessingTurn(false);
    }
  };

  const handleSaveGame = () => {
    if (!gameState || !gameConfig) return;
    try {
        const saveId = saveGame(gameState, gameConfig, logs, undefined, events);
        setLastSaveTime(Date.now());
        setShowSaveNotif(true);
        setTimeout(() => setShowSaveNotif(false), 2000);
        refreshSavedGames();
        addLog(`Game saved successfully (${saveId === "autosave" ? "autosave" : "manual save"}).`, "success");
    } catch (error) {
        addLog(`Save failed: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    }
  };

  const handleLoadSavedGame = (saveId: string) => {
    const saved = loadGame(saveId);
    if (!saved) {
      addLog(`Save "${saveId}" was not found.`, "error");
      refreshSavedGames();
      return;
    }

    if (provincesCache.length === 0) {
      addLog("Map data is still loading. Try loading the save again in a moment.", "error");
      return;
    }

    const restoredState = restoreSavedGameState(saved, provincesCache);
    setGameConfig(saved.gameConfig);
    setGameState(restoredState);
    setProvincesCache(restoredState.provinces);
    setEvents(saved.events || []);

    const restoredLogs = saved.logs && saved.logs.length > 0 ? saved.logs : [];
    setLogs([
      ...restoredLogs,
      {
        id: createLogId(),
        type: "success",
        text: `Loaded save from ${new Date(saved.timestamp).toLocaleString()}.`,
      },
    ]);

    setShowSavesPanel(false);
  };

  const handleDeleteSavedGame = (saveId: string) => {
    deleteGame(saveId);
    refreshSavedGames();
    if (gameConfig) {
      addLog(`Deleted save: ${saveId}`, "info");
    }
  };

  useEffect(() => {
    if (!gameState || !gameConfig) return;
    autoSave(gameState, gameConfig, logs, events);
    refreshSavedGames();
  }, [gameState, gameConfig, logs, events, refreshSavedGames]);

  const getNationLabel = (nationId: string) => {
    const nation = provincesCache.find((province) => String(province.id) === String(nationId));
    return nation?.name || nationId;
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-slate-950 text-slate-400 font-mono">
        <div className="animate-pulse">Loading Satellite Data...</div>
    </div>
  );

  if (!gameConfig) {
      return (
        <GameSetup
          provinces={provincesCache}
          onStartGame={handleStartGame}
          savedGames={savedGames}
          onLoadSavedGame={handleLoadSavedGame}
          onDeleteSavedGame={handleDeleteSavedGame}
          onRefreshSavedGames={refreshSavedGames}
        />
      );
  }

  const selectedProvince = gameState?.selectedProvinceId !== null 
    ? gameState?.provinces.find((p) => p.id === gameState.selectedProvinceId) || null 
    : null;

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-900 text-slate-100">
      {gameState && (
          <MapCanvas 
            provinces={gameState.provinces}
            players={gameState.players}
            onSelectProvince={handleSelectProvince}
            selectedProvinceId={gameState.selectedProvinceId}
            theme={gameState.theme}
          />
      )}
      
      <Sidebar 
        province={selectedProvince}
        owner={selectedProvince?.ownerId && gameState ? gameState.players[selectedProvince.ownerId] : undefined}
        onSendMessage={handleSendMessage}
      />

      <CommandTerminal 
        logs={logs}
        onCommand={processCommand}
      />
      
      {processingTurn && (
          <div className="absolute bottom-20 left-4 text-xs text-amber-500 animate-pulse font-mono bg-slate-900/80 px-2 py-1 rounded">
              [Processing...]
          </div>
      )}

      {showSaveNotif && (
          <div className="absolute top-20 right-4 text-sm text-emerald-400 font-mono bg-slate-900/90 px-3 py-2 rounded border border-emerald-700 shadow-lg animate-in fade-in duration-200">
              ✓ Game Saved
          </div>
      )}

      {/* Top Bar with Time Skip */}
	      {gameState && (
	        <div className="absolute top-0 left-0 w-full p-2 bg-gradient-to-b from-slate-950 to-transparent pointer-events-none flex justify-center items-center gap-8 text-slate-200 font-mono text-lg z-10">
            <div className="bg-slate-900/80 px-4 py-2 rounded-full border border-slate-700 backdrop-blur pointer-events-auto flex items-center gap-4">
                <div>
                    <span className="text-slate-500 text-sm uppercase mr-2">Year</span>
                    <span className="font-bold">{gameState.turn}</span>
                </div>
                <div className="w-px h-6 bg-slate-700"></div>
                <div>
                    <span className="text-blue-400 text-sm uppercase mr-2">Nation</span>
                    <span className="font-bold">{gameState.players["player"].name}</span>
                </div>
                <div className="w-px h-6 bg-slate-700"></div>
	                <button
	                    onClick={handleSaveGame}
	                    className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded transition-colors uppercase"
                      title={lastSaveTime ? `Last save: ${new Date(lastSaveTime).toLocaleString()}` : "Save game"}
	                >
	                    Save
	                </button>
                  <button
                      onClick={() => {
                        refreshSavedGames();
                        setShowSavesPanel(true);
                      }}
                      className="bg-sky-700 hover:bg-sky-600 text-white text-xs font-bold px-3 py-1 rounded transition-colors uppercase"
                  >
                      Saves ({savedGames.length})
                  </button>
	                <div className="w-px h-6 bg-slate-700"></div>
	                <div className="flex items-center gap-2 pointer-events-auto">
                    <select 
                        value={timeStep}
                        onChange={(e) => setTimeStep(e.target.value)}
                        className="bg-slate-800 text-white text-xs border border-slate-700 rounded px-2 py-1 outline-none"
                    >
                        <option value="5d">5 Days</option>
                        <option value="1m">1 Month</option>
                        <option value="6m">6 Months</option>
                        <option value="1y">1 Year</option>
                        <option value="custom">Custom...</option>
                    </select>
                    {timeStep === "custom" && (
                        <input 
                            type="text"
                            value={customTime}
                            onChange={(e) => setCustomTime(e.target.value)}
                            placeholder="e.g. 2 years"
                            className="bg-slate-800 text-white text-xs border border-slate-700 rounded px-2 py-1 w-20 outline-none"
                        />
                    )}
                    <button 
                        onClick={handleNextTurn}
                        disabled={processingTurn}
                        className="bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold px-3 py-1 rounded transition-colors uppercase"
                    >
                        Advance
                    </button>
                </div>
            </div>
        </div>
	      )}

        {showSavesPanel && (
          <div className="absolute inset-0 z-40 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-2xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                <h2 className="text-sm uppercase tracking-wide text-slate-200 font-bold">Saved Games</h2>
                <button
                  onClick={() => setShowSavesPanel(false)}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded"
                >
                  Close
                </button>
              </div>
              <div className="max-h-[70vh] overflow-y-auto">
                {savedGames.length === 0 && (
                  <div className="px-4 py-6 text-sm text-slate-400">No saves yet.</div>
                )}
                {savedGames.map((save) => (
                  <div key={`${save.id}-${save.timestamp}`} className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm text-slate-100 truncate">
                        {save.id === "autosave" ? "Autosave" : "Manual Save"}
                        {" · "}
                        {getNationLabel(save.gameConfig.playerNationId)}
                        {" · "}
                        {save.gameConfig.provider}/{save.gameConfig.model}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {new Date(save.timestamp).toLocaleString()} · Turn {save.gameState.turn}
                      </div>
                      <div className="text-xs text-slate-500 truncate">{save.gameConfig.scenario}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleLoadSavedGame(save.id)}
                        className="bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold px-3 py-1 rounded uppercase"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => handleDeleteSavedGame(save.id)}
                        className="bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold px-3 py-1 rounded uppercase"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
	    </main>
	  );
	}
