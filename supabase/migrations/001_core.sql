-- ============================================================================
-- Cooperative & Microfinance ERP — Core schema
-- Migration 001: extensions, identity, organization, members, savings, shares
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enumerated types
-- ---------------------------------------------------------------------------
create type app_role as enum (
  'super_admin','org_owner','board_chairman','board_member','managing_director',
  'branch_manager','accountant','finance_officer','loan_officer','recovery_officer',
  'teller','cashier','auditor','secretary','member','customer','vendor'
);

create type member_status as enum ('pending','active','dormant','suspended','exited');
create type kyc_status as enum ('unverified','submitted','verified','rejected');
create type savings_frequency as enum ('daily','weekly','monthly','fixed','target','group','children','shares');
create type txn_direction as enum ('deposit','withdrawal','charge','interest','adjustment');
create type loan_status as enum ('draft','submitted','under_review','approved','rejected','disbursed','active','restructured','written_off','closed');
create type interest_method as enum ('flat','reducing_balance');
create type payment_method as enum ('cash','bank_transfer','pos','online','mobile_money');
create type journal_status as enum ('draft','posted','reversed');
create type meeting_type as enum ('board','agm','egm','committee','management');
create type meeting_status as enum ('scheduled','in_progress','concluded','cancelled');
create type resolution_status as enum ('proposed','open_for_voting','passed','failed','withdrawn');
create type vote_choice as enum ('for','against','abstain');
create type election_status as enum ('draft','nominations','voting','closed','declared');
create type leave_status as enum ('pending','approved','rejected');
create type po_status as enum ('draft','approved','received','cancelled');
create type message_channel as enum ('email','sms','whatsapp','in_app');

-- ---------------------------------------------------------------------------
-- Organization settings (single row, white-label branding)
-- ---------------------------------------------------------------------------
create table org_settings (
  id int primary key default 1 check (id = 1),
  organization_name text not null default 'NegoLinks Cooperative & Microfinance ERP',
  application_name text not null default 'Cooperative ERP',
  logo_url text,
  favicon_url text,
  registration_details text,
  address text,
  phone_numbers text,
  email text,
  website text,
  social_media jsonb not null default '{}'::jsonb,
  currency_code text not null default 'NGN',
  currency_symbol text not null default '₦',
  time_zone text not null default 'Africa/Lagos',
  date_format text not null default 'DD/MM/YYYY',
  language text not null default 'en',
  theme_primary text not null default '#1E6B4E',
  theme_accent text not null default '#B08830',
  login_tagline text not null default 'The financial operating system for member-owned institutions.',
  letterhead_url text,
  stamp_url text,
  signature_url text,
  ai_assistant_name text not null default 'Advisor',
  updated_at timestamptz not null default now()
);
insert into org_settings (id) values (1);

create table branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  state text,
  address text,
  phone text,
  manager_name text,
  is_head_office boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
insert into branches (name, code, state, is_head_office) values ('Head Office','HQ','—', true);

-- ---------------------------------------------------------------------------
-- Profiles: one row per auth user
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role app_role not null default 'member',
  branch_id uuid references branches (id),
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    case when not exists (select 1 from profiles) then 'super_admin'::app_role else 'member'::app_role end
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function handle_new_user();

-- Role helpers used by RLS everywhere
create or replace function current_role_of() returns app_role
language sql stable security definer set search_path = public as
$$ select role from profiles where id = auth.uid() $$;

create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(current_role_of() not in ('member','customer','vendor'), false) $$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select coalesce(current_role_of() in ('super_admin','org_owner','managing_director'), false) $$;

-- ---------------------------------------------------------------------------
-- Audit trail (append-only)
-- ---------------------------------------------------------------------------
create table audit_logs (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid default auth.uid(),
  action text not null,
  entity text not null,
  entity_id text,
  detail jsonb not null default '{}'::jsonb
);

create or replace function log_audit(p_action text, p_entity text, p_entity_id text, p_detail jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = public as
$$ insert into audit_logs (actor, action, entity, entity_id, detail) values (auth.uid(), p_action, p_entity, p_entity_id, p_detail) $$;

-- ---------------------------------------------------------------------------
-- Members
-- ---------------------------------------------------------------------------
create table members (
  id uuid primary key default gen_random_uuid(),
  member_number text not null unique,
  profile_id uuid references profiles (id),
  branch_id uuid not null references branches (id),
  full_name text not null,
  gender text,
  date_of_birth date,
  phone text,
  email text,
  address text,
  occupation text,
  category text not null default 'Regular',
  status member_status not null default 'pending',
  kyc kyc_status not null default 'unverified',
  id_type text,
  id_number text,
  photo_url text,
  joined_on date not null default current_date,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table member_relations (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members (id) on delete cascade,
  relation_type text not null check (relation_type in ('beneficiary','guarantor','nominee')),
  full_name text not null,
  relationship text,
  phone text,
  share_percent numeric(5,2),
  created_at timestamptz not null default now()
);

create table member_documents (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members (id) on delete cascade,
  title text not null,
  file_url text not null,
  uploaded_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create or replace function next_member_number() returns text
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  select count(*) + 1 into n from members;
  return 'MBR-' || lpad(n::text, 5, '0');
end $$;

-- ---------------------------------------------------------------------------
-- Savings
-- ---------------------------------------------------------------------------
create table savings_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  frequency savings_frequency not null,
  interest_rate numeric(6,3) not null default 0,
  minimum_balance numeric(14,2) not null default 0,
  withdrawal_charge numeric(14,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table savings_accounts (
  id uuid primary key default gen_random_uuid(),
  account_number text not null unique,
  member_id uuid not null references members (id),
  product_id uuid not null references savings_products (id),
  branch_id uuid not null references branches (id),
  target_amount numeric(14,2),
  maturity_date date,
  status text not null default 'active' check (status in ('active','frozen','closed')),
  opened_on date not null default current_date,
  created_at timestamptz not null default now()
);

create table savings_transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references savings_accounts (id),
  direction txn_direction not null,
  amount numeric(14,2) not null check (amount > 0),
  method payment_method not null default 'cash',
  reference text,
  narration text,
  posted_by uuid default auth.uid(),
  posted_at timestamptz not null default now(),
  reversed boolean not null default false
);

create or replace view savings_balances as
select a.id as account_id, a.member_id,
  coalesce(sum(case when t.direction in ('deposit','interest') then t.amount
                    when t.direction in ('withdrawal','charge') then -t.amount
                    else t.amount end) filter (where not t.reversed), 0)::numeric(14,2) as balance
from savings_accounts a
left join savings_transactions t on t.account_id = a.id
group by a.id, a.member_id;

create or replace function post_savings_txn(
  p_account uuid, p_direction txn_direction, p_amount numeric,
  p_method payment_method, p_reference text, p_narration text
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_balance numeric; v_min numeric; v_id uuid;
begin
  if not is_staff() then raise exception 'Only staff can post savings transactions'; end if;
  if p_amount <= 0 then raise exception 'Amount must be positive'; end if;
  select b.balance, p.minimum_balance into v_balance, v_min
  from savings_balances b
  join savings_accounts a on a.id = b.account_id
  join savings_products p on p.id = a.product_id
  where b.account_id = p_account;
  if v_balance is null then raise exception 'Account not found'; end if;
  if p_direction in ('withdrawal','charge') and v_balance - p_amount < coalesce(v_min,0) then
    raise exception 'Insufficient balance: withdrawal would breach minimum balance of %', v_min;
  end if;
  insert into savings_transactions (account_id, direction, amount, method, reference, narration)
  values (p_account, p_direction, p_amount, p_method, p_reference, p_narration)
  returning id into v_id;
  perform log_audit('post', 'savings_transaction', v_id::text,
    jsonb_build_object('direction', p_direction, 'amount', p_amount));
  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- Shares & dividends
-- ---------------------------------------------------------------------------
create table share_settings (
  id int primary key default 1 check (id = 1),
  share_price numeric(14,2) not null default 100,
  updated_at timestamptz not null default now()
);
insert into share_settings (id) values (1);

create table share_purchases (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members (id),
  units int not null check (units > 0),
  unit_price numeric(14,2) not null,
  amount numeric(14,2) generated always as (units * unit_price) stored,
  certificate_no text not null unique,
  is_bonus boolean not null default false,
  purchased_on date not null default current_date,
  created_at timestamptz not null default now()
);

create table dividend_declarations (
  id uuid primary key default gen_random_uuid(),
  financial_year text not null,
  rate_percent numeric(6,3) not null,
  declared_on date not null default current_date,
  approved_by_resolution uuid,
  status text not null default 'declared' check (status in ('declared','distributed')),
  created_at timestamptz not null default now()
);

create table dividend_payouts (
  id uuid primary key default gen_random_uuid(),
  declaration_id uuid not null references dividend_declarations (id) on delete cascade,
  member_id uuid not null references members (id),
  share_value numeric(14,2) not null,
  amount numeric(14,2) not null,
  paid boolean not null default false,
  paid_at timestamptz
);

create or replace function distribute_dividends(p_declaration uuid) returns int
language plpgsql security definer set search_path = public as $$
declare v_rate numeric; v_count int;
begin
  if not is_admin() then raise exception 'Only administrators can distribute dividends'; end if;
  select rate_percent into v_rate from dividend_declarations where id = p_declaration and status = 'declared';
  if v_rate is null then raise exception 'Declaration not found or already distributed'; end if;
  insert into dividend_payouts (declaration_id, member_id, share_value, amount)
  select p_declaration, s.member_id, sum(s.amount), round(sum(s.amount) * v_rate / 100, 2)
  from share_purchases s group by s.member_id;
  get diagnostics v_count = row_count;
  update dividend_declarations set status = 'distributed' where id = p_declaration;
  perform log_audit('distribute','dividends', p_declaration::text, jsonb_build_object('payouts', v_count));
  return v_count;
end $$;
