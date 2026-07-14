import { createHash, randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

const Schema = z.object({
  organisationId: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string().min(2).max(120).optional(),
  role: z.enum(['stakeholder','operations','finance','technology','viewer']),
  title: z.string().max(120).optional(),
  expiresInHours: z.number().int().min(1).max(336).default(72)
});

export async function POST(request: NextRequest) {
  if (!process.env.ADMIN_API_KEY || request.headers.get('x-admin-key') !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const parsed = Schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + parsed.data.expiresInHours * 3600000).toISOString();
  const supabase = createAdminClient();

  const { data, error } = await supabase.from('stakeholder_invitations').insert({
    organisation_id: parsed.data.organisationId,
    email: parsed.data.email.toLowerCase(),
    full_name: parsed.data.fullName,
    role: parsed.data.role,
    title: parsed.data.title,
    token_hash: tokenHash,
    expires_at: expiresAt
  }).select('id,email,role,title,expires_at').single();

  if (error) return NextResponse.json({ error: 'Could not create invitation' }, { status: 500 });

  const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  return NextResponse.json({ invitation: data, invitationUrl: `${origin}/invite/${token}` }, { status: 201 });
}
