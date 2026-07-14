'use client';

import { useEffect, useMemo, useState } from 'react';

type Answer = { id?: number; sequence_number: number; stage: string; question: string; answer: string };
type Session = { id: string; participant_name: string; participant_role: string; participant_title?: string; current_stage: string; current_question?: string; completion_percent: number; assessment_answers?: Answer[] };
type Message = { role: 'agent' | 'user'; content: string };

const opening = 'Welcome back. I will continue the property transformation discovery from the latest securely saved point.';

export default function AssessmentWorkspace() {
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('Recovering your assessment session…');

  useEffect(() => {
    fetch('/api/assessment-sessions/current').then(async response => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not recover session');
      if (!body.session) throw new Error('No active assessment session was found');
      const recovered: Session = body.session;
      setSession(recovered);
      const restored: Message[] = [];
      (recovered.assessment_answers || []).forEach(answer => {
        restored.push({ role: 'agent', content: answer.question });
        restored.push({ role: 'user', content: answer.answer });
      });
      restored.push({ role: 'agent', content: recovered.current_question || opening });
      setMessages(restored);
      setStatus(`Session recovered · ${recovered.completion_percent}% complete`);
    }).catch(error => setStatus(error.message)).finally(() => setLoading(false));
  }, []);

  const answers = useMemo(() => (session?.assessment_answers || []).map(answer => ({ question: answer.question, answer: answer.answer })), [session]);

  async function send() {
    if (!session || !input.trim() || loading) return;
    const value = input.trim();
    const question = [...messages].reverse().find(message => message.role === 'agent')?.content || 'Discovery question';
    const sequenceNumber = (session.assessment_answers?.length || 0) + 1;
    setLoading(true);
    setInput('');
    setMessages(current => [...current, { role: 'user', content: value }]);

    try {
      const analysis = await fetch('/api/discovery', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: [...answers, { question, answer: value }], messages })
      });
      const result = await analysis.json();
      const completion = Math.min(100, Math.round((sequenceNumber / 12) * 100));
      const save = await fetch('/api/assessment-sessions/current', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          currentStage: result.complete ? 'pilot_recommendation' : session.current_stage,
          currentQuestion: result.message,
          completionPercent: result.complete ? 100 : completion,
          context: { role: session.participant_role, title: session.participant_title },
          answer: { sequenceNumber, stage: session.current_stage, question, answer: value, evidenceTags: [], riskTags: [], metadata: {} }
        })
      });
      if (!save.ok) throw new Error('The answer was analysed but could not be persisted');
      setSession(current => current ? { ...current, current_question: result.message, completion_percent: result.complete ? 100 : completion, assessment_answers: [...(current.assessment_answers || []), { sequence_number: sequenceNumber, stage: current.current_stage, question, answer: value }] } : current);
      setMessages(current => [...current, { role: 'agent', content: result.message }]);
      setStatus(result.complete ? 'Assessment complete and securely saved' : `Progress securely saved · ${completion}% complete`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not save assessment progress');
    } finally {
      setLoading(false);
    }
  }

  return <main className="assessmentShell">
    <header className="assessmentHeader"><div><p className="eyebrow">Secure assessment workspace</p><h1>{session?.participant_name || 'Stakeholder discovery'}</h1><p className="sub">{session ? `${session.participant_role}${session.participant_title ? ` · ${session.participant_title}` : ''}` : status}</p></div><span className="statusDot">{status}</span></header>
    <section className="conversation"><div className="messages">{messages.map((message, index) => <div className={`bubble ${message.role}`} key={index}>{message.content}</div>)}{loading && <div className="bubble agent">Loading and analysing…</div>}</div><div className="composer"><textarea value={input} onChange={event => setInput(event.target.value)} disabled={!session || loading} placeholder="Type your answer…"/><button onClick={send} disabled={!session || loading || !input.trim()}>Save and continue</button></div></section>
  </main>;
}
