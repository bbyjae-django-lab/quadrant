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

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  isAuthed: boolean;
  authLoading: boolean;
  isPro: boolean;
  proStatus: "unknown" | "free" | "pro";
  signOut: () => Promise<void>;
  refreshEntitlements: () => void;
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
  const [proStatus, setProStatus] = useState<"unknown" | "free" | "pro">("unknown");

  useEffect(() => {
    let active = true;
    const loadSession = async () => {
      const current = await getSession();
      if (!active) {
        return;
      }
      setSession(current);
      setUser(current?.user ?? null);
      setProStatus(current?.access_token ? "unknown" : "free");
      setAuthLoading(false);
    };
    loadSession();
    const unsubscribe = onAuthStateChange((nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setProStatus(nextSession?.access_token ? "unknown" : "free");
      setAuthLoading(false);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const refreshEntitlements = useCallback(() => {
    if (!session?.access_token) {
      setProStatus("free");
      return;
    }
    setProStatus("unknown");
    fetch("/api/entitlements", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setProStatus(data?.isPro ? "pro" : "free");
      })
      .catch(() => {
        setProStatus("free");
      });
  }, [session?.access_token]);

  useEffect(() => {
    if (!session?.access_token) {
      setProStatus("free");
      return;
    }
    refreshEntitlements();
  }, [session?.access_token, refreshEntitlements]);

  const handleSignOut = useCallback(async () => {
    await authSignOut();
    setProStatus("free");
  }, []);

  const isPro = proStatus === "pro";

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isAuthed: Boolean(user),
      authLoading,
      isPro,
      proStatus,
      signOut: handleSignOut,
      refreshEntitlements,
    }),
    [
      user,
      session,
      authLoading,
      isPro,
      proStatus,
      handleSignOut,
      refreshEntitlements,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
