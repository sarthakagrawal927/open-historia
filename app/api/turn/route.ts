import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  try {
    const { command, gameState, config } = await req.json();

    if (!config.apiKey) {
      return NextResponse.json({ error: "API Key missing" }, { status: 400 });
    }

    const systemPrompt = `
      You are the Game Master for a grand strategy game called "Open Historia".
      
      **Scenario Context:** ${config.scenario}
      **Year:** ${gameState.turn} (Started: ${config.year})
      **Player Nation:** ${gameState.players["player"].name}
      
      **Current World State (Simplified):**
      - Player Gold: ${gameState.players["player"].gold}
      - Player Territories: ${gameState.provinces.filter((p: any) => p.ownerId === "player").map((p: any) => p.name).join(", ") || "None"}
      
      **Player Command:** "${command}"
      
      **Instructions:**
      1. Interpret the player's command in the context of the scenario.
      2. Determine the outcome (success/failure) based on realism and game balance.
      3. If the player wants to attack/claim a specific country, you MUST return a state update changing its owner to "player" if successful.
      4. You can also deduct gold (e.g., -10 for claiming, -50 for war).
      
      **Response Format (JSON ONLY):**
      {
        "message": "A narrative description of what happened.",
        "updates": [
           { "type": "owner", "provinceName": "Name of province", "newOwnerId": "player" },
           { "type": "gold", "amount": -10 }
        ]
      }
      
      IMPORTANT:
      - Return ONLY the raw JSON object. No markdown, no backticks, no "json" prefix.
      - If you use markdown, I will not be able to parse it.
    `;

    let responseText = "";

    switch (config.provider) {
      case "google": {
        const genAI = new GoogleGenerativeAI(config.apiKey);
        const model = genAI.getGenerativeModel({ model: config.model });
        const result = await model.generateContent(systemPrompt);
        responseText = result.response.text();
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

    // Robust JSON cleaning (Reasoning models love to yap before the JSON)
    const cleanJson = responseText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        // Advanced regex to find the largest JSON block if mixed with text
        .match(/(\{[\s\S]*\})/)?.[1] || responseText.trim();
        
    const parsed = JSON.parse(cleanJson);

    return NextResponse.json(parsed);

  } catch (error) {
    console.error("AI Error:", error);
    return NextResponse.json({ 
        message: `The Game Master encountered an error: ${error instanceof Error ? error.message : "Internal Server Error"}`, 
        updates: [] 
    }, { status: 500 });
  }
}
