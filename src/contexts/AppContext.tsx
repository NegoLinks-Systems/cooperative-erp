import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/lib/core";
import type { Session, User } from "@supabase/supabase-js";

export interface OrgSettings {
  id: number;
  organization_name: string;
  application_name: string;
  registration_details: string | null;
  address: string | null;
  phone_numbers: string | null;
  email: string | null;
  website: string | null;
  currency_code: string;
  currency_symbol: string;
  time_zone: string;
  date_format: string;
  language: string;
  logo_url: string | null;
  favicon_url: string | null;
  theme_primary: string | null;
  theme_accent: string | null;
  login_tagline: string | null;
  letterhead_url: string | null;
  stamp_url: string | null;
  signature_url: string | null;
  ai_assistant_name: string;
  updated_at: string;
}

const DEFAULT_SETTINGS: OrgSettings = {
  id: 1, organization_name: "My Cooperative", application_name: "Cooperative & Microfinance ERP",
  registration_details: null, address: null, phone_numbers: null, email: null, website: null,
  currency_code: "NGN", currency_symbol: "₦", time_zone: "Africa/Lagos", date_format: "DD/MM/YYYY",
  language: "en", logo_url: null, favicon_url: null, theme_primary: null, theme_accent: null,
  login_tagline: null, letterhead_url: null, stamp_url: null, signature_url: null,
  ai_assistant_name: "AI Assistance", updated_at: "",
};

export interface Profile { id: string; full_name: string; role: string; branch_id: string | null; active: boolean; }

export const STAFF_ROLES = ["super_admin","org_owner","managing_director","general_manager","branch_manager","loan_officer","teller","savings_officer","accounts_officer","accountant","finance_officer","hr_officer","it_officer","compliance_officer","board_chairman","board_member"];
export const ALL_ROLES = [...STAFF_ROLES, "member"];

interface AppContextValue {
  session: Session | null; user: User | null; profile: Profile | null;
  settings: OrgSettings; refreshSettings: () => void;
  role: string; isStaff: boolean; isAdmin: boolean;
  signOut: () => Promise<void>;
  demoMode: boolean; notifCount: number;
  featureFlags: Record<string, boolean>;
  refreshNotifCount: () => void;
  theme: "dark" | "light";
  toggleTheme: () => void;
}

const AppCtx = createContext<AppContextValue | null>(null);
export const useApp = () => { const ctx = useContext(AppCtx); if (!ctx) throw new Error("useApp outside provider"); return ctx; };

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<OrgSettings>(DEFAULT_SETTINGS);
  const [demoMode, setDemoMode] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("nl-theme") : null;
    return saved === "light" ? "light" : "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { window.localStorage.setItem("nl-theme", theme); } catch { /* storage unavailable */ }
  }, [theme]);

  const toggleTheme = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);

  const role = profile?.role ?? "member";
  const isStaff = STAFF_ROLES.includes(role);
  const isAdmin = ["super_admin","org_owner","managing_director"].includes(role);

  const refreshSettings = useCallback(async () => {
    const { data } = await supabase.from("org_settings").select("*").eq("id", 1).single();
    if (data) {
      setSettings({ ...DEFAULT_SETTINGS, ...(data as Partial<OrgSettings>) });
      if ((data as OrgSettings).theme_primary) document.documentElement.style.setProperty("--accent-primary", (data as OrgSettings).theme_primary!);
      if ((data as OrgSettings).theme_accent) document.documentElement.style.setProperty("--gold", (data as OrgSettings).theme_accent!);
      document.title = `${(data as OrgSettings).organization_name ?? "NegoLinks"} | Cooperative ERP`;
    }
  }, []);

  const refreshNotifCount = useCallback(async () => {
    if (!session?.user) return;
    const { count } = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", session.user.id).eq("read", false);
    setNotifCount(count ?? 0);
  }, [session]);

  const loadFeatureFlags = useCallback(async () => {
    const { data } = await supabase.from("feature_flags").select("key,enabled");
    if (data) {
      const map: Record<string, boolean> = {};
      (data as Array<{key: string; enabled: boolean}>).forEach((f) => { map[f.key] = f.enabled; });
      setFeatureFlags(map);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_ev, sess) => setSession(sess));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) { setProfile(null); return; }
    supabase.from("profiles").select("*").eq("id", session.user.id).single().then(({ data }) => { if (data) setProfile(data as Profile); });
    refreshSettings();
    loadFeatureFlags();
    supabase.from("demo_data_control").select("is_active").eq("id", 1).single().then(({ data }) => setDemoMode(data?.is_active ?? false));
    refreshNotifCount();
    const timer = setInterval(refreshNotifCount, 30_000);
    return () => clearInterval(timer);
  }, [session, refreshSettings, loadFeatureFlags, refreshNotifCount]);

  const signOut = async () => { await supabase.auth.signOut(); setSession(null); setProfile(null); };

  return (
    <AppCtx.Provider value={{ session, user: session?.user ?? null, profile, settings, refreshSettings, role, isStaff, isAdmin, signOut, demoMode, notifCount, featureFlags, refreshNotifCount, theme, toggleTheme }}>
      {children}
    </AppCtx.Provider>
  );
}
