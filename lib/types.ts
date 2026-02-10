// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GeoFeature = any;

export type Player = {
  id: string;
  name: string;
  color: string;
};

export type Province = {
  id: string | number;
  name: string;
  ownerId: string | null;
  color: string;
  feature: GeoFeature;
  center: [number, number];
  neighbors: (string | number)[];
  resources: {
    population: number;
    defense: number;
    economy: number;
    technology: number;
  };
};

export type MapTheme = "classic" | "cyberpunk" | "parchment" | "blueprint";

export type GameEvent = {
  id: string;
  year: number;
  description: string;
  type: "diplomacy" | "war" | "discovery" | "flavor" | "economy" | "crisis";
};

// Diplomatic Relations
export type RelationType = "neutral" | "friendly" | "allied" | "hostile" | "war" | "vassal";

export type DiplomaticRelation = {
  nationA: string;
  nationB: string;
  type: RelationType;
  treaties: string[];
};

// Chat System
export type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  turnYear: number;
  tone?: "friendly" | "neutral" | "hostile" | "threatening";
};

export type ChatThread = {
  id: string;
  type: "bilateral" | "group";
  participants: string[];
  name: string;
  messages: ChatMessage[];
  unreadCount: number;
};

// Presets
export type Preset = {
  id: string;
  name: string;
  description: string;
  year: number;
  scenario: string;
  difficulty: "Sandbox" | "Easy" | "Realistic" | "Hardcore" | "Impossible";
  suggestedNations: string[];
  category: "historical" | "modern" | "alternate" | "fictional";
  icon: string;
};

// Timeline / Rewind
export type TimelineSnapshot = {
  id: string;
  turnYear: number;
  timestamp: number;
  description: string;
  command: string;
  gameStateSlim: {
    turn: number;
    provinceOwners: Record<string, string | null>;
    events: GameEvent[];
    relations: DiplomaticRelation[];
  };
  parentSnapshotId: string | null;
};

// Advisor
export type AdvisorMessage = {
  id: string;
  role: "user" | "advisor";
  content: string;
  timestamp: number;
  category?: "military" | "diplomacy" | "economy" | "domestic" | "general";
};

// Enhanced GameState
export type GameState = {
  turn: number;
  players: Record<string, Player>;
  provinces: Province[];
  selectedProvinceId: string | number | null;
  theme: MapTheme;
  events?: GameEvent[];
  relations?: DiplomaticRelation[];
  chatThreads?: ChatThread[];
  timeline?: TimelineSnapshot[];
  advisorHistory?: AdvisorMessage[];
};
