import { useState, useEffect, useRef, type ReactNode } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, PiggyBank, HandCoins, Scale, Landmark, TrendingUp,
  Award, Boxes, UserRound, MessageSquare, FileBarChart, ShieldCheck, Settings,
  Sparkles, Bell, Search, LogOut, ChevronsLeft, ChevronsRight, Menu, X,
  Zap, Sun, Moon, Send,
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { askAI } from "@/lib/ai/client";
import { supabase } from "@/lib/core";
import { cls, Badge } from "./ui";

const NAV = [
  { group: "Operations", items: [
    { to: "/",              label: "Dashboard",      icon: LayoutDashboard },
    { to: "/members",       label: "Members",        icon: Users },
    { to: "/savings",       label: "Savings",        icon: PiggyBank },
    { to: "/loans",         label: "Loans",          icon: HandCoins },
  ]},
  { group: "Finance", items: [
    { to: "/finance",       label: "General Ledger", icon: Landmark },
    { to: "/shares",        label: "Shares",         icon: Award },
    { to: "/investments",   label: "Investments",    icon: TrendingUp },
    { to: "/procurement",   label: "Procurement",    icon: Boxes },
  ]},
  { group: "Governance", items: [
    { to: "/governance",    label: "Governance",     icon: Scale },
  ]},
  { group: "Administration", items: [
    { to: "/hr",            label: "Human Resources",icon: UserRound },
    { to: "/communications",label: "Communications", icon: MessageSquare },
    { to: "/reports",       label: "Reports",        icon: FileBarChart },
    { to: "/audit",         label: "Audit Trail",    icon: ShieldCheck },
    { to: "/ai",            label: "AI Assistance",  icon: Sparkles },
    { to: "/settings",      label: "Settings",       icon: Settings },
  ]},
];

const ALL_LINKS = NAV.flatMap((g) => g.items.map((i) => ({ ...i, group: g.group })));

/* ── Notifications ─────────────────────────────────────── */
interface Notif { id: string; title: string; body: string; type: string; read: boolean; created_at: string }

function NotificationPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { refreshNotifCount } = useApp();
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(15)
      .then(({ data }) => { setItems((data ?? []) as Notif[]); setLoading(false); });
  }, [open]);

  const markAll = async () => {
    await supabase.from("notifications").update({ read: true }).eq("read", false);
    setItems((n) => n.map((x) => ({ ...x, read: true })));
    refreshNotifCount();
  };

  if (!open) return null;
  const dotColor = (t: string) =>
    t === "success" ? "var(--success)" : t === "warning" ? "var(--warning)" : t === "error" ? "var(--danger)" : "var(--info)";

  return (
    <div className="absolute right-0 top-11 w-[330px] z-50 rounded-xl overflow-hidden animate-slide-up"
      style={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", boxShadow: "var(--sh-lg)" }}>
      <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid var(--bg-border-lo)" }}>
        <h3 className="t-h2">Notifications</h3>
        {items.some((i) => !i.read) ? (
          <button onClick={markAll} className="t-micro hover:underline" style={{ color: "var(--accent-light)" }}>
            Mark all read
          </button>
        ) : null}
      </div>
      <div className="max-h-[340px] overflow-y-auto">
        {loading ? (
          <p className="t-micro text-center py-8">Loading…</p>
        ) : items.length === 0 ? (
          <p className="t-micro text-center py-10">You're all caught up</p>
        ) : items.map((n) => (
          <div key={n.id} className="flex gap-2.5 px-4 py-3 transition-colors hover:bg-[var(--bg-hover)]"
            style={{ borderBottom: "1px solid var(--bg-border-lo)" }}>
            <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
              style={{ background: n.read ? "var(--text-faint)" : dotColor(n.type) }} />
            <div className="min-w-0">
              <p style={{ fontSize: "var(--fs-data)", fontWeight: n.read ? 450 : 580, color: "var(--text-primary)" }}>
                {n.title}
              </p>
              {n.body ? <p className="t-micro mt-0.5 leading-snug">{n.body}</p> : null}
              <p className="t-micro mt-1" style={{ color: "var(--text-faint)" }}>
                {new Date(n.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── AI quick panel ────────────────────────────────────── */
function AIPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings } = useApp();
  const [input, setInput] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const name = settings.ai_assistant_name || "AI Assistance";

  const send = async () => {
    if (!input.trim() || busy) return;
    setBusy(true);
    try { setReply(await askAI(input)); }
    catch { setReply("AI Assistance isn't configured yet. Set it up in Settings → AI Platform."); }
    finally { setBusy(false); }
  };

  if (!open) return null;
  return (
    <div className="absolute right-0 top-11 w-[370px] z-50 rounded-xl overflow-hidden animate-slide-up"
      style={{ background: "var(--bg-card)", border: "1px solid var(--bg-border)", boxShadow: "var(--sh-lg)" }}>
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: "1px solid var(--bg-border-lo)" }}>
        <Sparkles size={13} style={{ color: "var(--gold)" }} />
        <h3 className="t-h2" style={{ color: "var(--gold)" }}>{name}</h3>
      </div>
      <div className="p-3.5 space-y-2.5">
        {reply ? (
          <div className="px-3 py-2.5 rounded-lg max-h-52 overflow-y-auto"
            style={{ background: "var(--bg-raised)", fontSize: "var(--fs-data)", lineHeight: "19px", color: "var(--text-secondary)" }}>
            {reply}
          </div>
        ) : (
          <p className="t-micro">Ask about members, savings, loans or governance.</p>
        )}
        <div className="flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask a question…" className="nl-input" />
          <button onClick={send} disabled={busy || !input.trim()}
            className="btn-primary h-8 w-8 shrink-0 flex items-center justify-center disabled:opacity-40">
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Command palette ───────────────────────────────────── */
function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) { setQ(""); setTimeout(() => ref.current?.focus(), 40); } }, [open]);

  const results = q
    ? ALL_LINKS.filter((l) => l.label.toLowerCase().includes(q.toLowerCase()) || l.group.toLowerCase().includes(q.toLowerCase()))
    : ALL_LINKS;

  if (!open) return null;
  return (
    <div className="nl-modal-backdrop !items-start !pt-[12vh]" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="nl-modal" style={{ maxWidth: 480 }}>
        <div className="flex items-center gap-2.5 px-4 py-3" style={{ borderBottom: "1px solid var(--bg-border-lo)" }}>
          <Search size={15} style={{ color: "var(--text-muted)" }} />
          <input ref={ref} value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Jump to…"
            className="flex-1 bg-transparent outline-none"
            style={{ fontSize: "var(--fs-body)", color: "var(--text-primary)" }} />
          <kbd className="t-micro px-1.5 py-0.5 rounded" style={{ border: "1px solid var(--bg-border)" }}>esc</kbd>
        </div>
        <div className="py-1.5 max-h-[46vh] overflow-y-auto">
          {results.length === 0 ? (
            <p className="t-micro text-center py-8">No matches</p>
          ) : results.map((l) => (
            <button key={l.to} onClick={() => { navigate(l.to); onClose(); }}
              className="w-full flex items-center gap-2.5 px-4 py-2 transition-colors hover:bg-[var(--bg-hover)]"
              style={{ fontSize: "var(--fs-data)", color: "var(--text-secondary)" }}>
              <l.icon size={15} style={{ color: "var(--text-faint)" }} />
              <span style={{ color: "var(--text-primary)" }}>{l.label}</span>
              <span className="t-micro ml-auto" style={{ color: "var(--text-faint)" }}>{l.group}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Shell ─────────────────────────────────────────────── */
export default function AppShell(): ReactNode {
  const { settings, profile, signOut, notifCount, demoMode, theme, toggleTheme } = useApp();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [palette, setPalette]   = useState(false);
  const [aiOpen, setAiOpen]     = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => { setMobileNav(false); setAiOpen(false); setNotifOpen(false); }, [location.pathname]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette(true); }
      if (e.key === "Escape") { setPalette(false); setAiOpen(false); setNotifOpen(false); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const currentLabel = ALL_LINKS.find((l) => l.to === location.pathname)?.label
    ?? (location.pathname.startsWith("/settings") ? "Settings" : "");

  const Nav = ({ mini }: { mini: boolean }) => (
    <>
      <div className={cls("flex items-center gap-2.5 h-14 shrink-0", mini ? "justify-center px-2" : "px-4")}
        style={{ borderBottom: "1px solid var(--bg-border-lo)" }}>
        <img src="/assets/negolinks-logo.svg" alt="" className="w-6 h-6 shrink-0" />
        {!mini ? (
          <div className="min-w-0 leading-tight">
            <p className="text-[13px] font-bold tracking-tight" style={{ color: "var(--gold)" }}>NegoLinks</p>
            <p className="text-[10.5px]" style={{ color: "var(--text-faint)" }}>Cooperative ERP</p>
          </div>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 pb-3">
        {NAV.map((group) => (
          <div key={group.group}>
            {!mini ? <p className="nl-nav-group">{group.group}</p> : <div className="h-3" />}
            {group.items.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === "/"}
                title={mini ? item.label : undefined}
                className={({ isActive }) => cls("nl-nav-item", isActive && "nl-nav-item--active", mini && "justify-center !px-0")}>
                <item.icon size={16} strokeWidth={1.9} className="shrink-0" />
                {!mini ? <span className="truncate">{item.label}</span> : null}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className={cls("shrink-0 py-2.5", mini ? "px-2" : "px-3")} style={{ borderTop: "1px solid var(--bg-border-lo)" }}>
        {!mini ? (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold text-white"
              style={{ background: "var(--accent-primary)" }}>
              {(profile?.full_name ?? "U").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0 leading-tight">
              <p className="text-[12.5px] font-medium truncate" style={{ color: "var(--text-primary)" }}>
                {profile?.full_name ?? "User"}
              </p>
              <p className="text-[10.5px] truncate capitalize" style={{ color: "var(--text-faint)" }}>
                {profile?.role?.replace(/_/g, " ")}
              </p>
            </div>
            <button onClick={signOut} title="Sign out"
              className="p-1.5 rounded-md transition-colors hover:bg-[var(--bg-hover)]"
              style={{ color: "var(--text-muted)" }}>
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button onClick={signOut} title="Sign out"
            className="w-full flex justify-center p-1.5 rounded-md hover:bg-[var(--bg-hover)]"
            style={{ color: "var(--text-muted)" }}>
            <LogOut size={15} />
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      {/* Desktop sidebar */}
      <aside className={cls("hidden md:flex flex-col shrink-0 transition-[width] duration-200", collapsed ? "w-[60px]" : "w-[212px]")}
        style={{ background: "var(--bg-surface)", borderRight: "1px solid var(--bg-border-lo)" }}>
        <Nav mini={collapsed} />
      </aside>

      {/* Mobile drawer */}
      {mobileNav ? (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0" style={{ background: "rgba(6,6,12,0.6)" }} onClick={() => setMobileNav(false)} />
          <aside className="relative w-[212px] flex flex-col z-10 animate-slide-up"
            style={{ background: "var(--bg-surface)", borderRight: "1px solid var(--bg-border)" }}>
            <Nav mini={false} />
          </aside>
        </div>
      ) : null}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="shrink-0 flex items-center gap-2 h-14 px-3 sm:px-4 relative"
          style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--bg-border-lo)" }}>
          <button className="md:hidden p-1.5 rounded-md hover:bg-[var(--bg-hover)]"
            style={{ color: "var(--text-secondary)" }} onClick={() => setMobileNav(true)}>
            <Menu size={17} />
          </button>

          <button onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex p-1.5 rounded-md hover:bg-[var(--bg-hover)] transition-colors"
            style={{ color: "var(--text-muted)" }}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {collapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="t-micro truncate hidden sm:inline">{settings.organization_name}</span>
            {currentLabel ? (
              <>
                <span className="hidden sm:inline" style={{ color: "var(--text-faint)" }}>/</span>
                <span className="truncate" style={{ fontSize: "var(--fs-data)", fontWeight: 550, color: "var(--text-primary)" }}>
                  {currentLabel}
                </span>
              </>
            ) : null}
            {demoMode ? <span className="ml-1.5 hidden sm:inline"><Badge tone="warning">Demo</Badge></span> : null}
          </div>

          <div className="flex items-center gap-0.5">
            <button onClick={() => setPalette(true)}
              className="flex items-center gap-2 h-8 px-2.5 rounded-md transition-colors hover:bg-[var(--bg-hover)]"
              style={{ border: "1px solid var(--bg-border)", color: "var(--text-muted)" }}>
              <Search size={13} />
              <span className="t-micro hidden lg:inline">Search</span>
              <kbd className="t-micro hidden lg:inline px-1 rounded" style={{ border: "1px solid var(--bg-border)" }}>⌘K</kbd>
            </button>

            <button onClick={toggleTheme} title={theme === "dark" ? "Light mode" : "Dark mode"}
              className="p-2 rounded-md transition-colors hover:bg-[var(--bg-hover)]"
              style={{ color: "var(--text-muted)" }}>
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <div className="relative">
              <button onClick={() => { setAiOpen(!aiOpen); setNotifOpen(false); }} title="AI Assistance"
                className="p-2 rounded-md transition-colors hover:bg-[var(--gold-glow)]">
                <Sparkles size={16} style={{ color: "var(--gold)" }} />
              </button>
              <AIPanel open={aiOpen} onClose={() => setAiOpen(false)} />
            </div>

            <div className="relative">
              <button onClick={() => { setNotifOpen(!notifOpen); setAiOpen(false); }} title="Notifications"
                className="relative p-2 rounded-md transition-colors hover:bg-[var(--bg-hover)]"
                style={{ color: "var(--text-muted)" }}>
                <Bell size={16} />
                {notifCount > 0 ? (
                  <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-1 rounded-full text-[9.5px] font-bold flex items-center justify-center text-white"
                    style={{ background: "var(--danger)" }}>
                    {notifCount > 9 ? "9+" : notifCount}
                  </span>
                ) : null}
              </button>
              <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
            </div>
          </div>
        </header>

        {demoMode ? (
          <div className="demo-banner no-print shrink-0">
            <Zap size={12} />
            Demo mode — sample data is loaded. Remove it in Settings → Demo Data.
          </div>
        ) : null}

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 animate-fade-in">
          <div className="mx-auto w-full max-w-[1500px]"><Outlet /></div>
        </main>

        <footer className="shrink-0 px-6 py-2.5 text-center no-print"
          style={{ borderTop: "1px solid var(--bg-border-lo)", fontSize: "10.5px", color: "var(--text-faint)" }}>
          Powered by NegoLinks Enterprise Suite · © {new Date().getFullYear()} Nego Links Systems Ltd.
        </footer>
      </div>

      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}
