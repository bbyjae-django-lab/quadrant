import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export const GET = async (request: Request) => {
  const requestUrl = new URL(request.url);
  const rawNext = requestUrl.searchParams.get("next") ?? "/dashboard";
  const code = requestUrl.searchParams.get("code");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

  const user = data.session.user;
  const userEmail = (user?.email ?? "").trim().toLowerCase();
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Auth callback: missing Supabase admin env vars.");
  } else if (userEmail) {
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
    const { data: pending, error: pendingError } = await admin
      .from("pending_entitlements")
      .select("*")
      .eq("email", userEmail)
      .maybeSingle();
    if (pendingError) {
      console.error("Auth callback: failed to load pending entitlement.");
    } else if (pending?.is_pro === true) {
      const { error: upsertError } = await admin
          .from("user_entitlements")
          .upsert(
            {
              user_id: user.id,
              is_pro: true,
              stripe_customer_id: pending.stripe_customer_id ?? null,
              stripe_subscription_id: pending.stripe_subscription_id ?? null,
              stripe_price_id: pending.stripe_price_id ?? null,
              current_period_end: pending.current_period_end ?? null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" },
          );
      if (upsertError) {
        console.error("Auth callback: failed to promote entitlement.");
      } else {
        const { error: deleteError } = await admin
          .from("pending_entitlements")
          .delete()
          .eq("email", userEmail);
        if (deleteError) {
          console.error("Auth callback: failed to delete pending entitlement.");
        }
      }
    }
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
