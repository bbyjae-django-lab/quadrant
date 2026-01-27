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

  const sessionUser = data.session.user;
  const userId = sessionUser?.id ?? "";
  const userEmail = (sessionUser?.email ?? "").trim().toLowerCase();
  if (!userId || !userEmail) {
    console.error("[auth/callback] missing user after exchange", {
      hasSession: Boolean(data?.session),
    });
  } else if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "[auth/callback] admin client config missing",
      "NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  } else {
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
    const { data: pending, error: pendingError } = await admin
      .from("pending_entitlements")
      .select("*")
      .eq("email", userEmail)
      .maybeSingle();
    if (pendingError) {
      console.error(
        "[auth/callback] pending entitlement lookup failed",
        pendingError?.code,
        pendingError?.message ?? pendingError,
      );
    } else if (!pending) {
      console.log("[auth/callback] no pending entitlement for", userEmail);
    } else if (pending?.is_pro === true) {
      const { error: upsertError } = await admin
        .from("user_entitlements")
          .upsert(
            {
              user_id: userId,
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
        console.error(
          "[auth/callback] entitlement upsert failed",
          upsertError?.code,
          upsertError?.message ?? upsertError,
        );
      } else {
        console.log("[auth/callback] promoted pro", {
          userId,
          email: userEmail,
        });
        const { error: deleteError } = await admin
          .from("pending_entitlements")
          .delete()
          .eq("email", userEmail);
        if (deleteError) {
          console.error(
            "[auth/callback] pending entitlement delete failed",
            deleteError?.code,
            deleteError?.message ?? deleteError,
          );
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
