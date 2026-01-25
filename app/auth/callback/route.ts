import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export const GET = async (request: Request) => {
  const requestUrl = new URL(request.url);
  const rawNext = requestUrl.searchParams.get("next") ?? "/dashboard";
  const code = requestUrl.searchParams.get("code");
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const safeNext =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";
  const finalNext =
    safeNext === "/pricing" || safeNext === "/" ? "/dashboard" : safeNext;
  const redirectUrl = new URL(finalNext, requestUrl.origin);
  if (!supabaseUrl || !anonKey || !code) {
    return NextResponse.redirect(redirectUrl);
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data?.session) {
    return NextResponse.redirect(redirectUrl);
  }

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set("sb-access-token", data.session.access_token, {
    path: "/",
    sameSite: "lax",
    secure: true,
    httpOnly: false,
  });
  response.cookies.set("sb-refresh-token", data.session.refresh_token, {
    path: "/",
    sameSite: "lax",
    secure: true,
    httpOnly: false,
  });
  return response;
};
