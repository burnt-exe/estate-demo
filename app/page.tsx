'use client';

import { useMemo, useState } from 'react';

type Message = { role: 'agent' | 'user'; content: string };
type Answer = { question: string; answer: string };

const opening = `Good day. I am the Property Transformation Discovery Agent. I will adapt the discussion to your role, business priorities and current operating environment. I may ask follow-up questions where an answer exposes a risk, dependency or opportunity. To begin, please introduce yourself, your role and the property portfolio you oversee.`;

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([{ role: 'agent', content: opening }]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [report, setReport] = useState<any>(null);

  const progress = useMemo(() => Math.min(100, Math.round((answers.length / 12) * 100)), [answers.length]);

  async function send() {
    const value = input.trim();
    if (!value || loading || complete) return;
    const latestQuestion = [...messages].reverse().find(m => m.role === 'agent')?.content || 'Initial discovery';
    const nextAnswers = [...answers, { question: latestQuestion, answer: value }];
    setAnswers(nextAnswers);
    setMessages(m => [...m, { role: 'user', content: value }]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: nextAnswers, messages })
      });
      const data = await response.json();
      if (data.complete) {
        setComplete(true);
        setReport(data.report);
        setMessages(m => [...m, { role: 'agent', content: data.message }]);
      } else {
        setMessages(m => [...m, { role: 'agent', content: data.message }]);
      }
    } catch {
      setMessages(m => [...m, { role: 'agent', content: 'I could not reach the analysis service. Your response has been retained. Please retry.' }]);
    } finally {
      setLoading(false);
    }
  }

  function download() {
    const blob = new Blob([JSON.stringify({ answers, report }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'property-discovery-assessment.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="shell">
      <header>
        <div>
          <p className="eyebrow">Agentic property transformation</p>
          <h1>Discovery, risk and capability assessment</h1>
          <p className="sub">A conversational assessment for Alberto, his partner and operational leadership. Each stakeholder can complete an individual session for later alignment analysis.</p>
        </div>
        <span className="status">Live MVP</span>
      </header>

      <section className="workspace">
        <aside>
          <h3>Assessment journey</h3>
          {['Stakeholder context','Business needs','Operational risks','Technology maturity','Capability confirmation','Pilot recommendation'].map((item, index) => (
            <div className={`stage ${answers.length >= index * 2 ? 'active' : ''}`} key={item}>
              <span>{index + 1}</span><div><strong>{item}</strong><small>{index < Math.floor(answers.length / 2) ? 'Evidence captured' : 'Pending'}</small></div>
            </div>
          ))}
          <div className="meter"><div style={{ width: `${progress}%` }} /></div>
          <p className="progress">{progress}% assessment coverage</p>
        </aside>

        <section className="conversation">
          <div className="messages">
            {messages.map((message, index) => <div key={index} className={`bubble ${message.role}`}>{message.content}</div>)}
            {loading && <div className="bubble agent">Analysing the answer and selecting the next evidence-based question…</div>}
          </div>
          {!complete && <div className="composer">
            <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Type your answer…" onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
            <button onClick={send} disabled={loading || !input.trim()}>Send response</button>
          </div>}
        </section>
      </section>

      {report && <section className="report">
        <div className="reportHead"><div><p className="eyebrow">Executive output</p><h2>Transformation readiness snapshot</h2></div><button onClick={download}>Download assessment</button></div>
        <div className="scores">
          {Object.entries(report.scores || {}).map(([key, value]) => <article key={key}><small>{key.replaceAll('_',' ')}</small><strong>{String(value)}%</strong></article>)}
        </div>
        <div className="reportGrid">
          <article><h3>Executive summary</h3><p>{report.executive_summary}</p></article>
          <article><h3>Priority risks</h3><ul>{(report.priority_risks || []).map((x:string)=><li key={x}>{x}</li>)}</ul></article>
          <article><h3>Recommended pilot</h3><ul>{(report.recommended_pilot || []).map((x:string)=><li key={x}>{x}</li>)}</ul></article>
          <article><h3>Decision gates</h3><ul>{(report.decision_gates || []).map((x:string)=><li key={x}>{x}</li>)}</ul></article>
        </div>
      </section>}
    </main>
  );
}
