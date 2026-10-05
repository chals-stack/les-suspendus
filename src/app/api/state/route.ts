import { NextResponse } from "next/server";
import { getNeonPool } from "@/lib/neon";
import { initialState } from "@/lib/data";

const workshopId = process.env.WORKSHOP_ID || "atelier-principal";
function authorized(request: Request) { return !!process.env.ORGANIZER_PASSWORD && request.headers.get("x-organizer-password") === process.env.ORGANIZER_PASSWORD; }
export async function GET() {
  try { const result = await getNeonPool().query("select state from workshops where id=$1", [workshopId]); if (!result.rowCount) { await getNeonPool().query("insert into workshops(id,state) values($1,$2) on conflict do nothing", [workshopId, JSON.stringify(initialState)]); return NextResponse.json(initialState); } return NextResponse.json(result.rows[0].state); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur" }, { status: 500 }); }
}
export async function PUT(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Mot de passe organisateur invalide" }, { status: 401 });
  try { const state = await request.json(); await getNeonPool().query("insert into workshops(id,state,updated_at) values($1,$2,now()) on conflict(id) do update set state=excluded.state,updated_at=now()", [workshopId, JSON.stringify(state)]); return NextResponse.json(state); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur serveur" }, { status: 500 }); }
}
