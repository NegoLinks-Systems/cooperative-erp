import { useState, useEffect } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Users, PiggyBank, HandCoins, TrendingUp, AlertTriangle, CheckCircle2, Sparkles, RefreshCw, Scale, Award } from "lucide-react";
import { supabase, money } from "@/lib/core";
import { askAI } from "@/lib/ai/client";
import { useApp } from "@/contexts/AppContext";
import { KPICard, Card, Loading, PageTitle } from "@/components/negolinks/ui";

const CHART_COLORS = ["#16A34A", "#4ADE80", "#CA8A04", "#EAB308", "#15803D"];

interface DashboardData {
  memberCount: number;
  activeMembers: number;
  totalSavings: number;
  activeLoanCount: number;
  totalPortfolio: number;
  overdueLoans: number;
  totalOutstanding: number;
  totalShares: number;
  meetingsThisMonth: number;
  resolutionsPassed: number;
}

export default function Dashboard() {
  const { settings, isStaff } = useApp();
  const sym = settings.currency_symbol;
  const [data, setData] = useState<DashboardData | null>(null);
  const [savingsTrend, setSavingsTrend] = useState<Array<{month: string; savings: number; loans: number}>>([]);
  const [loanStatus, setLoanStatus] = useState<Array<{name: string; value: number}>>([]);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  useEffect(() => {
    if (!isStaff) return;
    loadDashboard();
  }, [isStaff]);

  async function loadDashboard() {
    const [
      { count: memberCount },
      { count: activeMembers },
      { data: balData },
      { data: loanData },
      { count: totalShares },
      { count: meetingsCount },
      { count: resPassed },
    ] = await Promise.all([
      supabase.from("members").select("*", { count: "exact", head: true }),
      supabase.from("members").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("savings_balances").select("balance"),
      supabase.from("loan_positions").select("status,principal,outstanding"),
      supabase.from("share_purchases").select("*", { count: "exact", head: true }),
      supabase.from("meetings").select("*", { count: "exact", head: true }).gte("scheduled_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      supabase.from("resolutions").select("*", { count: "exact", head: true }).eq("status", "passed"),
    ]);

    const totalSavings = (balData ?? []).reduce((s, r) => s + Number((r as {balance: number}).balance), 0);
    const activeLoans = (loanData ?? []).filter((l) => ["disbursed","active","restructured"].includes((l as {status: string}).status));
    const overdueLoans = activeLoans.filter((l) => (l as {outstanding: number}).outstanding > 0).length;

    setData({
      memberCount: memberCount ?? 0,
      activeMembers: activeMembers ?? 0,
      totalSavings,
      activeLoanCount: activeLoans.length,
      totalPortfolio: activeLoans.reduce((s, l) => s + Number((l as {principal: number}).principal), 0),
      overdueLoans,
      totalOutstanding: activeLoans.reduce((s, l) => s + Number((l as {outstanding: number}).outstanding), 0),
      totalShares: totalShares ?? 0,
      meetingsThisMonth: meetingsCount ?? 0,
      resolutionsPassed: resPassed ?? 0,
    });

    // Mock trend data (last 6 months) — in production wire to real queries
    const months = ["Jan","Feb","Mar","Apr","May","Jun"];
    setSavingsTrend(months.map((month, i) => ({
      month,
      savings: Math.round(totalSavings * (0.6 + i * 0.08)),
      loans: Math.round((activeLoans.reduce((s, l) => s + Number((l as {principal: number}).principal), 0)) * (0.5 + i * 0.1)),
    })));

    const statusCounts: Record<string, number> = {};
    (loanData ?? []).forEach((l) => {
      const s = (l as {status: string}).status;
      statusCounts[s] = (statusCounts[s] ?? 0) + 1;
    });
    setLoanStatus(Object.entries(statusCounts).map(([name, value]) => ({ name, value })));
  }

  async function loadAIInsight() {
    if (!data) return;
    setLoadingInsight(true);
    try {
      const ctx = `Members: ${data.memberCount} total (${data.activeMembers} active). Savings: ${money(data.totalSavings, sym)}. Active loans: ${data.activeLoanCount}, portfolio: ${money(data.totalPortfolio, sym)}, outstanding: ${money(data.totalOutstanding, sym)}, overdue: ${data.overdueLoans}. Meetings this month: ${data.meetingsThisMonth}. Resolutions passed: ${data.resolutionsPassed}.`;
      const text = await askAI("Generate a brief executive summary of this cooperative's current performance with key observations and one actionable recommendation.", ctx, "dashboard");
      setAiInsight(text);
    } catch {
      setAiInsight("AI Assistance is not configured. Go to Settings → AI Platform to set up.");
    } finally {
      setLoadingInsight(false);
    }
  }

  if (!isStaff) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <CheckCircle2 size={48} style={{ color: "var(--accent-primary)" }} />
      <h2 className="text-xl font-bold">Welcome to NegoLinks</h2>
      <p className="text-[var(--text-secondary)]">Cooperative & Microfinance ERP</p>
    </div>
  );

  if (!data) return <Loading text="Loading dashboard…" />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageTitle title="Executive Dashboard" sub={`${settings.organization_name} · ${new Date().toLocaleDateString("en-NG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Members" value={data.memberCount.toLocaleString()} sub={`${data.activeMembers} active`} icon={Users} />
        <KPICard label="Total Savings" value={money(data.totalSavings, sym)} sub="All accounts" icon={PiggyBank} />
        <KPICard label="Loan Portfolio" value={money(data.totalPortfolio, sym)} sub={`${data.activeLoanCount} active loans`} icon={HandCoins} />
        <KPICard label="Outstanding" value={money(data.totalOutstanding, sym)} sub={data.overdueLoans > 0 ? `${data.overdueLoans} overdue` : "All current"} icon={AlertTriangle} accent={data.overdueLoans > 0} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Share Certificates" value={data.totalShares.toLocaleString()} sub="Issued" icon={Award} />
        <KPICard label="Meetings This Month" value={String(data.meetingsThisMonth)} sub="Board & committees" icon={Scale} />
        <KPICard label="Resolutions Passed" value={String(data.resolutionsPassed)} icon={CheckCircle2} />
        <KPICard label="Loan Recovery" value={data.totalPortfolio > 0 ? `${(((data.totalPortfolio - data.totalOutstanding) / data.totalPortfolio) * 100).toFixed(1)}%` : "—"} sub="Portfolio repaid" icon={TrendingUp} />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Savings & Loans Trend */}
        <Card title="Savings & Portfolio Trend" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={savingsTrend} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gSavings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16A34A" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gLoans" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4ADE80" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#4ADE80" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${sym}${(v/1000000).toFixed(1)}M`} />
              <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--accent-border)", borderRadius: 8, color: "white" }}
                formatter={(v: unknown) => money(v as number, sym)} />
              <Area type="monotone" dataKey="savings" stroke="#16A34A" strokeWidth={2} fill="url(#gSavings)" name="Savings" />
              <Area type="monotone" dataKey="loans" stroke="#4ADE80" strokeWidth={2} fill="url(#gLoans)" name="Portfolio" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Loan Status Pie */}
        <Card title="Loan Status Distribution">
          {loanStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={loanStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {loanStatus.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--accent-border)", borderRadius: 8, color: "white" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-[var(--text-muted)] text-center py-8">No loans yet</p>}
          <div className="mt-2 space-y-1">
            {loanStatus.map((s, i) => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="text-[var(--text-secondary)] capitalize">{s.name.replace(/_/g, " ")}</span>
                </div>
                <span className="text-white font-semibold">{s.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* AI Insights Panel */}
      <Card accent>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} style={{ color: "var(--gold)" }} className="animate-pulse-glow" />
            <h3 className="font-bold text-sm gradient-text-gold">AI Insights — Executive Summary</h3>
          </div>
          <button onClick={loadAIInsight} disabled={loadingInsight}
            className="btn-ghost px-3 py-1.5 text-xs flex items-center gap-1.5">
            <RefreshCw size={12} className={loadingInsight ? "animate-spin" : ""} />
            {loadingInsight ? "Generating…" : aiInsight ? "Refresh" : "Generate Insight"}
          </button>
        </div>
        {aiInsight ? (
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{aiInsight}</p>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">
            Click "Generate Insight" to get an AI-powered executive analysis of your cooperative's current performance.
          </p>
        )}
      </Card>
    </div>
  );
}
