import crypto from "crypto";

/**
 * Signed OAuth `state` to prevent CSRF and carry the target platform/user across the redirect.
 * HMAC-signed with NEXTAUTH_SECRET; tamper or expiry → verify throws.
 */
const secret = process.env.NEXTAUTH_SECRET || "clipwave-dev-secret";
const TTL_MS = 10 * 60 * 1000;

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64url");
}
function hmac(data: string): string {
  return crypto.createHmac("sha256", secret).update(data).digest("base64url");
}

export interface OAuthState {
  userId: string;
  platform: string;
  ts: number;
}

export function signState(payload: Omit<OAuthState, "ts">): string {
  const data = b64url(JSON.stringify({ ...payload, ts: Date.now() }));
  return `${data}.${hmac(data)}`;
}

export function verifyState(state: string): OAuthState {
  const [data, sig] = state.split(".");
  if (!data || !sig) throw new Error("Malformed OAuth state");
  const expected = hmac(data);
  // Constant-time comparison.
  if (
    sig.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    throw new Error("Invalid OAuth state signature");
  }
  const parsed = JSON.parse(Buffer.from(data, "base64url").toString()) as OAuthState;
  if (Date.now() - parsed.ts > TTL_MS) throw new Error("OAuth state expired");
  return parsed;
}
