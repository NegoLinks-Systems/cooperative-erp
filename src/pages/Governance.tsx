// @ts-nocheck
import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTable, useInsert, useUpdate, useRpc, rpc, fmtDate, titleCase, type Row } from "@/lib/core";
import { useApp } from "@/contexts/AppContext";
import { Plus, Gavel } from "lucide-react";
import { PageTitle, Card, Field, Input, Select, Textarea, Modal, Table, Td, Badge, Empty, Loading, ErrorText, Tabs, Button, StatCard, KPICard } from "@/components/negolinks/ui";

const MEETING_TONE: Record<string, "good" | "warn" | "neutral" | "bad" | "info"> = {
  scheduled: "info", in_progress: "warn", concluded: "good", cancelled: "bad",
};
const RES_TONE: Record<string, "good" | "warn" | "neutral" | "bad" | "brass" | "info"> = {
  proposed: "neutral", open_for_voting: "warn", passed: "good", failed: "bad", withdrawn: "neutral",
};

export default function Governance() {
  const [tab, setTab] = useState("Meetings");
  return (
    <div>
      <PageTitle title="Cooperative Governance" sub="Board meetings, AGMs, resolutions, elections, committees and policies" />
      <Tabs tabs={["Meetings", "Resolutions", "Elections", "Committees", "Policies"]} active={tab} onChange={setTab} />
      <div className="mt-4">
        {tab === "Meetings" ? <Meetings /> : null}
        {tab === "Resolutions" ? <Resolutions /> : null}
        {tab === "Elections" ? <Elections /> : null}
        {tab === "Committees" ? <Committees /> : null}
        {tab === "Policies" ? <Policies /> : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Meetings
// ---------------------------------------------------------------------------
function Meetings() {
  const { settings, isStaff } = useApp();
  const { data: meetings, isLoading } = useTable("meetings", { order: "scheduled_at", asc: false });
  const { data: committees } = useTable("committees", { order: "name", asc: true });
  const insert = useInsert("meetings");
  const [showNew, setShowNew] = useState(false);
  const [detail, setDetail] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Row>({ kind: "board", title: "", scheduled_at: "", venue: "", quorum_required: 0, committee_id: "" });

  if (isLoading) return <Loading />;

  return (
    <>
      <Card>
        {isStaff ? <div className="mb-4"><Button onClick={() => setShowNew(true)}><Plus size={16} /> Schedule meeting</Button></div> : null}
        {(meetings ?? []).length === 0 ? <Empty title="No meetings" hint="Schedule a board meeting, AGM or committee sitting." /> : (
          <Table headers={["№", "Meeting", "Type", "Date", "Venue", "Status", "Minutes", ""]}>
            {(meetings ?? []).map((m) => (
              <tr key={m.id} className="border-b border-line">
                <Td mono>{m.meeting_no}</Td>
                <Td className="font-medium">{m.title}</Td>
                <Td><Badge tone={m.kind === "agm" || m.kind === "egm" ? "brass" : "neutral"}>{m.kind.toUpperCase()}</Badge></Td>
                <Td>{fmtDate(m.scheduled_at, settings.date_format)}</Td>
                <Td>{m.venue ?? "—"}</Td>
                <Td><Badge tone={MEETING_TONE[m.status] ?? "neutral"}>{titleCase(m.status)}</Badge></Td>
                <Td>{m.minutes_approved ? <Badge tone="good">Approved</Badge> : m.minutes ? <Badge tone="warn">Draft</Badge> : <span className="text-ink-soft">—</span>}</Td>
                <Td><Button variant="ghost" onClick={() => setDetail(m)}>Open</Button></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Schedule meeting">
        <form className="space-y-4" onSubmit={async (e: FormEvent) => {
          e.preventDefault(); setError(null);
          try {
            const meeting_no = await rpc<string>("next_doc_number", { p_prefix: "MTG", p_table: "meetings" });
            await insert.mutateAsync({
              meeting_no, kind: form.kind, title: form.title, scheduled_at: form.scheduled_at,
              venue: form.venue || null, quorum_required: Number(form.quorum_required || 0),
              committee_id: form.committee_id || null,
            });
            setShowNew(false);
          } catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
        }}>
          <Field label="Meeting type">
            <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              <option value="board">Board meeting</option><option value="agm">Annual General Meeting</option>
              <option value="egm">Extraordinary General Meeting</option><option value="committee">Committee meeting</option>
              <option value="management">Management meeting</option>
            </Select>
          </Field>
          {form.kind === "committee" ? (
            <Field label="Committee">
              <Select value={form.committee_id} onChange={(e) => setForm({ ...form, committee_id: e.target.value })}>
                <option value="">Select committee…</option>
                {(committees ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
          ) : null}
          <Field label="Title"><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date & time"><Input required type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} /></Field>
            <Field label="Quorum required" hint="0 = no quorum rule"><Input type="number" min="0" value={form.quorum_required} onChange={(e) => setForm({ ...form, quorum_required: e.target.value })} /></Field>
          </div>
          <Field label="Venue"><Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></Field>
          <ErrorText error={error} />
          <Button type="submit" disabled={insert.isPending} className="w-full justify-center">Schedule</Button>
        </form>
      </Modal>

      {detail ? <MeetingDetail meeting={detail} onClose={() => setDetail(null)} /> : null}
    </>
  );
}

function MeetingDetail({ meeting, onClose }: { meeting: Row; onClose: () => void }) {
  const { settings, isStaff } = useApp();
  const qc = useQueryClient();
  const { data: agenda } = useTable("meeting_agenda", { order: "position", asc: true, filter: (q) => q.eq("meeting_id", meeting.id) });
  const { data: attendance } = useTable("meeting_attendance", { select: "*, members(full_name, member_number)", order: "recorded_at", asc: true, filter: (q) => q.eq("meeting_id", meeting.id) });
  const { data: quorum } = useTable("meeting_quorum", { order: "meeting_id", asc: true, filter: (q) => q.eq("meeting_id", meeting.id) });
  const { data: members } = useTable("members", { order: "full_name", asc: true, filter: (q) => q.eq("status", "active") });
  const insertAgenda = useInsert("meeting_agenda");
  const insertAttendance = useInsert("meeting_attendance");
  const update = useUpdate("meetings");
  const [agendaItem, setAgendaItem] = useState("");
  const [presenter, setPresenter] = useState("");
  const [attendee, setAttendee] = useState("");
  const [minutes, setMinutes] = useState(meeting.minutes ?? "");
  const q = (quorum ?? [])[0];

  return (
    <Modal open onClose={onClose} title={`${meeting.meeting_no} — ${meeting.title}`} wide>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Badge tone={meeting.kind === "agm" || meeting.kind === "egm" ? "brass" : "neutral"}>{meeting.kind.toUpperCase()}</Badge>
        <Badge tone={MEETING_TONE[meeting.status] ?? "neutral"}>{titleCase(meeting.status)}</Badge>
        <span>{fmtDate(meeting.scheduled_at, settings.date_format)} · {meeting.venue ?? "venue TBC"}</span>
        {q ? (
          <span className={q.quorum_met ? "text-good" : "text-bad"}>
            Quorum: {q.attendees}/{meeting.quorum_required || "—"} {q.quorum_met ? "✓ met" : "not met"}
          </span>
        ) : null}
      </div>

      {isStaff ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {["scheduled", "in_progress", "concluded", "cancelled"].map((s) => (
            <Button key={s} variant={meeting.status === s ? "primary" : "ghost"} onClick={() => { update.mutate({ id: meeting.id, values: { status: s } }); onClose(); }}>
              {titleCase(s)}
            </Button>
          ))}
        </div>
      ) : null}

      <h3 className="display mt-5 border-t border-line pt-4 text-sm font-semibold">Agenda</h3>
      {(agenda ?? []).length === 0 ? <p className="mt-1 text-sm text-ink-soft">No agenda items yet.</p> : (
        <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">
          {(agenda ?? []).map((a) => <li key={a.id}>{a.item}{a.presenter ? <span className="text-ink-soft"> — {a.presenter}</span> : null}</li>)}
        </ol>
      )}
      {isStaff ? (
        <form className="mt-2 flex flex-wrap gap-2" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          insertAgenda.mutate({ meeting_id: meeting.id, position: (agenda ?? []).length + 1, item: agendaItem, presenter: presenter || null });
          setAgendaItem(""); setPresenter("");
        }}>
          <Input required placeholder="Agenda item" value={agendaItem} onChange={(e) => setAgendaItem(e.target.value)} className="max-w-xs" />
          <Input placeholder="Presenter" value={presenter} onChange={(e) => setPresenter(e.target.value)} className="max-w-[160px]" />
          <Button type="submit" variant="ghost">Add</Button>
        </form>
      ) : null}

      <h3 className="display mt-5 border-t border-line pt-4 text-sm font-semibold">Attendance ({(attendance ?? []).filter((a) => a.present).length} present)</h3>
      {(attendance ?? []).length > 0 ? (
        <ul className="mt-1 divide-y divide-line text-sm">
          {(attendance ?? []).map((a) => (
            <li key={a.id} className="flex justify-between py-1.5">
              <span>{a.members?.full_name} <span className="text-ink-soft">({a.members?.member_number})</span></span>
              {a.present ? <Badge tone="good">Present</Badge> : a.apology ? <Badge tone="warn">Apology</Badge> : <Badge tone="bad">Absent</Badge>}
            </li>
          ))}
        </ul>
      ) : <p className="mt-1 text-sm text-ink-soft">No attendance recorded.</p>}
      {isStaff ? (
        <form className="mt-2 flex flex-wrap gap-2" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          insertAttendance.mutate({ meeting_id: meeting.id, member_id: attendee, present: true }, { onSuccess: () => qc.invalidateQueries({ queryKey: ["meeting_quorum"] }) });
          setAttendee("");
        }}>
          <Select required value={attendee} onChange={(e) => setAttendee(e.target.value)} className="max-w-xs">
            <option value="">Mark member present…</option>
            {(members ?? []).filter((m) => !(attendance ?? []).some((a) => a.member_id === m.id)).map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
          </Select>
          <Button type="submit" variant="ghost">Record</Button>
        </form>
      ) : null}

      <h3 className="display mt-5 border-t border-line pt-4 text-sm font-semibold">Minutes {meeting.minutes_approved ? <Badge tone="good">Approved</Badge> : null}</h3>
      {isStaff && !meeting.minutes_approved ? (
        <div className="mt-2 space-y-2">
          <Textarea rows={6} placeholder="Record the minutes of this meeting…" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => update.mutate({ id: meeting.id, values: { minutes } })}>Save draft</Button>
            <Button onClick={() => { update.mutate({ id: meeting.id, values: { minutes, minutes_approved: true } }); onClose(); }}>Save & approve</Button>
          </div>
        </div>
      ) : meeting.minutes ? <p className="mt-2 whitespace-pre-wrap rounded-lg border border-line bg-surface p-3 text-sm">{meeting.minutes}</p> : <p className="mt-1 text-sm text-ink-soft">No minutes recorded.</p>}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Resolutions
// ---------------------------------------------------------------------------
function Resolutions() {
  const { settings, isStaff, profile } = useApp();
  const qc = useQueryClient();
  const { data: resolutions, isLoading } = useTable("resolutions");
  const { data: tallies } = useTable("resolution_tallies", { order: "resolution_id", asc: true });
  const { data: meetings } = useTable("meetings", { order: "scheduled_at", asc: false });
  const { data: members } = useTable("members", { order: "full_name", asc: true, filter: (q) => q.eq("status", "active") });
  const insert = useInsert("resolutions");
  const update = useUpdate("resolutions");
  const castVote = useRpc("cast_resolution_vote", ["resolution_tallies", "resolution_votes"]);
  const closeRes = useRpc("close_resolution", ["resolutions", "resolution_tallies"]);
  const [showNew, setShowNew] = useState(false);
  const [voteFor, setVoteFor] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Row>({ title: "", text: "", meeting_id: "", moved_by: "", seconded_by: "", pass_threshold_percent: 50 });
  const tallyOf = (id: string) => (tallies ?? []).find((t) => t.resolution_id === id);
  const myMember = (members ?? []).find((m) => m.profile_id === profile?.id);

  if (isLoading) return <Loading />;

  return (
    <>
      <Card>
        {isStaff ? <div className="mb-4"><Button onClick={() => setShowNew(true)}><Plus size={16} /> Propose resolution</Button></div> : null}
        {(resolutions ?? []).length === 0 ? <Empty title="No resolutions" hint="Propose a resolution for the board or general meeting to decide." /> : (
          <div className="space-y-3">
            {(resolutions ?? []).map((r) => {
              const t = tallyOf(r.id);
              const total = Number(t?.votes_for ?? 0) + Number(t?.votes_against ?? 0);
              const pct = total > 0 ? (Number(t?.votes_for ?? 0) / total) * 100 : 0;
              return (
                <div key={r.id} className="rounded-lg border border-line p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold"><span className="figures text-ink-soft">{r.resolution_no}</span> · {r.title}</p>
                      <p className="mt-1 text-sm text-ink-soft">{r.text}</p>
                    </div>
                    <Badge tone={RES_TONE[r.status] ?? "neutral"}>{titleCase(r.status)}</Badge>
                  </div>
                  {t && Number(t.total_votes) > 0 ? (
                    <div className="mt-3">
                      <div className="flex h-2 overflow-hidden rounded-full bg-line">
                        <div className="bg-good" style={{ width: `${pct}%` }} />
                        <div className="bg-bad" style={{ width: `${100 - pct}%` }} />
                      </div>
                      <p className="figures mt-1 text-xs text-ink-soft">
                        For {t.votes_for} · Against {t.votes_against} · Abstain {t.abstentions} · Threshold &gt;{r.pass_threshold_percent}%
                      </p>
                    </div>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.status === "proposed" && isStaff ? (
                      <Button variant="ghost" onClick={() => update.mutate({ id: r.id, values: { status: "open_for_voting" } })}>Open voting</Button>
                    ) : null}
                    {r.status === "open_for_voting" ? (
                      <>
                        <Button onClick={() => setVoteFor(r)}><Gavel size={15} /> Cast vote</Button>
                        {isStaff ? <Button variant="brass" onClick={() => closeRes.mutateAsync({ p_resolution: r.id }).then(() => qc.invalidateQueries()).catch((e) => alert(e.message))}>Close & declare</Button> : null}
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Propose resolution" wide>
        <form className="space-y-4" onSubmit={async (e: FormEvent) => {
          e.preventDefault(); setError(null);
          try {
            const resolution_no = await rpc<string>("next_doc_number", { p_prefix: "RES", p_table: "resolutions" });
            await insert.mutateAsync({
              resolution_no, title: form.title, text: form.text,
              meeting_id: form.meeting_id || null, moved_by: form.moved_by || null,
              seconded_by: form.seconded_by || null, pass_threshold_percent: Number(form.pass_threshold_percent),
            });
            setShowNew(false);
          } catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
        }}>
          <Field label="Title"><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Resolution text"><Textarea required rows={3} placeholder="THAT the …" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Meeting (optional)">
              <Select value={form.meeting_id} onChange={(e) => setForm({ ...form, meeting_id: e.target.value })}>
                <option value="">—</option>
                {(meetings ?? []).map((m) => <option key={m.id} value={m.id}>{m.meeting_no} {m.title}</option>)}
              </Select>
            </Field>
            <Field label="Pass threshold % (simple majority = 50)"><Input type="number" min="1" max="100" value={form.pass_threshold_percent} onChange={(e) => setForm({ ...form, pass_threshold_percent: e.target.value })} /></Field>
            <Field label="Moved by">
              <Select value={form.moved_by} onChange={(e) => setForm({ ...form, moved_by: e.target.value })}>
                <option value="">—</option>
                {(members ?? []).map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </Select>
            </Field>
            <Field label="Seconded by">
              <Select value={form.seconded_by} onChange={(e) => setForm({ ...form, seconded_by: e.target.value })}>
                <option value="">—</option>
                {(members ?? []).map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </Select>
            </Field>
          </div>
          <ErrorText error={error} />
          <Button type="submit" disabled={insert.isPending} className="w-full justify-center">Propose</Button>
        </form>
      </Modal>

      <Modal open={Boolean(voteFor)} onClose={() => setVoteFor(null)} title={`Vote — ${voteFor?.title ?? ""}`}>
        <VoteForm
          members={members ?? []} isStaff={isStaff} myMemberId={myMember?.id}
          onVote={async (memberId, choice) => {
            setError(null);
            try {
              await castVote.mutateAsync({ p_resolution: voteFor!.id, p_member: memberId, p_choice: choice });
              qc.invalidateQueries();
              setVoteFor(null);
            } catch (err) { alert(err instanceof Error ? err.message : "Vote failed"); }
          }}
        />
      </Modal>
    </>
  );
}

function VoteForm({ members, isStaff, myMemberId, onVote }: { members: Row[]; isStaff: boolean; myMemberId?: string; onVote: (memberId: string, choice: string) => void }) {
  const [memberId, setMemberId] = useState(myMemberId ?? "");
  const [choice, setChoice] = useState("for");
  return (
    <form className="space-y-4" onSubmit={(e: FormEvent) => { e.preventDefault(); onVote(memberId, choice); }}>
      {isStaff ? (
        <Field label="Voting member" hint="Tellers may record votes on behalf of members present.">
          <Select required value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            <option value="">Select member…</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.full_name} ({m.member_number})</option>)}
          </Select>
        </Field>
      ) : (
        <p className="text-sm text-ink-soft">You are casting your own vote.</p>
      )}
      <Field label="Choice">
        <Select value={choice} onChange={(e) => setChoice(e.target.value)}>
          <option value="for">For</option><option value="against">Against</option><option value="abstain">Abstain</option>
        </Select>
      </Field>
      <Button type="submit" disabled={isStaff && !memberId} className="w-full justify-center">Cast vote</Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Elections
// ---------------------------------------------------------------------------
function Elections() {
  const { isStaff, profile } = useApp();
  const qc = useQueryClient();
  const { data: elections, isLoading } = useTable("elections");
  const { data: positions } = useTable("election_positions", { order: "title", asc: true });
  const { data: candidates } = useTable("election_candidates", { select: "*, members(full_name)", order: "id", asc: true });
  const { data: results } = useTable("election_results", { order: "position_id", asc: true });
  const { data: members } = useTable("members", { order: "full_name", asc: true, filter: (q) => q.eq("status", "active") });
  const insertElection = useInsert("elections");
  const insertPosition = useInsert("election_positions");
  const insertCandidate = useInsert("election_candidates");
  const updateElection = useUpdate("elections");
  const castBallot = useRpc("cast_election_ballot", ["election_results", "election_ballots"]);
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const myMember = (members ?? []).find((m) => m.profile_id === profile?.id);

  if (isLoading) return <Loading />;

  return (
    <>
      <Card>
        {isStaff ? (
          <div className="mb-4"><Button onClick={() => setShowNew(true)}><Plus size={16} /> New election</Button></div>
        ) : null}
        {(elections ?? []).length === 0 ? <Empty title="No elections" hint="Create an election with positions and candidates, then open voting." /> : (
          <div className="space-y-5">
            {(elections ?? []).map((el) => {
              const elPositions = (positions ?? []).filter((p) => p.election_id === el.id);
              return (
                <div key={el.id} className="rounded-lg border border-line p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="display font-semibold">{el.title}</p>
                    <div className="flex items-center gap-2">
                      <Badge tone={el.status === "voting" ? "warn" : el.status === "declared" ? "good" : "neutral"}>{titleCase(el.status)}</Badge>
                      {isStaff ? (
                        <Select value={el.status} onChange={(e) => updateElection.mutate({ id: el.id, values: { status: e.target.value } })} className="max-w-[160px]">
                          {["draft", "nominations", "voting", "closed", "declared"].map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
                        </Select>
                      ) : null}
                    </div>
                  </div>
                  {elPositions.length === 0 ? <p className="mt-2 text-sm text-ink-soft">No positions defined.</p> : elPositions.map((p) => {
                    const pCandidates = (candidates ?? []).filter((c) => c.position_id === p.id);
                    const pResults = (results ?? []).filter((r) => r.position_id === p.id);
                    return (
                      <div key={p.id} className="mt-3 border-t border-line pt-3">
                        <p className="text-sm font-semibold">{p.title} <span className="text-ink-soft">({p.seats} seat{p.seats > 1 ? "s" : ""})</span></p>
                        {pCandidates.length === 0 ? <p className="mt-1 text-sm text-ink-soft">No candidates.</p> : (
                          <ul className="mt-1 space-y-1">
                            {pCandidates.map((c) => {
                              const res = pResults.find((r) => r.candidate_id === c.id);
                              const winner = el.status === "declared" && res && Number(res.standing) <= p.seats;
                              return (
                                <li key={c.id} className="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-surface">
                                  <span>{c.members?.full_name} {winner ? <Badge tone="brass">Elected</Badge> : null}</span>
                                  <span className="flex items-center gap-3">
                                    {["voting", "closed", "declared"].includes(el.status) && isStaff ? <span className="figures text-ink-soft">{res?.votes ?? 0} votes</span> : null}
                                    {el.status === "voting" ? (
                                      <Button variant="ghost" onClick={async () => {
                                        const voter = isStaff
                                          ? prompt("Recording a ballot on behalf of which member? Type the exact member number:", "")
                                          : null;
                                        let voterId = myMember?.id;
                                        if (isStaff && voter) voterId = (members ?? []).find((m) => m.member_number === voter.trim())?.id;
                                        if (!voterId) { alert("Voter not identified."); return; }
                                        try { await castBallot.mutateAsync({ p_candidate: c.id, p_voter: voterId }); qc.invalidateQueries(); alert("Ballot recorded."); }
                                        catch (err) { alert(err instanceof Error ? err.message : "Ballot failed"); }
                                      }}>Vote</Button>
                                    ) : null}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        {isStaff && ["draft", "nominations"].includes(el.status) ? (
                          <form className="mt-2 flex flex-wrap gap-2" onSubmit={(e: FormEvent) => {
                            e.preventDefault();
                            const sel = (e.target as HTMLFormElement).elements.namedItem("cand") as HTMLSelectElement;
                            if (sel.value) insertCandidate.mutate({ position_id: p.id, member_id: sel.value });
                            sel.value = "";
                          }}>
                            <Select name="cand" className="max-w-xs">
                              <option value="">Nominate candidate…</option>
                              {(members ?? []).filter((m) => !pCandidates.some((c) => c.member_id === m.id)).map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                            </Select>
                            <Button type="submit" variant="ghost">Nominate</Button>
                          </form>
                        ) : null}
                      </div>
                    );
                  })}
                  {isStaff && ["draft", "nominations"].includes(el.status) ? (
                    <form className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3" onSubmit={(e: FormEvent) => {
                      e.preventDefault();
                      const f = e.target as HTMLFormElement;
                      const t = (f.elements.namedItem("ptitle") as HTMLInputElement);
                      const s = (f.elements.namedItem("pseats") as HTMLInputElement);
                      insertPosition.mutate({ election_id: el.id, title: t.value, seats: Number(s.value || 1) });
                      t.value = ""; s.value = "1";
                    }}>
                      <Input name="ptitle" required placeholder="Add position (e.g. Chairman)" className="max-w-xs" />
                      <Input name="pseats" type="number" min="1" defaultValue={1} className="max-w-[90px]" />
                      <Button type="submit" variant="ghost">Add position</Button>
                    </form>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal open={showNew} onClose={() => setShowNew(false)} title="New election">
        <form className="space-y-4" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          insertElection.mutate({ title }, { onSuccess: () => { setShowNew(false); setTitle(""); } });
        }}>
          <Field label="Election title"><Input required placeholder="e.g. 2026 Board of Directors Election" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Button type="submit" disabled={insertElection.isPending} className="w-full justify-center">Create election</Button>
        </form>
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// Committees
// ---------------------------------------------------------------------------
function Committees() {
  const { isStaff } = useApp();
  const { data: committees, isLoading } = useTable("committees");
  const { data: committeeMembers } = useTable("committee_members", { select: "*, members(full_name, member_number)", order: "appointed_on", asc: true });
  const { data: members } = useTable("members", { order: "full_name", asc: true, filter: (q) => q.eq("status", "active") });
  const insert = useInsert("committees");
  const insertMember = useInsert("committee_members");
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState<Row>({ name: "", mandate: "", kind: "standing" });

  if (isLoading) return <Loading />;

  return (
    <>
      <Card>
        {isStaff ? <div className="mb-4"><Button onClick={() => setShowNew(true)}><Plus size={16} /> New committee</Button></div> : null}
        {(committees ?? []).length === 0 ? <Empty title="No committees" hint="Constitute a committee such as Credit, Supervisory or Education." /> : (
          <div className="grid gap-4 lg:grid-cols-2">
            {(committees ?? []).map((c) => {
              const roster = (committeeMembers ?? []).filter((m) => m.committee_id === c.id && m.active);
              return (
                <div key={c.id} className="rounded-lg border border-line p-4">
                  <div className="flex items-center justify-between">
                    <p className="display font-semibold">{c.name}</p>
                    <Badge tone={c.kind === "standing" ? "neutral" : "brass"}>{titleCase(c.kind)}</Badge>
                  </div>
                  {c.mandate ? <p className="mt-1 text-sm text-ink-soft">{c.mandate}</p> : null}
                  <ul className="mt-3 divide-y divide-line text-sm">
                    {roster.map((m) => (
                      <li key={m.id} className="flex justify-between py-1.5">
                        <span>{m.members?.full_name}</span>
                        <span className="text-ink-soft">{m.role}</span>
                      </li>
                    ))}
                  </ul>
                  {isStaff ? (
                    <form className="mt-3 flex flex-wrap gap-2" onSubmit={(e: FormEvent) => {
                      e.preventDefault();
                      const f = e.target as HTMLFormElement;
                      const mem = (f.elements.namedItem("mem") as HTMLSelectElement);
                      const rle = (f.elements.namedItem("rle") as HTMLSelectElement);
                      if (mem.value) insertMember.mutate({ committee_id: c.id, member_id: mem.value, role: rle.value });
                      mem.value = "";
                    }}>
                      <Select name="mem" className="max-w-[190px]">
                        <option value="">Appoint member…</option>
                        {(members ?? []).filter((m) => !roster.some((r) => r.member_id === m.id)).map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                      </Select>
                      <Select name="rle" className="max-w-[150px]">
                        <option>Member</option><option>Chairperson</option><option>Secretary</option>
                      </Select>
                      <Button type="submit" variant="ghost">Appoint</Button>
                    </form>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal open={showNew} onClose={() => setShowNew(false)} title="New committee">
        <form className="space-y-4" onSubmit={(e: FormEvent) => { e.preventDefault(); insert.mutate(form, { onSuccess: () => setShowNew(false) }); }}>
          <Field label="Committee name"><Input required placeholder="e.g. Credit Committee" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Mandate"><Textarea rows={2} value={form.mandate} onChange={(e) => setForm({ ...form, mandate: e.target.value })} /></Field>
          <Field label="Kind">
            <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              <option value="standing">Standing</option><option value="ad_hoc">Ad hoc</option>
            </Select>
          </Field>
          <Button type="submit" disabled={insert.isPending} className="w-full justify-center">Create committee</Button>
        </form>
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// Policies
// ---------------------------------------------------------------------------
function Policies() {
  const { settings, isStaff } = useApp();
  const { data: policies, isLoading } = useTable("policy_documents");
  const { data: resolutions } = useTable("resolutions", { order: "created_at", asc: false, filter: (q) => q.eq("status", "passed") });
  const insert = useInsert("policy_documents");
  const update = useUpdate("policy_documents");
  const [showNew, setShowNew] = useState(false);
  const [reading, setReading] = useState<Row | null>(null);
  const [form, setForm] = useState<Row>({ title: "", category: "General", version: "1.0", body: "", effective_date: "", approved_by_resolution: "" });

  if (isLoading) return <Loading />;

  return (
    <>
      <Card>
        {isStaff ? <div className="mb-4"><Button onClick={() => setShowNew(true)}><Plus size={16} /> New policy</Button></div> : null}
        {(policies ?? []).length === 0 ? <Empty title="No policy documents" hint="Publish bye-laws, credit policy, HR policy and other governing documents." /> : (
          <Table headers={["Policy", "Category", "Version", "Effective", "Status", ""]}>
            {(policies ?? []).map((p) => (
              <tr key={p.id} className="border-b border-line">
                <Td className="font-medium"><button className="text-primary hover:underline" onClick={() => setReading(p)}>{p.title}</button></Td>
                <Td>{p.category}</Td>
                <Td mono>{p.version}</Td>
                <Td>{fmtDate(p.effective_date, settings.date_format)}</Td>
                <Td><Badge tone={p.status === "approved" ? "good" : p.status === "archived" ? "neutral" : "warn"}>{titleCase(p.status)}</Badge></Td>
                <Td>{isStaff ? (
                  <Select defaultValue={p.status} onChange={(e) => update.mutate({ id: p.id, values: { status: e.target.value } })} className="max-w-[140px]">
                    {["draft", "in_review", "approved", "archived"].map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
                  </Select>
                ) : null}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={showNew} onClose={() => setShowNew(false)} title="New policy document" wide>
        <form className="space-y-4" onSubmit={(e: FormEvent) => {
          e.preventDefault();
          insert.mutate({
            ...form, effective_date: form.effective_date || null,
            approved_by_resolution: form.approved_by_resolution || null, body: form.body || null,
          }, { onSuccess: () => setShowNew(false) });
        }}>
          <Field label="Title"><Input required placeholder="e.g. Credit Policy" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Category">
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option>General</option><option>Bye-laws</option><option>Credit</option><option>Finance</option><option>HR</option><option>Risk & Compliance</option>
              </Select>
            </Field>
            <Field label="Version"><Input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} /></Field>
            <Field label="Effective date"><Input type="date" value={form.effective_date} onChange={(e) => setForm({ ...form, effective_date: e.target.value })} /></Field>
          </div>
          <Field label="Approved by resolution (optional)">
            <Select value={form.approved_by_resolution} onChange={(e) => setForm({ ...form, approved_by_resolution: e.target.value })}>
              <option value="">—</option>
              {(resolutions ?? []).map((r) => <option key={r.id} value={r.id}>{r.resolution_no} {r.title}</option>)}
            </Select>
          </Field>
          <Field label="Policy text"><Textarea rows={8} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field>
          <Button type="submit" disabled={insert.isPending} className="w-full justify-center">Save policy</Button>
        </form>
      </Modal>

      {reading ? (
        <Modal open onClose={() => setReading(null)} title={`${reading.title} — v${reading.version}`} wide>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{reading.body ?? "No text recorded for this policy."}</p>
        </Modal>
      ) : null}
    </>
  );
}
