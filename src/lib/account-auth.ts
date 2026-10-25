import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { confirmedAccountUser, resolveAccountAppOrigin } from "./account-auth-policy";
export { resolveAccountIdentity } from "./account-identity";

export type AuthEnvironment = { SUPABASE_URL?: string; SUPABASE_PUBLISHABLE_KEY?: string; AUTH_GOOGLE_ENABLED?: string; APP_ORIGIN?: string };
export async function authEnvironment(): Promise<AuthEnvironment> {
  try { return (await getCloudflareContext({ async: true })).env as unknown as AuthEnvironment; }
  catch { return process.env as AuthEnvironment; }
}
export async function authConfiguration() {
  const env = await authEnvironment();
  return { configured: !!(env.SUPABASE_URL && env.SUPABASE_PUBLISHABLE_KEY), googleEnabled: env.AUTH_GOOGLE_ENABLED === "true" };
}
export async function accountAuthClient() {
  const env = await authEnvironment();
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) throw new Error("Account sign-in is not configured yet.");
  if (!env.SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_")) throw new Error("Configure a Supabase publishable key, not a legacy or secret key.");
  const jar = await cookies();
  return createServerClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    cookieOptions: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" },
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (values) => { for (const {name,value,options} of values) { try { jar.set(name,value,options); } catch { /* Read-only server render: refresh happens in API routes. */ } } },
    },
  });
}
export async function verifiedAuthUser() {
  if (!(await authConfiguration()).configured) return null;
  const supabase = await accountAuthClient();
  const { data, error } = await supabase.auth.getUser();
  return error ? null : confirmedAccountUser(data.user);
}

export async function accountAppOrigin(request: Request) {
  const env = await authEnvironment();
  return resolveAccountAppOrigin(request.url, env.APP_ORIGIN, process.env.MODHORIZON_LOCAL_ORIGIN, process.env.NODE_ENV === "development", request.headers.get("host"));
}
