import { Player } from "./types";

export const INITIAL_PLAYERS: Record<string, Player> = {
  "player": { id: "player", name: "You", color: "#3b82f6", gold: 100 }, // Blue
  "ai_red": { id: "ai_red", name: "Red Empire", color: "#ef4444", gold: 100 }, // Red
  "ai_green": { id: "ai_green", name: "Green Republic", color: "#22c55e", gold: 100 }, // Green
  "ai_yellow": { id: "ai_yellow", name: "Golden Horde", color: "#eab308", gold: 100 }, // Yellow
};