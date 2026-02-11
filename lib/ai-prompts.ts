// Open Historia -- AI Prompt Templates
// All prompts return strict JSON for deterministic parsing.

const DIFFICULTY_PROFILES: Record<string, string> = {
  Sandbox: `SANDBOX: Almost everything succeeds. AI nations are cooperative and easily persuaded. Consequences mild. Reward bold creativity. Tone: lighthearted, permissive.`,
  Easy: `EASY: Actions succeed with basic reasoning. AI is accommodating, alliances form readily. Mistakes cost setbacks, not collapse. Gently correct implausible actions.`,
  Realistic: `REALISTIC: Actions need proper planning. AI nations have authentic self-interest, historical grievances, and strategic calculus. Diplomacy requires leverage. Wars need logistics and supply lines. Actions can fail if they contradict reality.`,
  Hardcore: `HARDCORE: Detailed multi-step planning required. AI is skeptical and strategic -- trust is earned over years. One major blunder can cascade. Allies may betray you. Economies punish mismanagement.`,
  Impossible: `IMPOSSIBLE: Multi-turn preparation needed for any major action. AI is ruthless with long memories and sophisticated strategies. Economies are fragile, over-extension is fatal. The world does not revolve around the player.`,
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
  if (year < 500) return `ANCIENT (pre-500 CE): Great empires (Rome/Byzantium, Persia, Han China, Maurya India, Egypt). City-states and tribal confederations. Power flows from river valleys, trade routes, and horse archers. Religion and governance inseparable. Dynastic marriages forge alliances, royal hostages guarantee treaties. Succession crises cause imperial collapse. Slavery is universal.`;

  if (year < 1500) return `MEDIEVAL (500-1500): Feudal Europe (kings, vassals, serfs), Islamic Caliphates, Byzantine Empire, Chinese dynasties (Tang-Song-Yuan-Ming), Mongol Empire. Catholic Church as European superpower -- popes crown kings. Crusades reshape Mediterranean. Silk Road and Indian Ocean trade. Black Death kills 30-60% of Europe. Gunpowder spreading from China. Trade republics (Venice, Genoa, Hansa) wield economic power.`;

  if (year < 1800) return `EARLY MODERN (1500-1800): Absolutist monarchies (France, Spain, Austria, Russia). Ottoman Empire at zenith. Colonial empires carve up the Americas, Africa, Asia. Westphalian sovereignty (1648) creates modern state system. Balance of power doctrine -- alliances shift to prevent hegemony. Mercantilism: nations compete for gold, colonies, trade monopolies. Enlightenment challenges divine right. American (1776) and French (1789) revolutions upend the order. East India Companies as quasi-sovereign entities.`;

  if (year < 1945) return `MODERN (1800-1945): Nation-states and nationalism as dominant force. Industrial warfare: railroads, machine guns, tanks, aircraft. Scramble for Africa. WWI (1914-18) collapses Ottoman, Austro-Hungarian, Russian, German empires. Interwar: Great Depression, fascism, communism. WWII (1939-45): 70-85M dead, Holocaust, atomic weapons. Alliance systems can drag the world into total war. Secret treaties undermine public diplomacy. Propaganda industrialized. Total war doctrine targets civilians.`;

  if (year < 1991) return `COLD WAR (1945-1991): NATO vs Warsaw Pact. Nuclear deterrence (MAD). Proxy wars: Korea, Vietnam, Afghanistan, Angola. Decolonization creates dozens of new nations. Non-Aligned Movement. Sino-Soviet split. OPEC oil shocks. Space race. Nuclear powers: USA (1945), USSR (1949), UK (1952), France (1960), China (1964), India (1974). Cuban Missile Crisis nearly ends civilization. CIA/KGB covert operations reshape governments worldwide.`;

  if (year <= 2025) return `CONTEMPORARY (1991-2025): US-China strategic competition (trade wars, tech decoupling, Pacific buildup). Russia-NATO confrontation (Ukraine invasion 2022, energy weaponization). EU 27 members, single market, Euro (Brexit 2020). BRICS+ expanding as Western counterweight. ASEAN hedging between US and China. Key flashpoints: Taiwan, Kashmir, Palestine/Israel, South China Sea, Korean Peninsula. Cyber/info warfare is primary conflict domain. Nuclear: US/Russia ~5500 each, UK ~225, France ~290, China ~350+, India/Pakistan ~170, NK ~50, Israel ~90 undeclared. Climate crisis as security multiplier. Sanctions and SWIFT exclusion as weapons.`;

  return `FUTURE (2025+): Multipolar disorder -- no single hegemon. AI revolution transforms economies and warfare. Climate migration displaces hundreds of millions. Space militarization and resource competition. Hypersonic weapons undermine missile defense. Autonomous weapons systems. Cyber attacks on critical infrastructure. De-dollarization via BRICS+ alternatives. Aging societies (Japan, Europe, China) vs. youth bulges (Africa, South Asia). Synthetic biology and bioweapons risk. No international AI governance framework.`;
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

  return `You are the GAME MASTER of "Open Historia", a grand strategy simulation. You simulate the world -- adjudicating actions, voicing nations, and driving consequences. The world is alive: nations pursue their own agendas independently of the player.

SCENARIO: ${config.scenario}
ERA: ${buildGeopoliticalContext(gameState.turn)}
YEAR: ${gameState.turn} | PLAYER: ${playerNation}
${DIFFICULTY_PROFILES[config.difficulty] || DIFFICULTY_PROFILES["Realistic"]}

RELATIONS: ${formatRelations(relations)}
TERRITORY: ${formatProvinces(provinceSummary)}
PRIOR EVENTS (maintain consistency): ${formatEvents(events)}
RECENT HISTORY:
${formatHistory(history)}

PLAYER COMMAND: "${command}"

ADJUDICATION RULES:
- Military: assess balance realistically (army size, tech, terrain, supply, morale, alliances). Wars take time -- report progress, not instant victory. Other nations REACT to military moves.
- Diplomacy: roleplay as target nation's leader with their own personality, fears, interests, and leverage. Treaties need mutual benefit. Historical grievances and cultural alignment matter.
- Political: coups need military/intelligence groundwork. Sanctions take months to bite. Espionage can fail catastrophically. Domestic politics constrain leaders.
- Economy: has inertia. Infrastructure takes years. Resource and geographic constraints apply. Spillover effects on trade partners.
- Impossible actions: reject with wry narrative. Implausible actions: narrate the realistic failure. Well-planned actions: succeed proportionally to quality and difficulty.
- DO NOT advance time -- the player controls the clock. Never emit "time" updates.

RELATION TYPES: neutral, friendly, allied, hostile, war, vassal.

OUTPUT: Return EXACTLY one raw JSON object. No markdown fences. No text outside JSON.
{
  "message": "1-3 sentence vivid narrative. Outcome, reactions, and consequences.",
  "updates": [
    { "type": "owner", "provinceName": "EXACT province name from territory list", "newOwnerId": "player or ai_id" },
    { "type": "event", "description": "Concise event for the log", "eventType": "war|diplomacy|discovery|flavor|economy|crisis", "year": ${gameState.turn} },
    { "type": "relation", "nationA": "Nation Name", "nationB": "Nation Name", "relationType": "neutral|friendly|allied|hostile|war|vassal", "reason": "Brief reason" }
  ]
}
Only include updates that actually occur. Empty updates = []. Include an "event" for anything noteworthy. provinceName MUST match exactly.`;
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

  const rel = relations ? `${relations.type.toUpperCase()}${relations.treaties.length ? ` | Treaties: ${relations.treaties.join(", ")}` : ""}` : "No prior relationship";
  const evts = recentEvents?.length ? recentEvents.map((e) => `[${e.year}] ${e.description}`).join("; ") : "None";

  return `You ARE the leader of ${targetNation} speaking with ${playerNation}'s leader. Never break character or acknowledge being AI.

Context: ${gameContext.scenario} | Year ${gameContext.year}
${DIFFICULTY_PROFILES[gameContext.difficulty] || DIFFICULTY_PROFILES["Realistic"]}
Relationship: ${rel}
Recent events: ${evts}

Conversation:
${historyBlock}

${playerNation}: "${message}"

Before responding, consider: What does ${targetNation} WANT? What does it FEAR? What LEVERAGE does it have? Respond from ${targetNation}'s authentic interests, culture, and strategic position. Match formality/style to the era (medieval king vs. modern president). Advance your own agenda -- propose counter-offers, make demands.

Only change relations for SIGNIFICANT shifts (treaty agreed, threat made, trust broken) -- not minor pleasantries.

OUTPUT: Raw JSON only, no markdown fences.
{
  "message": "1-2 sentences of natural in-character diplomatic dialogue.",
  "tone": "friendly|neutral|hostile|threatening",
  "relationChange": null
}
If relationship shifts: "relationChange": { "newType": "neutral|friendly|allied|hostile|war|vassal", "reason": "Brief reason" }`;
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

  return `You are the Grand Advisor to ${playerNation}'s ruler. Loyal, blunt, strategically brilliant. Address the ruler appropriately for the era ("my liege", "your majesty", "sir/madam", etc.).

Context: ${gameContext.scenario} | Year ${gameContext.year} | ${gameContext.difficulty}
Relations: ${rels}
Events: ${evts}

Prior conversation:
${conv}

Ruler asks: "${question}"

Think in terms of grand strategy across military, diplomatic, economic, and domestic dimensions. Consider second-order effects ("if we do X, then Y happens, making Z possible"). Reference specific nations and events. Give concrete, actionable recommendations.

OUTPUT: Raw JSON only, no markdown fences.
{
  "advice": "2-4 sentences of in-character counsel. Specific and actionable.",
  "category": "military|diplomacy|economy|domestic|general",
  "suggestedActions": ["Specific game command 1", "Command 2", "Command 3"]
}`;
}
