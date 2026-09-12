-- Role-aware hardening for high-risk policy/accounting domains.
-- Ordinary operating tables remain membership-gated until their role workflows
-- are mapped during the frontend rebuild.

-- Pricing policy: all members may read. ADMIN owns consequential mutation.
-- COMMERCIAL may create and edit DRAFT rules only.
drop policy if exists pricing_rules_member_insert on public.pricing_rules;
drop policy if exists pricing_rules_member_update on public.pricing_rules;
drop policy if exists pricing_rules_member_delete on public.pricing_rules;

create policy pricing_rules_role_insert
on public.pricing_rules for insert
to authenticated
with check (
  private.has_app_role(array['ADMIN'])
  or (private.has_app_role(array['COMMERCIAL']) and status = 'DRAFT')
);

create policy pricing_rules_role_update
on public.pricing_rules for update
to authenticated
using (
  private.has_app_role(array['ADMIN'])
  or (private.has_app_role(array['COMMERCIAL']) and status = 'DRAFT')
)
with check (
  private.has_app_role(array['ADMIN'])
  or (private.has_app_role(array['COMMERCIAL']) and status = 'DRAFT')
);

create policy pricing_rules_admin_delete
on public.pricing_rules for delete
to authenticated
using (private.has_app_role(array['ADMIN']));

-- Reusable economic/cost rates are governed policy. Keep read broad internally,
-- but mutations ADMIN-only until a lower-risk draft workflow is explicitly earned.
drop policy if exists economic_rate_profiles_member_all on public.economic_rate_profiles;
create policy economic_rate_profiles_member_select
on public.economic_rate_profiles for select
to authenticated
using (private.is_app_member());
create policy economic_rate_profiles_admin_insert
on public.economic_rate_profiles for insert
to authenticated
with check (private.has_app_role(array['ADMIN']));
create policy economic_rate_profiles_admin_update
on public.economic_rate_profiles for update
to authenticated
using (private.has_app_role(array['ADMIN']))
with check (private.has_app_role(array['ADMIN']));
create policy economic_rate_profiles_admin_delete
on public.economic_rate_profiles for delete
to authenticated
using (private.has_app_role(array['ADMIN']));

-- Company-level accounts/costs are distinct from engagement-level economics.
drop policy if exists financial_accounts_member_all on public.financial_accounts;
create policy financial_accounts_member_select
on public.financial_accounts for select
to authenticated
using (private.is_app_member());
create policy financial_accounts_admin_insert
on public.financial_accounts for insert
to authenticated
with check (private.has_app_role(array['ADMIN']));
create policy financial_accounts_admin_update
on public.financial_accounts for update
to authenticated
using (private.has_app_role(array['ADMIN']))
with check (private.has_app_role(array['ADMIN']));
create policy financial_accounts_admin_delete
on public.financial_accounts for delete
to authenticated
using (private.has_app_role(array['ADMIN']));

drop policy if exists financial_account_snapshots_member_insert on public.financial_account_snapshots;
create policy financial_account_snapshots_admin_insert
on public.financial_account_snapshots for insert
to authenticated
with check (private.has_app_role(array['ADMIN']));

drop policy if exists company_cost_items_member_all on public.company_cost_items;
create policy company_cost_items_member_select
on public.company_cost_items for select
to authenticated
using (private.is_app_member());
create policy company_cost_items_admin_insert
on public.company_cost_items for insert
to authenticated
with check (private.has_app_role(array['ADMIN']));
create policy company_cost_items_admin_update
on public.company_cost_items for update
to authenticated
using (private.has_app_role(array['ADMIN']))
with check (private.has_app_role(array['ADMIN']));
create policy company_cost_items_admin_delete
on public.company_cost_items for delete
to authenticated
using (private.has_app_role(array['ADMIN']));

-- Asset-economic snapshots are consequential business/economic assertions.
drop policy if exists resource_economic_snapshots_member_insert on public.resource_economic_snapshots;
create policy resource_economic_snapshots_admin_insert
on public.resource_economic_snapshots for insert
to authenticated
with check (private.has_app_role(array['ADMIN']));
