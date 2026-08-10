import { useTable } from "@/lib/core";
import { useApp } from "@/contexts/AppContext";
import { PageTitle, Card, Table, Td, Badge, Empty, Loading } from "@/components/negolinks/ui";

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
  profile?: { full_name?: string };
}

function tone(action: string): "success"|"danger"|"warning"|"info"|"neutral" {
  if (["create","insert","load_demo"].includes(action)) return "success";
  if (["delete","reject","delete_demo"].includes(action)) return "danger";
  if (["update","edit"].includes(action)) return "warning";
  if (["login","export"].includes(action)) return "info";
  return "neutral";
}

export default function AuditPage() {
  const { isAdmin } = useApp();
  const { data = [], isLoading } = useTable<AuditLog>("audit_logs", {
    select: "*, profile:profiles(full_name)",
    order: "created_at", asc: false,
  });

  if (!isAdmin) return <Empty title="Auditors and Admins only" hint="Audit Trail requires elevated access." />;
  if (isLoading) return <Loading text="Loading audit trail…" />;

  return (
    <div className="space-y-4">
      <PageTitle title="Audit Trail" sub={`${data.length} records — tamper-evident, read-only`} />
      <Card>
        {data.length === 0 ? (
          <Empty title="No audit records" hint="Actions will be recorded here automatically." />
        ) : (
          <Table headers={["When", "User", "Action", "Module", "Details"]}>
            {data.map((l) => (
              <tr key={l.id}>
                <Td className="text-xs text-[var(--text-muted)] whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</Td>
                <Td className="text-sm">{l.profile?.full_name ?? "System"}</Td>
                <Td><Badge tone={tone(l.action)}>{l.action.replace(/_/g, " ")}</Badge></Td>
                <Td><Badge tone="neutral">{l.entity}</Badge></Td>
                <Td className="text-xs text-[var(--text-muted)] max-w-xs truncate">
                  {l.detail ? JSON.stringify(l.detail).slice(0, 80) : "—"}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
