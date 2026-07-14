import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

const AcceptSchema = z.object({ userId: z.string().uuid(), email: z.string().email(), fullName: z.string().min(2).max(120) });
const hash = (token: string) => createHash('sha256').update(token).digest('hex');

async function findInvitation(token: string) {
  const supabase = createAdminClient();
  return supabase.from('stakeholder_invitations')
    .select('id,organisation_id,email,full_name,role,title,status,expires_at,organisations(name)')
    .eq('token_hash', hash(token)).single();
}

export async function GET(_request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const { data, error } = await findInvitation(token);
  if (error || !data || data.status !== 'pending' || new Date(data.expires_at) <= new Date()) {
    return NextResponse.json({ error: 'Invitation is invalid or expired' }, { status: 404 });
  }
  return NextResponse.json({ invitation: { email: data.email, fullName: data.full_name, role: data.role, title: data.title, expiresAt: data.expires_at, organisation: data.organisations } });
}

export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const parsed = AcceptSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = createAdminClient();
  const { data: invitation, error } = await findInvitation(token);
  if (error || !invitation || invitation.status !== 'pending' || new Date(invitation.expires_at) <= new Date()) {
    return NextResponse.json({ error: 'Invitation is invalid or expired' }, { status: 404 });
  }
  if (invitation.email.toLowerCase() !== parsed.data.email.toLowerCase()) {
    return NextResponse.json({ error: 'Invitation email does not match authenticated user' }, { status: 403 });
  }

  const { data: session, error: sessionError } = await supabase.from('assessment_sessions').insert({
    organisation_id: invitation.organisation_id,
    invitation_id: invitation.id,
    participant_user_id: parsed.data.userId,
    participant_email: invitation.email,
    participant_name: parsed.data.fullName,
    participant_role: invitation.role,
    participant_title: invitation.title,
    status: 'in_progress',
    started_at: new Date().toISOString()
  }).select('*').single();
  if (sessionError) return NextResponse.json({ error: 'Could not create assessment session' }, { status: 500 });

  await supabase.from('stakeholder_invitations').update({ status: 'accepted', accepted_by: parsed.data.userId, accepted_at: new Date().toISOString() }).eq('id', invitation.id);
  await supabase.from('assessment_events').insert({ session_id: session.id, actor_user_id: parsed.data.userId, event_type: 'invitation_accepted' });

  return NextResponse.json({ session }, { status: 201 });
}
