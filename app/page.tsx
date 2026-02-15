"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import GameSetup, { GameConfig } from "@/components/GameSetup";
import CommandTerminal from "@/components/CommandTerminal";
import Timeline from "@/components/Timeline";
import Advisor from "@/components/Advisor";
import RelationsPanel from "@/components/RelationsPanel";
import PromptSettings from "@/components/PromptSettings";
import { DiplomaticRelation } from "@/lib/types";
import { LogEntry } from "@/lib/game-storage";

import { useGameState } from "@/hooks/useGameState";
import { useTurnProcessing } from "@/hooks/useTurnProcessing";
import { useDiplomacy } from "@/hooks/useDiplomacy";
import { useAdvisor } from "@/hooks/useAdvisor";
import { useTimeline } from "@/hooks/useTimeline";
import { useSaveLoad } from "@/hooks/useSaveLoad";

// Dynamic imports for heavy components
const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });
const DiplomacyChat = dynamic(() => import("@/components/DiplomacyChat"), { ssr: false });
const PresetBrowser = dynamic(() => import("@/components/PresetBrowser"), { ssr: false });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function GamePage({ initialGameId }: { initialGameId?: string } = {}) {
  // ── Shared relation state (needed by turn processing, diplomacy, timeline, advisor) ──
  const [relations, setRelations] = useState<DiplomaticRelation[]>([]);

  // ── Core game state + initialization ──
  const game = useGameState(initialGameId);

  // ── Timeline (needs setEvents and setRelations) ──
  // We pass a placeholder addLog first and fix after turn hook is created
  const timeline = useTimeline({
    gameState: game.gameState,
    setGameState: game.setGameState,
    setEvents: (val) => turn.setEvents(val),
    setRelations,
    addLog: (text, type) => turn.addLog(text, type),
  });

  // ── Turn processing ──
  const turn = useTurnProcessing({
    gameState: game.gameState,
    gameConfig: game.gameConfig,
    setGameState: game.setGameState,
    relations,
    setRelations,
    timelineSnapshots: timeline.timelineSnapshots,
    setTimelineSnapshots: timeline.setTimelineSnapshots,
  });

  // ── Diplomacy ──
  const diplomacy = useDiplomacy({
    gameState: game.gameState,
    gameConfig: game.gameConfig,
    relations,
    setRelations,
    events: turn.events,
  });

  // ── Advisor ──
  const advisor = useAdvisor({
    gameState: game.gameState,
    gameConfig: game.gameConfig,
    events: turn.events,
    relations,
  });

  // ── Save/Load ──
  const save = useSaveLoad({
    gameState: game.gameState,
    gameConfig: game.gameConfig,
    logs: turn.logs,
    events: turn.events,
    storySoFar: turn.storySoFar,
    addLog: turn.addLog,
    refreshSavedGames: game.refreshSavedGames,
    initialGameIdLoaded: game.initialGameIdLoaded,
  });

  // ── Apply initial restore data from URL-loaded game ──
  const initialApplied = useRef(false);
  useEffect(() => {
    if (initialApplied.current) return;
    if (game.initialLogs.length > 0) {
      initialApplied.current = true;
      turn.setLogs(game.initialLogs);
      turn.setEvents(game.initialEvents);
      turn.setStorySoFar(game.initialStorySoFar);
    }
  }, [game.initialLogs]);

  // ── Game start handler (bridges game + turn + diplomacy + advisor state) ──
  const handleStartGame = useCallback(
    (config: GameConfig) => {
      const gameId = game.handleStartGame(config);
      save.setGameId(gameId);

      // Reset subsystem state
      diplomacy.setChatThreads([]);
      advisor.setAdvisorMessages([]);
      timeline.setTimelineSnapshots([]);
      turn.setPendingOrders([]);

      turn.setLogs([
        { id: uid(), type: "info", text: "Welcome to Open Historia." },
        { id: uid(), type: "info", text: `Scenario: ${config.scenario.slice(0, 120)}...` },
        { id: uid(), type: "info", text: `Difficulty: ${config.difficulty}` },
        { id: uid(), type: "info", text: "The AI Game Master is listening..." },
      ]);
      turn.setEvents([]);
      turn.setStorySoFar("");
      setRelations([]);
    },
    [game, save, diplomacy, advisor, timeline, turn]
  );

  // ── Load saved game handler ──
  const handleLoadSavedGame = useCallback(
    async (saveId: string) => {
      const result = await game.handleLoadSavedGame(saveId);
      if (!result) {
        turn.addLog(`Save "${saveId}" not found.`, "error");
        return;
      }
      turn.setEvents(result.events);
      turn.setStorySoFar(result.storySoFar);
      turn.setLogs([
        ...result.logs,
        { id: uid(), type: "success" as LogEntry["type"], text: `Loaded save from ${new Date(Date.now()).toLocaleString()}.` },
      ]);
      save.onLoadComplete(saveId);
    },
    [game, turn, save]
  );

  // ── Save & Exit (reset all subsystems) ──
  const handleSaveAndExit = useCallback(async () => {
    await save.handleSaveAndExit();
    game.setGameConfig(null);
    game.setGameState(null);
    game.setShowPresets(true);
    turn.setLogs([]);
    turn.setEvents([]);
    turn.setStorySoFar("");
    turn.setPendingOrders([]);
    diplomacy.setChatThreads([]);
    setRelations([]);
    timeline.setTimelineSnapshots([]);
    advisor.setAdvisorMessages([]);
    await game.refreshSavedGames();
  }, [save, game, turn, diplomacy, timeline, advisor]);

  // ── Year flash tracking ──
  const prevTurnRef = useRef<number | null>(null);
  const [yearFlash, setYearFlash] = useState(false);

  useEffect(() => {
    if (game.gameState && prevTurnRef.current !== null && prevTurnRef.current !== game.gameState.turn) {
      setYearFlash(true);
      const timer = setTimeout(() => setYearFlash(false), 600);
      return () => clearTimeout(timer);
    }
    if (game.gameState) prevTurnRef.current = game.gameState.turn;
  }, [game.gameState?.turn]);

  // ── Render ──

  if (game.loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950 text-slate-400 font-mono">
        <div className="text-center">
          <div className="animate-pulse text-lg mb-2">Loading World Data...</div>
          <div className="text-xs text-slate-600">Initializing satellite uplink</div>
        </div>
      </div>
    );
  }

  // Phase 1: Preset selection
  if (game.showPresets && !game.gameConfig) {
    return (
      <PresetBrowser
        onSelectPreset={game.handleSelectPreset}
        onCustomScenario={game.handleCustomScenario}
        savedGames={game.savedGames}
        savesLoading={game.savesLoading}
        onLoadSavedGame={handleLoadSavedGame}
        onDeleteSavedGame={game.handleDeleteSavedGame}
        getNationName={game.getNationLabel}
        authSession={game.authSession}
        onRefreshSavedGames={game.refreshSavedGames}
      />
    );
  }

  // Phase 2: Game setup
  if (!game.gameConfig) {
    return (
      <GameSetup
        provinces={game.provincesCache}
        onStartGame={handleStartGame}
        onBack={() => { game.setShowPresets(true); game.setSelectedPreset(null); }}
        preset={
          game.selectedPreset
            ? {
                year: game.selectedPreset.year,
                scenario: game.selectedPreset.scenario,
                difficulty: game.selectedPreset.difficulty,
                suggestedNations: game.selectedPreset.suggestedNations,
                scenarioName: game.selectedPreset.name,
              }
            : null
        }
      />
    );
  }

  // Phase 3: Main game
  const { gameState } = game;

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Map */}
      {gameState && (
        <MapView
          provinces={gameState.provinces}
          players={gameState.players}
          onSelectProvince={game.handleSelectProvince}
          selectedProvinceId={gameState.selectedProvinceId}
          theme={gameState.theme}
          relations={relations}
        />
      )}

      {/* Diplomacy Chat (top-right) */}
      {gameState && (
        <DiplomacyChat
          chatThreads={diplomacy.chatThreads}
          provinces={gameState.provinces}
          players={gameState.players}
          playerNationName={gameState.players["player"].name}
          currentYear={gameState.turn}
          onSendMessage={diplomacy.handleSendChatMessage}
          onCreateThread={diplomacy.handleCreateThread}
          selectedProvinceId={gameState.selectedProvinceId}
          processing={diplomacy.processingChat}
        />
      )}

      {/* Command Terminal + Advance Button (bottom-left) */}
      <div style={{ position: "absolute", bottom: timeline.timelineSnapshots.length > 0 ? 140 : 16, left: 16, zIndex: 20 }}>
        <CommandTerminal logs={turn.logs} onCommand={turn.queueOrder} processing={turn.processingTurn} />
        {/* Inline advance bar below terminal */}
        <div className="mt-1 flex items-center gap-2 bg-slate-900/90 border border-slate-700 rounded px-2 py-1.5 backdrop-blur font-mono">
          {turn.pendingOrders.length > 0 && (
            <span className="text-amber-400 text-xs">
              {turn.pendingOrders.length} order{turn.pendingOrders.length > 1 ? "s" : ""} queued
            </span>
          )}
          {turn.pendingOrders.length === 0 && (
            <span className="text-slate-500 text-xs">No orders queued</span>
          )}
          <button
            onClick={() => turn.setPendingOrders([])}
            disabled={turn.pendingOrders.length === 0}
            className="text-xs text-slate-400 hover:text-slate-200 disabled:opacity-30 px-1"
            title="Clear queued orders"
          >
            Clear
          </button>
          <div className="flex-1" />
          <button
            onClick={turn.handleNextTurn}
            disabled={turn.processingTurn}
            className={`bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold px-4 py-1 rounded transition-colors uppercase ${turn.processingTurn ? "animate-pulse-glow" : ""}`}
          >
            {turn.processingTurn ? "Processing..." : "Advance"}
          </button>
        </div>
      </div>

      {/* Timeline (bottom) */}
      {timeline.timelineSnapshots.length > 0 && (
        <Timeline
          snapshots={timeline.timelineSnapshots}
          currentYear={gameState?.turn || 0}
          onRewind={timeline.handleTimelineRewind}
          onBranch={timeline.handleTimelineBranch}
        />
      )}

      {/* Advisor (floating) */}
      {gameState && (
        <Advisor
          messages={advisor.advisorMessages}
          onAskAdvisor={advisor.handleAskAdvisor}
          processing={advisor.processingAdvisor}
          playerNation={gameState.players["player"].name}
          currentYear={gameState.turn}
        />
      )}

      {/* Relations Panel (bottom-right) */}
      {gameState && relations.length > 0 && (
        <div
          className="absolute right-4 z-20"
          style={{ bottom: timeline.timelineSnapshots.length > 0 ? 140 : 16 }}
        >
          <RelationsPanel
            relations={relations}
            playerNationName={gameState.players["player"].name}
            provinces={gameState.provinces}
          />
        </div>
      )}

      {/* Processing overlay */}
      {turn.processingTurn && (
        <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden">
          <div
            className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent"
            style={{ animation: "scanline 2s linear infinite" }}
          />
          <div className="absolute inset-0 bg-slate-950/10" />
        </div>
      )}

      {/* Save notification */}
      {save.showSaveNotif && (
        <div className="absolute top-20 right-4 text-sm text-emerald-400 font-mono bg-slate-900/90 px-3 py-2 rounded border border-emerald-700 shadow-lg animate-slide-down z-40">
          Game Saved
        </div>
      )}

      {/* Top Bar */}
      {gameState && (
        <div className="absolute top-0 left-0 w-full p-2 bg-gradient-to-b from-slate-950/90 to-transparent pointer-events-none flex justify-center items-center gap-8 text-slate-200 font-mono text-lg z-10">
          <div className="bg-slate-900/80 px-4 py-2 rounded-full border border-slate-700 backdrop-blur pointer-events-auto flex items-center gap-4">
            <div className={yearFlash ? "animate-flash-border rounded px-1 -mx-1" : ""}>
              <span className="text-slate-500 text-sm uppercase mr-2">Year</span>
              <span className="font-bold">{gameState.turn}</span>
            </div>
            <div className="w-px h-6 bg-slate-700" />
            <div>
              <span className="text-blue-400 text-sm uppercase mr-2">Nation</span>
              <span className="font-bold">{gameState.players["player"].name}</span>
            </div>
            <div className="w-px h-6 bg-slate-700" />
            <button
              onClick={save.handleSaveGame}
              className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded transition-colors uppercase"
              title={save.lastSaveTime ? `Last: ${new Date(save.lastSaveTime).toLocaleString()}` : "Save"}
            >
              Save
            </button>
            <button
              onClick={handleSaveAndExit}
              className="bg-rose-800 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1 rounded transition-colors uppercase"
              title="Save game and return to main menu"
            >
              Save & Exit
            </button>
            <button
              onClick={() => {
                game.refreshSavedGames();
                save.setShowSavesPanel(true);
              }}
              className="bg-sky-700 hover:bg-sky-600 text-white text-xs font-bold px-3 py-1 rounded transition-colors uppercase"
            >
              Saves ({game.savedGames.length})
            </button>
            <button
              onClick={() => save.setShowPromptSettings(true)}
              className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-2 py-1 rounded transition-colors"
              title="Prompt Settings"
            >
              Settings
            </button>
            <div className="w-px h-6 bg-slate-700" />
            <div className="flex items-center gap-2 pointer-events-auto">
              <select
                value={turn.timeStep}
                onChange={(e) => turn.setTimeStep(e.target.value)}
                className="bg-slate-800 text-white text-xs border border-slate-700 rounded px-2 py-1 outline-none"
              >
                <option value="5d">5 Days</option>
                <option value="1m">1 Month</option>
                <option value="6m">6 Months</option>
                <option value="1y">1 Year</option>
                <option value="custom">Custom...</option>
              </select>
              {turn.timeStep === "custom" && (
                <input
                  type="text"
                  value={turn.customTime}
                  onChange={(e) => turn.setCustomTime(e.target.value)}
                  placeholder="e.g. 2 years"
                  className="bg-slate-800 text-white text-xs border border-slate-700 rounded px-2 py-1 w-20 outline-none"
                />
              )}
              <button
                onClick={turn.handleNextTurn}
                disabled={turn.processingTurn}
                className={`bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold px-3 py-1 rounded transition-colors uppercase ${turn.processingTurn ? "animate-pulse-glow" : ""}`}
              >
                {turn.processingTurn ? "Processing..." : "Advance"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saves Panel */}
      {save.showSavesPanel && (
        <div className="absolute inset-0 z-40 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
              <h2 className="text-sm uppercase tracking-wide text-slate-200 font-bold">
                Saved Games
              </h2>
              <button
                onClick={() => save.setShowSavesPanel(false)}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded"
              >
                Close
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              {game.savedGames.length === 0 && (
                <div className="px-4 py-6 text-sm text-slate-400">No saves yet.</div>
              )}
              {game.savedGames.map((s) => (
                <div
                  key={`${s.id}-${s.timestamp}`}
                  className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="text-sm text-slate-100 truncate">
                      {s.id === "autosave" ? "Autosave" : "Manual Save"}
                      {" · "}
                      {game.getNationLabel(s.gameConfig.playerNationId)}
                      {" · "}
                      {s.gameConfig.provider}/{s.gameConfig.model}
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      {new Date(s.timestamp).toLocaleString()} · Turn{" "}
                      {s.gameState.turn}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {s.gameConfig.scenario}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleLoadSavedGame(s.id)}
                      className="bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold px-3 py-1 rounded uppercase"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => game.handleDeleteSavedGame(s.id)}
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

      {/* Prompt Settings */}
      <PromptSettings
        open={save.showPromptSettings}
        onClose={() => save.setShowPromptSettings(false)}
      />
    </main>
  );
}
