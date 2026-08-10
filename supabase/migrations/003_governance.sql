-- ============================================================================
-- Migration 003: Cooperative Governance
-- Board meetings, AGMs, resolutions & voting, elections, committees, policies
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Committees (standing and ad-hoc)
-- ---------------------------------------------------------------------------
create table committees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mandate text,
  kind text not null default 'standing' check (kind in ('standing','ad_hoc')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table committee_members (
  id uuid primary key default gen_random_uuid(),
  committee_id uuid not null references committees (id) on delete cascade,
  member_id uuid not null references members (id),
  role text not null default 'Member' , -- Chairperson, Secretary, Member
  appointed_on date not null default current_date,
  term_ends date,
  active boolean not null default true,
  unique (committee_id, member_id)
);

-- ---------------------------------------------------------------------------
-- Meetings: board, AGM, EGM, committee, management
-- ---------------------------------------------------------------------------
create table meetings (
  id uuid primary key default gen_random_uuid(),
  meeting_no text not null unique,
  kind meeting_type not null,
  title text not null,
  committee_id uuid references committees (id),
  scheduled_at timestamptz not null,
  venue text,
  status meeting_status not null default 'scheduled',
  quorum_required int not null default 0,
  notice_sent boolean not null default false,
  minutes text,
  minutes_approved boolean not null default false,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table meeting_agenda (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings (id) on delete cascade,
  position int not null default 1,
  item text not null,
  presenter text,
  notes text
);

create table meeting_attendance (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings (id) on delete cascade,
  member_id uuid not null references members (id),
  present boolean not null default true,
  apology boolean not null default false,
  proxy_for uuid references members (id),
  recorded_at timestamptz not null default now(),
  unique (meeting_id, member_id)
);

create or replace view meeting_quorum as
select m.id as meeting_id, m.quorum_required,
  count(a.id) filter (where a.present) as attendees,
  (m.quorum_required = 0 or count(a.id) filter (where a.present) >= m.quorum_required) as quorum_met
from meetings m
left join meeting_attendance a on a.meeting_id = m.id
group by m.id, m.quorum_required;

-- ---------------------------------------------------------------------------
-- Resolutions & voting records
-- ---------------------------------------------------------------------------
create table resolutions (
  id uuid primary key default gen_random_uuid(),
  resolution_no text not null unique,
  meeting_id uuid references meetings (id),
  title text not null,
  text text not null,
  moved_by uuid references members (id),
  seconded_by uuid references members (id),
  status resolution_status not null default 'proposed',
  pass_threshold_percent numeric(5,2) not null default 50,
  decided_on date,
  created_at timestamptz not null default now()
);

create table resolution_votes (
  id uuid primary key default gen_random_uuid(),
  resolution_id uuid not null references resolutions (id) on delete cascade,
  member_id uuid not null references members (id),
  choice vote_choice not null,
  cast_at timestamptz not null default now(),
  unique (resolution_id, member_id)
);

create or replace view resolution_tallies as
select r.id as resolution_id, r.status, r.pass_threshold_percent,
  count(v.id) filter (where v.choice = 'for') as votes_for,
  count(v.id) filter (where v.choice = 'against') as votes_against,
  count(v.id) filter (where v.choice = 'abstain') as abstentions,
  count(v.id) as total_votes
from resolutions r
left join resolution_votes v on v.resolution_id = r.id
group by r.id, r.status, r.pass_threshold_percent;

create or replace function cast_resolution_vote(p_resolution uuid, p_member uuid, p_choice vote_choice)
returns void language plpgsql security definer set search_path = public as $$
declare v_status resolution_status;
begin
  select status into v_status from resolutions where id = p_resolution;
  if v_status is null then raise exception 'Resolution not found'; end if;
  if v_status <> 'open_for_voting' then raise exception 'Voting is not open on this resolution'; end if;
  if not is_staff() then
    -- members may only cast their own vote
    if not exists (select 1 from members where id = p_member and profile_id = auth.uid()) then
      raise exception 'You can only cast your own vote';
    end if;
  end if;
  insert into resolution_votes (resolution_id, member_id, choice)
  values (p_resolution, p_member, p_choice)
  on conflict (resolution_id, member_id) do update set choice = excluded.choice, cast_at = now();
  perform log_audit('vote','resolution', p_resolution::text, jsonb_build_object('member', p_member));
end $$;

create or replace function close_resolution(p_resolution uuid) returns resolution_status
language plpgsql security definer set search_path = public as $$
declare t record; v_new resolution_status;
begin
  if not is_staff() then raise exception 'Staff only'; end if;
  select * into t from resolution_tallies where resolution_id = p_resolution;
  if t.status <> 'open_for_voting' then raise exception 'Resolution is not open for voting'; end if;
  if (t.votes_for + t.votes_against) = 0 then
    v_new := 'failed';
  elsif t.votes_for::numeric / (t.votes_for + t.votes_against) * 100 > t.pass_threshold_percent then
    v_new := 'passed';
  else
    v_new := 'failed';
  end if;
  update resolutions set status = v_new, decided_on = current_date where id = p_resolution;
  perform log_audit('close','resolution', p_resolution::text, jsonb_build_object('outcome', v_new));
  return v_new;
end $$;

-- ---------------------------------------------------------------------------
-- Elections
-- ---------------------------------------------------------------------------
create table elections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  meeting_id uuid references meetings (id),
  status election_status not null default 'draft',
  opens_at timestamptz,
  closes_at timestamptz,
  created_at timestamptz not null default now()
);

create table election_positions (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references elections (id) on delete cascade,
  title text not null,          -- e.g. Chairman, Treasurer
  seats int not null default 1 check (seats > 0)
);

create table election_candidates (
  id uuid primary key default gen_random_uuid(),
  position_id uuid not null references election_positions (id) on delete cascade,
  member_id uuid not null references members (id),
  manifesto text,
  unique (position_id, member_id)
);

create table election_ballots (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references election_candidates (id) on delete cascade,
  voter_member_id uuid not null references members (id),
  cast_at timestamptz not null default now()
);

-- one ballot per voter per position
create or replace function cast_election_ballot(p_candidate uuid, p_voter uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_position uuid; v_election uuid; v_status election_status;
begin
  select c.position_id, p.election_id into v_position, v_election
  from election_candidates c join election_positions p on p.id = c.position_id
  where c.id = p_candidate;
  if v_position is null then raise exception 'Candidate not found'; end if;
  select status into v_status from elections where id = v_election;
  if v_status <> 'voting' then raise exception 'This election is not open for voting'; end if;
  if not is_staff() then
    if not exists (select 1 from members where id = p_voter and profile_id = auth.uid()) then
      raise exception 'You can only cast your own ballot';
    end if;
  end if;
  if exists (
    select 1 from election_ballots b
    join election_candidates c2 on c2.id = b.candidate_id
    where c2.position_id = v_position and b.voter_member_id = p_voter
  ) then
    raise exception 'This member has already voted for this position';
  end if;
  insert into election_ballots (candidate_id, voter_member_id) values (p_candidate, p_voter);
  perform log_audit('ballot','election', v_election::text, jsonb_build_object('position', v_position));
end $$;

create or replace view election_results as
select p.election_id, p.id as position_id, p.title as position_title, p.seats,
  c.id as candidate_id, m.full_name as candidate_name,
  count(b.id) as votes,
  rank() over (partition by p.id order by count(b.id) desc) as standing
from election_positions p
join election_candidates c on c.position_id = p.id
join members m on m.id = c.member_id
left join election_ballots b on b.candidate_id = c.id
group by p.election_id, p.id, p.title, p.seats, c.id, m.full_name;

-- ---------------------------------------------------------------------------
-- Policy documents (versioned)
-- ---------------------------------------------------------------------------
create table policy_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'General',
  version text not null default '1.0',
  body text,
  file_url text,
  effective_date date,
  approved_by_resolution uuid references resolutions (id),
  status text not null default 'draft' check (status in ('draft','in_review','approved','archived')),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

-- number generators shared by the app
create or replace function next_doc_number(p_prefix text, p_table text) returns text
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  execute format('select count(*) + 1 from %I', p_table) into n;
  return p_prefix || '-' || to_char(current_date, 'YYYY') || '-' || lpad(n::text, 4, '0');
end $$;
