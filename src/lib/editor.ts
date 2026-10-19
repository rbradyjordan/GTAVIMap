import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const EDITOR_COOKIE = "blipvi_editor";

function expected(): string | null {
  const pw = process.env.EDITOR_PASSWORD?.trim();
  if (!pw) return null;
  return createHash("sha256").update(`blipvi:${pw}`).digest("hex");
}

export function passwordMatches(candidate: string): boolean {
  const pw = process.env.EDITOR_PASSWORD?.trim();
  if (!pw) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(pw);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function cookieValue(): string | null {
  return expected();
}

/** True when the request carries the editor cookie that matches EDITOR_PASSWORD. */
export async function isEditor(): Promise<boolean> {
  const want = expected();
  if (!want) return false;
  const got = (await cookies()).get(EDITOR_COOKIE)?.value ?? "";
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}
