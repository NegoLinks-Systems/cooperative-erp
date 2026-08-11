import { useState, useEffect, useRef, type ReactNode, type FormEvent } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, PiggyBank, HandCoins, Scale, Landmark, TrendingUp,
  Award, Boxes, UserRound, MessageSquare, FileBarChart, ShieldCheck, Settings,
  Sparkles, Bell, Search, LogOut, ChevronLeft, ChevronRight, Menu, X, Cpu,
  Database, Zap, Activity, ToggleLeft, Sun, Moon,
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { askAI } from "@/lib/ai/client";
import { supabase } from "@/lib/core";
import { cls } from "./ui";

const NAV = [
  { group: "Operations", items: [
    { to: "/",             label: "Dashboard",         icon: LayoutDashboard },
    { to: "/members",      label: "Members",           icon: Users },
    { to: "/savings",      label: "Savings",           icon: PiggyBank },
    { to: "/loans",        label: "Loans",             icon: HandCoins },
  ]},
  { group: "Finance", items: [
    { to: "/finance",      label: "General Ledger",    icon: Landmark },
    { to: "/shares",       label: "Shares & Dividends",icon: Award },
    { to: "/investments",  label: "Investments",       icon: TrendingUp },
    { to: "/procurement",  label: "Procurement",       icon: Boxes },
  ]},
  { group: "Governance", gold: true, items: [
    { to: "/governance",   label: "Governance",        icon: Scale },
  ]},
  { group: "Administration", items: [
    { to: "/hr",           label: "Human Resources",   icon: UserRound },
    { to: "/communications",label: "Communications",   icon: MessageSquare },
    { to: "/reports",      label: "Reports",           icon: FileBarChart },
    { to: "/audit",        label: "Audit Trail",       icon: ShieldCheck },
    { to: "/ai",           label: "AI Assistance",     icon: Sparkles },
    { to: "/settings",     label: "Settings",          icon: Settings },
  ]},
];

// ─── Demo Mode Banner ──────────────────────────────────────────────────────────
function DemoBanner() {
  const { demoMode } = useApp();
  if (!demoMode) return null;
  return (
    <div className="demo-banner no-print">
      <Zap size={14} />
      DEMO MODE — Sample Data Loaded
    </div>
  );
}

// ─── Notification Center ───────────────────────────────────────────────────────
function NotificationCenter({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [notifications, setNotifications] = useState<Array<{id:string;title:string;body:string;type:string;read:boolean;created_at:string}>>([]);
  useEffect(() => {
    if (!open) return;
    supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => setNotifications(data ?? []));
  }, [open]);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((n) => n.map((x) => x.id === id ? { ...x, read: true } : x));
  };

  if (!open) return null;
  return (
    <div className="absolute right-0 top-12 w-80 z-50 glass-accent rounded-xl shadow-2xl overflow-hidden animate-slide-up">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--bg-border)]">
        <h3 className="font-bold text-sm">Notifications</h3>
        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">×</button>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="text-center py-8 text-sm text-[var(--text-muted)]">No notifications</p>
        ) : notifications.map((n) => (
          <div key={n.id} onClick={() => markRead(n.id)}
            className={cls("px-4 py-3 border-b border-[var(--bg-border)] cursor-pointer hover:bg-[var(--accent-glow)] transition-colors",
              !n.read && "bg-white/3")}>
            <div className="flex items-start gap-2">
              <div className={cls("w-2 h-2 rounded-full mt-1.5 shrink-0",
                n.type === "success" ? "bg-[var(--success)]" : n.type === "warning" ? "bg-[var(--warning)]" : n.type === "error" ? "bg-[var(--danger)]" : "bg-[var(--info)]")} />
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{n.title}</p>
                {n.body ? <p className="text-xs text-[var(--text-muted)] mt-0.5">{n.body}</p> : null}
                <p className="text-xs text-[var(--text-muted)] mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── AI Quick Panel ───────────────────────────────────────────────────────────
function AIQuickPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings } = useApp();
  const [input, setInput] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!input.trim() || busy) return;
    setBusy(true);
    try {
      const text = await askAI(input);
      setResponse(text);
    } catch {
      setResponse("AI Assistance is currently unavailable. Check Settings → AI Platform.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;
  return (
    <div className="absolute right-0 top-12 w-96 z-50 glass-accent rounded-xl shadow-2xl overflow-hidden animate-slide-up">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--bg-border)]">
        <div className="flex items-center gap-2">
          <Sparkles size={14} style={{ color: "var(--gold)" }} />
          <h3 className="font-bold text-sm gradient-text-gold">{settings.ai_assistant_name ?? "AI Assistance"}</h3>
        </div>
        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">×</button>
      </div>
      <div className="p-4 space-y-3">
        {response ? (
          <div className="p-3 rounded-lg text-sm text-[var(--text-primary)] leading-relaxed"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
            {response}
          </div>
        ) : (
          <p className="text-xs text-[var(--text-muted)]">Ask anything about your cooperative's operations.</p>
        )}
        <div className="flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask AI Assistance…"
            className="nl-input flex-1 text-sm" />
          <button onClick={send} disabled={busy || !input.trim()} className="btn-primary px-3 py-2 text-sm">
            {busy ? "…" : "Ask"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Search Command Palette ────────────────────────────────────────────────────
function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);

  const LINKS = [
    { label: "Dashboard", to: "/" }, { label: "Members", to: "/members" },
    { label: "Savings", to: "/savings" }, { label: "Loans", to: "/loans" },
    { label: "General Ledger", to: "/finance" }, { label: "Shares", to: "/shares" },
    { label: "Governance", to: "/governance" }, { label: "HR", to: "/hr" },
    { label: "Reports", to: "/reports" }, { label: "Settings", to: "/settings" },
    { label: "AI Assistance", to: "/ai" }, { label: "Audit Trail", to: "/audit" },
  ];
  const filtered = q ? LINKS.filter((l) => l.label.toLowerCase().includes(q.toLowerCase())) : LINKS;

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
      style={{ background: "rgba(0,0,0,0.7)" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="glass-accent rounded-xl w-full max-w-lg shadow-2xl animate-slide-up">
        <div className="flex items-center gap-3 p-4 border-b border-[var(--bg-border)]">
          <Search size={16} style={{ color: "var(--text-muted)" }} />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search modules…"
            className="flex-1 bg-transparent outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" />
          <kbd className="text-xs text-[var(--text-muted)] border border-[var(--bg-border)] rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <div className="p-2 max-h-72 overflow-y-auto">
          {filtered.map((l) => (
            <button key={l.to} onClick={() => { navigate(l.to); onClose(); }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-glow)] transition-colors">
              {l.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main AppShell ─────────────────────────────────────────────────────────────
export default function AppShell(): ReactNode {
  const { settings, profile, signOut, notifCount, theme, toggleTheme } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showNotif, setShowNotif] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setShowSearch(true); }
      if (e.key === "Escape") { setShowSearch(false); setShowAI(false); setShowNotif(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className={cls("flex items-center gap-3 p-4 border-b border-[var(--bg-border)]", collapsed && "justify-center")}>
        <img src="/assets/negolinks-logo.svg" alt="NegoLinks" className="w-8 h-8 shrink-0" />
        {!collapsed ? (
          <div>
            <p className="font-bold text-sm gradient-text-gold leading-tight">NegoLinks</p>
            <p className="text-xs text-[var(--text-muted)] leading-tight">Cooperative ERP</p>
          </div>
        ) : null}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2.5">
        {NAV.map((group) => (
          <div key={group.group}>
            {!collapsed ? (
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] px-3 pt-3 pb-1.5"
                style={{ color: group.gold ? "var(--gold)" : "var(--text-muted)" }}>
                {group.group}
              </p>
            ) : <div className="h-4" />}
            {group.items.map((item) => (
              <NavLink key={item.to} to={item.to}
                className={({ isActive }) => cls(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-medium transition-all",
                  isActive
                    ? "text-[var(--accent-light)] bg-[var(--accent-glow)] font-semibold"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-glow)]",
                  collapsed && "justify-center px-2"
                )}
                title={collapsed ? item.label : undefined}
                onClick={() => setMobileOpen(false)}>
                <item.icon size={17} className="shrink-0" />
                {!collapsed ? item.label : null}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className={cls("p-3 border-t border-[var(--bg-border)]", collapsed && "flex justify-center")}>
        {!collapsed ? (
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0"
              style={{ background: "linear-gradient(135deg, var(--accent-primary), var(--accent-deep))" }}>
              {(profile?.full_name ?? "U").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{profile?.full_name ?? "User"}</p>
              <p className="text-xs text-[var(--text-muted)] truncate capitalize">{profile?.role?.replace(/_/g, " ")}</p>
            </div>
            <button onClick={() => signOut()} title="Sign out" className="text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors p-1 rounded">
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button onClick={() => signOut()} title="Sign out" className="text-[var(--text-muted)] hover:text-[var(--danger)] p-2">
            <LogOut size={18} />
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      {/* Desktop Sidebar */}
      <aside className={cls(
        "hidden md:flex flex-col shrink-0 transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )} style={{ background: "var(--bg-surface)", borderRight: "1px solid var(--bg-border)" }}>
        <SidebarContent />
        <button onClick={() => setCollapsed(!collapsed)}
          className="absolute top-1/2 -right-3 w-6 h-6 rounded-full flex items-center justify-center text-[var(--text-primary)] shadow-lg z-10 hidden md:flex"
          style={{ background: "var(--accent-primary)", transform: "translateY(-50%)" }}>
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 flex flex-col z-50" style={{ background: "var(--bg-surface)", borderRight: "1px solid var(--bg-border)" }}>
            <SidebarContent />
          </aside>
        </div>
      ) : null}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="shrink-0 flex items-center gap-3 px-4 h-16 relative"
          style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--bg-border)" }}>
          <button className="md:hidden text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1"
            onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="flex-1">
            <p className="text-sm font-semibold text-[var(--text-secondary)] truncate">
              {settings.organization_name ?? "My Cooperative"}
            </p>
          </div>

          <div className="flex items-center gap-1">
            {/* Search */}
            <button onClick={() => setShowSearch(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-glow)] transition-colors"
              style={{ border: "1px solid var(--bg-border)" }}>
              <Search size={13} />
              <span className="hidden sm:block">Search</span>
              <kbd className="hidden sm:block text-[10px] border border-[var(--bg-border)] rounded px-1 py-0.5">⌘K</kbd>
            </button>

            {/* Theme toggle */}
            <button onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-[var(--accent-glow)] transition-colors"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
              {theme === "dark"
                ? <Sun  size={17} style={{ color: "var(--text-secondary)" }} />
                : <Moon size={17} style={{ color: "var(--text-secondary)" }} />}
            </button>

            {/* AI */}
            <div className="relative">
              <button onClick={() => { setShowAI(!showAI); setShowNotif(false); }}
                className="p-2 rounded-lg hover:bg-[var(--gold-glow)] transition-colors animate-pulse-glow"
                title="AI Assistance">
                <Sparkles size={18} style={{ color: "var(--gold)" }} />
              </button>
              <AIQuickPanel open={showAI} onClose={() => setShowAI(false)} />
            </div>

            {/* Notifications */}
            <div className="relative">
              <button onClick={() => { setShowNotif(!showNotif); setShowAI(false); }}
                className="relative p-2 rounded-lg hover:bg-white/5 transition-colors"
                title="Notifications">
                <Bell size={18} style={{ color: "var(--text-secondary)" }} />
                {(notifCount ?? 0) > 0 ? (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                    style={{ background: "var(--danger)" }}>
                    {notifCount}
                  </span>
                ) : null}
              </button>
              <NotificationCenter open={showNotif} onClose={() => setShowNotif(false)} />
            </div>
          </div>
        </header>

        <DemoBanner />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 animate-fade-in">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="shrink-0 px-6 py-3 text-center text-xs border-t border-[var(--bg-border)] no-print"
          style={{ color: "var(--text-muted)" }}>
          Powered by NegoLinks Enterprise Suite · © {new Date().getFullYear()} Nego Links Systems Ltd. All rights reserved.
        </footer>
      </div>

      <SearchPalette open={showSearch} onClose={() => setShowSearch(false)} />
    </div>
  );
}
