// @ts-nocheck
import { useState, type FormEvent } from "react";
import { useTable, useInsert, useUpdate, money, fmtDate, titleCase, type Row } from "@/lib/core";
import { useApp } from "@/contexts/AppContext";
import { Plus } from "lucide-react";
import { PageTitle, Card, Field, Input, Select, Textarea, Modal, Table, Td, Badge, Empty, Loading, ErrorText, Tabs, Button, StatCard, KPICard } from "@/components/negolinks/ui";

export default function Hr() {
  const { settings, isStaff, isAdmin } = useApp();
  const sym = settings.currency_symbol;
  const [tab, setTab] = useState("Employees");

  const { data: employees, isLoading } = useTable("employees", { order: "staff_number", asc: true });
  const { data: attendance } = useTable("attendance", { select: "*, employees(full_name, staff_number)", order: "day", asc: false });
  const { data: leave } = useTable("leave_requests", { select: "*, employees(full_name)" });
  const { data: reviews } = useTable("performance_reviews", { select: "*, employees(full_name)" });

  const insertEmployee = useInsert("employees");
  const insertAttendance = useInsert("attendance");
  const insertLeave = useInsert("leave_requests");
  const updateLeave = useUpdate("leave_requests");
  const insertReview = useInsert("performance_reviews");

  const [modal, setModal] = useState<"" | "employee" | "leave" | "review">("");
  const [eForm, setEForm] = useState<Row>({ full_name: "", position: "", phone: "", email: "", salary: "" });
  const [lForm, setLForm] = useState<Row>({ employee_id: "", leave_type: "annual", start_date: "", end_date: "", reason: "" });
  const [rForm, setRForm] = useState<Row>({ employee_id: "", period: "", score: 3, remarks: "" });

  if (isLoading) return <Loading />;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <PageTitle title="Human Resources" sub="Employees, attendance, leave and performance (payroll-ready)" action={
        isStaff ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setModal("leave")}><Plus size={15} /> Leave request</Button>
            <Button variant="ghost" onClick={() => setModal("review")}><Plus size={15} /> Review</Button>
            {isAdmin ? <Button onClick={() => setModal("employee")}><Plus size={16} /> Employee</Button> : null}
          </div>
        ) : undefined
      } />
      <Tabs tabs={["Employees", "Attendance", "Leave", "Performance"]} active={tab} onChange={setTab} />
      <div className="mt-4">
        {tab === "Employees" ? (
          <Card>
            {(employees ?? []).length === 0 ? <Empty title="No employees" hint="Add employees to run attendance and leave." /> : (
              <Table headers={["Staff №", "Name", "Position", "Salary", "Hired", "Status", ""]}>
                {(employees ?? []).map((e) => (
                  <tr key={e.id} className="border-b border-line">
                    <Td mono>{e.staff_number}</Td>
                    <Td className="font-medium">{e.full_name}</Td>
                    <Td>{e.position}</Td>
                    <Td mono right>{isAdmin && e.salary != null ? money(e.salary, sym) : "•••"}</Td>
                    <Td>{fmtDate(e.hired_on, settings.date_format)}</Td>
                    <Td><Badge tone={e.active ? "good" : "neutral"}>{e.active ? "Active" : "Exited"}</Badge></Td>
                    <Td>{isStaff ? (
                      <Button variant="ghost" onClick={() =>
                        insertAttendance.mutate({ employee_id: e.id, day: today, check_in: new Date().toTimeString().slice(0, 8), status: "present" },
                          { onError: (err) => alert(err.message.includes("duplicate") ? "Already checked in today." : err.message) })
                      }>Check in today</Button>
                    ) : null}</Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        ) : null}

        {tab === "Attendance" ? (
          <Card>
            {(attendance ?? []).length === 0 ? <Empty title="No attendance records" hint="Use “Check in today” on the Employees tab." /> : (
              <Table headers={["Date", "Employee", "Check-in", "Check-out", "Status"]}>
                {(attendance ?? []).map((a) => (
                  <tr key={a.id} className="border-b border-line">
                    <Td>{fmtDate(a.day, settings.date_format)}</Td>
                    <Td className="font-medium">{a.employees?.full_name}</Td>
                    <Td mono>{a.check_in ?? "—"}</Td>
                    <Td mono>{a.check_out ?? "—"}</Td>
                    <Td><Badge tone={a.status === "present" ? "good" : a.status === "leave" ? "info" : "bad"}>{titleCase(a.status)}</Badge></Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        ) : null}

        {tab === "Leave" ? (
          <Card>
            {(leave ?? []).length === 0 ? <Empty title="No leave requests" hint="Submit a leave request for an employee." /> : (
              <Table headers={["Employee", "Type", "From", "To", "Status", ""]}>
                {(leave ?? []).map((l) => (
                  <tr key={l.id} className="border-b border-line">
                    <Td className="font-medium">{l.employees?.full_name}</Td>
                    <Td>{titleCase(l.leave_type)}</Td>
                    <Td>{fmtDate(l.start_date, settings.date_format)}</Td>
                    <Td>{fmtDate(l.end_date, settings.date_format)}</Td>
                    <Td><Badge tone={l.status === "approved" ? "good" : l.status === "rejected" ? "bad" : "warn"}>{titleCase(l.status)}</Badge></Td>
                    <Td>{isAdmin && l.status === "pending" ? (
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => updateLeave.mutate({ id: l.id, values: { status: "approved" } })}>Approve</Button>
                        <Button variant="danger" onClick={() => updateLeave.mutate({ id: l.id, values: { status: "rejected" } })}>Reject</Button>
                      </div>
                    ) : null}</Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        ) : null}

        {tab === "Performance" ? (
          <Card>
            {(reviews ?? []).length === 0 ? <Empty title="No performance reviews" hint="Record periodic reviews with a 1–5 score." /> : (
              <Table headers={["Employee", "Period", "Score", "Remarks"]}>
                {(reviews ?? []).map((r) => (
                  <tr key={r.id} className="border-b border-line">
                    <Td className="font-medium">{r.employees?.full_name}</Td>
                    <Td>{r.period}</Td>
                    <Td><Badge tone={r.score >= 4 ? "good" : r.score >= 3 ? "warn" : "bad"}>{r.score}/5</Badge></Td>
                    <Td>{r.remarks ?? "—"}</Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        ) : null}
      </div>

      <Modal open={modal === "employee"} onClose={() => setModal("")} title="New employee">
        <form className="space-y-4" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          const staff_number = `EMP-${String((employees ?? []).length + 1).padStart(4, "0")}`;
          insertEmployee.mutate({ staff_number, full_name: eForm.full_name, position: eForm.position, phone: eForm.phone || null, email: eForm.email || null, salary: eForm.salary === "" ? null : Number(eForm.salary) }, { onSuccess: () => setModal("") });
        }}>
          <Field label="Full name"><Input required value={eForm.full_name} onChange={(e) => setEForm({ ...eForm, full_name: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Position"><Input required value={eForm.position} onChange={(e) => setEForm({ ...eForm, position: e.target.value })} /></Field>
            <Field label={`Salary (${sym}/month)`}><Input type="number" min="0" step="0.01" value={eForm.salary} onChange={(e) => setEForm({ ...eForm, salary: e.target.value })} /></Field>
            <Field label="Phone"><Input value={eForm.phone} onChange={(e) => setEForm({ ...eForm, phone: e.target.value })} /></Field>
            <Field label="Email"><Input type="email" value={eForm.email} onChange={(e) => setEForm({ ...eForm, email: e.target.value })} /></Field>
          </div>
          <Button type="submit" disabled={insertEmployee.isPending} className="w-full justify-center">Add employee</Button>
        </form>
      </Modal>

      <Modal open={modal === "leave"} onClose={() => setModal("")} title="Leave request">
        <form className="space-y-4" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          insertLeave.mutate({ ...lForm, reason: lForm.reason || null }, { onSuccess: () => setModal("") });
        }}>
          <Field label="Employee">
            <Select required value={lForm.employee_id} onChange={(e) => setLForm({ ...lForm, employee_id: e.target.value })}>
              <option value="">Select employee…</option>
              {(employees ?? []).map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Type">
              <Select value={lForm.leave_type} onChange={(e) => setLForm({ ...lForm, leave_type: e.target.value })}>
                <option value="annual">Annual</option><option value="sick">Sick</option><option value="maternity">Maternity</option>
                <option value="paternity">Paternity</option><option value="compassionate">Compassionate</option><option value="unpaid">Unpaid</option>
              </Select>
            </Field>
            <Field label="From"><Input required type="date" value={lForm.start_date} onChange={(e) => setLForm({ ...lForm, start_date: e.target.value })} /></Field>
            <Field label="To"><Input required type="date" value={lForm.end_date} onChange={(e) => setLForm({ ...lForm, end_date: e.target.value })} /></Field>
          </div>
          <Field label="Reason"><Textarea rows={2} value={lForm.reason} onChange={(e) => setLForm({ ...lForm, reason: e.target.value })} /></Field>
          <Button type="submit" disabled={insertLeave.isPending} className="w-full justify-center">Submit request</Button>
        </form>
      </Modal>

      <Modal open={modal === "review"} onClose={() => setModal("")} title="Performance review">
        <form className="space-y-4" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          insertReview.mutate({ ...rForm, score: Number(rForm.score), remarks: rForm.remarks || null }, { onSuccess: () => setModal("") });
        }}>
          <Field label="Employee">
            <Select required value={rForm.employee_id} onChange={(e) => setRForm({ ...rForm, employee_id: e.target.value })}>
              <option value="">Select employee…</option>
              {(employees ?? []).map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Period"><Input required placeholder="e.g. H1 2026" value={rForm.period} onChange={(e) => setRForm({ ...rForm, period: e.target.value })} /></Field>
            <Field label="Score (1–5)"><Input required type="number" min="1" max="5" value={rForm.score} onChange={(e) => setRForm({ ...rForm, score: e.target.value })} /></Field>
          </div>
          <Field label="Remarks"><Textarea rows={2} value={rForm.remarks} onChange={(e) => setRForm({ ...rForm, remarks: e.target.value })} /></Field>
          <Button type="submit" disabled={insertReview.isPending} className="w-full justify-center">Save review</Button>
        </form>
      </Modal>
    </div>
  );
}
