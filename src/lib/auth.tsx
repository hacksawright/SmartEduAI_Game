import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getAicodeSession } from "@/integrations/aicode/session";

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  school: string | null;
  math_nickname: string | null;
  math_level: string | null;
  learning_goal: string | null;
  daily_goal_minutes: number | null;
  xp_total: number;
  level: number;
  streak_current: number;
  streak_longest: number;
  onboarding_completed: boolean;
  show_in_feed: boolean;
}

interface AuthCtx {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    setProfile((data as Profile | null) ?? null);
  };

  useEffect(() => {
    // Set up listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => loadProfile(sess.user.id), 0);
      } else {
        setProfile(null);
      }
    });

    // THEN sync with the AICode account on every load: the AICode user may have
    // logged out or switched accounts since the Supabase session was stored.
    (async () => {
      try {
        const result = await getAicodeSession();
        if (result.status === "unauthenticated") {
          await supabase.auth.signOut({ scope: "local" });
          const target = new URL(result.loginUrl, window.location.href);
          target.searchParams.set("message", "login_required");
          target.searchParams.set("redirect", window.location.href);
          window.location.assign(target.href);
          return;
        }
        if (result.status === "issued") {
          const { error } = await supabase.auth.setSession({
            access_token: result.accessToken,
            refresh_token: result.refreshToken,
          });
          if (error) throw error;
        }
        const { data: { session: s } } = await supabase.auth.getSession();
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) await loadProfile(s.user.id);
      } catch (error) {
        console.error("AICode sign-in failed", error);
      }
      setLoading(false);
    })();

    return () => subscription.unsubscribe();
  }, []);


  const value: AuthCtx = {
    user,
    session,
    profile,
    loading,
    refreshProfile: async () => { if (user) await loadProfile(user.id); },
    signOut: async () => { await supabase.auth.signOut(); },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
