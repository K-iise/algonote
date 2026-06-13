import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE = "algonote_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7일

export interface Session {
  token: string; // GitHub access token
  login: string; // GitHub 사용자명
  name: string;
  avatar: string;
}

function secret(): string {
  return process.env.SESSION_SECRET || "dev-insecure-secret-change-me";
}

/** payload(base64).signature(hmac) 형태로 직렬화 */
function sign(payload: string): string {
  const sig = crypto.createHmac("sha256", secret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

function unsign(value: string): string | null {
  const idx = value.lastIndexOf(".");
  if (idx < 0) return null;
  const payload = value.slice(0, idx);
  const sig = value.slice(idx + 1);
  const expected = crypto.createHmac("sha256", secret()).update(payload).digest("hex");
  // timing-safe 비교
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return payload;
}

export async function setSession(session: Session): Promise<void> {
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  const store = await cookies();
  store.set(COOKIE, sign(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return null;
  const payload = unsign(raw);
  if (!payload) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Session;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

/** OAuth CSRF state 쿠키 (짧은 수명) */
export async function setOAuthState(state: string): Promise<void> {
  const store = await cookies();
  store.set("algonote_oauth_state", sign(state), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
}

export async function consumeOAuthState(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get("algonote_oauth_state")?.value;
  store.delete("algonote_oauth_state");
  if (!raw) return null;
  return unsign(raw);
}
