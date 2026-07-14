# Secure stakeholder assessment architecture

## Implemented capabilities

- One-time 256-bit invitation tokens; only SHA-256 hashes are persisted.
- Invitation expiry, revocation and acceptance state.
- Organisation, stakeholder role, title and invited-email context.
- Supabase Auth passwordless email verification using PKCE.
- Server-derived authenticated identity when accepting an invitation.
- PostgreSQL persistence for organisations, memberships, invitations, sessions, answers and audit events.
- Row Level Security for tenant and participant isolation.
- Assessment recovery using the latest active session for the authenticated stakeholder.
- Incremental answer upserts, current-stage persistence and completion tracking.
- SSR cookie refresh with private/no-store cache controls.

## Activation

1. Create or select a Supabase project.
2. Apply migrations in `supabase/migrations` in timestamp order.
3. Run Supabase security and performance advisors and resolve all material findings.
4. Configure Auth Site URL and redirect URLs for `/auth/callback`.
5. Configure the Confirm signup and Magic Link templates for PKCE redirects.
6. Set the variables documented in `.env.example`.
7. Keep `SUPABASE_SECRET_KEY` and `ADMIN_API_KEY` server-only. Never expose either through `NEXT_PUBLIC_` variables.
8. Generate a strong random `ADMIN_API_KEY` and protect invitation creation behind an authenticated administrator interface or API gateway before production.

## Invitation flow

1. An authorised administrator calls `POST /api/invitations` with organisation, stakeholder email, role and title.
2. The server creates a random token, stores only its hash and returns the stakeholder URL.
3. The stakeholder opens `/invite/{token}` and reviews their assigned organisation and role context.
4. Supabase Auth sends a passwordless email link to the exact invited email.
5. After PKCE callback, the server verifies the authenticated email against the invitation.
6. The invitation is marked accepted and an isolated assessment session is created.
7. The stakeholder is redirected to `/assessment`.

## Recovery flow

- `GET /api/assessment-sessions/current` restores the latest active session and ordered answers.
- `PATCH /api/assessment-sessions/current` saves current stage, question, completion, context and the latest answer.
- RLS restricts participants to their own sessions and permits owner, administrator and consultant roles to review sessions in their organisation.

## Production controls still required

- Replace the temporary `x-admin-key` control with authenticated administrator RBAC.
- Add rate limiting and bot protection to invitation and authentication endpoints.
- Add invitation revocation and resend interfaces.
- Add session timeout, retention and deletion workflows.
- Add consent and privacy-notice evidence.
- Add audit-event insert policies or a protected server-only event service.
- Add integration and end-to-end tests.
- Deploy to Vercel, Azure App Service or another Node.js-compatible runtime.
