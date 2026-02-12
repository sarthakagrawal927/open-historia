# Open Historia

**Rewrite history through AI-powered grand strategy.**

Open Historia is a unique strategy game where you command nations using natural language. Issue orders like "Invade West Coast" or "Negotiate trade with Japan", and watch as AI adjudicates outcomes, drives independent nation behavior, and creates emergent narratives spanning from ancient empires to speculative futures.

---

## Problem

Traditional grand strategy games require complex menu navigation, steep learning curves, and rigid rule systems. Players spend more time managing UIs than making strategic decisions. Open Historia removes these barriers by letting you command nations the way a real leader would - through natural language - while AI handles the complexity of simulation and world response.

---

## Features

### AI Game Master
- **Multiple Providers**: Choose Claude, GPT-4, Gemini, DeepSeek, or local dev mode
- **5 Difficulty Levels**: From Sandbox (anything goes) to Impossible (ruthless realism)
- **Dynamic Narrative**: AI generates unique events, consequences, and independent nation behavior
- **Era-Aware**: AI adjusts for ancient empires, medieval kingdoms, or modern nation-states

### Interactive World Map
- **3-Tier LOD**: Seamless zoom from countries to regions to individual states (MapLibre GL JS)
- **Real Geography**: High-resolution world map with accurate borders using Natural Earth data
- **Sub-National Provinces**: Capture regions piecemeal (e.g., "California (USA)")
- **Click to Select**: Click any province to highlight and interact with the whole country
- **Multiple Themes**: Classic, cyberpunk, parchment, blueprint aesthetics
- **Relation Borders**: War zones pulse red, hostile borders flash orange, allied borders glow green

### Diplomacy Engine
- **Direct Chat**: Negotiate with AI leaders one-on-one
- **Era-Appropriate**: Medieval kings speak differently than modern presidents
- **Strategic AI**: Nations pursue self-interest, form alliances, react to threats
- **Relationship Tracking**: Neutral, friendly, allied, hostile, war, vassal states

### Rich Systems
- **Order Queue**: Queue multiple commands, then advance time to execute
- **Timeline Rewind**: Review past turns, branch alternate timelines
- **AI Advisor**: Ask strategic questions, get tailored military/diplomatic/economic advice
- **Cloud Saves**: Cross-device sync with Google sign-in (optional)
- **20+ Presets**: Jump into curated scenarios from history, alternate timelines, or fiction

---

## Architecture

```mermaid
graph TB
    subgraph "Frontend (Next.js 16 + React 19)"
        UI[UI Components]
        Map[Interactive Map<br/>MapLibre GL JS + Natural Earth]
        Game[Game State Manager]
        UI --> Map
        UI --> Game
    end

    subgraph "API Layer (Next.js API Routes)"
        Turn[/api/turn<br/>Execute Commands]
        Chat[/api/chat<br/>Diplomacy]
        Advisor[/api/advisor<br/>Strategic Advice]
        Auth[/api/auth<br/>Better Auth]
        Saves[/api/saves<br/>CRUD Operations]
    end

    subgraph "AI Providers"
        Claude[Claude API<br/>Anthropic]
        GPT[GPT-4 API<br/>OpenAI]
        Gemini[Gemini API<br/>Google]
        DeepSeek[DeepSeek API]
        Local[Local CLI Bridge<br/>Dev Mode]
    end

    subgraph "Data Storage"
        Turso[(Turso SQLite<br/>Cloud DB)]
        LocalStorage[Browser LocalStorage<br/>Offline Saves]
    end

    subgraph "External Data"
        NaturalEarth[Natural Earth<br/>Map Data]
        WorldAtlas[World Atlas<br/>TopoJSON]
    end

    UI --> Turn
    UI --> Chat
    UI --> Advisor
    UI --> Auth
    UI --> Saves
    Map --> NaturalEarth
    Map --> WorldAtlas

    Turn --> Claude
    Turn --> GPT
    Turn --> Gemini
    Turn --> DeepSeek
    Turn --> Local
    Chat --> Claude
    Chat --> GPT
    Chat --> Gemini
    Chat --> DeepSeek
    Advisor --> Claude
    Advisor --> GPT
    Advisor --> Gemini

    Saves --> Turso
    Saves --> LocalStorage
    Auth --> Turso

    style UI fill:#4a90e2
    style Map fill:#4a90e2
    style Game fill:#4a90e2
    style Turn fill:#50c878
    style Chat fill:#50c878
    style Advisor fill:#50c878
    style Auth fill:#50c878
    style Saves fill:#50c878
    style Claude fill:#f4a261
    style GPT fill:#f4a261
    style Gemini fill:#f4a261
    style DeepSeek fill:#f4a261
    style Local fill:#f4a261
    style Turso fill:#e76f51
    style LocalStorage fill:#e76f51
```

### Tech Stack

- **Next.js 16** + React 19 + TypeScript
- **MapLibre GL JS** for WebGL map rendering with hierarchical LOD (Natural Earth 50m data)
- **Tailwind CSS 4** for dark-themed UI
- **Turso + Drizzle** for cloud saves (optional)
- **Better Auth** with Google OAuth (optional)
- **Multi-AI Support**: Claude, GPT-4, Gemini, DeepSeek, or local development mode

### Key Components

- **Frontend**: React components with MapLibre GL JS (WebGL) map visualization
- **API Routes**: Next.js API routes handle AI provider calls, game logic, and data persistence
- **Game Engine**: Client-side game state management with turn-based execution
- **AI Integration**: Unified interface to multiple AI providers with prompt engineering
- **Storage Layer**: Dual-mode saves (cloud via Turso or local browser storage)

---

## Getting Started

### Installation

```bash
git clone https://github.com/sarthakagrawal927/open-historia.git
cd open-historia
npm install
```

### Running the Game

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### How to Play

1. **Choose a scenario** (WWII, Cold War, custom, etc.)
2. **Pick your nation** (any country on the map)
3. **Configure AI** (provider + difficulty)
4. **Start commanding** your nation through natural language

### Optional: Cloud Saves Setup

For cross-device saves and authentication, create `.env.local`:

```env
# Turso Database (cloud saves)
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token

# Better Auth
BETTER_AUTH_SECRET=random-32-char-secret
BETTER_AUTH_URL=http://localhost:3000

# Google OAuth (cloud saves)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
```

Then run database migrations:

```bash
npm run db:generate  # Generate migrations
npm run db:push      # Apply to Turso
npm run db:studio    # Browse database
```

**Note**: The game works fully offline with local saves if you skip this step.

---

## Example Gameplay

**Scenario**: World War II (1939)
**Nation**: United Kingdom
**Difficulty**: Realistic

```
> Evacuate children from London to countryside

AI: Operation Pied Piper initiated. 3.5 million evacuated to safety.

> Send diplomatic mission to USA requesting aid

AI (USA): President Roosevelt is sympathetic, but Congress remains isolationist.
          We can offer Lend-Lease equipment, but no troops yet.

> Prepare Royal Navy for North Atlantic convoy defense

AI: Fleet mobilized. U-boat threat assessed as severe. Convoys organized.

[Advance 1 month]

AI: Germany launches air raids on British shipping.
    Royal Navy sinks 3 U-boats. France requests reinforcements.
```

---

## Scenarios

### Historical
WWII (1939), Cold War (1962), Fall of Rome (476 AD), Viking Age (793 AD), Age of Exploration (1492), Napoleon (1799), Mongol Invasions (1206), WWI (1914), Renaissance (1453), Three Kingdoms China (220 AD)

### Modern
2026 Geopolitical Tensions, 2027 Fracturing NATO Alliance

### Alternate History
USSR Survives (1995), Byzantine Revival (1204), Climate Collapse (2040)

### Fictional
Zombie Apocalypse (2026), AI Awakening (2030), Mars Colonization (2035)

---

## Development

### Scripts

```bash
npm run dev          # Dev server (includes local AI bridge)
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint
```

### For AI Agents

See **AGENTS.md** for comprehensive development documentation including:
- Complete file map with all components and their purposes
- Architecture patterns and technical decisions
- AI prompt system details
- Common tasks with code examples
- Coding conventions and pitfalls
- Testing strategies

---

## FAQ

**Q: Do I need an API key?**
A: Yes, from Anthropic, OpenAI, Google, or DeepSeek. Or use Local CLI Bridge for development (no key needed).

**Q: Are saves stored online?**
A: Optional. Local-only saves work without authentication. Cloud saves require Google sign-in.

**Q: Can I play offline?**
A: No, AI providers require internet. Local CLI Bridge also needs network.

**Q: How much do API calls cost?**
A: Varies by provider. Typical: $0.10-$0.50/hour on GPT-4, less on Gemini/DeepSeek.

**Q: Can I create custom scenarios?**
A: Yes. Click "Custom Scenario" and write your own setup.

**Q: Is multiplayer supported?**
A: Not yet. Single-player only (you vs. AI nations).

**Q: Can I mod the game?**
A: Yes, it's open source. Fork and modify. See AGENTS.md for developer docs.

---

## License

MIT License - see LICENSE file for details

---

## Links

- **Repository**: [github.com/sarthakagrawal927/open-historia](https://github.com/sarthakagrawal927/open-historia)
- **AI Developer Docs**: See AGENTS.md
- **Issues**: [GitHub Issues](https://github.com/sarthakagrawal927/open-historia/issues)

---

**Rewrite history. Command nations. Shape the world.**
