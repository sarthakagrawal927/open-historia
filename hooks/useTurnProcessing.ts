"use client";

import { useState, useCallback } from "react";
import { GameConfig } from "@/components/GameSetup";
import {
  GameState,
  GameEvent,
  DiplomaticRelation,
  TimelineSnapshot,
} from "@/lib/types";
import { LogEntry } from "@/lib/game-storage";
import { loadPromptOverrides } from "@/components/PromptSettings";

const MAX_LOGS = 200;
const MAX_EVENTS = 200;

function uid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useTurnProcessing(deps: {
  gameState: GameState | null;
  gameConfig: GameConfig | null;
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
  relations: DiplomaticRelation[];
  setRelations: React.Dispatch<React.SetStateAction<DiplomaticRelation[]>>;
  timelineSnapshots: TimelineSnapshot[];
  setTimelineSnapshots: React.Dispatch<React.SetStateAction<TimelineSnapshot[]>>;
}) {
  const {
    gameState,
    gameConfig,
    setGameState,
    relations,
    setRelations,
    timelineSnapshots,
    setTimelineSnapshots,
  } = deps;

  const [processingTurn, setProcessingTurn] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<string[]>([]);
  const [timeStep, setTimeStep] = useState("1m");
  const [customTime, setCustomTime] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [storySoFar, setStorySoFar] = useState("");

  const addLog = useCallback((text: string, type: LogEntry["type"] = "info") => {
    setLogs((prev) => {
      const next = [...prev, { id: uid(), type, text }];
      return next.length > MAX_LOGS ? next.slice(-MAX_LOGS) : next;
    });
  }, []);

  const queueOrder = useCallback(
    (cmd: string) => {
      if (!gameState || !gameConfig) return;
      addLog(cmd, "command");
      setPendingOrders((prev) => [...prev, cmd]);
      addLog("Order queued. Click Advance to execute.", "info");
    },
    [gameState, gameConfig, addLog]
  );

  const processCommand = useCallback(
    async (cmd: string) => {
      if (!gameState || !gameConfig || processingTurn) return;

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
            history: logs.slice(-15),
            events: events.slice(-10),
            relations,
            provinceSummary,
            storySoFar,
            promptOverrides: loadPromptOverrides(),
          }),
        });

        const data = await res.json();

        if (data.message) {
          addLog(data.message, "info");
        }

        if (data.storySoFar) {
          setStorySoFar(data.storySoFar);
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
                const pLower = provinceName.toLowerCase();
                let target = prev.provinces.find(
                  (p) => p.name.toLowerCase() === pLower
                );
                if (!target) {
                  target = prev.provinces.find(
                    (p) =>
                      p.name.toLowerCase().startsWith(pLower + " (") ||
                      p.name.replace(/\s*\(.*\)$/, "").toLowerCase() === pLower
                  );
                }
                if (!target) {
                  target = prev.provinces.find(
                    (p) =>
                      (p.parentCountryName || "").toLowerCase() === pLower &&
                      !p.isSubNational
                  );
                }
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

            if (update.type === "event") {
              const eventType = (update.eventType as string) || "flavor";
              const newEvent: GameEvent = {
                id: uid(),
                year: (update.year as number) || gameState.turn,
                description: update.description as string,
                type: (eventType as GameEvent["type"]) || "flavor",
              };
              setEvents((prev) => {
                const next = [...prev, newEvent];
                return next.length > MAX_EVENTS ? next.slice(-MAX_EVENTS) : next;
              });

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

        if (turnEvents.length > 0) {
          const summary = turnEvents.map((e) => `  - ${e}`).join("\n");
          addLog(`--- Events This Period ---\n${summary}`, "event-summary");
        }

        if (hasSignificantEvent) {
          setTimelineSnapshots((prev) => {
            const next = [
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
            ];
            return next.length > 50 ? next.slice(-50) : next;
          });
        }
      } catch (err) {
        console.error(err);
        addLog("Communication with HQ lost (Network Error).", "error");
      } finally {
        setProcessingTurn(false);
      }
    },
    [gameState, gameConfig, processingTurn, logs, events, relations, storySoFar, addLog, setGameState, setRelations, setTimelineSnapshots]
  );

  const handleNextTurn = useCallback(() => {
    if (!gameState || !gameConfig || processingTurn) return;

    const period = timeStep === "custom" ? customTime : timeStep;
    const label = period || "1 month";

    const orders = [...pendingOrders];
    const timeCmd = `Advance time by ${label}`;

    let fullCommand: string;
    if (orders.length > 0) {
      fullCommand = `ORDERS:\n${orders.map((o, i) => `${i + 1}. ${o}`).join("\n")}\n\nThen ${timeCmd}.`;
    } else {
      fullCommand = `No new orders. ${timeCmd}. Describe what happens in the world.`;
    }

    const yearDelta =
      period === "5d" ? 0 :
      period === "1m" ? 0 :
      period === "6m" ? 0 :
      period === "1y" ? 1 : 0;
    if (yearDelta > 0) {
      setGameState((prev) => (prev ? { ...prev, turn: prev.turn + yearDelta } : null));
    }
    setPendingOrders([]);
    processCommand(fullCommand);
  }, [gameState, gameConfig, processingTurn, timeStep, customTime, pendingOrders, processCommand, setGameState]);

  return {
    processingTurn,
    pendingOrders,
    setPendingOrders,
    timeStep,
    setTimeStep,
    customTime,
    setCustomTime,
    logs,
    setLogs,
    events,
    setEvents,
    storySoFar,
    setStorySoFar,
    addLog,
    queueOrder,
    handleNextTurn,
  };
}
