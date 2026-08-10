-- ============================================================================
-- Migration 002: loans, general ledger, investments, procurement, HR, comms
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Loans
-- ---------------------------------------------------------------------------
create table loan_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  interest_rate numeric(6,3) not null,          -- % per annum
  method interest_method not null default 'reducing_balance',
  max_tenor_months int not null default 24,
  processing_fee_percent numeric(6,3) not null default 1,
  requires_guarantors int not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table loans (
  id uuid primary key default gen_random_uuid(),
  loan_number text not null unique,
  member_id uuid not null references members (id),
  product_id uuid not null references loan_products (id),
  branch_id uuid not null references branches (id),
  principal numeric(14,2) not null check (principal > 0),
  tenor_months int not null check (tenor_months > 0),
  purpose text,
  status loan_status not null default 'submitted',
  applied_on date not null default current_date,
  approved_by uuid,
  approved_on date,
  disbursed_on date,
  disbursement_method payment_method,
  rejection_reason text,
  restructured_from uuid references loans (id),
  written_off_on date,
  credit_score int,
  credit_notes text,
  created_at timestamptz not null default now()
);

create table loan_guarantors (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references loans (id) on delete cascade,
  guarantor_member_id uuid not null references members (id),
  amount_guaranteed numeric(14,2) not null,
  accepted boolean not null default false,
  created_at timestamptz not null default now()
);

create table loan_schedule (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references loans (id) on delete cascade,
  installment_no int not null,
  due_date date not null,
  principal_due numeric(14,2) not null,
  interest_due numeric(14,2) not null,
  total_due numeric(14,2) not null,
  unique (loan_id, installment_no)
);

create table loan_repayments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references loans (id),
  amount numeric(14,2) not null check (amount > 0),
  method payment_method not null default 'cash',
  reference text,
  posted_by uuid default auth.uid(),
  posted_at timestamptz not null default now()
);

create or replace view loan_positions as
select l.id as loan_id, l.member_id, l.status, l.principal,
  coalesce((select sum(total_due) from loan_schedule s where s.loan_id = l.id), 0)::numeric(14,2) as total_payable,
  coalesce((select sum(amount) from loan_repayments r where r.loan_id = l.id), 0)::numeric(14,2) as total_paid,
  (coalesce((select sum(total_due) from loan_schedule s where s.loan_id = l.id), 0)
   - coalesce((select sum(amount) from loan_repayments r where r.loan_id = l.id), 0))::numeric(14,2) as outstanding,
  (select min(due_date) from loan_schedule s where s.loan_id = l.id
     and s.due_date < current_date
     and (select coalesce(sum(amount),0) from loan_repayments r where r.loan_id = l.id)
         < (select coalesce(sum(total_due),0) from loan_schedule s2 where s2.loan_id = l.id and s2.due_date <= s.due_date)
  ) as first_overdue
from loans l;

create or replace function approve_loan(p_loan uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if current_role_of() not in ('super_admin','org_owner','managing_director','branch_manager','loan_officer') then
    raise exception 'You do not have permission to approve loans';
  end if;
  update loans set status = 'approved', approved_by = auth.uid(), approved_on = current_date
  where id = p_loan and status in ('submitted','under_review');
  if not found then raise exception 'Loan is not awaiting approval'; end if;
  perform log_audit('approve','loan', p_loan::text);
end $$;

create or replace function reject_loan(p_loan uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'Staff only'; end if;
  update loans set status = 'rejected', rejection_reason = p_reason
  where id = p_loan and status in ('submitted','under_review');
  if not found then raise exception 'Loan is not awaiting approval'; end if;
  perform log_audit('reject','loan', p_loan::text, jsonb_build_object('reason', p_reason));
end $$;

-- Disburse: generates the amortization schedule (flat or reducing balance)
create or replace function disburse_loan(p_loan uuid, p_method payment_method) returns void
language plpgsql security definer set search_path = public as $$
declare
  v loans%rowtype; v_rate numeric; v_im interest_method;
  v_monthly_rate numeric; v_pmt numeric; v_bal numeric;
  v_int numeric; v_prin numeric; i int;
begin
  if current_role_of() not in ('super_admin','org_owner','managing_director','branch_manager','accountant','finance_officer') then
    raise exception 'You do not have permission to disburse loans';
  end if;
  select * into v from loans where id = p_loan and status = 'approved';
  if v.id is null then raise exception 'Loan must be approved before disbursement'; end if;
  select interest_rate, method into v_rate, v_im from loan_products where id = v.product_id;

  delete from loan_schedule where loan_id = p_loan;
  v_monthly_rate := v_rate / 100 / 12;

  if v_im = 'flat' then
    for i in 1..v.tenor_months loop
      v_prin := round(v.principal / v.tenor_months, 2);
      v_int := round(v.principal * v_monthly_rate, 2);
      insert into loan_schedule (loan_id, installment_no, due_date, principal_due, interest_due, total_due)
      values (p_loan, i, v.disbursed_on + (i * interval '1 month'), v_prin, v_int, v_prin + v_int);
    end loop;
  else
    v_bal := v.principal;
    if v_monthly_rate = 0 then
      v_pmt := round(v.principal / v.tenor_months, 2);
    else
      v_pmt := round(v.principal * v_monthly_rate / (1 - power(1 + v_monthly_rate, -v.tenor_months)), 2);
    end if;
    for i in 1..v.tenor_months loop
      v_int := round(v_bal * v_monthly_rate, 2);
      v_prin := case when i = v.tenor_months then v_bal else v_pmt - v_int end;
      insert into loan_schedule (loan_id, installment_no, due_date, principal_due, interest_due, total_due)
      values (p_loan, i, coalesce(v.disbursed_on, current_date) + (i * interval '1 month'), v_prin, v_int, v_prin + v_int);
      v_bal := v_bal - v_prin;
    end loop;
  end if;

  update loans set status = 'disbursed', disbursed_on = current_date, disbursement_method = p_method
  where id = p_loan;
  -- Regenerate schedule anchored on actual disbursement date
  update loan_schedule s set due_date = current_date + (s.installment_no * interval '1 month') where s.loan_id = p_loan;
  perform log_audit('disburse','loan', p_loan::text, jsonb_build_object('method', p_method));
end $$;

create or replace function write_off_loan(p_loan uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Only administrators can write off loans'; end if;
  update loans set status = 'written_off', written_off_on = current_date
  where id = p_loan and status in ('disbursed','active','restructured');
  if not found then raise exception 'Loan cannot be written off in its current status'; end if;
  perform log_audit('write_off','loan', p_loan::text);
end $$;

-- ---------------------------------------------------------------------------
-- General ledger
-- ---------------------------------------------------------------------------
create table gl_accounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  type text not null check (type in ('asset','liability','equity','income','expense')),
  active boolean not null default true
);

insert into gl_accounts (code, name, type) values
  ('1000','Cash on Hand','asset'),
  ('1010','Bank Accounts','asset'),
  ('1100','Loans to Members','asset'),
  ('1200','Investments','asset'),
  ('1300','Fixed Assets','asset'),
  ('2000','Member Savings','liability'),
  ('2100','Payables','liability'),
  ('3000','Share Capital','equity'),
  ('3100','Retained Earnings','equity'),
  ('4000','Interest Income','income'),
  ('4100','Fees & Charges','income'),
  ('4200','Investment Income','income'),
  ('5000','Operating Expenses','expense'),
  ('5100','Salaries & Wages','expense'),
  ('5200','Dividend Expense','expense'),
  ('5300','Loan Loss Provision','expense');

create table journals (
  id uuid primary key default gen_random_uuid(),
  journal_no text not null unique,
  entry_date date not null default current_date,
  memo text,
  status journal_status not null default 'draft',
  posted_by uuid,
  posted_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table journal_lines (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references journals (id) on delete cascade,
  account_id uuid not null references gl_accounts (id),
  debit numeric(14,2) not null default 0 check (debit >= 0),
  credit numeric(14,2) not null default 0 check (credit >= 0),
  narration text,
  check (debit = 0 or credit = 0)
);

create or replace function post_journal(p_journal uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_dr numeric; v_cr numeric;
begin
  if current_role_of() not in ('super_admin','org_owner','managing_director','accountant','finance_officer') then
    raise exception 'Only finance roles can post journals';
  end if;
  select coalesce(sum(debit),0), coalesce(sum(credit),0) into v_dr, v_cr
  from journal_lines where journal_id = p_journal;
  if v_dr = 0 or v_dr <> v_cr then
    raise exception 'Journal is not balanced: debits % vs credits %', v_dr, v_cr;
  end if;
  update journals set status = 'posted', posted_by = auth.uid(), posted_at = now()
  where id = p_journal and status = 'draft';
  if not found then raise exception 'Journal not found or already posted'; end if;
  perform log_audit('post','journal', p_journal::text);
end $$;

create or replace view trial_balance as
select a.id, a.code, a.name, a.type,
  coalesce(sum(l.debit) filter (where j.status = 'posted'), 0)::numeric(14,2) as total_debit,
  coalesce(sum(l.credit) filter (where j.status = 'posted'), 0)::numeric(14,2) as total_credit
from gl_accounts a
left join journal_lines l on l.account_id = a.id
left join journals j on j.id = l.journal_id
group by a.id, a.code, a.name, a.type
order by a.code;

-- ---------------------------------------------------------------------------
-- Investments
-- ---------------------------------------------------------------------------
create table investments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind text not null check (kind in ('fixed_deposit','treasury','cooperative','other')),
  institution text,
  principal numeric(14,2) not null,
  rate_percent numeric(6,3) not null default 0,
  start_date date not null default current_date,
  maturity_date date,
  status text not null default 'active' check (status in ('active','matured','liquidated')),
  notes text,
  created_at timestamptz not null default now()
);

create table investment_returns (
  id uuid primary key default gen_random_uuid(),
  investment_id uuid not null references investments (id) on delete cascade,
  amount numeric(14,2) not null,
  received_on date not null default current_date,
  notes text
);

-- ---------------------------------------------------------------------------
-- Procurement & assets
-- ---------------------------------------------------------------------------
create table vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  phone text,
  email text,
  bank_details text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_number text not null unique,
  vendor_id uuid not null references vendors (id),
  description text not null,
  amount numeric(14,2) not null,
  status po_status not null default 'draft',
  ordered_on date not null default current_date,
  received_on date,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table assets (
  id uuid primary key default gen_random_uuid(),
  asset_tag text not null unique,
  name text not null,
  category text not null default 'Equipment',
  branch_id uuid references branches (id),
  purchase_cost numeric(14,2) not null,
  purchase_date date not null default current_date,
  useful_life_years int not null default 5,
  salvage_value numeric(14,2) not null default 0,
  disposed boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace view asset_depreciation as
select a.*,
  round(greatest(a.purchase_cost - a.salvage_value, 0) / nullif(a.useful_life_years,0) / 12, 2) as monthly_depreciation,
  least(
    round(greatest(a.purchase_cost - a.salvage_value, 0) / nullif(a.useful_life_years,0) / 12, 2)
      * greatest(extract(year from age(current_date, a.purchase_date)) * 12
               + extract(month from age(current_date, a.purchase_date)), 0),
    a.purchase_cost - a.salvage_value
  )::numeric(14,2) as accumulated_depreciation
from assets a;

create table inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'Office Supplies',
  unit text not null default 'unit',
  quantity numeric(12,2) not null default 0 check (quantity >= 0),
  reorder_level numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- HR
-- ---------------------------------------------------------------------------
create table employees (
  id uuid primary key default gen_random_uuid(),
  staff_number text not null unique,
  profile_id uuid references profiles (id),
  full_name text not null,
  position text not null,
  branch_id uuid references branches (id),
  phone text,
  email text,
  salary numeric(14,2),
  hired_on date not null default current_date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees (id) on delete cascade,
  day date not null default current_date,
  check_in time,
  check_out time,
  status text not null default 'present' check (status in ('present','absent','leave','holiday')),
  unique (employee_id, day)
);

create table leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees (id) on delete cascade,
  leave_type text not null default 'annual',
  start_date date not null,
  end_date date not null,
  reason text,
  status leave_status not null default 'pending',
  decided_by uuid,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table performance_reviews (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees (id) on delete cascade,
  period text not null,
  score int check (score between 1 and 5),
  remarks text,
  reviewer uuid default auth.uid(),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Communications
-- ---------------------------------------------------------------------------
create table message_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel message_channel not null,
  subject text,
  body text not null,
  purpose text not null default 'general',
  created_at timestamptz not null default now()
);

insert into message_templates (name, channel, subject, body, purpose) values
  ('Savings due reminder','sms', null, 'Dear {member_name}, your {product} savings contribution of {amount} is due on {due_date}. Thank you.', 'savings_due'),
  ('Loan repayment reminder','sms', null, 'Dear {member_name}, your loan installment of {amount} is due on {due_date}. Please pay to avoid penalties.', 'loan_due'),
  ('Meeting notice','email', 'Notice of {meeting_title}', 'Dear {member_name},\n\nYou are invited to {meeting_title} scheduled for {date} at {venue}.\n\nSecretary', 'meeting'),
  ('AGM notice','email', 'Notice of Annual General Meeting', 'Dear {member_name},\n\nNotice is hereby given that the Annual General Meeting will hold on {date} at {venue}.\n\nBy order of the Board', 'agm'),
  ('Dividend payment','sms', null, 'Dear {member_name}, a dividend of {amount} for {year} has been credited to you. Thank you for your patronage.', 'dividend');

create table message_log (
  id uuid primary key default gen_random_uuid(),
  channel message_channel not null,
  recipient text not null,
  subject text,
  body text not null,
  provider text,
  status text not null default 'queued' check (status in ('queued','sent','failed')),
  related_entity text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table integration_settings (
  id int primary key default 1 check (id = 1),
  email_provider text not null default 'smtp',
  email_config jsonb not null default '{}'::jsonb,
  sms_provider text not null default 'termii',
  sms_config jsonb not null default '{}'::jsonb,
  whatsapp_provider text not null default 'meta_cloud',
  whatsapp_config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into integration_settings (id) values (1);
