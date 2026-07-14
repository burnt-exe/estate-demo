import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const SaveSchema = z.object({
  sessionId: z.string().uuid(),
  currentStage: z.string().min(1).max(80),
  currentQuestion: z.string().max(2000).nullable().optional(),
  completionPercent: z.number().int().min(0).max(100),
  context: z.record(z.unknown()).default({}),
  answer: z.object({
    sequenceNumber: z.number().int().positive(),
    stage: z.string().min(1).max(80),
    question: z.string().min(1).max(2000),
    answer: z.string().min(1).max(10000),
    evidenceTags: z.array(z.string().max(80)).max(30).default([]),
    riskTags: z.array(z.string().max(80)).max(30).default([]),
    metadata: z.record(z.unknown()).default({})
  }).optional()
});

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const { data: session, error } = await supabase.from('assessment_sessions')
    .select('*, assessment_answers(*)')
    .eq('participant_user_id', user.id)
    .in('status', ['in_progress','invited'])
    .order('last_activity_at', { ascending: false })
    .order('sequence_number', { referencedTable: 'assessment_answers', ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'Could not recover assessment session' }, { status: 500 });
  return NextResponse.json({ session });
}

export async function PATCH(request: NextRequest) {
  const parsed = SaveSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const now = new Date().toISOString();
  const { data: session, error } = await supabase.from('assessment_sessions').update({
    current_stage: parsed.data.currentStage,
    current_question: parsed.data.currentQuestion,
    completion_percent: parsed.data.completionPercent,
    context: parsed.data.context,
    last_activity_at: now,
    updated_at: now
  }).eq('id', parsed.data.sessionId).eq('participant_user_id', user.id).select('*').single();

  if (error) return NextResponse.json({ error: 'Could not save assessment progress' }, { status: 500 });

  if (parsed.data.answer) {
    const a = parsed.data.answer;
    const { error: answerError } = await supabase.from('assessment_answers').upsert({
      session_id: parsed.data.sessionId,
      sequence_number: a.sequenceNumber,
      stage: a.stage,
      question: a.question,
      answer: a.answer,
      evidence_tags: a.evidenceTags,
      risk_tags: a.riskTags,
      metadata: a.metadata,
      updated_at: now
    }, { onConflict: 'session_id,sequence_number' });
    if (answerError) return NextResponse.json({ error: 'Session saved but answer persistence failed' }, { status: 500 });
  }

  return NextResponse.json({ session });
}
