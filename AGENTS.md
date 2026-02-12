# AGENTS.md - Complete AI Agent Development Guide for Open Historia

> **Purpose**: This document contains EVERYTHING an AI agent needs to know to develop, debug, and extend Open Historia. For human-friendly documentation, see README.md.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Patterns](#architecture--patterns)
3. [Complete File Map](#complete-file-map)
4. [Type System](#type-system)
5. [AI Prompt System](#ai-prompt-system)
6. [Development Workflows](#development-workflows)
7. [Common Tasks with Examples](#common-tasks-with-examples)
8. [Coding Conventions](#coding-conventions)
9. [Technical Decisions & Rationale](#technical-decisions--rationale)
10. [Common Pitfalls](#common-pitfalls)
11. [Testing Strategy](#testing-strategy)
12. [Quick Reference](#quick-reference)

---

## Project Overview

**Open Historia** is an AI-powered grand strategy game where players rewrite history through natural language commands. The game simulates geopolitical scenarios from ancient history to speculative futures.

### Core Concept
- **AI as Game Engine**: The AI doesn't just respond - it adjudicates outcomes, drives independent nation behavior, and generates emergent narratives
- **Natural Language Interface**: Players issue commands via terminal (e.g., "Invade West Coast (USA)", "Negotiate with Japan")
- **Deterministic State Updates**: AI returns strict JSON that updates game state predictably
- **Multi-Provider Support**: Anthropic Claude, OpenAI GPT, Google Gemini, DeepSeek, or local CLI bridge

### Technology Stack
```
Framework:       Next.js 16 (App Router, React 19, TypeScript)
Styling:         Tailwind CSS 4 (dark theme, monospace aesthetic)
Map Rendering:   MapLibre GL JS (WebGL) via react-map-gl/maplibre
Database:        Turso (LibSQL) + Drizzle ORM
Authentication:  Better Auth (Google OAuth)
AI SDKs:         @anthropic-ai/sdk, openai, @google/generative-ai
Geo Libraries:   topojson-client, maplibre-gl, react-map-gl
```

### Project Root
`/Users/sarthakagrawal/Desktop/open-historia`

---

## Architecture & Patterns

### 1. Separation of Concerns

```
Game State Management → /app/page.tsx (1,144 lines)
├─ Turn processing, save/load, UI coordination
├─ Order queue (commands wait until "Advance")
└─ Subsystem integration (chat, advisor, timeline)

AI Communication → /app/api/
├─ /turn/route.ts - Game Master (turn processing)
├─ /chat/route.ts - Diplomacy AI
└─ /advisor/route.ts - Strategic advisor

Data Layer → /lib/
├─ game-storage.ts - Local + cloud save abstraction
├─ types.ts - TypeScript definitions
├─ ai-prompts.ts - All AI prompt templates
└─ world-loader.ts - Map data processing

Presentation → /components/
├─ MapView.tsx - MapLibre GL JS map renderer (3-tier LOD)
├─ CommandTerminal.tsx - Terminal UI
├─ DiplomacyChat.tsx - Multi-threaded chat
└─ [15+ other UI components]
```

### 2. AI Prompt Evolution - The `storySoFar` Pattern

**Problem**: Long games exceed token limits with full turn history.

**Solution** (from commit history):
- AI generates a compressed narrative summary (`storySoFar`) each turn
- Only recent logs/events sent as detailed context
- Old turns compressed into running narrative
- Token usage stays constant regardless of game length

**Location**: `/lib/ai-prompts.ts` - see `buildGameMasterPrompt()`

### 3. Difficulty as AI Personality

Difficulty levels modify AI behavior instructions, not numerical stats:

```typescript
// /lib/ai-prompts.ts - DIFFICULTY_PROFILES
{
  Sandbox: "Accept all player actions unless physically impossible",
  Easy: "Most actions succeed with basic reasoning",
  Realistic: "Actions need proper planning, AI has self-interest",
  Hardcore: "Detailed planning required, AI is skeptical",
  Impossible: "Multi-turn prep needed, ruthless AI, fragile economies"
}
```

### 4. Map System Evolution

**History** (from commits):
- **Initial**: 3D WebGL globe (Three.js) in `GlobeMap.tsx`
- **Pivot**: "Replace 3D globe with animated flat map" (commit 9f158b3)
- **Intermediate**: D3.js Canvas2D flat map (`FlatMap.tsx`) with sub-national provinces
- **Current**: MapLibre GL JS (WebGL) with 3-tier hierarchical LOD
- **Reason**: Reliable hit-testing via `queryRenderedFeatures`, zoom-dependent layer visibility, better performance

**Current Implementation**: `/components/MapView.tsx`

**3-Tier Level of Detail (LOD)**:
| Tier | Zoom Range | Data | Description |
|------|-----------|------|-------------|
| 1 - Countries | 0–3.5 | ~240 country polygons | Merged from tier 2 provinces |
| 2 - Regions | 2.5–6.5 | ~285 provinces | Main game entities (61 sub-national + 224 countries) |
| 3 - States | 5.5+ | ~554 admin-1 states | Lazy-loaded from `admin1-detail.json` |

**Key Architectural Decisions**:
- Import `MapGL` (not `Map`) from `react-map-gl/maplibre` to avoid shadowing `globalThis.Map`
- GeoJSON built in `useMemo` from `Province[]` props (no separate data pipeline)
- Tier 3 lazy-loaded via `fetch("/admin1-detail.json")` when zoom >= 5
- Player territory highlight: dedicated source with glow + border layers at all zoom levels
- Relation-based borders: war (pulsing red), hostile (dashed orange), allied (subtle green)
- Whole-country selection: clicking any sub-province highlights all sibling provinces

### 5. Progressive Feature Addition

**Development Timeline** (from commit history):
1. **Phase 1**: Basic map + terminal + turn processing
2. **Phase 2**: Diplomacy chat, timeline rewind, AI advisor
3. **Phase 3**: Cloud saves, authentication, sub-national provinces
4. **Phase 4**: Animations, relations panel, prompt customization

**Pattern**: Core game loop first, then auxiliary systems incrementally.

### 6. Cloud-First Progressive Enhancement

- **Local storage** as fallback (no auth required)
- **Cloud saves** as enhancement (Google OAuth)
- **Pattern**: All features work locally, cloud adds cross-device sync

---

## Complete File Map

### Core Application (`/app/`)

```
/app/page.tsx (1,144 lines)
├─ Main game orchestrator
├─ State: players, provinces, events, relations, timeline
├─ Turn processing with order queue
├─ Save/load coordination
└─ Subsystem integration

/app/[id]/page.tsx
├─ Game session by ID route
└─ Same UI as main page, different URL pattern

/app/layout.tsx
├─ Root layout with metadata
└─ Better Auth session provider

/app/error.tsx & /app/global-error.tsx
└─ Error boundaries for production resilience
```

### API Routes (`/app/api/`)

```
/app/api/turn/route.ts
├─ POST: Process player command via AI Game Master
├─ Input: command, gameState, gameConfig, logs, events, relations, storySoFar
├─ Output: { message, updates[], newEvents[], relationChanges[], updatedStorySoFar }
└─ Handles province ownership, events, AI responses

/app/api/chat/route.ts
├─ POST: Bilateral diplomacy chat with AI nations
├─ Input: messages[], playerNation, targetNation, year, scenario, difficulty
├─ Output: { reply, tone }
└─ Nation-specific AI personalities based on era

/app/api/advisor/route.ts
├─ POST: Strategic advisor AI
├─ Input: question, gameState, scenario, playerNation
├─ Output: { advice }
└─ Analyzes map, relations, events for recommendations

/app/api/saves/route.ts
├─ GET: List all cloud saves for authenticated user
└─ POST: Create new cloud save

/app/api/saves/[id]/route.ts
├─ GET: Load specific cloud save
├─ PUT: Update existing save
└─ DELETE: Remove save

/app/api/saves/upload/route.ts
└─ POST: Upload local save to cloud

/app/api/auth/[...all]/route.ts
└─ Better Auth dynamic route handler
```

### UI Components (`/components/`)

```
MapView.tsx (~1,150 lines)
├─ MapLibre GL JS (WebGL) renderer via react-map-gl/maplibre
├─ 3-tier hierarchical LOD (countries → regions → states)
├─ Built-in hit-testing via queryRenderedFeatures
├─ Dynamic coloring by ownership with player highlights
├─ Tier 3 lazy loading (admin1-detail.json at zoom 5+)
├─ Relation borders: war (pulsing red), hostile (orange), allied (green)
├─ Whole-country selection on click
└─ City labels, province labels, vignette overlay

CommandTerminal.tsx (396 lines)
├─ Terminal-style command input
├─ Command history (↑/↓ navigation)
├─ Autocomplete suggestions
└─ Colored log output by type

DiplomacyChat.tsx (322 lines)
├─ Multi-threaded chat UI
├─ Thread list with unread counts
├─ Message history per nation
└─ AI response integration

Timeline.tsx (512 lines)
├─ Visual timeline with snapshots
├─ Rewind to previous states
├─ Branch alternate timelines
└─ Timeline visualization with tooltips

Advisor.tsx (146 lines)
├─ Floating advisor panel
├─ Question input + history
├─ AI-generated strategic advice
└─ Category-based prompts

GameSetup.tsx (653 lines)
├─ Scenario selection (presets)
├─ Nation picker
├─ AI provider/model configuration
├─ Difficulty selector
└─ Custom scenario input

PresetBrowser.tsx (458 lines)
├─ Cinematic preset gallery
├─ 20+ scenarios (historical/modern/alternate/fictional)
├─ Category filtering
└─ Preset details view

RelationsPanel.tsx (123 lines)
├─ Diplomatic relations display
├─ Nation relationships (neutral/friendly/allied/hostile/war/vassal)
└─ Treaty tracking

PromptSettings.tsx (164 lines)
├─ AI prompt customization
├─ Game Master, Diplomacy, Advisor prompt overrides
└─ Reset to defaults

SavedGamesList.tsx (100 lines)
├─ Cloud save browser
├─ Load/delete saves
└─ Sync local to cloud

UserMenu.tsx (113 lines)
├─ Auth status display
├─ Google OAuth sign-in/out
└─ User profile dropdown

AuthModal.tsx (80 lines)
└─ Sign-in modal for unauthenticated users

FlatMap.tsx (deprecated - replaced by MapView.tsx)
MapCanvas.tsx (deprecated)
GlobeMap.tsx (deprecated - old 3D globe)
GlobeTooltip.tsx (deprecated)
Sidebar.tsx (96 lines - minimal sidebar)
Tooltip.tsx (67 lines - reusable tooltip)
```

### Library Code (`/lib/`)

```
ai-prompts.ts (248 lines)
├─ buildGameMasterPrompt() - Turn processing
├─ buildDiplomacyPrompt() - Nation chat
├─ buildAdvisorPrompt() - Strategic advice
├─ DIFFICULTY_PROFILES - AI behavior modifiers
├─ buildGeopoliticalContext() - Era-specific context
├─ formatRelations(), formatEvents(), formatProvinces() - Context helpers
└─ Prompt override support from PromptSettings

types.ts (118 lines)
├─ Player, Province, GameState, GameEvent
├─ DiplomaticRelation, RelationType
├─ ChatThread, ChatMessage
├─ TimelineSnapshot, AdvisorMessage
└─ Preset, MapTheme

game-storage.ts (426 lines)
├─ saveGame() - Local + cloud persistence
├─ loadGame() - Restore game state
├─ listSaves() - Enumerate saves
├─ deleteGame() - Remove save
├─ Auto-save with debouncing
├─ State serialization (compact provinceOwners snapshot)
└─ Cloud sync when authenticated

world-loader.ts (752 lines)
├─ loadWorldAtlas() - Fetch 50m TopoJSON
├─ computeProvinceNeighbors() - Voronoi adjacency
├─ generateSubNationalProvinces() - Split countries into regions
├─ computeProvinceCenters() - Label placement
└─ Map theme support

presets.ts (239 lines)
├─ 20+ scenario presets
├─ Categories: historical, modern, alternate, fictional
└─ Suggested nations per preset

auth.ts (26 lines)
└─ Better Auth server configuration (Google OAuth)

auth-client.ts (5 lines)
└─ Better Auth client instance

db/schema.ts (Drizzle schema)
├─ users table
├─ sessions table
└─ saves table (gameState, gameConfig, logs, events JSON)

db/index.ts
└─ Turso database client

cli-bridge.ts (63 lines)
└─ Local development AI bridge (no API keys required)

cities.ts (114 lines)
└─ Major city coordinates for map labels

crypto.ts (39 lines)
└─ Encryption helpers for API keys

rate-limit.ts (68 lines)
└─ Rate limiting for API routes

map-generator.ts (13 lines - deprecated)
```

### Configuration Files

```
package.json
├─ Dependencies: Next.js, React, MapLibre GL, react-map-gl, Drizzle, Better Auth, AI SDKs
├─ Scripts: dev, build, lint, db:generate, db:push, db:studio
└─ Dev server starts CLI bridge: "cd server && npm install && node index.mjs &"

tsconfig.json
└─ Strict TypeScript with path aliases (@/*)

next.config.ts
├─ React compiler enabled
└─ Image optimization config

tailwind.config.js (implicit via Tailwind 4)
drizzle.config.ts - Database migration config
.env.example - Environment variable template
.env.local - Local environment (not in git)
```

### Server (`/server/`)

```
index.mjs
└─ Local CLI bridge Express server (port 3001)
```

### Public Assets (`/public/`)

```
favicon.ico
og-image.png (Open Graph social preview)
robots.txt
sitemap.xml
cities.json (city coordinates)
```

---

## Type System

All types defined in `/lib/types.ts`. Key interfaces:

### Core Game Types

```typescript
type Province = {
  id: string | number;
  name: string;
  ownerId: string | null;
  color: string;
  feature: GeoFeature; // TopoJSON feature
  center: [number, number];
  neighbors: (string | number)[];
  resources: {
    population: number;
    defense: number;
    economy: number;
    technology: number;
  };
  parentCountryId?: string;
  parentCountryName?: string;
  isSubNational?: boolean;
};

type Player = {
  id: string;
  name: string;
  color: string;
};

type GameState = {
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

type GameEvent = {
  id: string;
  year: number;
  description: string;
  type: "diplomacy" | "war" | "discovery" | "flavor" | "economy" | "crisis";
};

type RelationType = "neutral" | "friendly" | "allied" | "hostile" | "war" | "vassal";

type DiplomaticRelation = {
  nationA: string;
  nationB: string;
  type: RelationType;
  treaties: string[];
};
```

### Chat System

```typescript
type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  turnYear: number;
  tone?: "friendly" | "neutral" | "hostile" | "threatening";
};

type ChatThread = {
  id: string;
  type: "bilateral" | "group";
  participants: string[];
  name: string;
  messages: ChatMessage[];
  unreadCount: number;
};
```

### Timeline & Advisor

```typescript
type TimelineSnapshot = {
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

type AdvisorMessage = {
  id: string;
  role: "user" | "advisor";
  content: string;
  timestamp: number;
  category?: "military" | "diplomacy" | "economy" | "domestic" | "general";
};
```

### Presets

```typescript
type Preset = {
  id: string;
  name: string;
  description: string;
  year: number;
  scenario: string;
  difficulty: "Sandbox" | "Easy" | "Realistic" | "Hardcore" | "Impossible";
  suggestedNations: string[];
  category: "historical" | "modern" | "alternate" | "fictional";
  icon: string; // emoji
};
```

---

## AI Prompt System

All prompts in `/lib/ai-prompts.ts` return **strict JSON** for deterministic parsing.

### 1. Game Master Prompt (`buildGameMasterPrompt`)

**Purpose**: Process player commands, update game state, generate narrative.

**Inputs**:
- `command`: Player's natural language order
- `playerNation`: Player's nation name
- `year`: Current game year
- `scenario`: Scenario description
- `difficulty`: Difficulty level
- `gameState`: Full game state
- `logs`: Recent log entries
- `events`: Recent events
- `relations`: Diplomatic relations
- `storySoFar`: Compressed narrative summary
- `promptOverrides`: Custom prompt settings

**Output JSON Schema**:
```json
{
  "message": "Narrative response to player",
  "updates": [
    { "provinceId": "...", "newOwnerId": "..." }
  ],
  "newEvents": [
    { "year": 2026, "description": "...", "type": "war" }
  ],
  "relationChanges": [
    { "nationA": "...", "nationB": "...", "newType": "hostile" }
  ],
  "updatedStorySoFar": "Compressed narrative including this turn"
}
```

**Key Features**:
- Difficulty-based behavior modification
- Era-specific geopolitical context
- Province ownership updates for territorial changes
- Relation changes for diplomacy shifts
- Event generation for major occurrences
- `storySoFar` compression for long-term memory

### 2. Diplomacy Prompt (`buildDiplomacyPrompt`)

**Purpose**: Generate AI nation responses in bilateral chat.

**Inputs**:
- `playerNation`: Player's nation
- `targetNation`: AI nation being addressed
- `messages`: Chat history
- `year`: Current year
- `scenario`: Scenario context
- `difficulty`: Difficulty level
- `promptOverrides`: Custom settings

**Output JSON Schema**:
```json
{
  "reply": "AI nation's response",
  "tone": "friendly" | "neutral" | "hostile" | "threatening"
}
```

**Key Features**:
- Nation-specific personalities
- Era-appropriate language (medieval vs. modern)
- Difficulty affects AI cooperativeness
- Tone detection for UI hints

### 3. Advisor Prompt (`buildAdvisorPrompt`)

**Purpose**: Provide strategic advice analyzing game state.

**Inputs**:
- `question`: Player's question
- `playerNation`: Player's nation
- `gameState`: Full game state
- `scenario`: Scenario context
- `promptOverrides`: Custom settings

**Output JSON Schema**:
```json
{
  "advice": "Strategic recommendation"
}
```

**Key Features**:
- Analyzes province ownership, relations, events
- Provides actionable recommendations
- Context-aware (considers scenario, difficulty, current state)

---

## Development Workflows

### Setting Up Development Environment

```bash
# Clone repository (if needed)
cd /Users/sarthakagrawal/Desktop/open-historia

# Install dependencies
npm install

# Configure environment (optional for local dev)
cp .env.example .env.local
# Edit .env.local with credentials (or leave blank for local-only mode)

# Run development server (includes CLI bridge)
npm run dev

# Open browser
# http://localhost:3000
```

### Database Setup (Optional - for cloud saves)

```bash
# Generate migrations
npm run db:generate

# Apply schema to Turso
npm run db:push

# Browse database
npm run db:studio
```

### Commit Message Convention

**Format** (from commit history):
```
<type>: <description>

Types:
- Feat: New features
- Fix: Bug fixes
- Refactor: Code restructuring without behavior change
- Docs: Documentation updates
```

**Examples**:
```
Feat: Sub-national provinces for partial country capture
Fix: Map hit-testing and cleaner province boundaries
Refactor: Balance concise prompts with essential gameplay context
Docs: Update AGENTS.md with complete file map
```

### Feature Development Pattern

**Pattern** (observed from commits):
1. **Commit the feature core** (even if rough)
2. **Iterate on fixes** (overflow, race conditions, edge cases)
3. **Polish UX** (animations, transitions, visual feedback)

**Example** (from commit history):
```
1. Feat: Add Turso database + Better Auth
2. Fix: Add callbackURL to Google sign-in
3. Fix: Use relative path for OAuth callbackURL
```

---

## Common Tasks with Examples

### Task 1: Add a New Preset Scenario

**File**: `/lib/presets.ts`

```typescript
// Add to PRESETS array
{
  id: "my-scenario",
  name: "My Scenario Name",
  description: "Detailed description of the scenario setup",
  year: 2030,
  scenario: "Narrative context for AI. Describe the geopolitical situation, key actors, tensions, technologies, etc.",
  difficulty: "Realistic",
  suggestedNations: ["USA", "China", "EU", "India"],
  category: "fictional",
  icon: "🚀"
}
```

**Testing**:
1. Refresh GameSetup page
2. Filter by category
3. Verify preset appears and loads correctly

### Task 2: Modify AI Prompt Behavior

**File**: `/lib/ai-prompts.ts`

**Example**: Make AI more aggressive in war outcomes

```typescript
// In buildGameMasterPrompt(), modify GM_DEFAULT_RULES:
const GM_DEFAULT_RULES = `
- Military: assess balance realistically...
  WARS ARE UNPREDICTABLE. Even superior forces can suffer setbacks.
  Guerilla resistance, logistics failures, and morale can change outcomes.
  ...
`;
```

**Testing Protocol** (from development guidelines):
1. Test across ALL difficulty levels (behavior changes dramatically)
2. Verify JSON output is still valid
3. Check `storySoFar` updates correctly
4. Play multiple turns to ensure consistency

### Task 3: Add a New UI Component

**Example**: Add a "Resources Panel" showing province resources

**Steps**:
1. Create `/components/ResourcesPanel.tsx`:
```typescript
"use client";
import { Province } from "@/lib/types";

export function ResourcesPanel({ provinces }: { provinces: Province[] }) {
  // Component implementation
}
```

2. Import in `/app/page.tsx`:
```typescript
import { ResourcesPanel } from "@/components/ResourcesPanel";

// In render:
<ResourcesPanel provinces={gameState.provinces} />
```

3. Style with Tailwind (dark theme):
```typescript
<div className="bg-slate-900 border border-slate-700 rounded p-4">
  <h2 className="text-amber-400 font-mono text-lg mb-2">Resources</h2>
  {/* ... */}
</div>
```

### Task 4: Add a New API Route

**Example**: Add `/app/api/stats/route.ts` for game statistics

```typescript
import { NextRequest, NextResponse } from "next/server";
import { GameState } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { gameState } = await req.json() as { gameState: GameState };

    // Compute stats
    const stats = {
      totalProvinces: gameState.provinces.length,
      playerProvinces: gameState.provinces.filter(p => p.ownerId === "player").length,
      // ...
    };

    return NextResponse.json({ stats });
  } catch (err) {
    console.error("Stats API error:", err);
    return NextResponse.json({ error: "Failed to compute stats" }, { status: 500 });
  }
}
```

**Client Usage** (in `/app/page.tsx`):
```typescript
const fetchStats = async () => {
  const res = await fetch("/api/stats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gameState })
  });
  const data = await res.json();
  console.log(data.stats);
};
```

### Task 5: Modify Map Rendering

**File**: `/components/MapView.tsx`

**Example**: Change province border color

```typescript
// Find the border layer paint property
paint={{
  "line-color": th.border,  // Change theme border color in THEMES object
  "line-width": 0.8,
}}
```

**Key Concepts**:
- Fill layers use `["get", "fillColor"]` for data-driven colors
- `fill-outline-color` must match fill-color to prevent cracks between polygons
- Use `minzoom`/`maxzoom` for tier visibility
- `interpolate` expressions handle cross-fade transitions between tiers

**Testing Protocol**:
1. Test hit-testing at all zoom levels (click provinces at zoom 1, 4, 7)
2. Verify smooth zoom transitions between LOD tiers
3. Check whole-country selection highlighting
4. Test auto-zoom to player nation on game start
5. Verify no visible cracks between adjacent polygons

### Task 6: Add Cloud Save Feature

**Already Implemented** - see `/lib/game-storage.ts` and `/app/api/saves/`

**Pattern for New Cloud Features**:
1. Add database schema in `/lib/db/schema.ts`
2. Run `npm run db:generate` and `npm run db:push`
3. Create API route in `/app/api/`
4. Add client-side logic in component or `/lib/`
5. Handle authentication state (Better Auth)

---

## Coding Conventions

### TypeScript

- **Strict mode enabled** in `tsconfig.json`
- All game entities typed in `/lib/types.ts`
- Avoid `any` except for third-party geo types (`GeoFeature`)
- Use `Record<string, T>` for key-value maps
- Prefer `type` over `interface` for simplicity

### React Patterns

```typescript
// 1. Client-side components for interactivity
"use client";

// 2. State management with hooks
const [state, setState] = useState<Type>(initialValue);

// 3. Callbacks for event handlers
const handleClick = useCallback(() => {
  // ...
}, [dependencies]);

// 4. Effects for initialization and side effects
useEffect(() => {
  // ...
}, [dependencies]);

// 5. No external state library (Redux, Zustand) - keep it simple
```

### Component Structure

```typescript
// 1. Imports
import { useState, useCallback } from "react";
import { SomeType } from "@/lib/types";

// 2. Type definitions (if local to component)
type ComponentProps = {
  data: SomeType[];
  onAction: (id: string) => void;
};

// 3. Helper functions
function formatData(data: SomeType[]) {
  return data.map(/* ... */);
}

// 4. Main component
export function MyComponent({ data, onAction }: ComponentProps) {
  const [state, setState] = useState(/* ... */);

  const handleClick = useCallback(() => {
    // ...
  }, [dependencies]);

  return (
    <div>
      {/* ... */}
    </div>
  );
}

// 5. Sub-components (if small and component-specific)
function SubComponent() {
  return <div>...</div>;
}
```

### Styling with Tailwind

**Color Palette**:
```
Amber:    Primary actions, warnings, highlights
          bg-amber-700, text-amber-400, border-amber-600

Emerald:  Success, saves, positive actions
          bg-emerald-700, text-emerald-400

Rose:     Destructive actions, errors, wars
          bg-rose-700, text-rose-400

Slate:    Backgrounds, UI chrome, neutral elements
          bg-slate-950 (darkest), bg-slate-900, bg-slate-800
          text-slate-100, text-slate-300, border-slate-700
```

**Typography**:
```
font-mono:       Terminal aesthetic (commands, logs, code)
font-sans:       UI elements (buttons, labels)
text-xs/sm/base/lg/xl: Consistent sizing
```

**Common Patterns**:
```typescript
// Panel/Card
<div className="bg-slate-900 border border-slate-700 rounded p-4">

// Button (Primary)
<button className="bg-amber-700 hover:bg-amber-600 text-white px-4 py-2 rounded font-mono">

// Button (Danger)
<button className="bg-rose-700 hover:bg-rose-600 text-white px-4 py-2 rounded">

// Input
<input className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-100" />

// Terminal Log
<div className="font-mono text-sm text-emerald-400">Success message</div>
<div className="font-mono text-sm text-rose-400">Error message</div>
```

### File Organization

- **One major component per file**
- **Related utilities in `/lib/` directory**
- **API routes mirror feature structure** (`/api/turn`, `/api/chat`, `/api/advisor`, `/api/saves`)
- **No deep nesting** - keep hierarchy flat

### Error Handling

**Pattern** (observed in codebase):
```typescript
async function performAction() {
  setLoading(true);
  try {
    const res = await fetch("/api/endpoint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const result = await res.json();
    // Handle success
    addLog("Success message", "success");
  } catch (err) {
    console.error("Action failed:", err);
    addLog("User-friendly error message", "error");
  } finally {
    setLoading(false); // ALWAYS reset loading states
  }
}
```

### JSON Parsing from AI

**Always validate AI responses**:
```typescript
const data = await res.json();

// Check for expected fields
if (data.message) {
  addLog(data.message, "info");
}

if (data.updates && Array.isArray(data.updates)) {
  data.updates.forEach((update: any) => {
    if (update.provinceId && update.newOwnerId) {
      // Type-safe handling
      applyProvinceUpdate(update);
    }
  });
}

if (data.newEvents && Array.isArray(data.newEvents)) {
  setEvents(prev => [...prev, ...data.newEvents]);
}
```

---

## Technical Decisions & Rationale

### Why Next.js App Router?

**Reasons**:
- Server actions for API routes (no separate backend)
- Built-in SEO support (metadata, sitemap, OG images)
- File-based routing for game IDs (`/[id]/page.tsx`)
- React Server Components for initial load optimization
- TypeScript support out of the box

**Trade-offs**:
- App Router learning curve vs. Pages Router
- Client-side state management still needed (no built-in solution)

### Why MapLibre GL JS for Maps?

**Reasons**:
- Built-in reliable hit-testing via `queryRenderedFeatures` (no offscreen canvas needed)
- Native zoom-dependent layer visibility with `minzoom`/`maxzoom` for hierarchical LOD
- WebGL rendering for smooth pan/zoom at any scale
- Data-driven styling with expressions (`["get", "fillColor"]`)
- Free and open-source (no API key required for map rendering)

**Alternatives Considered**:
- Three.js (used initially, replaced for performance)
- D3.js Canvas2D (used previously, had winding-order hit-testing bugs with merged MultiPolygons)
- Leaflet (too heavy, poor hit-testing for strategy games)
- Mapbox (proprietary, requires API key)

### Why Multiple AI Providers?

**Reasons**:
- User choice of cost/performance tradeoff
- Fallback options if one provider is down
- Local CLI bridge for development without API keys
- Different models excel at different aspects (Claude for narrative, GPT for structured output)

**Implementation**:
- Provider abstraction in API routes
- API keys stored client-side (encrypted)
- Rate limiting per provider

### Why Strict JSON from AI?

**Reasons**:
- Deterministic parsing (no regex scraping of narrative)
- Easier to validate and test
- Prevents "the AI just writes narrative without updating state" issue
- Type-safe integration with game logic

**Alternative Considered**:
- Function calling (OpenAI) - too restrictive, not supported by all providers

### Why Order Queue System?

**Reasons**:
- Player controls time advancement explicitly
- Allows batching multiple commands per turn
- Mirrors grand strategy game conventions (Europa Universalis, Stellaris)
- Better UX than instant execution (player can review queued orders)

**Alternative Considered**:
- Instant command execution - too fast-paced, no "pause and plan" phase

### Why Turso + Drizzle?

**Reasons**:
- LibSQL (SQLite fork) for edge deployment
- Drizzle ORM for type-safe queries
- Free tier supports indie projects
- Better Auth integrates seamlessly

**Alternatives Considered**:
- Supabase (heavier, more opinionated)
- Vercel Postgres (vendor lock-in)
- Local-only (no cross-device sync)

---

## Common Pitfalls

### 1. Province Name Matching

**Issue**: AI returns province names that don't exactly match map data (e.g., "USA" instead of "United States").

**Solution** (from `/app/api/turn/route.ts`):
```typescript
function findProvince(provinces: Province[], name: string): Province | undefined {
  const pLower = name.toLowerCase();

  // Try exact match first
  let target = provinces.find(p => p.name.toLowerCase() === pLower);

  // Then try without parenthetical suffix
  if (!target) {
    target = provinces.find(p =>
      p.name.toLowerCase().startsWith(pLower + " (") ||
      p.name.replace(/\s*\(.*\)$/, "").toLowerCase() === pLower
    );
  }

  // Then try parent country name
  if (!target) {
    target = provinces.find(p =>
      (p.parentCountryName || "").toLowerCase() === pLower
    );
  }

  return target;
}
```

### 2. Race Conditions in Map Rendering

**Issue**: State boundaries don't render, provinces show null errors.

**Causes** (from commit history):
- `useEffect` dependencies incomplete
- Data not loaded before render
- Null/undefined not checked before accessing nested properties

**Solutions**:
```typescript
// Check data before rendering
useEffect(() => {
  if (!provinces || provinces.length === 0) return;
  // Render map
}, [provinces]);

// Defensive property access
const provName = province?.name ?? "Unknown";
const owner = province?.ownerId ?? null;
```

### 3. Token Limit Management

**Issue**: Long games exceed AI context limits.

**Solution** (from `/lib/ai-prompts.ts`):
- AI generates `storySoFar` summary each turn
- Only recent logs/events sent as detailed context
- Old turns compressed into narrative
- Token usage stays constant regardless of game length

**Implementation**:
```typescript
// In Game Master prompt
const recentLogs = logs.slice(-8); // Only last 8 logs
const recentEvents = events.slice(-5); // Only last 5 events
const storySoFar = prevStorySoFar || "Game just started.";

// AI outputs updated summary
return {
  // ...
  updatedStorySoFar: "Compressed narrative including this turn's events..."
};
```

### 4. Save/Load State Mismatch

**Issue**: Province IDs change between saves (TopoJSON re-generates IDs).

**Solution** (from `/lib/game-storage.ts`):
- Save only `provinceOwners` snapshot (id + ownerId)
- Restore by matching province ID from fresh map load
- Gracefully handle missing provinces (log warning, skip)

```typescript
// Save
const provinceOwners = gameState.provinces.map(p => ({
  id: p.id,
  ownerId: p.ownerId
}));

// Load
const restoredProvinces = freshProvinces.map(p => {
  const saved = provinceOwners.find(po => po.id === p.id);
  return {
    ...p,
    ownerId: saved?.ownerId ?? null
  };
});
```

### 5. Hit-Testing Accuracy

**Issue**: Clicking provinces doesn't select correct territory.

**Previous Solution** (D3/Canvas): Offscreen canvas with unique colors per province.

**Current Solution** (MapLibre GL JS in `/components/MapView.tsx`):
- Uses `queryRenderedFeatures` — built-in MapLibre hit-testing
- Set `interactiveLayerIds` to active tier fill layers
- `onClick` reads `event.features[0].properties.id`
- Sub-national provinces resolve to parent country for whole-country selection
- Tier 3 (state) clicks map `regionId` back to tier 2 province

```typescript
// Interactive layers update based on loaded tiers
const interactiveLayerIds = ["countries-fill", "regions-fill"];
if (tier3Loaded) ids.push("states-fill");

// Click resolves to province, then highlights whole country
const parentId = selected.parentCountryId || String(selected.id);
const countryProvinces = provinces.filter(
  (p) => (p.parentCountryId || String(p.id)) === parentId
);
```

### 6. OAuth Redirect Hang

**Issue**: Google OAuth hangs on redirect (from commit "Fix: Add callbackURL to Google sign-in").

**Cause**: Better Auth needs explicit callback URL in production.

**Solution** (in `/lib/auth.ts`):
```typescript
google: googleOAuth({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: `${process.env.BETTER_AUTH_URL}/api/auth/callback/google`
})
```

---

## Testing Strategy

**Current State** (inferred from commits):
- No formal test suite (Jest, Vitest)
- Manual play-testing after each feature
- Fix commits indicate issues found in production use
- Edge case handling added reactively

**Recommended Testing Focus**:

### 1. AI Prompt Output Validation
```typescript
// Verify JSON structure from AI
const validateGameMasterOutput = (output: any) => {
  assert(output.message, "Missing message");
  assert(Array.isArray(output.updates), "Updates not array");
  assert(Array.isArray(output.newEvents), "Events not array");
  // ...
};
```

### 2. Province Matching Logic
```typescript
// Test province name resolution
const testProvinceMatching = () => {
  const provinces = [
    { name: "California (USA)", parentCountryName: "United States" },
    { name: "Texas (USA)", parentCountryName: "United States" }
  ];

  assert(findProvince(provinces, "california (usa)"), "Exact match failed");
  assert(findProvince(provinces, "California"), "Partial match failed");
  assert(findProvince(provinces, "United States"), "Parent match failed");
};
```

### 3. Save/Load Roundtrip
```typescript
// Test state serialization
const testSaveLoad = () => {
  const originalState = { /* game state */ };
  const saved = saveGame(originalState);
  const loaded = loadGame(saved.id);

  assert(loaded.turn === originalState.turn);
  assert(loaded.provinces.length === originalState.provinces.length);
  // ...
};
```

### 4. Multi-Provider AI Switching
```typescript
// Test switching between providers
const testProviderSwitch = async () => {
  const providers = ["anthropic", "openai", "google", "deepseek"];

  for (const provider of providers) {
    const result = await callAI(provider, prompt);
    assert(result.message, `${provider} failed to return message`);
  }
};
```

---

## Quick Reference

### Essential Commands

```bash
# Development
npm run dev           # Start dev server (includes CLI bridge on :3001)
npm run build         # Production build
npm run start         # Production server
npm run lint          # ESLint check

# Database
npm run db:generate   # Generate Drizzle migrations
npm run db:push       # Apply schema to Turso
npm run db:studio     # Visual database browser
```

### Environment Variables

```bash
# .env.local (optional for local-only dev)

# Turso (cloud saves)
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token

# Better Auth
BETTER_AUTH_SECRET=random-32-char-secret
BETTER_AUTH_URL=http://localhost:3000

# Google OAuth (cloud saves)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
```

### Key Files for Common Tasks

| Task | Files |
|------|-------|
| Add scenario preset | `/lib/presets.ts` |
| Modify AI behavior | `/lib/ai-prompts.ts` |
| Change map rendering | `/components/MapView.tsx` |
| Add UI component | `/components/NewComponent.tsx`, `/app/page.tsx` |
| Add API endpoint | `/app/api/new-endpoint/route.ts` |
| Modify game state types | `/lib/types.ts` |
| Change save format | `/lib/game-storage.ts` |
| Add database table | `/lib/db/schema.ts` |

### Player Commands (Examples)

Players issue natural language commands via terminal:
```
Invade West Coast (USA)
Negotiate trade agreement with Japan
Build up military defenses in Berlin
Launch espionage campaign against Russia
Research nuclear technology
Establish naval blockade around Cuba
Send humanitarian aid to Ukraine
Impose sanctions on Iran
```

### AI Response Format (Turn API)

```json
{
  "message": "Narrative response describing what happened",
  "updates": [
    { "provinceId": "california", "newOwnerId": "player" }
  ],
  "newEvents": [
    {
      "year": 2026,
      "description": "California falls after 2-week siege",
      "type": "war"
    }
  ],
  "relationChanges": [
    {
      "nationA": "player",
      "nationB": "USA",
      "newType": "war"
    }
  ],
  "updatedStorySoFar": "Game began in 2026 with rising tensions..."
}
```

### Difficulty Profiles Summary

| Difficulty | AI Behavior |
|------------|-------------|
| Sandbox | Accept all actions unless physically impossible |
| Easy | Most actions succeed, AI cooperative |
| Realistic | Actions need planning, AI has self-interest |
| Hardcore | Detailed planning required, AI skeptical |
| Impossible | Multi-turn prep, ruthless AI, fragile economies |

### Map Themes

- **classic**: Traditional strategy game (default)
- **cyberpunk**: Neon colors, futuristic
- **parchment**: Medieval/ancient era styling
- **blueprint**: Technical/modern warfare aesthetic

Themes auto-select based on scenario keywords (e.g., "cyberpunk" in scenario name → cyberpunk theme).

---

## Development Context for AI Agents

When working on this codebase as an AI agent:

1. **Read `/lib/ai-prompts.ts` first** - it defines how the game thinks
2. **Check `/lib/types.ts`** - it defines what the game knows
3. **Study `/app/page.tsx`** - it defines how the game flows
4. **Test with different difficulty levels** - AI behavior varies dramatically
5. **Use "Sandbox" mode for development** - most permissive, easiest to debug
6. **Preserve commit message style** - consistency matters for history
7. **Always reset loading states in finally blocks** - prevents stuck UI
8. **Validate AI JSON responses** - AI can return malformed data
9. **Test map interactions after changes** - hit-testing is fragile
10. **Maintain backward compatibility in save format** - users have existing games

### Critical Files to Read Before Major Changes

- `/lib/ai-prompts.ts` - AI behavior
- `/lib/types.ts` - Data structures
- `/app/page.tsx` - Game orchestration
- `/lib/game-storage.ts` - Save/load logic
- `/components/MapView.tsx` - Map rendering (MapLibre GL JS, 3-tier LOD)

### When Debugging

1. Check browser console for errors
2. Verify API responses (`/api/turn`, `/api/chat`, `/api/advisor`)
3. Inspect game state in React DevTools
4. Test with "Sandbox" difficulty (most permissive AI)
5. Check province matching logic (common source of bugs)
6. Verify `storySoFar` updates correctly (token management)

---

## Philosophy

This project is an **experiment in AI-driven game design**. The AI isn't just a feature - it's the core game engine. Changes to prompts can fundamentally alter gameplay.

**Principles**:
- **Emergent narrative** over scripted events
- **Player agency** through natural language
- **Deterministic updates** despite AI unpredictability
- **Historical authenticity** balanced with creative freedom
- **Token efficiency** for long games
- **Provider flexibility** for user choice

**Development Mindset**:
- Tread carefully with AI prompts
- Test thoroughly across difficulty levels
- Embrace the chaos of emergent narrative
- Maintain strict JSON contracts
- Keep the game loop simple and robust

---

**End of AGENTS.md**

For human-friendly documentation, see README.md.
