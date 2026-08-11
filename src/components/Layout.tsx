import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard, Users, PiggyBank, HandCoins, Scale, Landmark, TrendingUp,
  Award, Boxes, UserRound, MessageSquare, FileBarChart, ShieldCheck, Settings,
  Sparkles, Sun, Moon, LogOut, Menu,
} from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { cls } from "./ui";

const NAV = [
  { group: "Operations", items: [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/members", label: "Members", icon: Users },
    { to: "/savings", label: "Savings", icon: PiggyBank },
    { to: "/loans", label: "Loans", icon: HandCoins },
  ]},
  { group: "Finance", items: [
    { to: "/finance", label: "General Ledger", icon: Landmark },
    { to: "/shares", label: "Shares & Dividends", icon: Award },
    { to: "/investments", label: "Investments", icon: TrendingUp },
    { to: "/procurement", label: "Procurement & Assets", icon: Boxes },
  ]},
  { group: "Governance", brass: true, items: [
    { to: "/governance", label: "Governance", icon: Scale },
  ]},
  { group: "Administration", items: [
    { to: "/hr", label: "Human Resources", icon: UserRound },
    { to: "/communications", label: "Communications", icon: MessageSquare },
    { to: "/reports", label: "Reports", icon: FileBarChart },
    { to: "/audit", label: "Audit Trail", icon: ShieldCheck },
    { to: "/assistant", label: "Assistant", icon: Sparkles },
    { to: "/settings", label: "Settings", icon: Settings },
  ]},
];

export default function Layout() {
  const { settings, profile, role, dark, toggleDark, signOut, isStaff } = useApp();
  const [open, setOpen] = useState(false);

  const nav = NAV.map((g) =>
    g.group === "Administration" && !isStaff
      ? { ...g, items: g.items.filter((i) => ["/assistant"].includes(i.to)) }
      : g
  );

  return (
    <div className="flex min-h-screen">
      <aside className={cls(
        "fixed inset-y-0 left-0 z-40 w-64 shrink-0 border-r border-line bg-panel transition-transform lg:static lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          {settings.logo_url
            ? <img src={settings.logo_url} alt="" className="h-9 w-9 rounded-lg object-contain" />
            : <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">{settings.application_name.slice(0, 1)}</div>}
          <div className="min-w-0">
            <p className="display truncate text-sm font-semibold leading-tight">{settings.application_name}</p>
            <p className="truncate text-xs text-ink-soft">{settings.organization_name}</p>
          </div>
        </div>
        <nav className="space-y-5 overflow-y-auto p-4" style={{ maxHeight: "calc(100vh - 73px)" }}>
          {nav.map((g) => (
            <div key={g.group}>
              <p className={cls("px-2 pb-1 text-[11px] font-bold uppercase tracking-widest", g.brass ? "text-brass" : "text-ink-soft")}>{g.group}</p>
              <div className={cls(g.brass && "border-l-2 border-brass pl-1")}>
                {g.items.map(({ to, label, icon: Icon }) => (
                  <NavLink key={to} to={to} end={to === "/"} onClick={() => setOpen(false)}
                    className={({ isActive }) => cls(
                      "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium",
                      isActive ? "bg-primary-soft text-primary" : "text-ink-soft hover:bg-primary-soft hover:text-ink"
                    )}>
                    <Icon size={17} /> {label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      {open ? <div className="fixed inset-0 z-30 bg-ink/30 lg:hidden" onClick={() => setOpen(false)} /> : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="topbar flex items-center justify-between border-b border-line bg-panel px-4 py-2.5">
          <button className="rounded p-1.5 text-ink-soft lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <div className="hidden text-sm text-ink-soft lg:block">{settings.organization_name}</div>
          <div className="flex items-center gap-2">
            <button onClick={toggleDark} aria-label="Toggle dark mode" className="rounded-lg border border-line p-2 text-ink-soft hover:text-ink">
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div className="rounded-lg border border-line px-3 py-1.5 text-right">
              <p className="text-sm font-semibold leading-tight">{profile?.full_name ?? "—"}</p>
              <p className="text-[11px] uppercase tracking-wide text-ink-soft">{role.replace(/_/g, " ")}</p>
            </div>
            <button onClick={signOut} aria-label="Sign out" className="rounded-lg border border-line p-2 text-ink-soft hover:text-bad"><LogOut size={16} /></button>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6"><Outlet /></main>
      </div>
    </div>
  );
}

export function PageTitle({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="display text-2xl font-semibold">{title}</h1>
        {sub ? <p className="mt-0.5 text-sm text-ink-soft">{sub}</p> : null}
      </div>
      {action}
    </div>
  );
}
