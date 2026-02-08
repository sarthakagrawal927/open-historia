"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import MapCanvas from "@/components/MapCanvas";
import Sidebar from "@/components/Sidebar";
import CommandTerminal from "@/components/CommandTerminal";
import GameSetup, { GameConfig } from "@/components/GameSetup";
import { loadWorldData } from "@/lib/world-loader";
import { INITIAL_PLAYERS } from "@/lib/map-generator";
import { Province, GameState, MapTheme } from "@/lib/types";

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
  const logCounter = useRef(0);

  // Load Map Data Once on Mount
  useEffect(() => {
    async function load() {
        const data = await loadWorldData();
        setProvincesCache(data);
        setLoading(false);
    }
    load();
  }, []);

  const addLog = (text: string, type: LogEntry["type"] = "info") => {
    logCounter.current += 1;
    setLogs((prev) => [...prev, { id: `log-${Date.now()}-${logCounter.current}`, type, text }]);
  };

  const handleStartGame = (config: GameConfig) => {
    setGameConfig(config);
    
    // Determine Theme based on Scenario
    let theme: MapTheme = "classic";
    const s = config.scenario.toLowerCase();
    if (s.includes("cyber") || s.includes("future") || s.includes("robot") || s.includes("neon")) {
        theme = "cyberpunk";
    } else if (s.includes("rome") || s.includes("ancient") || s.includes("medieval") || s.includes("king") || s.includes("empire")) {
        theme = "parchment";
    } else if (s.includes("cold war") || s.includes("plan") || s.includes("blueprint") || s.includes("modern")) {
        theme = "blueprint";
    }

    // Initialize State
    const initialPlayers = { ...INITIAL_PLAYERS };
    
    // Update Player Name to selected nation if possible, or keep custom
    const nation = provincesCache.find(p => p.id === config.playerNationId);
    if (nation) {
        initialPlayers["player"].name = nation.name;
        // Also give them ownership of that nation
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
        { id: "init-1", type: "info", text: `Welcome to Open Historia.` },
        { id: "init-2", type: "info", text: `Scenario: ${config.scenario}` },
        { id: "init-3", type: "info", text: `Visual Theme: ${theme.toUpperCase()}` },
        { id: "init-4", type: "info", text: "The AI Game Master is listening..." },
    ]);
  };

  const handleSelectProvince = useCallback((provinceId: string | number | null) => {
    setGameState((prev) => {
        if (!prev) return null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { ...prev, selectedProvinceId: provinceId as any };
    });
  }, []);

  // Handle direct messages from Sidebar
  const handleSendMessage = (provinceId: string | number, message: string) => {
      // Find country name
      const target = gameState?.provinces.find(p => p.id === provinceId);
      if (!target) return;

      const command = `Diplomatic Message to ${target.name}: "${message}"`;
      processCommand(command);
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
                history: logs.slice(-5) 
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
                if (update.type === "gold") {
                     setGameState(prev => {
                        if (!prev) return null;
                        const p = prev.players["player"];
                        return { 
                            ...prev, 
                            players: { ...prev.players, player: { ...p, gold: p.gold + update.amount } } 
                        };
                     });
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

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-slate-950 text-slate-400 font-mono">
        <div className="animate-pulse">Loading Satellite Data...</div>
    </div>
  );

  if (!gameConfig) {
      return <GameSetup provinces={provincesCache} onStartGame={handleStartGame} />;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectedProvince = gameState?.selectedProvinceId !== null 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? gameState?.provinces.find(p => p.id === (gameState.selectedProvinceId as any)) || null 
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
      
      {/* Processing Indicator */}
      {processingTurn && (
          <div className="absolute bottom-20 left-4 text-xs text-amber-500 animate-pulse font-mono bg-slate-900/80 px-2 py-1 rounded">
              [Uplink Active: Decrypting Response...]
          </div>
      )}

      {gameState && (
        <div className="absolute top-0 left-0 w-full p-2 bg-gradient-to-b from-slate-950 to-transparent pointer-events-none flex justify-center gap-8 text-slate-200 font-mono text-lg z-10">
            <div>
                <span className="text-slate-500 text-sm uppercase mr-2">Year</span>
                <span className="font-bold">{gameState.turn}</span>
            </div>
            <div>
                <span className="text-amber-500 text-sm uppercase mr-2">Budget</span>
                <span className="font-bold text-amber-400">${gameState.players["player"].gold}B</span>
            </div>
            <div>
                <span className="text-blue-400 text-sm uppercase mr-2">Nation</span>
                <span className="font-bold">{gameState.players["player"].name}</span>
            </div>
        </div>
      )}
    </main>
  );
}