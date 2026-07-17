/**
 * Edge-compatible session auth.
 * Uses Web Crypto API — available in Cloudflare Workers, Next.js Edge Runtime, and Node 18+.
 */

export const SESSION_COOKIE = "zyanix_session";
const SECRET = "zyanix-hq-secret-2026";

// ── Password hashing ──────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + SECRET);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return bufToHex(new Uint8Array(hash));
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return (await hashPassword(password)) === hash;
}

// ── Session payload ───────────────────────────────────────────────────────────

export interface SessionPayload {
  userId: string;
  username: string;
  role: string;
  name: string;
  permissions: string[];
  mustChangePassword?: boolean;
}

// ── HMAC signing ──────────────────────────────────────────────────────────────

function bufToHex(buf: Uint8Array): string {
  return Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacSign(data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return bufToHex(new Uint8Array(sig));
}

// ── Token: base64url(payload) + "~" + hmac ────────────────────────────────────
// Uses "~" as separator — never appears in base64url or hex output.

function toBase64Url(str: string): string {
  // btoa then make URL-safe (no padding issues in cookie values)
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): string {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4;
  return atob(pad ? padded + "=".repeat(4 - pad) : padded);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const data = toBase64Url(JSON.stringify(payload));
  const sig = await hmacSign(data);
  return `${data}~${sig}`;
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const tilde = token.indexOf("~");
    if (tilde === -1) return null;
    const data = token.substring(0, tilde);
    const sig = token.substring(tilde + 1);
    if (!data || !sig) return null;
    const expected = await hmacSign(data);
    // Constant-time comparison to prevent timing attacks
    if (expected.length !== sig.length) return null;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
    if (diff !== 0) return null;
    return JSON.parse(fromBase64Url(data)) as SessionPayload;
  } catch {
    return null;
  }
}

// ── Cookie helpers ────────────────────────────────────────────────────────────

export function getSessionFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  // Regex: match cookie value up to ";" or end of string
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}
