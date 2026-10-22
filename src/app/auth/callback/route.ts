import { NextResponse } from "next/server";
import { accountAppOrigin, accountAuthClient } from "@/lib/account-auth";
export const dynamic = "force-dynamic";
export async function GET(request:Request) {
  const url = new URL(request.url), origin = await accountAppOrigin(request);
  const code = url.searchParams.get("code");
  if (code && code.length<4096) {
    try {
      const client = await accountAuthClient();
      const {error} = await client.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(`${origin}/account${url.searchParams.get("next")==="reset"?"?mode=reset":""}`,{headers:{"Cache-Control":"no-store","Referrer-Policy":"no-referrer"}});
    } catch { /* Display a safe error without leaking OAuth codes. */ }
  }
  return NextResponse.redirect(`${origin}/account?error=callback`,{headers:{"Cache-Control":"no-store","Referrer-Policy":"no-referrer"}});
}
