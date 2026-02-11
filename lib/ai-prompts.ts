// Open Historia -- AI Prompt Templates (concise)
// All prompts return strict JSON for deterministic parsing.

const DIFFICULTY_PROFILES: Record<string, string> = {
  Sandbox: "SANDBOX: Almost everything succeeds. AI nations are cooperative. Consequences are mild. Reward creativity.",
  Easy: "EASY: Actions succeed with basic reasoning. AI is accommodating. Mistakes cost setbacks, not collapse.",
  Realistic: "REALISTIC: Actions need proper planning. AI nations have authentic motivations. Diplomacy requires leverage. Wars need logistics.",
  Hardcore: "HARDCORE: Detailed multi-step planning required. AI is skeptical and strategic. One major blunder can cascade.",
  Impossible: "IMPOSSIBLE: Multi-turn preparation needed. AI is ruthless. Economies are fragile. A single mistake can mean collapse.",
};

function formatRelations(
  relations?: Array<{ nationA: string; nationB: string; type: string; treaties?: string[] }>
): string {
  if (!relations || relations.length === 0) return "None.";
  return relations.map((r) => {
    const t = r.treaties?.length ? ` [${r.treaties.join(", ")}]` : "";
    return `${r.nationA}<->${r.nationB}: ${r.type.toUpperCase()}${t}`;
  }).join("; ");
}

function formatEvents(events?: Array<{ year: number; description: string; type?: string }>): string {
  if (!events || events.length === 0) return "None.";
  return events.map((e) => `[${e.year}] ${e.description}`).join("; ");
}

function formatHistory(history?: Array<{ type?: string; text?: string; content?: string }>): string {
  if (!history || history.length === 0) return "None.";
  return history.slice(-8).map((h) => `[${(h.type || "info").toUpperCase()}] ${h.text || h.content || ""}`).join("\n");
}

function formatProvinces(provinces?: Array<{ name: string; ownerId: string | null }>): string {
  if (!provinces || provinces.length === 0) return "None.";
  const grouped: Record<string, string[]> = {};
  for (const p of provinces.filter((p) => p.ownerId !== null)) {
    const o = p.ownerId!;
    if (!grouped[o]) grouped[o] = [];
    grouped[o].push(p.name);
  }
  return Object.entries(grouped).map(([o, n]) => `${o}: ${n.join(", ")}`).join("; ");
}

function buildGeopoliticalContext(year: number): string {
  if (year < 500) return "ANCIENT: Empires (Rome, Persia, Han China, Maurya India), city-states, tribal confederations. Power = river valleys, trade routes. Nomadic threats. Dynastic succession crises.";
  if (year < 1500) return "MEDIEVAL: Feudal hierarchies, Islamic caliphates, Byzantine Empire, Mongol conquests, Chinese dynasties. Church as superpower. Crusades. Silk Road trade. Black Death reshapes society.";
  if (year < 1800) return "EARLY MODERN: Absolutist monarchies, colonial empires, balance of power. Westphalian sovereignty. Mercantilism. Atlantic slave trade. Enlightenment seeds revolution.";
  if (year < 1945) return "MODERN: Nation-states, industrialized warfare, imperial scramble. WWI collapses 4 empires. Rise of fascism/communism. WWII: 70M dead, atomic weapons, Holocaust. Decolonization begins.";
  if (year < 1991) return "COLD WAR: NATO vs Warsaw Pact. MAD/nuclear deterrence. Proxy wars (Korea, Vietnam, Afghanistan). Decolonization. Sino-Soviet split. Space race. OPEC oil shocks.";
  if (year <= 2025) return "CONTEMPORARY: US-China competition. NATO expansion. EU integration (Brexit shock). BRICS rising. Ukraine war. Taiwan flashpoint. Cyber/info warfare. Climate crisis. Nuclear: US/Russia ~5500 each, UK ~225, France ~290, China ~350, India/Pakistan ~170, NK ~50, Israel ~90 undeclared.";
  return "FUTURE: Multipolar disorder. AI revolution. Climate migration. Space militarization. Hypersonic weapons. Cyber as primary conflict domain. De-dollarization. Demographic divergence.";
}

// 1. GAME MASTER TURN PROMPT
export function buildGameMasterPrompt(args: {
  command: string;
  gameState: { turn: number; players: Record<string, { name: string }> };
  config: { scenario: string; difficulty: string };
  history?: Array<{ type?: string; text: string }>;
  events?: Array<{ year: number; description: string; type: string }>;
  relations?: Array<{ nationA: string; nationB: string; type: string; treaties: string[] }>;
  provinceSummary?: Array<{ name: string; ownerId: string | null }>;
}): string {
  const { command, gameState, config, history, events, relations, provinceSummary } = args;
  const playerNation = gameState.players["player"]?.name ?? "Unknown";

  return `You are the GAME MASTER of "Open Historia", a grand strategy simulation spanning all of history. Adjudicate player actions with vivid prose. The world is alive -- nations pursue their own agendas independently.

SCENARIO: ${config.scenario}
ERA: ${buildGeopoliticalContext(gameState.turn)}
YEAR: ${gameState.turn} | PLAYER: ${playerNation} | ${DIFFICULTY_PROFILES[config.difficulty] || DIFFICULTY_PROFILES["Realistic"]}

RELATIONS: ${formatRelations(relations)}
TERRITORY: ${formatProvinces(provinceSummary)}
EVENTS: ${formatEvents(events)}
RECENT HISTORY:
${formatHistory(history)}

PLAYER COMMAND: "${command}"

RULES:
- Military: assess balance, terrain, logistics, alliances. Wars take time. Other nations react.
- Diplomacy: roleplay as target nation's leader with their own interests. Treaties need mutual benefit.
- Political: coups need groundwork, sanctions take time, espionage can fail. Consider domestic politics.
- Economy: has inertia. Infrastructure takes years. Resource/geographic constraints apply.
- Time advances: describe GLOBAL events, not just player's nation. The world moves independently.
- Validate actions: reject impossible ones, narrate failures for implausible ones, reward well-planned ones proportionally.

RELATION TYPES: neutral, friendly, allied, hostile, war, vassal.

OUTPUT: Return EXACTLY one raw JSON object. No markdown fences.
{
  "message": "1-3 sentence narrative. Punchy, vivid. Outcome + consequences only.",
  "updates": [
    { "type": "owner", "provinceName": "Name", "newOwnerId": "player_or_ai_id" },
    { "type": "time", "amount": 1 },
    { "type": "event", "description": "Concise event", "eventType": "war|diplomacy|discovery|flavor|economy|crisis", "year": ${gameState.turn} },
    { "type": "relation", "nationA": "Name", "nationB": "Name", "relationType": "neutral|friendly|allied|hostile|war|vassal", "reason": "Brief reason" }
  ]
}
Only include updates that actually occur. Empty updates = []. Always include an "event" if something noteworthy happened. Raw JSON only.`;
}

// 2. DIPLOMACY CHAT PROMPT
export function buildDiplomacyPrompt(args: {
  playerNation: string;
  targetNation: string;
  message: string;
  chatHistory: Array<{ sender: string; content: string; turnYear: number }>;
  gameContext: { year: number; scenario: string; difficulty: string };
  relations?: { type: string; treaties: string[] } | null;
  recentEvents?: Array<{ year: number; description: string }>;
}): string {
  const { playerNation, targetNation, message, chatHistory, gameContext, relations, recentEvents } = args;

  const historyBlock = chatHistory.length > 0
    ? chatHistory.map((m) => `[${m.turnYear}] ${m.sender}: ${m.content}`).join("\n")
    : "First contact.";

  const rel = relations ? `${relations.type.toUpperCase()}${relations.treaties.length ? ` | Treaties: ${relations.treaties.join(", ")}` : ""}` : "None established";
  const evts = recentEvents?.length ? recentEvents.map((e) => `[${e.year}] ${e.description}`).join("; ") : "None";

  return `You ARE the leader of ${targetNation} in diplomatic conversation with ${playerNation}'s leader. Stay in character -- never acknowledge being AI.

Context: ${gameContext.scenario} | Year ${gameContext.year} | ${DIFFICULTY_PROFILES[gameContext.difficulty] || DIFFICULTY_PROFILES["Realistic"]}
Relationship: ${rel}
Recent events: ${evts}

Conversation:
${historyBlock}

${playerNation}: "${message}"

Respond based on ${targetNation}'s interests, culture, and strategic position. Protect your interests. Negotiate realistically. Match tone to the period.

OUTPUT: Raw JSON only, no markdown.
{
  "message": "1-2 sentences of in-character diplomatic dialogue. Brief and natural.",
  "tone": "friendly|neutral|hostile|threatening",
  "relationChange": null
}
Or if relationship shifts: "relationChange": { "newType": "neutral|friendly|allied|hostile|war|vassal", "reason": "Brief reason" }`;
}

// 3. ADVISOR PROMPT
export function buildAdvisorPrompt(args: {
  question: string;
  playerNation: string;
  gameContext: { year: number; scenario: string; difficulty: string };
  recentEvents?: Array<{ year: number; description: string }>;
  relations?: Array<{ nationA: string; nationB: string; type: string }>;
  history?: Array<{ content: string; role: string }>;
}): string {
  const { question, playerNation, gameContext, recentEvents, relations, history } = args;

  const evts = recentEvents?.length ? recentEvents.map((e) => `[${e.year}] ${e.description}`).join("; ") : "None";
  const rels = relations?.length ? relations.map((r) => `${r.nationA}<->${r.nationB}: ${r.type}`).join("; ") : "None";
  const conv = history?.length ? history.slice(-6).map((h) => `[${h.role === "user" ? "RULER" : "ADVISOR"}] ${h.content}`).join("\n") : "New session.";

  return `You are the Grand Advisor to ${playerNation}'s ruler. Loyal, blunt, strategically brilliant. Speak in character for the era.

Context: ${gameContext.scenario} | Year ${gameContext.year} | ${gameContext.difficulty}
Relations: ${rels}
Events: ${evts}

Prior conversation:
${conv}

Ruler asks: "${question}"

Give concrete, actionable strategic advice. Consider military, diplomatic, economic, and domestic dimensions. Suggest 2-4 specific commands the ruler can issue.

OUTPUT: Raw JSON only, no markdown.
{
  "advice": "1-3 sentences. Concrete counsel referencing specific nations/events.",
  "category": "military|diplomacy|economy|domestic|general",
  "suggestedActions": ["Specific command 1", "Specific command 2", "Specific command 3"]
}`;
}
