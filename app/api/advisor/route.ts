import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { buildAdvisorPrompt } from "@/lib/ai-prompts";
import { callCliBridge } from "@/lib/cli-bridge";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

// ---------------------------------------------------------------------------
// Constants & Helpers
// ---------------------------------------------------------------------------

const DEFAULT_GEMINI_MODEL = "gemini-3-flash-preview";
const FALLBACK_GEMINI_MODELS = [
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
  "gemini-flash-latest",
];

const normalizeGeminiModel = (model: string | undefined): string => {
  if (!model) return DEFAULT_GEMINI_MODEL;
  const trimmed = model.trim();
  if (!trimmed) return DEFAULT_GEMINI_MODEL;
  return trimmed.startsWith("models/") ? trimmed.slice("models/".length) : trimmed;
};

const isModelSelectionError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    message.includes("not found") ||
    message.includes("unsupported") ||
    message.includes("invalid model") ||
    message.includes("404")
  );
};

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

type AdvisorCategory = "military" | "diplomacy" | "economy" | "domestic" | "general";

interface AdvisorResponse {
  advice: string;
  category: AdvisorCategory;
  suggestedActions: string[];
}

const VALID_CATEGORIES: AdvisorCategory[] = [
  "military",
  "diplomacy",
  "economy",
  "domestic",
  "general",
];

const sanitizeAdvisorResponse = (raw: unknown): AdvisorResponse => {
  const payload = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const advice =
    typeof payload.advice === "string" && payload.advice.trim()
      ? payload.advice.trim()
      : "My liege, I must confess that the situation confounds even my years of experience. Allow me a moment to gather my thoughts and consult the archives.";

  const category: AdvisorCategory =
    typeof payload.category === "string" &&
    VALID_CATEGORIES.includes(payload.category as AdvisorCategory)
      ? (payload.category as AdvisorCategory)
      : "general";

  let suggestedActions: string[] = [];
  if (Array.isArray(payload.suggestedActions)) {
    suggestedActions = payload.suggestedActions
      .filter((a): a is string => typeof a === "string" && a.trim().length > 0)
      .map((a) => a.trim())
      .slice(0, 5);
  }

  // Ensure at least one suggestion
  if (suggestedActions.length === 0) {
    suggestedActions = ["Review the current diplomatic situation"];
  }

  return { advice, category, suggestedActions };
};

const extractJson = (text: string): string => {
  return (
    text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .match(/(\{[\s\S]*\})/)?.[1] || text.trim()
  );
};

// ---------------------------------------------------------------------------
// AI provider dispatch
// ---------------------------------------------------------------------------

async function callProvider(
  prompt: string,
  config: { provider: string; apiKey: string; model: string }
): Promise<string> {
  switch (config.provider) {
    case "local": {
      return callCliBridge({
        provider: config.model || "claude",
        prompt,
        systemPrompt: "You are a JSON-only response bot for a grand strategy game's advisor system. Never explain your answer, only return valid JSON.",
      });
    }
    case "google": {
      const genAI = new GoogleGenerativeAI(config.apiKey);
      const preferredModel = normalizeGeminiModel(config.model);

      const requestGemini = async (modelName: string): Promise<string> => {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { responseMimeType: "application/json" },
        });
        const result = await model.generateContent(prompt);
        return result.response.text();
      };

      const modelCandidates = Array.from(
        new Set([preferredModel, ...FALLBACK_GEMINI_MODELS])
      );

      let lastModelError: unknown = null;
      for (const modelName of modelCandidates) {
        try {
          const text = await requestGemini(modelName);
          return text;
        } catch (error) {
          if (!isModelSelectionError(error)) throw error;
          lastModelError = error;
        }
      }

      if (lastModelError) throw lastModelError;
      return "{}";
    }

    case "deepseek": {
      const deepseek = new OpenAI({
        apiKey: config.apiKey,
        baseURL: "https://api.deepseek.com",
      });
      const completion = await deepseek.chat.completions.create({
        messages: [{ role: "system", content: prompt }],
        model: config.model,
      });
      return completion.choices[0].message.content || "{}";
    }

    case "openai": {
      const openai = new OpenAI({ apiKey: config.apiKey });
      const isOSeries = config.model.startsWith("o");
      const completion = await openai.chat.completions.create({
        messages: [{ role: isOSeries ? "user" : "system", content: prompt }],
        model: config.model,
        response_format:
          config.model.includes("gpt-4o") || config.model.includes("o3")
            ? { type: "json_object" }
            : undefined,
      });
      return completion.choices[0].message.content || "{}";
    }

    case "anthropic": {
      const anthropic = new Anthropic({ apiKey: config.apiKey });
      const msg = await anthropic.messages.create({
        model: config.model,
        max_tokens: 1536,
        system:
          "You are a JSON-only response bot for a grand strategy game's advisor system. Never explain your answer, only return valid JSON.",
        messages: [{ role: "user", content: prompt }],
      });
      if (msg.content[0].type === "text") {
        return msg.content[0].text;
      }
      return "{}";
    }

    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
}

// ---------------------------------------------------------------------------
// POST /api/advisor
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const { allowed, retryAfterMs } = rateLimit(`advisor:${ip}`, { maxRequests: 20, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } }
    );
  }

  try {
    const body = await req.json();

    const {
      question,
      playerNation,
      gameContext,
      recentEvents,
      relations,
      history,
      config,
      promptOverrides,
    } = body as {
      question: string;
      playerNation: string;
      gameContext: { year: number; scenario: string; difficulty: string };
      recentEvents?: Array<{ year: number; description: string }>;
      relations?: Array<{ nationA: string; nationB: string; type: string }>;
      history?: Array<{ content: string; role: string }>;
      config: { provider: string; apiKey: string; model: string };
      promptOverrides?: Record<string, string>;
    };

    // --- Validation ---
    if (config?.provider !== "local" && !config?.apiKey) {
      return NextResponse.json(
        { error: "API Key missing" },
        { status: 400 }
      );
    }
    if (!question || !playerNation) {
      return NextResponse.json(
        { error: "Missing required fields: question, playerNation" },
        { status: 400 }
      );
    }

    // --- Build prompt ---
    const prompt = buildAdvisorPrompt({
      question,
      playerNation,
      gameContext: gameContext || { year: 2026, scenario: "", difficulty: "Realistic" },
      recentEvents: recentEvents || [],
      relations: relations || [],
      history: history || [],
      promptOverrides,
    });

    // --- Call AI ---
    const responseText = await callProvider(prompt, config);

    // --- Parse & sanitize ---
    const cleanJson = extractJson(responseText);
    const parsed = JSON.parse(cleanJson);
    const sanitized = sanitizeAdvisorResponse(parsed);

    return NextResponse.json(sanitized);
  } catch (error) {
    console.error("Advisor Error:", error);

    return NextResponse.json(
      {
        advice:
          "Forgive me, my liege. An unforeseen disturbance has interrupted my counsel. I shall compose my thoughts and return shortly.",
        category: "general" as AdvisorCategory,
        suggestedActions: ["Wait and try consulting the advisor again"],
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
