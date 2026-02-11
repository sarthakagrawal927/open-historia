"use client";

import React, { useState, useEffect, useCallback } from "react";
import CommandTerminal from "@/components/CommandTerminal";
import FlatMap from "@/components/FlatMap";
import GameSetup, { GameConfig } from "@/components/GameSetup";
import DiplomacyChat from "@/components/DiplomacyChat";
import Timeline from "@/components/Timeline";
import Advisor from "@/components/Advisor";
import PresetBrowser from "@/components/PresetBrowser";
import { loadWorldData } from "@/lib/world-loader";
import { INITIAL_PLAYERS } from "@/lib/map-generator";
import {
  Province,
  GameState,
  MapTheme,
  GameEvent,
  ChatThread,
  ChatMessage,
  DiplomaticRelation,
  TimelineSnapshot,
  AdvisorMessage,
  Preset,
} from "@/lib/types";
import {
  saveGame,
  autoSave,
  listSavedGames,
  loadGame,
  deleteGame,
  restoreSavedGameState,
  SavedGame,
} from "@/lib/game-storage";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// LogEntry type imported from game-storage
type LogEntry = import("@/lib/game-storage").LogEntry;

function uid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function GamePage() {
  // ── Core State ──────────────────────────────────────────────────────────
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingTurn, setProcessingTurn] = useState(false);
  const [provincesCache, setProvincesCache] = useState<Province[]>([]);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);

  // ── Flow State ──────────────────────────────────────────────────────────
  const [showPresets, setShowPresets] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);

  // ── Time Skip ───────────────────────────────────────────────────────────
  const [timeStep, setTimeStep] = useState("1m");
  const [customTime, setCustomTime] = useState("");

  // ── Save/Load ───────────────────────────────────────────────────────────
  const [lastSaveTime, setLastSaveTime] = useState<number | null>(null);
  const [showSaveNotif, setShowSaveNotif] = useState(false);
  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);
  const [showSavesPanel, setShowSavesPanel] = useState(false);

  // ── New Systems ─────────────────────────────────────────────────────────
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);
  const [relations, setRelations] = useState<DiplomaticRelation[]>([]);
  const [timelineSnapshots, setTimelineSnapshots] = useState<TimelineSnapshot[]>([]);
  const [advisorMessages, setAdvisorMessages] = useState<AdvisorMessage[]>([]);
  const [processingChat, setProcessingChat] = useState(false);
  const [processingAdvisor, setProcessingAdvisor] = useState(false);

  // ── Initialization ──────────────────────────────────────────────────────

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

  // ── Logging ─────────────────────────────────────────────────────────────

  const addLog = useCallback((text: string, type: LogEntry["type"] = "info") => {
    setLogs((prev) => [...prev, { id: uid(), type, text }]);
  }, []);

  // ── Preset Selection ────────────────────────────────────────────────────

  const handleSelectPreset = (preset: Preset) => {
    setSelectedPreset(preset);
    setShowPresets(false);
  };

  const handleCustomScenario = () => {
    setSelectedPreset(null);
    setShowPresets(false);
  };

  // ── Game Start ──────────────────────────────────────────────────────────

  const handleStartGame = (config: GameConfig) => {
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
      initialPlayers["player"].name = nation.name;
      provinces = provincesCache.map((p) =>
        p.id === config.playerNationId ? { ...p, ownerId: "player" } : p
      );
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
    setChatThreads([]);
    setRelations([]);
    setTimelineSnapshots([]);
    setAdvisorMessages([]);

    setLogs([
      { id: uid(), type: "info", text: "Welcome to Open Historia." },
      { id: uid(), type: "info", text: `Scenario: ${config.scenario.slice(0, 120)}...` },
      { id: uid(), type: "info", text: `Difficulty: ${config.difficulty}` },
      { id: uid(), type: "info", text: "The AI Game Master is listening..." },
    ]);
    setEvents([]);
  };

  // ── Province Selection ──────────────────────────────────────────────────

  const handleSelectProvince = useCallback((provinceId: string | number | null) => {
    setGameState((prev) => {
      if (!prev) return null;
      return { ...prev, selectedProvinceId: provinceId };
    });
  }, []);

  // ── Turn Processing ─────────────────────────────────────────────────────

  const handleNextTurn = () => {
    const period = timeStep === "custom" ? customTime : timeStep;
    const label = period || "1 month";

    // Player-controlled time: advance the year on each Advance click
    setGameState((prev) => prev ? { ...prev, turn: prev.turn + 1 } : null);
    processCommand(`Wait / Advance Time by ${label}`);
  };

  const processCommand = async (cmd: string) => {
    if (!gameState || !gameConfig || processingTurn) return;

    addLog(cmd, "command");
    setProcessingTurn(true);

    try {
      const provinceSummary = gameState.provinces
        .filter((p) => p.ownerId !== null)
        .map((p) => ({ name: p.name, ownerId: p.ownerId }));

      const res = await fetch("/api/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: cmd,
          gameState: {
            turn: gameState.turn,
            players: gameState.players,
            provinces: provinceSummary,
          },
          config: gameConfig,
          history: logs.slice(-25),
          events: events.slice(-10),
          relations: relations.slice(-20),
          provinceSummary,
        }),
      });

      const data = await res.json();

      if (data.message) {
        addLog(data.message, "info");
      }

      let hasSignificantEvent = false;
      const turnEvents: string[] = [];

      if (data.updates) {
        data.updates.forEach((update: Record<string, unknown>) => {
          if (update.type === "owner") {
            const provinceName = update.provinceName as string;
            const newOwner = update.newOwnerId as string;
            const isPlayerCapture = newOwner === "player";

            setGameState((prev) => {
              if (!prev) return null;
              const target = prev.provinces.find(
                (p) => p.name.toLowerCase() === provinceName.toLowerCase()
              );
              if (target) {
                return {
                  ...prev,
                  provinces: prev.provinces.map((p) =>
                    p.id === target.id ? { ...p, ownerId: newOwner } : p
                  ),
                };
              }
              return prev;
            });

            hasSignificantEvent = true;
            if (isPlayerCapture) {
              addLog(`CAPTURED: ${provinceName} is now under your control!`, "capture");
              turnEvents.push(`Captured ${provinceName}`);
            } else {
              addLog(`${provinceName} seized by ${newOwner}`, "war");
              turnEvents.push(`${provinceName} fell to ${newOwner}`);
            }
          }

          // Time updates ignored — player controls time via Advance button
          if (update.type === "time") {
            // no-op
          }

          if (update.type === "event") {
            const eventType = (update.eventType as string) || "flavor";
            const newEvent: GameEvent = {
              id: uid(),
              year: (update.year as number) || gameState.turn,
              description: update.description as string,
              type: (eventType as GameEvent["type"]) || "flavor",
            };
            setEvents((prev) => [...prev, newEvent]);

            const logType = (
              eventType === "war" ? "war" :
              eventType === "diplomacy" ? "diplomacy" :
              eventType === "economy" ? "economy" :
              eventType === "crisis" ? "crisis" : "info"
            ) as LogEntry["type"];

            if (eventType !== "flavor") {
              hasSignificantEvent = true;
              turnEvents.push(update.description as string);
            }
            addLog(update.description as string, logType);
          }

          if (update.type === "relation") {
            const rel: DiplomaticRelation = {
              nationA: update.nationA as string,
              nationB: update.nationB as string,
              type: (update.relationType as DiplomaticRelation["type"]) || "neutral",
              treaties: [],
            };
            setRelations((prev) => {
              const filtered = prev.filter(
                (r) =>
                  !(
                    (r.nationA === rel.nationA && r.nationB === rel.nationB) ||
                    (r.nationA === rel.nationB && r.nationB === rel.nationA)
                  )
              );
              return [...filtered, rel];
            });

            hasSignificantEvent = true;
            const relType = update.relationType as string;
            const logType = (relType === "war" ? "war" : relType === "allied" ? "diplomacy" : "info") as LogEntry["type"];
            addLog(`${update.nationA} ↔ ${update.nationB}: ${relType}`, logType);
            turnEvents.push(`${update.nationA} & ${update.nationB} now ${relType}`);
          }
        });
      }

      // Show concise event summary after time skips
      const isTimeSkip = cmd.toLowerCase().includes("advance") || cmd.toLowerCase().includes("wait");
      if (isTimeSkip && turnEvents.length > 0) {
        const summary = turnEvents.map((e) => `  - ${e}`).join("\n");
        addLog(`--- Events This Period ---\n${summary}`, "event-summary");
      }

      // Only create timeline snapshot on significant events (not every command)
      if (hasSignificantEvent) {
        setTimelineSnapshots((prev) => [
          ...prev,
          {
            id: uid(),
            turnYear: gameState.turn,
            timestamp: Date.now(),
            description: turnEvents[0] || data.message?.slice(0, 100) || cmd.slice(0, 100),
            command: cmd,
            gameStateSlim: {
              turn: gameState.turn,
              provinceOwners: Object.fromEntries(
                gameState.provinces.map((p) => [String(p.id), p.ownerId])
              ),
              events: events.slice(-20),
              relations,
            },
            parentSnapshotId: prev.length > 0 ? prev[prev.length - 1].id : null,
          },
        ]);
      }
    } catch (err) {
      console.error(err);
      addLog("Communication with HQ lost (Network Error).", "error");
    } finally {
      setProcessingTurn(false);
    }
  };

  // ── Diplomacy Chat ──────────────────────────────────────────────────────

  const handleCreateThread = useCallback(
    (type: "bilateral" | "group", participantIds: string[], name?: string) => {
      const threadName = name || participantIds.join(", ");
      const existing = chatThreads.find(
        (t) =>
          t.type === type &&
          t.participants.length === participantIds.length + 1 &&
          participantIds.every((p) => t.participants.includes(p))
      );
      if (existing) return;

      const newThread: ChatThread = {
        id: uid(),
        type,
        participants: ["player", ...participantIds],
        name: threadName,
        messages: [],
        unreadCount: 0,
      };
      setChatThreads((prev) => [...prev, newThread]);
    },
    [chatThreads]
  );

  const handleSendChatMessage = useCallback(
    async (threadId: string, message: string) => {
      const thread = chatThreads.find((t) => t.id === threadId);
      if (!thread || !gameConfig || !gameState) return;

      setProcessingChat(true);

      const playerMsg: ChatMessage = {
        id: uid(),
        senderId: "player",
        senderName: gameState.players["player"].name,
        content: message,
        timestamp: Date.now(),
        turnYear: gameState.turn,
      };

      setChatThreads((prev) =>
        prev.map((t) =>
          t.id === threadId ? { ...t, messages: [...t.messages, playerMsg] } : t
        )
      );

      try {
        const targetNation =
          thread.participants.find((p) => p !== "player") || thread.name;

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            playerNation: gameState.players["player"].name,
            targetNation,
            chatHistory: thread.messages.slice(-20).map((m) => ({
              sender: m.senderName,
              content: m.content,
              turnYear: m.turnYear,
            })),
            gameContext: {
              year: gameState.turn,
              scenario: gameConfig.scenario,
              difficulty: gameConfig.difficulty,
            },
            relations: relations.find(
              (r) =>
                (r.nationA === "player" && r.nationB === targetNation) ||
                (r.nationB === "player" && r.nationA === targetNation)
            ) || null,
            recentEvents: events
              .slice(-10)
              .map((e) => ({ year: e.year, description: e.description })),
            config: gameConfig,
          }),
        });

        const data = await res.json();

        const aiMsg: ChatMessage = {
          id: uid(),
          senderId: targetNation,
          senderName: targetNation,
          content: data.message || "...",
          timestamp: Date.now(),
          turnYear: gameState.turn,
          tone: data.tone || "neutral",
        };

        setChatThreads((prev) =>
          prev.map((t) =>
            t.id === threadId ? { ...t, messages: [...t.messages, aiMsg] } : t
          )
        );

        // Handle relation changes from diplomacy
        if (data.relationChange) {
          const rel: DiplomaticRelation = {
            nationA: gameState.players["player"].name,
            nationB: targetNation,
            type: data.relationChange.newType || "neutral",
            treaties: [],
          };
          setRelations((prev) => {
            const filtered = prev.filter(
              (r) =>
                !(
                  (r.nationA === rel.nationA && r.nationB === rel.nationB) ||
                  (r.nationA === rel.nationB && r.nationB === rel.nationA)
                )
            );
            return [...filtered, rel];
          });
        }
      } catch (err) {
        console.error(err);
        const errMsg: ChatMessage = {
          id: uid(),
          senderId: "system",
          senderName: "System",
          content: "Communication channel disrupted. Try again.",
          timestamp: Date.now(),
          turnYear: gameState.turn,
          tone: "hostile",
        };
        setChatThreads((prev) =>
          prev.map((t) =>
            t.id === threadId ? { ...t, messages: [...t.messages, errMsg] } : t
          )
        );
      } finally {
        setProcessingChat(false);
      }
    },
    [chatThreads, gameConfig, gameState, relations, events]
  );

  // ── Advisor ─────────────────────────────────────────────────────────────

  const handleAskAdvisor = useCallback(
    async (question: string) => {
      if (!gameConfig || !gameState) return;

      setProcessingAdvisor(true);

      const userMsg: AdvisorMessage = {
        id: uid(),
        role: "user",
        content: question,
        timestamp: Date.now(),
      };
      setAdvisorMessages((prev) => [...prev, userMsg]);

      try {
        const res = await fetch("/api/advisor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question,
            playerNation: gameState.players["player"].name,
            gameContext: {
              year: gameState.turn,
              scenario: gameConfig.scenario,
              difficulty: gameConfig.difficulty,
            },
            recentEvents: events.slice(-10),
            relations,
            history: advisorMessages.slice(-10).map((m) => ({
              content: m.content,
              role: m.role,
            })),
            config: gameConfig,
          }),
        });

        const data = await res.json();

        const advisorMsg: AdvisorMessage = {
          id: uid(),
          role: "advisor",
          content: data.advice || "I need more time to analyze the situation.",
          timestamp: Date.now(),
          category: data.category || "general",
        };
        setAdvisorMessages((prev) => [...prev, advisorMsg]);
      } catch (err) {
        console.error(err);
        setAdvisorMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "advisor",
            content: "My intelligence networks are disrupted. Please try again.",
            timestamp: Date.now(),
            category: "general",
          },
        ]);
      } finally {
        setProcessingAdvisor(false);
      }
    },
    [gameConfig, gameState, events, relations, advisorMessages]
  );

  // ── Timeline Rewind ─────────────────────────────────────────────────────

  const handleTimelineRewind = useCallback(
    (snapshotId: string) => {
      const snapshot = timelineSnapshots.find((s) => s.id === snapshotId);
      if (!snapshot || !gameState) return;

      const restoredProvinces = gameState.provinces.map((p) => ({
        ...p,
        ownerId:
          snapshot.gameStateSlim.provinceOwners[String(p.id)] ?? p.ownerId,
      }));

      setGameState({
        ...gameState,
        turn: snapshot.gameStateSlim.turn,
        provinces: restoredProvinces,
      });
      setEvents(snapshot.gameStateSlim.events);
      setRelations(snapshot.gameStateSlim.relations);
      addLog(`Rewound to Year ${snapshot.turnYear}.`, "success");
    },
    [timelineSnapshots, gameState, addLog]
  );

  const handleTimelineBranch = useCallback(
    (snapshotId: string) => {
      handleTimelineRewind(snapshotId);
      addLog("Created alternate timeline branch.", "info");
    },
    [handleTimelineRewind, addLog]
  );

  // ── Save / Load ─────────────────────────────────────────────────────────

  const handleSaveGame = () => {
    if (!gameState || !gameConfig) return;
    try {
      const saveId = saveGame(gameState, gameConfig, logs, undefined, events);
      setLastSaveTime(Date.now());
      setShowSaveNotif(true);
      setTimeout(() => setShowSaveNotif(false), 2000);
      refreshSavedGames();
      addLog(
        `Game saved (${saveId === "autosave" ? "autosave" : "manual"}).`,
        "success"
      );
    } catch (error) {
      addLog(
        `Save failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        "error"
      );
    }
  };

  const handleLoadSavedGame = (saveId: string) => {
    const saved = loadGame(saveId);
    if (!saved) {
      addLog(`Save "${saveId}" not found.`, "error");
      refreshSavedGames();
      return;
    }
    if (provincesCache.length === 0) {
      addLog("Map data still loading.", "error");
      return;
    }

    const restoredState = restoreSavedGameState(saved, provincesCache);
    setGameConfig(saved.gameConfig);
    setGameState(restoredState);
    setProvincesCache(restoredState.provinces);
    setEvents(saved.events || []);
    setShowPresets(false);

    const restoredLogs = saved.logs?.length ? saved.logs : [];
    setLogs([
      ...restoredLogs,
      { id: uid(), type: "success", text: `Loaded save from ${new Date(saved.timestamp).toLocaleString()}.` },
    ]);
    setShowSavesPanel(false);
  };

  const handleDeleteSavedGame = (saveId: string) => {
    deleteGame(saveId);
    refreshSavedGames();
    if (gameConfig) addLog(`Deleted save: ${saveId}`, "info");
  };

  // Auto-save
  useEffect(() => {
    if (!gameState || !gameConfig) return;
    autoSave(gameState, gameConfig, logs, events);
    refreshSavedGames();
  }, [gameState, gameConfig, logs, events, refreshSavedGames]);

  // ── Helpers ─────────────────────────────────────────────────────────────

  const getNationLabel = (nationId: string) => {
    return provincesCache.find((p) => String(p.id) === String(nationId))?.name || nationId;
  };

  // ── Render ──────────────────────────────────────────────────────────────

  if (loading) {
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
  if (showPresets && !gameConfig) {
    return (
      <PresetBrowser
        onSelectPreset={handleSelectPreset}
        onCustomScenario={handleCustomScenario}
      />
    );
  }

  // Phase 2: Game setup
  if (!gameConfig) {
    return (
      <GameSetup
        provinces={provincesCache}
        onStartGame={handleStartGame}
        savedGames={savedGames}
        onLoadSavedGame={handleLoadSavedGame}
        onDeleteSavedGame={handleDeleteSavedGame}
        onRefreshSavedGames={refreshSavedGames}
        preset={
          selectedPreset
            ? {
                year: selectedPreset.year,
                scenario: selectedPreset.scenario,
                difficulty: selectedPreset.difficulty,
                suggestedNations: selectedPreset.suggestedNations,
              }
            : null
        }
      />
    );
  }

  // Phase 3: Main game
  const selectedProvince =
    gameState?.selectedProvinceId != null
      ? gameState.provinces.find((p) => p.id === gameState.selectedProvinceId) || null
      : null;

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Flat Map */}
      {gameState && (
        <FlatMap
          provinces={gameState.provinces}
          players={gameState.players}
          onSelectProvince={handleSelectProvince}
          selectedProvinceId={gameState.selectedProvinceId}
          theme={gameState.theme}
          relations={relations}
        />
      )}

      {/* Diplomacy Chat (top-right) */}
      {gameState && (
        <DiplomacyChat
          chatThreads={chatThreads}
          provinces={gameState.provinces}
          players={gameState.players}
          playerNationName={gameState.players["player"].name}
          currentYear={gameState.turn}
          onSendMessage={handleSendChatMessage}
          onCreateThread={handleCreateThread}
          selectedProvinceId={gameState.selectedProvinceId}
          processing={processingChat}
        />
      )}

      {/* Command Terminal (bottom-left, pushed up when timeline visible) */}
      <div style={{ position: "absolute", bottom: timelineSnapshots.length > 0 ? 140 : 16, left: 16, zIndex: 20 }}>
        <CommandTerminal logs={logs} onCommand={processCommand} />
      </div>

      {/* Timeline (bottom) */}
      {timelineSnapshots.length > 0 && (
        <Timeline
          snapshots={timelineSnapshots}
          currentYear={gameState?.turn || 0}
          onRewind={handleTimelineRewind}
          onBranch={handleTimelineBranch}
        />
      )}

      {/* Advisor (floating) */}
      {gameState && (
        <Advisor
          messages={advisorMessages}
          onAskAdvisor={handleAskAdvisor}
          processing={processingAdvisor}
          playerNation={gameState.players["player"].name}
          currentYear={gameState.turn}
        />
      )}

      {/* Processing indicator */}
      {processingTurn && (
        <div className="absolute bottom-20 left-4 text-xs text-amber-500 animate-pulse font-mono bg-slate-900/80 px-2 py-1 rounded z-20">
          [Processing...]
        </div>
      )}

      {/* Save notification */}
      {showSaveNotif && (
        <div className="absolute top-20 right-4 text-sm text-emerald-400 font-mono bg-slate-900/90 px-3 py-2 rounded border border-emerald-700 shadow-lg animate-fade-in z-40">
          Game Saved
        </div>
      )}

      {/* Top Bar */}
      {gameState && (
        <div className="absolute top-0 left-0 w-full p-2 bg-gradient-to-b from-slate-950/90 to-transparent pointer-events-none flex justify-center items-center gap-8 text-slate-200 font-mono text-lg z-10">
          <div className="bg-slate-900/80 px-4 py-2 rounded-full border border-slate-700 backdrop-blur pointer-events-auto flex items-center gap-4">
            <div>
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
              onClick={handleSaveGame}
              className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded transition-colors uppercase"
              title={lastSaveTime ? `Last: ${new Date(lastSaveTime).toLocaleString()}` : "Save"}
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
            <div className="w-px h-6 bg-slate-700" />
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

      {/* Saves Panel */}
      {showSavesPanel && (
        <div className="absolute inset-0 z-40 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
              <h2 className="text-sm uppercase tracking-wide text-slate-200 font-bold">
                Saved Games
              </h2>
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
                <div
                  key={`${save.id}-${save.timestamp}`}
                  className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="text-sm text-slate-100 truncate">
                      {save.id === "autosave" ? "Autosave" : "Manual Save"}
                      {" · "}
                      {getNationLabel(save.gameConfig.playerNationId)}
                      {" · "}
                      {save.gameConfig.provider}/{save.gameConfig.model}
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      {new Date(save.timestamp).toLocaleString()} · Turn{" "}
                      {save.gameState.turn}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {save.gameConfig.scenario}
                    </div>
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
