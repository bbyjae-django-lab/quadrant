"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { getSession, onAuthStateChange, signOut as authSignOut } from "../lib/auth";
import { getSupabaseClient } from "../lib/supabaseClient";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  isAuthed: boolean;
  authLoading: boolean;
  isPro: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    let active = true;
    const loadSession = async () => {
      const current = await getSession();
      if (!active) {
        return;
      }
      setSession(current);
      setUser(current?.user ?? null);
      setAuthLoading(false);
    };
    loadSession();
    const unsubscribe = onAuthStateChange((nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setAuthLoading(false);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadEntitlement = async () => {
      if (!user) {
        setIsPro(false);
        return;
      }
      if (!user.email) {
        setIsPro(false);
        return;
      }
      const supabase = getSupabaseClient();
      if (!supabase) {
        setIsPro(false);
        return;
      }
      const { data, error } = await supabase
        .from("billing_customers")
        .select("status, price_id")
        .eq("email", user.email)
        .maybeSingle();
      if (!active) {
        return;
      }
      if (error) {
        setIsPro(false);
        return;
      }
      const status = data?.status ?? "";
      const priceId =
        process.env.NEXT_PUBLIC_STRIPE_PRICE_ID ?? "";
      const matchesPrice = priceId ? data?.price_id === priceId : true;
      const hasProStatus = status === "active" || status === "trialing";
      setIsPro(Boolean(matchesPrice && hasProStatus));
    };
    void loadEntitlement();
    return () => {
      active = false;
    };
  }, [user]);

  const handleSignOut = useCallback(async () => {
    await authSignOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isAuthed: Boolean(user),
      authLoading,
      isPro,
      signOut: handleSignOut,
    }),
    [user, session, authLoading, isPro, handleSignOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
