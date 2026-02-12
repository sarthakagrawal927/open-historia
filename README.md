# Open Historia

**Rewrite history through AI-powered grand strategy.**

Open Historia is a unique strategy game where you command nations using natural language. Issue orders like "Invade West Coast" or "Negotiate trade with Japan", and watch as AI adjudicates outcomes, drives independent nation behavior, and creates emergent narratives spanning from ancient empires to speculative futures.

---

## What It Does

- **Command with Natural Language**: No complex menus or hotkeys. Just type what you want to do.
- **AI Game Master**: The AI simulates the world, adjudicates actions, and drives AI nations with their own agendas.
- **Interactive World Map**: Click provinces, see territory change hands, watch your empire expand.
- **Deep Diplomacy**: Chat with AI-controlled nations that respond with era-appropriate personalities.
- **20+ Scenarios**: Play through WWII, the Cold War, ancient Rome, zombie apocalypse, space colonization, and more.

---

## Tech Stack

- **Next.js 16** + React 19 + TypeScript
- **D3.js** for map rendering (Natural Earth 50m data)
- **Tailwind CSS 4** for dark-themed UI
- **Turso + Drizzle** for cloud saves (optional)
- **Better Auth** with Google OAuth (optional)
- **Multi-AI Support**: Claude, GPT-4, Gemini, DeepSeek, or local development mode

---

## Quick Start

### 1. Install

```bash
git clone https://github.com/sarthakagrawal927/open-historia.git
cd open-historia
npm install
```

### 2. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 3. Play

1. **Choose a scenario** (WWII, Cold War, custom, etc.)
2. **Pick your nation** (any country on the map)
3. **Configure AI** (provider + difficulty)
4. **Start commanding** your nation through natural language

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

## Features

### AI Game Master
- **Multiple Providers**: Choose Claude, GPT-4, Gemini, DeepSeek, or local dev mode
- **5 Difficulty Levels**: From Sandbox (anything goes) to Impossible (ruthless realism)
- **Dynamic Narrative**: AI generates unique events, consequences, and independent nation behavior
- **Era-Aware**: AI adjusts for ancient empires, medieval kingdoms, or modern nation-states

### Interactive Map
- **Real Geography**: High-resolution world map with accurate borders
- **Sub-National Provinces**: Capture regions piecemeal (e.g., "California (USA)")
- **Click to Select**: Click nations to view info or start diplomacy
- **Multiple Themes**: Classic, cyberpunk, parchment, blueprint aesthetics

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

## Scenarios

### Historical
- WWII (1939), Cold War (1962), Fall of Rome (476 AD), Viking Age (793 AD)
- Age of Exploration (1492), Napoleon (1799), Mongol Invasions (1206)
- WWI (1914), Renaissance (1453), Three Kingdoms China (220 AD)

### Modern
- 2026 Geopolitical Tensions, 2027 Fracturing NATO Alliance

### Alternate History
- USSR Survives (1995), Byzantine Revival (1204), Climate Collapse (2040)

### Fictional
- Zombie Apocalypse (2026), AI Awakening (2030), Mars Colonization (2035)

---

## Configuration

### Environment Variables (Optional)

For cloud saves and authentication, create `.env.local`:

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

**Note**: The game works fully offline with local saves if you skip this step.

### Database Setup (Optional)

For cloud saves:

```bash
npm run db:generate  # Generate migrations
npm run db:push      # Apply to Turso
npm run db:studio    # Browse database
```

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

## How It Works

### The AI Loop

1. **You command**: "Invade California"
2. **AI adjudicates**: Considers military strength, logistics, alliances, terrain
3. **Game updates**: Provinces change ownership, events trigger, relations shift
4. **AI responds**: Generates narrative outcome and updates game state
5. **Independent AI**: Other nations react, form alliances, pursue agendas

### The Difficulty System

Difficulty isn't just numbers - it's AI personality:

- **Sandbox**: Actions succeed unless physically impossible. Creative experimentation.
- **Easy**: Most actions work with basic reasoning. AI is cooperative.
- **Realistic**: Actions need planning. AI has self-interest. (Default)
- **Hardcore**: Detailed preparation required. AI is skeptical. Mistakes cascade.
- **Impossible**: Multi-turn planning essential. Ruthless AI. Fragile economies.

### The Memory System

Long games compress history via **storySoFar** - a running narrative summary:
- AI generates a compressed summary each turn
- Recent events stay detailed
- Old turns become narrative context
- Token usage stays constant regardless of game length

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

## Roadmap

- [ ] Mobile-responsive UI
- [ ] More map themes (pixel art, hand-drawn)
- [ ] Treaty negotiation system
- [ ] Economic simulation depth
- [ ] Military unit types and logistics
- [ ] Multiplayer (human vs. human + AI nations)
- [ ] Scenario editor with mod support
- [ ] Voice command input
- [ ] Animated battle sequences

---

## Credits

- **Developer**: [Sarthak Agrawal](https://github.com/sarthakagrawal927)
- **AI Co-Pilot**: Google Gemini
- **Map Data**: Natural Earth (public domain)
- **Geo Libraries**: D3.js, TopoJSON
- **Inspiration**: Europa Universalis IV, Crusader Kings, AI Dungeon

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
