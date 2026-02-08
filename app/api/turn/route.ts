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
      
      **Game Context:**
      - **Scenario:** ${config.scenario}
      - **Year:** ${gameState.turn}
      - **Player Nation:** ${gameState.players["player"].name}
      - **Difficulty:** ${config.difficulty}
      
      **Player Command:** "${command}"
      
      **Instructions:**
      1. **ROLEPLAY:** If the command is diplomatic, reply AS the target nation's leader.
         - Consider the difficulty: In "Hardcore", nations are suspicious and aggressive. In "Sandbox", they are compliant.
      2. **TIME:** If the command is "Wait" or "Advance Time", describe what happens in the world over the next few months/year.
         - Update the "time" state by +1.
      3. **REALISM:**
         - Actions take time. You can say "Construction started, it will finish next year."
         - No gold budget. Resources are abstract. If a player does too much at once, say their bureaucracy is overwhelmed.
      
      **Response Format (JSON ONLY):**
      {
        "message": "Narrative response...",
        "updates": [
           { "type": "owner", "provinceName": "Exact Name", "newOwnerId": "player" },
           { "type": "time", "amount": 1 } 
        ]
      }
      
      IMPORTANT:
      - Return ONLY the raw JSON object. No markdown.
      - "updates" array is optional, only use if map/time changes.
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

    // Robust JSON cleaning
    const cleanJson = responseText
        .replace(/```json/g, "")
        .replace(/```/g, "")
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
