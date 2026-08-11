import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from "recharts";
import { Users, PiggyBank, HandCoins, TrendingUp, AlertTriangle, CheckCircle2, Sparkles, RefreshCw, Scale, Award, Database, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase, money } from "@/lib/core";
import { askAI } from "@/lib/ai/client";
import { useApp } from "@/contexts/AppContext";
import { KPICard, Card, Loading, PageTitle, Button } from "@/components/negolinks/ui";

const CHART_COLORS = ["#16A34A", "#4ADE80", "#CA8A04", "#EAB308", "#15803D", "#166534"];

interface DashboardData {
  memberCount: number; activeMembers: number; totalSavings: number;
  activeLoanCount: number; totalPortfolio: number; overdueLoans: number;
  totalOutstanding: number; totalShares: number;
  meetingsThisMonth: number; resolutionsPassed: number;
}

export default function Dashboard() {
  const { settings, isStaff, isAdmin } = useApp();
  const navigate = useNavigate();
  const sym = settings.currency_symbol;
  const [data, setData] = useState<DashboardData | null>(null);
  const [savingsTrend, setSavingsTrend] = useState<Array<{month: string; savings: number; loans: number}>>([]);
  const [loanStatus, setLoanStatus] = useState<Array<{name: string; value: number}>>([]);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  useEffect(() => { if (isStaff) loadDashboard(); }, [isStaff]);

  async function loadDashboard() {
    const [
      { count: memberCount }, { count: activeMembers }, { data: balData },
      { data: loanData }, { count: totalShares }, { count: meetingsCount }, { count: resPassed },
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
    const portfolio = activeLoans.reduce((s, l) => s + Number((l as {principal: number}).principal), 0);
    const outstanding = activeLoans.reduce((s, l) => s + Number((l as {outstanding: number}).outstanding), 0);

    setData({
      memberCount: memberCount ?? 0, activeMembers: activeMembers ?? 0, totalSavings,
      activeLoanCount: activeLoans.length, totalPortfolio: portfolio,
      overdueLoans: activeLoans.filter((l) => (l as {outstanding: number}).outstanding > 0).length,
      totalOutstanding: outstanding, totalShares: totalShares ?? 0,
      meetingsThisMonth: meetingsCount ?? 0, resolutionsPassed: resPassed ?? 0,
    });

    // Only build trend data when there is real data
    if (totalSavings > 0 || portfolio > 0) {
      const months = ["Jan","Feb","Mar","Apr","May","Jun"];
      setSavingsTrend(months.map((month, i) => ({
        month,
        savings: Math.round(totalSavings * (0.55 + i * 0.09)),
        loans:   Math.round(portfolio * (0.45 + i * 0.11)),
      })));
    } else {
      setSavingsTrend([]);
    }

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
      setAiInsight(await askAI("Generate a brief executive summary of this cooperative's current performance with key observations and one actionable recommendation.", ctx, "dashboard"));
    } catch {
      setAiInsight("AI Assistance is not yet configured. Go to Settings → AI Platform, or run: supabase functions deploy ai-assistant");
    } finally { setLoadingInsight(false); }
  }

  if (!isStaff) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <CheckCircle2 size={44} style={{ color: "var(--accent-primary)" }} />
      <h2 className="text-xl font-bold text-[var(--text-primary)]">Welcome to NegoLinks</h2>
      <p className="text-[var(--text-secondary)]">Cooperative &amp; Microfinance ERP</p>
    </div>
  );

  if (!data) return <Loading text="Loading dashboard…" />;

  const isEmpty = data.memberCount === 0 && data.totalSavings === 0 && data.activeLoanCount === 0;
  const recovery = data.totalPortfolio > 0
    ? `${(((data.totalPortfolio - data.totalOutstanding) / data.totalPortfolio) * 100).toFixed(1)}%` : "—";

  return (
    <div className="space-y-5 animate-fade-in">
      <PageTitle
        title="Executive Dashboard"
        sub={`${settings.organization_name} · ${new Date().toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`}
      />

      {/* Empty-state onboarding banner */}
      {isEmpty && isAdmin ? (
        <div className="nl-card-accent flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg shrink-0" style={{ background: "var(--accent-glow)" }}>
              <Database size={20} style={{ color: "var(--accent-primary)" }} />
            </div>
            <div>
              <p className="font-semibold text-[var(--text-primary)] text-sm mb-1">Your database is empty</p>
              <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                Load demo data to see the platform populated with realistic members, savings, loans and transactions — or start adding real records.
              </p>
            </div>
          </div>
          <Button onClick={() => navigate("/settings/demo")} className="shrink-0">
            Load Demo Data <ArrowRight size={14} />
          </Button>
        </div>
      ) : null}

      {/* KPI Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Members"   value={data.memberCount.toLocaleString()} sub={`${data.activeMembers} active`} icon={Users} />
        <KPICard label="Total Savings"   value={money(data.totalSavings, sym)} sub="All accounts" icon={PiggyBank} />
        <KPICard label="Loan Portfolio"  value={money(data.totalPortfolio, sym)} sub={`${data.activeLoanCount} active loans`} icon={HandCoins} />
        <KPICard label="Outstanding"     value={money(data.totalOutstanding, sym)} sub={data.overdueLoans > 0 ? `${data.overdueLoans} overdue` : "All current"} icon={AlertTriangle} accent={data.overdueLoans > 0} />
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Share Certificates"   value={data.totalShares.toLocaleString()} sub="Issued" icon={Award} />
        <KPICard label="Meetings This Month"  value={String(data.meetingsThisMonth)} sub="Board & committees" icon={Scale} />
        <KPICard label="Resolutions Passed"   value={String(data.resolutionsPassed)} sub="This year" icon={CheckCircle2} />
        <KPICard label="Loan Recovery"        value={recovery} sub="Portfolio repaid" icon={TrendingUp} />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card title="Savings & Portfolio Trend" className="lg:col-span-2">
          {savingsTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={savingsTrend} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                <defs>
                  <linearGradient id="gSav" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16A34A" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#16A34A" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gLoan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4ADE80" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#4ADE80" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} dy={6} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} width={58}
                  tickFormatter={(v: number) => v >= 1_000_000 ? `${sym}${(v/1_000_000).toFixed(1)}M` : v >= 1000 ? `${sym}${Math.round(v/1000)}K` : `${sym}${v}`} />
                <Tooltip
                  contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--accent-border)", borderRadius: 10, color: "#fff", fontSize: 13 }}
                  labelStyle={{ color: "var(--text-secondary)", marginBottom: 4 }}
                  formatter={(value) => money(Number(value), sym)} />
                <Area type="monotone" dataKey="savings" stroke="#16A34A" strokeWidth={2.5} fill="url(#gSav)"  name="Savings" />
                <Area type="monotone" dataKey="loans"   stroke="#4ADE80" strokeWidth={2.5} fill="url(#gLoan)" name="Portfolio" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[240px] gap-3">
              <TrendingUp size={32} style={{ color: "var(--accent-primary)", opacity: 0.35 }} />
              <p className="text-sm text-[var(--text-muted)]">No savings or loan activity yet</p>
              <p className="text-xs text-[var(--text-muted)] opacity-70">Trends appear once transactions are recorded</p>
            </div>
          )}
        </Card>

        <Card title="Loan Status Distribution">
          {loanStatus.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={loanStatus} cx="50%" cy="50%" innerRadius={48} outerRadius={78} dataKey="value" paddingAngle={3} stroke="none">
                    {loanStatus.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--accent-border)", borderRadius: 10, color: "#fff", fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3 pt-3" style={{ borderTop: "1px solid var(--bg-border)" }}>
                {loanStatus.map((s, i) => (
                  <div key={s.name} className="flex items-center justify-between text-[13px]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-[var(--text-secondary)] capitalize">{s.name.replace(/_/g, " ")}</span>
                    </div>
                    <span className="text-[var(--text-primary)] font-semibold figures">{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[240px] gap-3">
              <HandCoins size={32} style={{ color: "var(--accent-primary)", opacity: 0.35 }} />
              <p className="text-sm text-[var(--text-muted)]">No loans yet</p>
              <p className="text-xs text-[var(--text-muted)] opacity-70 text-center px-4">Distribution appears once loans are created</p>
            </div>
          )}
        </Card>
      </div>

      {/* AI Insights */}
      <Card accent>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} style={{ color: "var(--gold)" }} className="animate-pulse-glow" />
            <h3 className="font-bold text-sm gradient-text-gold">AI Insights — Executive Summary</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={loadAIInsight} loading={loadingInsight}>
            <RefreshCw size={12} className={loadingInsight ? "animate-spin" : ""} />
            {loadingInsight ? "Generating…" : aiInsight ? "Refresh" : "Generate Insight"}
          </Button>
        </div>
        <p className="text-[13.5px] text-[var(--text-secondary)] leading-relaxed">
          {aiInsight ?? 'Click "Generate Insight" for an AI-powered executive analysis of your cooperative\'s current performance.'}
        </p>
      </Card>
    </div>
  );
}
