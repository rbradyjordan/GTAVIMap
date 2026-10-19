import { cookies } from "next/headers";
import { cookieValue, EDITOR_COOKIE, isEditor, passwordMatches } from "@/lib/editor";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ editor: await isEditor(), configured: Boolean(process.env.EDITOR_PASSWORD?.trim()) });
}

export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (!process.env.EDITOR_PASSWORD?.trim()) {
    return Response.json({ error: "No EDITOR_PASSWORD is set in .env.local, so editing is off." }, { status: 503 });
  }
  if (!password || !passwordMatches(password)) {
    return Response.json({ error: "Wrong password." }, { status: 401 });
  }
  (await cookies()).set(EDITOR_COOKIE, cookieValue()!, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  return Response.json({ editor: true });
}

export async function DELETE() {
  (await cookies()).delete(EDITOR_COOKIE);
  return Response.json({ editor: false });
}
