-- ============================================================================
-- Migration 004: Row Level Security
-- Staff (any non-member role) can operate; admins manage settings;
-- members can read their own records and cast their own votes.
-- ============================================================================

-- helper macro-style policies applied table by table
do $$
declare t text;
begin
  foreach t in array array[
    'org_settings','branches','profiles','audit_logs',
    'members','member_relations','member_documents',
    'savings_products','savings_accounts','savings_transactions',
    'share_settings','share_purchases','dividend_declarations','dividend_payouts',
    'loan_products','loans','loan_guarantors','loan_schedule','loan_repayments',
    'gl_accounts','journals','journal_lines',
    'investments','investment_returns',
    'vendors','purchase_orders','assets','inventory_items',
    'employees','attendance','leave_requests','performance_reviews',
    'message_templates','message_log','integration_settings',
    'committees','committee_members','meetings','meeting_agenda','meeting_attendance',
    'resolutions','resolution_votes','elections','election_positions','election_candidates',
    'election_ballots','policy_documents'
  ] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- Org settings: everyone authenticated can read (branding), admins update
create policy org_settings_read on org_settings for select to authenticated using (true);
create policy org_settings_write on org_settings for update to authenticated using (is_admin()) with check (is_admin());

-- Branches: read all authenticated, write admin
create policy branches_read on branches for select to authenticated using (true);
create policy branches_write on branches for all to authenticated using (is_admin()) with check (is_admin());

-- Profiles: self read/update; staff read all; admins manage
create policy profiles_self_read on profiles for select to authenticated using (id = auth.uid() or is_staff());
create policy profiles_self_update on profiles for update to authenticated using (id = auth.uid() or is_admin()) with check (id = auth.uid() or is_admin());
create policy profiles_admin_insert on profiles for insert to authenticated with check (is_admin());

-- Audit logs: staff read; inserts via security-definer function only
create policy audit_read on audit_logs for select to authenticated using (is_staff());

-- Members: staff full; a member can read their own record
create policy members_staff_all on members for all to authenticated using (is_staff()) with check (is_staff());
create policy members_self_read on members for select to authenticated using (profile_id = auth.uid());

create policy member_relations_staff on member_relations for all to authenticated using (is_staff()) with check (is_staff());
create policy member_relations_self on member_relations for select to authenticated
  using (exists (select 1 from members m where m.id = member_id and m.profile_id = auth.uid()));

create policy member_documents_staff on member_documents for all to authenticated using (is_staff()) with check (is_staff());
create policy member_documents_self on member_documents for select to authenticated
  using (exists (select 1 from members m where m.id = member_id and m.profile_id = auth.uid()));

-- Savings
create policy savings_products_read on savings_products for select to authenticated using (true);
create policy savings_products_write on savings_products for all to authenticated using (is_admin()) with check (is_admin());
create policy savings_accounts_staff on savings_accounts for all to authenticated using (is_staff()) with check (is_staff());
create policy savings_accounts_self on savings_accounts for select to authenticated
  using (exists (select 1 from members m where m.id = member_id and m.profile_id = auth.uid()));
create policy savings_txn_staff_read on savings_transactions for select to authenticated using (is_staff());
create policy savings_txn_self_read on savings_transactions for select to authenticated
  using (exists (select 1 from savings_accounts a join members m on m.id = a.member_id
                 where a.id = account_id and m.profile_id = auth.uid()));
-- inserts happen only through post_savings_txn (security definer)

-- Shares & dividends
create policy share_settings_read on share_settings for select to authenticated using (true);
create policy share_settings_write on share_settings for update to authenticated using (is_admin()) with check (is_admin());
create policy share_purchases_staff on share_purchases for all to authenticated using (is_staff()) with check (is_staff());
create policy share_purchases_self on share_purchases for select to authenticated
  using (exists (select 1 from members m where m.id = member_id and m.profile_id = auth.uid()));
create policy dividends_staff on dividend_declarations for all to authenticated using (is_staff()) with check (is_staff());
create policy dividend_payouts_staff on dividend_payouts for all to authenticated using (is_staff()) with check (is_staff());
create policy dividend_payouts_self on dividend_payouts for select to authenticated
  using (exists (select 1 from members m where m.id = member_id and m.profile_id = auth.uid()));

-- Loans
create policy loan_products_read on loan_products for select to authenticated using (true);
create policy loan_products_write on loan_products for all to authenticated using (is_admin()) with check (is_admin());
create policy loans_staff on loans for all to authenticated using (is_staff()) with check (is_staff());
create policy loans_self on loans for select to authenticated
  using (exists (select 1 from members m where m.id = member_id and m.profile_id = auth.uid()));
create policy loan_guarantors_staff on loan_guarantors for all to authenticated using (is_staff()) with check (is_staff());
create policy loan_schedule_read on loan_schedule for select to authenticated
  using (is_staff() or exists (select 1 from loans l join members m on m.id = l.member_id
                               where l.id = loan_id and m.profile_id = auth.uid()));
create policy loan_repayments_staff on loan_repayments for all to authenticated using (is_staff()) with check (is_staff());
create policy loan_repayments_self on loan_repayments for select to authenticated
  using (exists (select 1 from loans l join members m on m.id = l.member_id
                 where l.id = loan_id and m.profile_id = auth.uid()));

-- General ledger: finance/staff only
create policy gl_read on gl_accounts for select to authenticated using (is_staff());
create policy gl_write on gl_accounts for all to authenticated using (is_admin()) with check (is_admin());
create policy journals_staff on journals for all to authenticated using (is_staff()) with check (is_staff());
create policy journal_lines_staff on journal_lines for all to authenticated using (is_staff()) with check (is_staff());

-- Investments, procurement, HR, comms: staff
create policy investments_staff on investments for all to authenticated using (is_staff()) with check (is_staff());
create policy inv_returns_staff on investment_returns for all to authenticated using (is_staff()) with check (is_staff());
create policy vendors_staff on vendors for all to authenticated using (is_staff()) with check (is_staff());
create policy po_staff on purchase_orders for all to authenticated using (is_staff()) with check (is_staff());
create policy assets_staff on assets for all to authenticated using (is_staff()) with check (is_staff());
create policy inventory_staff on inventory_items for all to authenticated using (is_staff()) with check (is_staff());
create policy employees_staff on employees for all to authenticated using (is_staff()) with check (is_staff());
create policy attendance_staff on attendance for all to authenticated using (is_staff()) with check (is_staff());
create policy leave_staff on leave_requests for all to authenticated using (is_staff()) with check (is_staff());
create policy reviews_staff on performance_reviews for all to authenticated using (is_staff()) with check (is_staff());
create policy templates_staff on message_templates for all to authenticated using (is_staff()) with check (is_staff());
create policy msglog_staff on message_log for all to authenticated using (is_staff()) with check (is_staff());
create policy integrations_admin_read on integration_settings for select to authenticated using (is_admin());
create policy integrations_admin_write on integration_settings for update to authenticated using (is_admin()) with check (is_admin());

-- Governance: staff manage; members can view meetings/resolutions/elections/policies
create policy committees_read on committees for select to authenticated using (true);
create policy committees_write on committees for all to authenticated using (is_staff()) with check (is_staff());
create policy committee_members_read on committee_members for select to authenticated using (true);
create policy committee_members_write on committee_members for all to authenticated using (is_staff()) with check (is_staff());

create policy meetings_read on meetings for select to authenticated using (true);
create policy meetings_write on meetings for all to authenticated using (is_staff()) with check (is_staff());
create policy agenda_read on meeting_agenda for select to authenticated using (true);
create policy agenda_write on meeting_agenda for all to authenticated using (is_staff()) with check (is_staff());
create policy attendance_gov_read on meeting_attendance for select to authenticated using (true);
create policy attendance_gov_write on meeting_attendance for all to authenticated using (is_staff()) with check (is_staff());

create policy resolutions_read on resolutions for select to authenticated using (true);
create policy resolutions_write on resolutions for all to authenticated using (is_staff()) with check (is_staff());
create policy res_votes_read on resolution_votes for select to authenticated using (is_staff());
create policy res_votes_self_read on resolution_votes for select to authenticated
  using (exists (select 1 from members m where m.id = member_id and m.profile_id = auth.uid()));
-- votes are cast through cast_resolution_vote (security definer)

create policy elections_read on elections for select to authenticated using (true);
create policy elections_write on elections for all to authenticated using (is_staff()) with check (is_staff());
create policy positions_read on election_positions for select to authenticated using (true);
create policy positions_write on election_positions for all to authenticated using (is_staff()) with check (is_staff());
create policy candidates_read on election_candidates for select to authenticated using (true);
create policy candidates_write on election_candidates for all to authenticated using (is_staff()) with check (is_staff());
create policy ballots_staff_read on election_ballots for select to authenticated using (is_staff());
-- ballots are cast through cast_election_ballot (security definer)

create policy policies_read on policy_documents for select to authenticated
  using (status = 'approved' or is_staff());
create policy policies_write on policy_documents for all to authenticated using (is_staff()) with check (is_staff());
