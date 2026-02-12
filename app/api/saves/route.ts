import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { savedGame } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
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

// GET /api/saves — list all saves for authenticated user
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const saves = await db
    .select({
      id: savedGame.id,
      name: savedGame.name,
      timestamp: savedGame.timestamp,
      version: savedGame.version,
      storySoFar: savedGame.storySoFar,
      scenario: savedGame.scenario,
      playerNationId: savedGame.playerNationId,
      provider: savedGame.provider,
      model: savedGame.model,
      difficulty: savedGame.difficulty,
      turn: savedGame.turn,
      createdAt: savedGame.createdAt,
      updatedAt: savedGame.updatedAt,
    })
    .from(savedGame)
    .where(eq(savedGame.userId, session.user.id))
    .orderBy(desc(savedGame.timestamp));

  return NextResponse.json({ saves });
}

// POST /api/saves — upsert a save
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    id,
    name,
    timestamp,
    version,
    gameState,
    gameConfig,
    logs,
    events,
    storySoFar,
  } = body;

  if (!id || !gameState || !gameConfig) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const gameConfigJson = stripApiKey(
    typeof gameConfig === "string" ? gameConfig : JSON.stringify(gameConfig)
  );
  const gameStateJson =
    typeof gameState === "string" ? gameState : JSON.stringify(gameState);
  const logsJson =
    typeof logs === "string" ? logs : JSON.stringify(logs || []);
  const eventsJson =
    typeof events === "string" ? events : JSON.stringify(events || []);

  // Extract denormalized metadata from config
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
    id,
    userId: session.user.id,
    name: name || null,
    timestamp: timestamp || now,
    version: version || "2.0.0",
    gameStateJson,
    gameConfigJson,
    logsJson,
    eventsJson,
    storySoFar: storySoFar || null,
    scenario: (parsedConfig.scenario as string) || null,
    playerNationId: (parsedConfig.playerNationId as string) || null,
    provider: (parsedConfig.provider as string) || null,
    model: (parsedConfig.model as string) || null,
    difficulty: (parsedConfig.difficulty as string) || null,
    turn: (parsedState.turn as number) || null,
    createdAt: now,
    updatedAt: now,
  };

  await db
    .insert(savedGame)
    .values(row)
    .onConflictDoUpdate({
      target: savedGame.id,
      set: {
        name: row.name,
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

  return NextResponse.json({ ok: true, id });
}
