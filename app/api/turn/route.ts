import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

const DEFAULT_GEMINI_MODEL = "gemini-3-flash-preview";
const FALLBACK_GEMINI_MODELS = [
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
  "gemini-flash-latest",
];

const normalizeGeminiModel = (model: string | undefined) => {
  if (!model) return DEFAULT_GEMINI_MODEL;
  const trimmed = model.trim();
  if (!trimmed) return DEFAULT_GEMINI_MODEL;
  return trimmed.startsWith("models/") ? trimmed.slice("models/".length) : trimmed;
};

const isModelSelectionError = (error: unknown) => {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    message.includes("not found") ||
    message.includes("unsupported") ||
    message.includes("invalid model") ||
    message.includes("404")
  );
};

type ParsedUpdate =
  | { type: "owner"; provinceName: string; newOwnerId: string }
  | { type: "time"; amount: number }
  | { type: "event"; description: string; eventType: "diplomacy" | "war" | "discovery" | "flavor"; year: number };

const normalizeEventType = (eventType: unknown): "diplomacy" | "war" | "discovery" | "flavor" => {
  if (eventType === "diplomacy" || eventType === "war" || eventType === "discovery" || eventType === "flavor") {
    return eventType;
  }
  return "flavor";
};

const sanitizeAiPayload = (
  payload: unknown,
  fallbackYear: number
): { message: string; updates: ParsedUpdate[] } => {
  const safePayload = (payload && typeof payload === "object" ? payload : {}) as {
    message?: unknown;
    updates?: unknown;
  };

  const message =
    typeof safePayload.message === "string" && safePayload.message.trim()
      ? safePayload.message.trim()
      : "The world watches your move. Issue your next command.";

  const updates: ParsedUpdate[] = [];
  if (Array.isArray(safePayload.updates)) {
    safePayload.updates.forEach((update) => {
      if (!update || typeof update !== "object") return;
      const u = update as Record<string, unknown>;

      if (u.type === "owner" && typeof u.provinceName === "string" && typeof u.newOwnerId === "string") {
        updates.push({
          type: "owner",
          provinceName: u.provinceName.trim(),
          newOwnerId: u.newOwnerId.trim(),
        });
      }

      if (u.type === "time") {
        const rawAmount = typeof u.amount === "number" ? u.amount : Number(u.amount);
        if (Number.isFinite(rawAmount)) {
          updates.push({
            type: "time",
            amount: Math.trunc(rawAmount),
          });
        }
      }

      if (u.type === "event" && typeof u.description === "string") {
        const rawYear = typeof u.year === "number" ? u.year : Number(u.year);
        updates.push({
          type: "event",
          description: u.description.trim(),
          eventType: normalizeEventType(u.eventType),
          year: Number.isFinite(rawYear) ? Math.trunc(rawYear) : fallbackYear,
        });
      }
    });
  }

  return { message, updates };
};

const buildTurnPrompt = (args: {
  command: string;
  gameState: {
    turn: number;
    players: Record<string, { name: string }>;
  };
  config: {
    scenario: string;
    difficulty: string;
  };
  history?: Array<{ type?: string; text: string }>;
  events?: Array<{ year: number; description: string }>;
}) => {
  const { command, gameState, config, history, events } = args;

  return `
You are the Game Master for a grand strategy simulation called "Open Historia".

GAME CONTEXT
- Scenario: ${config.scenario}
- Year: ${gameState.turn}
- Player Nation: ${gameState.players["player"].name}
- Difficulty: ${config.difficulty}

RECENT HISTORY
${history ? history.map((h) => `[${h.type?.toUpperCase() || "INFO"}] ${h.text}`).join("\n") : "No history yet."}

WORLD EVENTS MEMORY
${events ? events.map((e) => `[Year ${e.year}] ${e.description}`).join("\n") : "No significant events yet."}

PLAYER COMMAND
"${command}"

SIMULATION RULES
1) Stay internally consistent with prior events, alliances, wars, and tone.
2) If the command is diplomatic, roleplay as the target leader with strategic motives.
3) If time advances, narrate consequences and include a "time" update.
4) Only emit "owner" updates when control clearly changes.
5) Emit "event" updates for major geopolitical developments.
6) Keep response grounded and plausible for the selected difficulty.

OUTPUT CONTRACT (STRICT JSON ONLY)
Return one JSON object with this shape:
{
  "message": "2-6 sentence narrative response",
  "updates": [
    { "type": "owner", "provinceName": "Exact Name", "newOwnerId": "player|ai_id" },
    { "type": "time", "amount": 1 },
    { "type": "event", "description": "Event summary", "eventType": "war|diplomacy|discovery|flavor", "year": ${gameState.turn} }
  ]
}

HARD CONSTRAINTS
- No markdown.
- No keys outside "message" and "updates".
- If no state change, return "updates": [].
`;
};

export async function POST(req: NextRequest) {
  try {
    const { command, gameState, config, history, events } = await req.json();

    if (!config.apiKey) {
      return NextResponse.json({ error: "API Key missing" }, { status: 400 });
    }

    const systemPrompt = buildTurnPrompt({ command, gameState, config, history, events });

    let responseText = "";

    switch (config.provider) {
      case "google": {
        const genAI = new GoogleGenerativeAI(config.apiKey);
        const preferredModel = normalizeGeminiModel(config.model);

        const requestGemini = async (modelName: string) => {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: { responseMimeType: "application/json" },
          });
          const result = await model.generateContent(systemPrompt);
          return result.response.text();
        };

        const modelCandidates = Array.from(
          new Set([preferredModel, ...FALLBACK_GEMINI_MODELS])
        );

        let lastModelError: unknown = null;
        for (const modelName of modelCandidates) {
          try {
            responseText = await requestGemini(modelName);
            lastModelError = null;
            break;
          } catch (error) {
            if (!isModelSelectionError(error)) throw error;
            lastModelError = error;
          }
        }

        if (!responseText && lastModelError) {
          throw lastModelError;
        }
        break;
      }
      case "deepseek": {
        const deepseek = new OpenAI({
          apiKey: config.apiKey,
          baseURL: "https://api.deepseek.com",
        });
        const completion = await deepseek.chat.completions.create({
          messages: [{ role: "system", content: systemPrompt }],
          model: config.model,
        });
        responseText = completion.choices[0].message.content || "{}";
        break;
      }
      case "openai": {
        const openai = new OpenAI({ apiKey: config.apiKey });
        const isOSeries = config.model.startsWith('o');
        const completion = await openai.chat.completions.create({
          messages: [{ role: isOSeries ? "user" : "system", content: systemPrompt }],
          model: config.model,
          response_format: config.model.includes('gpt-4o') || config.model.includes('o3') ? { type: "json_object" } : undefined,
        });
        responseText = completion.choices[0].message.content || "{}";
        break;
      }
      case "anthropic": {
        const anthropic = new Anthropic({ apiKey: config.apiKey });
        const message = await anthropic.messages.create({
          model: config.model,
          max_tokens: 2048,
          system: "You are a JSON-only response bot for a strategy game. Never explain your answer, only return JSON.",
          messages: [{ role: "user", content: systemPrompt }],
        });
        if (message.content[0].type === 'text') {
             responseText = message.content[0].text;
        }
        break;
      }
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }

    // Robust JSON cleaning
    const cleanJson = responseText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .match(/(\{[\s\S]*\})/)?.[1] || responseText.trim();
        
    const parsed = JSON.parse(cleanJson);
    const sanitized = sanitizeAiPayload(parsed, gameState.turn);
    return NextResponse.json(sanitized);

  } catch (error) {
    console.error("AI Error:", error);
    return NextResponse.json({ 
        message: `The Game Master encountered an error: ${error instanceof Error ? error.message : "Internal Server Error"}`, 
        updates: [] 
    }, { status: 500 });
  }
}
