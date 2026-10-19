import { SignJWT, importPKCS8 } from "jose";

export const dynamic = "force-dynamic";

/**
 * Signs a short-lived MapKit JS token with the private key from .env.local.
 * The key never leaves the server; the browser only ever sees 30-minute tokens.
 */
export async function GET() {
  const teamId = process.env.MAPKIT_TEAM_ID?.trim();
  const keyId = process.env.MAPKIT_KEY_ID?.trim();
  const pem = process.env.MAPKIT_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();

  const missing = [
    !teamId && "MAPKIT_TEAM_ID",
    !keyId && "MAPKIT_KEY_ID",
    !pem && "MAPKIT_PRIVATE_KEY",
  ].filter(Boolean) as string[];
  if (missing.length) {
    return Response.json({ missing }, { status: 503 });
  }

  try {
    const key = await importPKCS8(pem!, "ES256");
    const now = Math.floor(Date.now() / 1000);
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "ES256", kid: keyId!, typ: "JWT" })
      .setIssuer(teamId!)
      .setIssuedAt(now)
      .setExpirationTime(now + 30 * 60)
      .sign(key);
    return new Response(token, {
      headers: { "content-type": "text/plain", "cache-control": "no-store" },
    });
  } catch (e) {
    return Response.json(
      { error: `Could not sign a token: ${(e as Error).message}. Check that MAPKIT_PRIVATE_KEY is the full .p8 file contents.` },
      { status: 500 },
    );
  }
}
