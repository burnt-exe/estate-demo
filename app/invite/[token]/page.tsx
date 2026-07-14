'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Invitation = {
  email: string;
  fullName?: string;
  role: string;
  title?: string;
  expiresAt: string;
  organisation?: { name?: string } | null;
};

export default function InvitationPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [fullName, setFullName] = useState('');
  const [status, setStatus] = useState('Validating invitation…');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/invitations/${token}`).then(async response => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Invalid invitation');
      setInvitation(body.invitation);
      setFullName(body.invitation.fullName || '');
      setStatus('Invitation verified');
    }).catch(error => setStatus(error.message));
  }, [token]);

  async function continueSecurely() {
    if (!invitation || !fullName.trim()) return;
    setBusy(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const next = `/invite/${token}`;
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const { error } = await supabase.auth.signInWithOtp({
        email: invitation.email,
        options: { emailRedirectTo: redirectTo, shouldCreateUser: true }
      });
      setStatus(error ? error.message : `A secure sign-in link was sent to ${invitation.email}.`);
      setBusy(false);
      return;
    }

    const response = await fetch(`/api/invitations/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: fullName.trim() })
    });
    const body = await response.json();
    if (!response.ok) {
      setStatus(body.error || 'Could not accept invitation');
      setBusy(false);
      return;
    }
    router.push('/?view=discovery&resume=1');
  }

  return (
    <main className="inviteShell">
      <section className="inviteCard">
        <p className="eyebrow">Secure stakeholder invitation</p>
        <h1>{invitation?.organisation?.name || 'Property transformation assessment'}</h1>
        <p className="sub">This invitation is assigned to one stakeholder and requires verification of the invited email address before an assessment session is created.</p>
        {invitation && <div className="contextGrid">
          <article><small>Invited email</small><strong>{invitation.email}</strong></article>
          <article><small>Role</small><strong>{invitation.role}</strong></article>
          <article><small>Title</small><strong>{invitation.title || 'Not specified'}</strong></article>
          <article><small>Expires</small><strong>{new Date(invitation.expiresAt).toLocaleString()}</strong></article>
        </div>}
        <label className="fieldLabel" htmlFor="fullName">Full name</label>
        <input id="fullName" value={fullName} onChange={event => setFullName(event.target.value)} placeholder="Enter your full name" />
        <button onClick={continueSecurely} disabled={!invitation || busy || !fullName.trim()}>{busy ? 'Processing…' : 'Verify and continue'}</button>
        <p className="statusText">{status}</p>
      </section>
    </main>
  );
}
