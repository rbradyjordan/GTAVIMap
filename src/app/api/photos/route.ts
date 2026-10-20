import { isEditor } from "@/lib/editor";
import { storePhoto } from "@/lib/pinStore";

export const dynamic = "force-dynamic";

/** Takes one photo as a data URL and returns the URL to store on the pin. */
export async function POST(req: Request) {
  if (!(await isEditor())) {
    return Response.json({ error: "Only the editor can add photos." }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { dataUrl?: unknown } | null;
  if (typeof body?.dataUrl !== "string" || !body.dataUrl.startsWith("data:image/")) {
    return Response.json({ error: "That isn't a photo." }, { status: 400 });
  }
  try {
    return Response.json({ url: await storePhoto(body.dataUrl) });
  } catch (e) {
    console.error("store photo", e);
    return Response.json({ error: "Could not upload the photo." }, { status: 502 });
  }
}
