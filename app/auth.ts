import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "cloudflare:workers";
import { getSession } from "../lib/auth/service";
import type { AuthUser } from "../lib/auth/types";
import { signInPath } from "../lib/auth-path";
export { signInPath } from "../lib/auth-path";

/** Only an opaque, server-validated session establishes identity. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  return getSession(await headers(), env);
}
export async function requireCurrentUser(returnTo: string): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (user) return user;
  redirect(signInPath(returnTo));
}
