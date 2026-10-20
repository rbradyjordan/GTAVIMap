import { Blip } from "@/data/blips";
import { isEditor } from "@/lib/editor";
import { loadBlips, saveBlips } from "@/lib/pinStore";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await loadBlips(), { headers: { "cache-control": "no-store" } });
}

export async function PUT(req: Request) {
  if (!(await isEditor())) {
    return Response.json({ error: "Only the editor can change the map." }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as unknown;
  if (!Array.isArray(body) || !body.every((b) => b && typeof b.id === "string" && typeof b.name === "string" && typeof b.lat === "number" && typeof b.lng === "number")) {
    return Response.json({ error: "That isn't a list of blips." }, { status: 400 });
  }
  try {
    const blips = await saveBlips(body as Blip[]);
    return Response.json({ ok: true, count: blips.length, blips });
  } catch (e) {
    console.error("save blips", e);
    return Response.json({ error: "Could not save to storage." }, { status: 502 });
  }
}
