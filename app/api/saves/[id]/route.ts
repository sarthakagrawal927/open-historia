import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { savedGame } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";

// GET /api/saves/[id] — load a single save
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const rows = await db
    .select()
    .from(savedGame)
    .where(and(eq(savedGame.id, id), eq(savedGame.userId, session.user.id)))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const row = rows[0];
  return NextResponse.json({
    save: {
      id: row.id,
      timestamp: row.timestamp,
      version: row.version,
      gameState: JSON.parse(row.gameStateJson),
      gameConfig: JSON.parse(row.gameConfigJson),
      logs: JSON.parse(row.logsJson),
      events: JSON.parse(row.eventsJson),
      storySoFar: row.storySoFar,
    },
  });
}

// DELETE /api/saves/[id] — delete a save
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  await db
    .delete(savedGame)
    .where(and(eq(savedGame.id, id), eq(savedGame.userId, session.user.id)));

  return NextResponse.json({ ok: true });
}
