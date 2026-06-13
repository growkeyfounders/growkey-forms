import { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";
import { apiGet } from "./api";

type Me = {
  profile: { userId: string; role: "admin" | "client"; name: string; photoUrl?: string } | null;
  client: Record<string, unknown> | null;
};

type SessionState = {
  session: Session | null;
  me: Me | null;
  loading: boolean;
  refreshMe: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<SessionState>({ session: null, me: null, loading: true, refreshMe: async () => {}, signOut: async () => {} });
export const useSession = () => useContext(Ctx);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshMe() {
    try { setMe(await apiGet<Me>("/api/skool/me")); }
    catch { setMe(null); }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setMe(null); setLoading(false); return; }
    setLoading(true);
    void refreshMe().finally(() => setLoading(false));
  }, [session?.access_token]);

  return (
    <Ctx.Provider value={{ session, me, loading, refreshMe, signOut: async () => { await supabase.auth.signOut(); } }}>
      {children}
    </Ctx.Provider>
  );
}
