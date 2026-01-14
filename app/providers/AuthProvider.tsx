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

  const handleSignOut = useCallback(async () => {
    await authSignOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isAuthed: Boolean(user),
      authLoading,
      signOut: handleSignOut,
    }),
    [user, session, authLoading, handleSignOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
