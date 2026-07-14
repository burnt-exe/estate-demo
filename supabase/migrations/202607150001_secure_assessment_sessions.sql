create extension if not exists pgcrypto;

create type public.organisation_role as enum ('owner','administrator','consultant','stakeholder','operations','finance','technology','viewer');
create type public.invitation_status as enum ('pending','accepted','expired','revoked');
create type public.assessment_status as enum ('invited','in_progress','submitted','reviewed','archived');

create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  registration_number text,
  industry text not null default 'property',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organisation_members (
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.organisation_role not null,
  title text,
  created_at timestamptz not null default now(),
  primary key (organisation_id,user_id)
);

create table public.stakeholder_invitations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  email citext not null,
  full_name text,
  role public.organisation_role not null default 'stakeholder',
  title text,
  token_hash text not null unique,
  status public.invitation_status not null default 'pending',
  expires_at timestamptz not null,
  accepted_by uuid references auth.users(id),
  accepted_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);

create table public.assessment_sessions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  invitation_id uuid unique references public.stakeholder_invitations(id) on delete set null,
  participant_user_id uuid references auth.users(id) on delete set null,
  participant_email citext not null,
  participant_name text,
  participant_role public.organisation_role not null default 'stakeholder',
  participant_title text,
  status public.assessment_status not null default 'invited',
  current_stage text not null default 'stakeholder_context',
  current_question text,
  completion_percent integer not null default 0 check (completion_percent between 0 and 100),
  context jsonb not null default '{}'::jsonb,
  report jsonb,
  started_at timestamptz,
  submitted_at timestamptz,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assessment_answers (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.assessment_sessions(id) on delete cascade,
  sequence_number integer not null,
  stage text not null,
  question text not null,
  answer text not null,
  evidence_tags text[] not null default '{}',
  risk_tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(session_id,sequence_number)
);

create table public.assessment_events (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.assessment_sessions(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index assessment_sessions_participant_idx on public.assessment_sessions(participant_user_id,last_activity_at desc);
create index assessment_sessions_org_idx on public.assessment_sessions(organisation_id,status);
create index assessment_answers_session_idx on public.assessment_answers(session_id,sequence_number);
create index invitations_org_status_idx on public.stakeholder_invitations(organisation_id,status,expires_at);

alter table public.organisations enable row level security;
alter table public.organisation_members enable row level security;
alter table public.stakeholder_invitations enable row level security;
alter table public.assessment_sessions enable row level security;
alter table public.assessment_answers enable row level security;
alter table public.assessment_events enable row level security;

create policy organisations_member_select on public.organisations for select to authenticated
using (exists (select 1 from public.organisation_members m where m.organisation_id=id and m.user_id=(select auth.uid())));

create policy members_same_org_select on public.organisation_members for select to authenticated
using (exists (select 1 from public.organisation_members self where self.organisation_id=organisation_id and self.user_id=(select auth.uid())));

create policy invitations_admin_select on public.stakeholder_invitations for select to authenticated
using (exists (select 1 from public.organisation_members m where m.organisation_id=organisation_id and m.user_id=(select auth.uid()) and m.role in ('owner','administrator','consultant')));

create policy sessions_participant_or_admin_select on public.assessment_sessions for select to authenticated
using (
  participant_user_id=(select auth.uid()) or exists (
    select 1 from public.organisation_members m
    where m.organisation_id=organisation_id and m.user_id=(select auth.uid()) and m.role in ('owner','administrator','consultant')
  )
);

create policy sessions_participant_update on public.assessment_sessions for update to authenticated
using (participant_user_id=(select auth.uid()))
with check (participant_user_id=(select auth.uid()));

create policy answers_session_participant_select on public.assessment_answers for select to authenticated
using (exists (select 1 from public.assessment_sessions s where s.id=session_id and (s.participant_user_id=(select auth.uid()) or exists (select 1 from public.organisation_members m where m.organisation_id=s.organisation_id and m.user_id=(select auth.uid()) and m.role in ('owner','administrator','consultant')))));

create policy answers_session_participant_insert on public.assessment_answers for insert to authenticated
with check (exists (select 1 from public.assessment_sessions s where s.id=session_id and s.participant_user_id=(select auth.uid()) and s.status='in_progress'));

create policy answers_session_participant_update on public.assessment_answers for update to authenticated
using (exists (select 1 from public.assessment_sessions s where s.id=session_id and s.participant_user_id=(select auth.uid()) and s.status='in_progress'))
with check (exists (select 1 from public.assessment_sessions s where s.id=session_id and s.participant_user_id=(select auth.uid()) and s.status='in_progress'));

create policy events_session_access_select on public.assessment_events for select to authenticated
using (exists (select 1 from public.assessment_sessions s where s.id=session_id and (s.participant_user_id=(select auth.uid()) or exists (select 1 from public.organisation_members m where m.organisation_id=s.organisation_id and m.user_id=(select auth.uid()) and m.role in ('owner','administrator','consultant')))));

revoke all on public.organisations, public.organisation_members, public.stakeholder_invitations, public.assessment_sessions, public.assessment_answers, public.assessment_events from anon;
grant select on public.organisations, public.organisation_members, public.stakeholder_invitations, public.assessment_sessions, public.assessment_answers, public.assessment_events to authenticated;
grant update on public.assessment_sessions to authenticated;
grant insert,update on public.assessment_answers to authenticated;
