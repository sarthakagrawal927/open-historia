import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { savedGame } from "@/lib/db/schema";
import { headers } from "next/headers";

function stripApiKey(configJson: string): string {
  try {
    const config = JSON.parse(configJson);
    config.apiKey = "";
    return JSON.stringify(config);
  } catch {
    return configJson;
  }
}

// POST /api/saves/upload — bulk upload localStorage saves to cloud
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { saves } = body;

  if (!Array.isArray(saves) || saves.length === 0) {
    return NextResponse.json({ error: "No saves provided" }, { status: 400 });
  }

  let uploaded = 0;

  for (const save of saves) {
    if (!save.id || !save.gameState || !save.gameConfig) continue;

    const gameConfigJson = stripApiKey(
      typeof save.gameConfig === "string"
        ? save.gameConfig
        : JSON.stringify(save.gameConfig)
    );
    const gameStateJson =
      typeof save.gameState === "string"
        ? save.gameState
        : JSON.stringify(save.gameState);
    const logsJson =
      typeof save.logs === "string"
        ? save.logs
        : JSON.stringify(save.logs || []);
    const eventsJson =
      typeof save.events === "string"
        ? save.events
        : JSON.stringify(save.events || []);

    let parsedConfig: Record<string, unknown> = {};
    try {
      parsedConfig = JSON.parse(gameConfigJson);
    } catch { /* ignore */ }

    let parsedState: Record<string, unknown> = {};
    try {
      parsedState = JSON.parse(gameStateJson);
    } catch { /* ignore */ }

    const now = Date.now();

    const row = {
      id: save.id,
      userId: session.user.id,
      name: save.name || null,
      timestamp: save.timestamp || now,
      version: save.version || "2.0.0",
      gameStateJson,
      gameConfigJson,
      logsJson,
      eventsJson,
      storySoFar: save.storySoFar || null,
      scenario: (parsedConfig.scenario as string) || null,
      playerNationId: (parsedConfig.playerNationId as string) || null,
      provider: (parsedConfig.provider as string) || null,
      model: (parsedConfig.model as string) || null,
      difficulty: (parsedConfig.difficulty as string) || null,
      turn: (parsedState.turn as number) || null,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await db
        .insert(savedGame)
        .values(row)
        .onConflictDoUpdate({
          target: savedGame.id,
          set: {
            timestamp: row.timestamp,
            version: row.version,
            gameStateJson: row.gameStateJson,
            gameConfigJson: row.gameConfigJson,
            logsJson: row.logsJson,
            eventsJson: row.eventsJson,
            storySoFar: row.storySoFar,
            scenario: row.scenario,
            playerNationId: row.playerNationId,
            provider: row.provider,
            model: row.model,
            difficulty: row.difficulty,
            turn: row.turn,
            updatedAt: now,
          },
        });
      uploaded++;
    } catch (err) {
      console.error(`Failed to upload save ${save.id}:`, err);
    }
  }

  return NextResponse.json({ ok: true, uploaded });
}
