import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Blip, DEFAULT_BLIPS } from "@/data/blips";
import { isEditor } from "@/lib/editor";

export const dynamic = "force-dynamic";

/** The one shared set of pins. Lives in data/blips.json; starts from the defaults. */
const FILE = path.join(process.cwd(), "data", "blips.json");

async function load(): Promise<Blip[]> {
  try {
    return JSON.parse(await readFile(FILE, "utf8")) as Blip[];
  } catch {
    return DEFAULT_BLIPS;
  }
}

export async function GET() {
  return Response.json(await load(), { headers: { "cache-control": "no-store" } });
}

export async function PUT(req: Request) {
  if (!(await isEditor())) {
    return Response.json({ error: "Only the editor can change the map." }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as unknown;
  if (!Array.isArray(body) || !body.every((b) => b && typeof b.id === "string" && typeof b.name === "string" && typeof b.lat === "number" && typeof b.lng === "number")) {
    return Response.json({ error: "That isn't a list of blips." }, { status: 400 });
  }
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(body, null, 2));
  return Response.json({ ok: true, count: body.length });
}
