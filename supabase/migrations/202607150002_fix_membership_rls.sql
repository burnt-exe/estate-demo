drop policy if exists members_same_org_select on public.organisation_members;
create policy members_own_membership_select on public.organisation_members
for select to authenticated
using (user_id = (select auth.uid()));
