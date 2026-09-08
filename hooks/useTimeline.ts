
import { useCallback,useState } from "react";

import type { LogEntry } from "@/lib/game-storage";
import type {
  DiplomaticRelation,
  GameEvent,
  GameState,
  TimelineSnapshot,
} from "@/lib/types";

export function useTimeline(deps: {
  gameState: GameState | null;
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
  setEvents: React.Dispatch<React.SetStateAction<GameEvent[]>>;
  setRelations: React.Dispatch<React.SetStateAction<DiplomaticRelation[]>>;
  addLog: (text: string, type?: LogEntry["type"]) => void;
}) {
  const { gameState, setGameState, setEvents, setRelations, addLog } = deps;

  const [timelineSnapshots, setTimelineSnapshots] = useState<TimelineSnapshot[]>([]);

  const handleTimelineRewind = useCallback(
    (snapshotId: string) => {
      const snapshot = timelineSnapshots.find((s) => s.id === snapshotId);
      if (!snapshot || !gameState) return;

      const restoredProvinces = gameState.provinces.map((p) => ({
        ...p,
        ownerId:
          snapshot.gameStateSlim.provinceOwners[String(p.id)] === undefined
            ? p.ownerId
            : snapshot.gameStateSlim.provinceOwners[String(p.id)],
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
    [timelineSnapshots, gameState, setGameState, setEvents, setRelations, addLog]
  );

  const handleTimelineBranch = useCallback(
    (snapshotId: string) => {
      handleTimelineRewind(snapshotId);
      addLog("Created alternate timeline branch.", "info");
    },
    [handleTimelineRewind, addLog]
  );

  return {
    timelineSnapshots,
    setTimelineSnapshots,
    handleTimelineRewind,
    handleTimelineBranch,
  };
}
