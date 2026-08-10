import { createClient } from "@supabase/supabase-js";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const SUPA_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
export const supabase = createClient(SUPA_URL, SUPA_KEY);

export type Row = Record<string, unknown>;

export function money(v: unknown, sym = "₦"): string {
  const n = Number(v ?? 0);
  return `${sym}${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtDate(v: unknown, fmt = "DD/MM/YYYY"): string {
  if (!v) return "—";
  const d = new Date(v as string);
  if (isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  if (fmt === "MM/DD/YYYY") return `${mm}/${dd}/${yyyy}`;
  if (fmt === "YYYY-MM-DD") return `${yyyy}-${mm}-${dd}`;
  return `${dd}/${mm}/${yyyy}`;
}

export function titleCase(s: string): string {
  return (s ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function useTable<T = Row>(table: string, opts: { select?: string; order?: string; asc?: boolean; filter?: (q: ReturnType<typeof supabase.from>) => unknown } = {}) {
  return useQuery<T[]>({
    queryKey: [table, opts],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = supabase.from(table).select(opts.select ?? "*");
      if (opts.filter) q = opts.filter(q);
      if (opts.order) q = q.order(opts.order, { ascending: opts.asc ?? true });
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as T[];
    },
  });
}

export function useInsert(table: string, invalidate?: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Row) => {
      const { data, error } = await supabase.from(table).insert(values).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { [table, ...(invalidate ?? [])].forEach((t) => qc.invalidateQueries({ queryKey: [t] })); },
  });
}

export function useUpdate(table: string, invalidate?: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: unknown; values: Row }) => {
      const { data, error } = await supabase.from(table).update(values).eq("id", id as string).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { [table, ...(invalidate ?? [])].forEach((t) => qc.invalidateQueries({ queryKey: [t] })); },
  });
}

export function useRpc(fn: string, invalidate?: string[]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: Row) => {
      const { data, error } = await supabase.rpc(fn, args);
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { (invalidate ?? []).forEach((t) => qc.invalidateQueries({ queryKey: [t] })); },
  });
}

export async function rpc<T = unknown>(fn: string, args: Row = {}): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export function downloadCsv(filename: string, rows: Row[]): void {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]!);
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export const STAFF_ROLES = ["super_admin","org_owner","managing_director","general_manager","branch_manager","loan_officer","teller","savings_officer","accounts_officer","accountant","finance_officer","hr_officer","it_officer","compliance_officer","board_chairman","board_member"];
export const ALL_ROLES   = [...STAFF_ROLES, "member"];
