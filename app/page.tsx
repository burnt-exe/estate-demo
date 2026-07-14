'use client';

import { useMemo, useState } from 'react';

type Message = { role: 'agent' | 'user'; content: string };
type Answer = { question: string; answer: string };
type Report = {
  scores?: Record<string, number>;
  executive_summary?: string;
  priority_risks?: string[];
  recommended_pilot?: string[];
  decision_gates?: string[];
};
type ViewKey = 'overview' | 'discovery' | 'portfolio' | 'rentals' | 'maintenance' | 'municipal' | 'risk' | 'analytics';

const opening = `Good day. I am the Property Transformation Discovery Agent. I will adapt the discussion to your role, business priorities and current operating environment. I may ask follow-up questions where an answer exposes a risk, dependency or opportunity. To begin, please introduce yourself, your role and the property portfolio you oversee.`;

const navItems: { key: ViewKey; label: string; short: string }[] = [
  { key: 'overview', label: 'Executive overview', short: 'Overview' },
  { key: 'discovery', label: 'Agentic discovery', short: 'Discovery' },
  { key: 'portfolio', label: 'Portfolio operations', short: 'Portfolio' },
  { key: 'rentals', label: 'Rentals and leasing', short: 'Rentals' },
  { key: 'maintenance', label: 'Maintenance', short: 'Maintenance' },
  { key: 'municipal', label: 'Municipal and utilities', short: 'Utilities' },
  { key: 'risk', label: 'Risk and compliance', short: 'Risk' },
  { key: 'analytics', label: 'Analytics and insights', short: 'Analytics' }
];

const capabilityCards = [
  ['Agentic discovery', 'Adaptive stakeholder interviews, evidence-gap detection and executive recommendations.'],
  ['Portfolio register', 'Properties, buildings, units, occupancy, ownership and operating documents.'],
  ['Rentals and leasing', 'Applications, leases, collections, arrears, renewals and inspections.'],
  ['Maintenance operations', 'Requests, work orders, contractor allocation, approvals and cost history.'],
  ['Municipal controls', 'Statements, meters, consumption, disputes, due dates and allocation anomalies.'],
  ['Risk and compliance', 'POPIA, documents, payments, security, contractor and operational controls.'],
  ['Owner and tenant portals', 'Role-specific self-service, communication and case visibility.'],
  ['AI and analytics', 'Forecasting, anomaly detection, summaries, pricing insight and performance dashboards.']
];

const properties = [
  ['Corner House', 'Johannesburg CBD', '96%', 'R1.24m', '3 open'],
  ['Market Square', 'Germiston', '88%', 'R742k', '7 open'],
  ['Hillview Rooms', 'Yeoville', '91%', 'R386k', '4 open'],
  ['Main Street Retail', 'Johannesburg CBD', '82%', 'R518k', '6 open']
];

const rentalRows = [
  ['Unit 4B', 'Nomsa Dlamini', 'Paid', 'R6,800', '31 Aug 2026'],
  ['Shop 12', 'Metro Mobile', '7 days overdue', 'R14,500', '31 Jul 2026'],
  ['Room 203', 'Thabo Mokoena', 'Payment plan', 'R3,250', '31 Jul 2026'],
  ['Unit 7A', 'Lerato Maseko', 'Renewal due', 'R7,400', '30 Sep 2026']
];

const maintenanceRows = [
  ['Water leak — Unit 4B', 'Urgent', 'Plumbing', 'Assigned', '2h'],
  ['Lift service', 'High', 'Mechanical', 'Awaiting approval', '1d'],
  ['Broken shop shutter', 'High', 'Security', 'Contractor en route', '45m'],
  ['Corridor lighting', 'Normal', 'Electrical', 'Scheduled', '3d']
];

export default function Home() {
  const [activeView, setActiveView] = useState<ViewKey>('overview');
  const [navOpen, setNavOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ role: 'agent', content: opening }]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [report, setReport] = useState<Report | null>(null);

  const progress = useMemo(() => Math.min(100, Math.round((answers.length / 12) * 100)), [answers.length]);

  async function send() {
    const value = input.trim();
    if (!value || loading || complete) return;
    const latestQuestion = [...messages].reverse().find(message => message.role === 'agent')?.content || 'Initial discovery';
    const nextAnswers = [...answers, { question: latestQuestion, answer: value }];
    setAnswers(nextAnswers);
    setMessages(current => [...current, { role: 'user', content: value }]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: nextAnswers, messages })
      });
      const data = await response.json();
      setMessages(current => [...current, { role: 'agent', content: data.message }]);
      if (data.complete) {
        setComplete(true);
        setReport(data.report);
      }
    } catch {
      setMessages(current => [...current, { role: 'agent', content: 'I could not reach the analysis service. Your response has been retained. Please retry.' }]);
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

  function selectView(view: ViewKey) {
    setActiveView(view);
    setNavOpen(false);
  }

  return (
    <main className="appShell">
      <aside className={`sideNav ${navOpen ? 'open' : ''}`}>
        <div className="brandBlock">
          <span className="brandMark">P</span>
          <div><strong>PropertyOS</strong><small>Transformation prototype</small></div>
        </div>
        <nav>
          {navItems.map(item => (
            <button key={item.key} className={activeView === item.key ? 'navItem active' : 'navItem'} onClick={() => selectView(item.key)}>
              <span>{item.short.slice(0, 2).toUpperCase()}</span>{item.label}
            </button>
          ))}
        </nav>
        <div className="sideFoot"><strong>Demonstration workspace</strong><small>Responsive wireframes · Agentic discovery · Local fallback</small></div>
      </aside>

      <section className="mainArea">
        <header className="topBar">
          <button className="menuButton" onClick={() => setNavOpen(value => !value)} aria-label="Toggle navigation">☰</button>
          <div><p className="eyebrow">Property operating platform</p><h1>{navItems.find(item => item.key === activeView)?.label}</h1></div>
          <div className="topActions"><button className="ghostButton">Share assessment</button><span className="statusDot">Prototype live</span></div>
        </header>

        {activeView === 'overview' && <Overview onStart={() => setActiveView('discovery')} />}
        {activeView === 'discovery' && <Discovery messages={messages} answers={answers} progress={progress} input={input} loading={loading} complete={complete} report={report} setInput={setInput} send={send} download={download} />}
        {activeView === 'portfolio' && <Portfolio />}
        {activeView === 'rentals' && <Rentals />}
        {activeView === 'maintenance' && <Maintenance />}
        {activeView === 'municipal' && <Municipal />}
        {activeView === 'risk' && <Risk />}
        {activeView === 'analytics' && <Analytics />}
      </section>
    </main>
  );
}

function Overview({ onStart }: { onStart: () => void }) {
  return <div className="pageStack">
    <section className="heroPanel">
      <div><p className="eyebrow">From first conversation to transformation roadmap</p><h2>One operating layer for property, people, payments and performance.</h2><p>Demonstrate the complete lifecycle: stakeholder discovery, portfolio control, tenant operations, municipal oversight, maintenance, risk management and executive insight.</p><div className="buttonRow"><button onClick={onStart}>Start agentic discovery</button><button className="ghostButton">View pilot scope</button></div></div>
      <div className="heroMetrics"><Metric label="Portfolio occupancy" value="91.4%" note="+2.8% this quarter"/><Metric label="Collection rate" value="94.7%" note="R186k currently overdue"/><Metric label="Open risks" value="12" note="3 require executive action"/><Metric label="Automation potential" value="78%" note="Across 16 workflows"/></div>
    </section>
    <section><div className="sectionHead"><div><p className="eyebrow">Core capabilities</p><h2>What the demonstration shows</h2></div><span className="chip">8 connected modules</span></div><div className="capabilityGrid">{capabilityCards.map(([title, text], index) => <article className="capabilityCard" key={title}><span>{String(index + 1).padStart(2, '0')}</span><h3>{title}</h3><p>{text}</p><button className="textButton">Open wireframe →</button></article>)}</div></section>
    <section className="twoColumn"><article className="panel"><p className="eyebrow">Suggested pilot</p><h3>90-day controlled implementation</h3><ol className="timeline"><li><strong>Weeks 1–2</strong><span>Discovery, data inventory, process mapping and governance.</span></li><li><strong>Weeks 3–6</strong><span>Portfolio register, tenant workflows, collections and maintenance.</span></li><li><strong>Weeks 7–10</strong><span>Municipal controls, owner dashboard and stakeholder validation.</span></li><li><strong>Weeks 11–13</strong><span>Measure outcomes, prioritise integrations and approve scale-up.</span></li></ol></article><article className="panel"><p className="eyebrow">Business model</p><h3>Asset-light platform revenue</h3><div className="tagList"><span>Discovery fee</span><span>Implementation fee</span><span>Per-unit subscription</span><span>Managed services</span><span>Tenant placement</span><span>Maintenance coordination</span><span>Valuations</span><span>Analytics licensing</span></div></article></section>
  </div>;
}

function Discovery(props: { messages: Message[]; answers: Answer[]; progress: number; input: string; loading: boolean; complete: boolean; report: Report | null; setInput: (value: string) => void; send: () => void; download: () => void }) {
  return <div className="pageStack"><section className="discoveryLayout"><aside className="journeyPanel"><p className="eyebrow">Assessment journey</p>{['Stakeholder context','Business needs','Operational risks','Technology maturity','Capability confirmation','Pilot recommendation'].map((item, index) => <div className={`stage ${props.answers.length >= index * 2 ? 'active' : ''}`} key={item}><span>{index + 1}</span><div><strong>{item}</strong><small>{index < Math.floor(props.answers.length / 2) ? 'Evidence captured' : 'Pending'}</small></div></div>)}<div className="meter"><div style={{ width: `${props.progress}%` }} /></div><p className="progress">{props.progress}% assessment coverage</p></aside><section className="conversation"><div className="messages">{props.messages.map((message, index) => <div key={index} className={`bubble ${message.role}`}>{message.content}</div>)}{props.loading && <div className="bubble agent">Analysing the answer and selecting the next evidence-based question…</div>}</div>{!props.complete && <div className="composer"><textarea value={props.input} onChange={event => props.setInput(event.target.value)} placeholder="Type your answer…" onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); props.send(); } }} /><button onClick={props.send} disabled={props.loading || !props.input.trim()}>Send response</button></div>}</section></section>{props.report && <section className="panel"><div className="sectionHead"><div><p className="eyebrow">Executive output</p><h2>Transformation readiness snapshot</h2></div><button onClick={props.download}>Download assessment</button></div><div className="metricGrid">{Object.entries(props.report.scores || {}).map(([key, value]) => <Metric key={key} label={key.replaceAll('_',' ')} value={`${value}%`} note="Evidence-based readiness score" />)}</div><div className="reportGrid"><article><h3>Executive summary</h3><p>{props.report.executive_summary}</p></article><ListPanel title="Priority risks" items={props.report.priority_risks}/><ListPanel title="Recommended pilot" items={props.report.recommended_pilot}/><ListPanel title="Decision gates" items={props.report.decision_gates}/></div></section>}</div>;
}

function Portfolio() { return <Wireframe title="Portfolio command centre" subtitle="Unified visibility across buildings, units, owners, occupancy, income and outstanding operational work." metrics={[['Properties','24','4 cities'],['Lettable spaces','1,286','91.4% occupied'],['Monthly billed','R4.82m','94.7% collected'],['Open actions','37','12 high priority']]}><DataTable headers={['Property','Location','Occupancy','Monthly billed','Open actions']} rows={properties}/></Wireframe>; }
function Rentals() { return <Wireframe title="Rental and lease operations" subtitle="Manage enquiries, applications, leases, collections, arrears, renewals and tenant communications." metrics={[['Active leases','1,176','92 renewals due'],['Collection rate','94.7%','Target 97%'],['Arrears','R186k','-8% month-on-month'],['Vacant units','110','42 applications active']]}><DataTable headers={['Space','Tenant','Status','Monthly rental','Lease milestone']} rows={rentalRows}/></Wireframe>; }
function Maintenance() { return <Wireframe title="Maintenance and facilities control" subtitle="Convert tenant reports into prioritised work orders with contractor, approval, SLA and cost visibility." metrics={[['Open work orders','37','9 urgent'],['Average response','2h 18m','-34 minutes'],['Monthly spend','R284k','6% over plan'],['Contractor SLA','87%','Target 92%']]}><DataTable headers={['Work order','Priority','Category','Status','Age']} rows={maintenanceRows}/></Wireframe>; }
function Municipal() { return <Wireframe title="Municipal and utility assurance" subtitle="Track statements, meters, allocations, consumption anomalies, disputes and payment deadlines." metrics={[['Accounts monitored','68','24 properties'],['Monthly utilities','R892k','+4.1%'],['Active disputes','6','R214k exposure'],['Anomalies detected','11','3 critical']]}><div className="twoColumn"><article className="panel inset"><h3>Consumption exceptions</h3><ul className="signalList"><li><strong>Corner House water</strong><span>38% above seasonal baseline</span></li><li><strong>Market Square electricity</strong><span>Meter allocation mismatch</span></li><li><strong>Main Street refuse</strong><span>Duplicate municipal charge</span></li></ul></article><article className="panel inset"><h3>Control workflow</h3><ol className="timeline compact"><li><strong>Capture</strong><span>Statement and meter evidence</span></li><li><strong>Validate</strong><span>Tariff, usage and allocation checks</span></li><li><strong>Escalate</strong><span>Dispute owner and deadline</span></li><li><strong>Resolve</strong><span>Adjustment and audit evidence</span></li></ol></article></div></Wireframe>; }
function Risk() { return <Wireframe title="Risk, compliance and control centre" subtitle="Prioritise legal, financial, operational, security and technology exposure with accountable owners." metrics={[['High risks','3','Executive attention'],['Controls tested','74%','18 overdue'],['POPIA readiness','61%','Consent gaps'],['Audit evidence','83%','Target 95%']]}><div className="riskGrid">{[['Payment reconciliation','High','Manual allocation and weak exception approval.'],['Tenant data governance','High','Consent and retention evidence incomplete.'],['Municipal billing','Medium','Disputes lack consistent ownership and deadlines.'],['Contractor assurance','Medium','Insurance and compliance documents expire manually.'],['System continuity','Low','Fallback process documented; recovery testing pending.'],['Physical security','Medium','Incident reporting fragmented across sites.']].map(([title, level, text]) => <article className={`riskCard ${level.toLowerCase()}`} key={title}><span>{level}</span><h3>{title}</h3><p>{text}</p><button className="textButton">Review control →</button></article>)}</div></Wireframe>; }
function Analytics() { return <Wireframe title="Executive analytics and AI insights" subtitle="Turn operational data into portfolio performance, forecasts, anomalies and recommended actions." metrics={[['Net operating income','R3.18m','+6.2%'],['Vacancy loss','R412k','-3.4%'],['Maintenance ratio','5.9%','Target <5%'],['Forecast confidence','86%','Next 90 days']]}><div className="twoColumn"><article className="panel inset"><h3>Portfolio performance trend</h3><div className="chartBars">{[54,68,61,74,79,83,76,89,92,88,95,97].map((height,index)=><span key={index} style={{height:`${height}%`}} />)}</div><div className="axis"><span>Aug</span><span>Jul</span></div></article><article className="panel inset"><h3>AI-recommended actions</h3><ul className="signalList"><li><strong>Prioritise 14 renewals</strong><span>High probability of retention at current escalation.</span></li><li><strong>Inspect Corner House water system</strong><span>Consumption anomaly indicates probable leak.</span></li><li><strong>Retarget three vacant retail units</strong><span>Pricing exceeds local comparable range.</span></li><li><strong>Escalate Shop 12 arrears</strong><span>Payment behaviour has deteriorated over 60 days.</span></li></ul></article></div></Wireframe>; }

function Wireframe({ title, subtitle, metrics, children }: { title: string; subtitle: string; metrics: string[][]; children: React.ReactNode }) { return <div className="pageStack"><section className="pageIntro"><div><p className="eyebrow">Capability wireframe</p><h2>{title}</h2><p>{subtitle}</p></div><div className="buttonRow"><button className="ghostButton">Export view</button><button>Create action</button></div></section><div className="metricGrid">{metrics.map(([label,value,note])=><Metric key={label} label={label} value={value} note={note}/>)}</div><section className="panel"><div className="sectionHead"><div><p className="eyebrow">Operational workspace</p><h3>Current portfolio activity</h3></div><div className="filterRow"><span className="chip">All properties</span><span className="chip">Last 30 days</span></div></div>{children}</section></div>; }
function Metric({ label, value, note }: { label: string; value: string; note: string }) { return <article className="metricCard"><small>{label}</small><strong>{value}</strong><span>{note}</span></article>; }
function ListPanel({ title, items = [] }: { title: string; items?: string[] }) { return <article><h3>{title}</h3><ul>{items.map(item=><li key={item}>{item}</li>)}</ul></article>; }
function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) { return <div className="tableWrap"><table><thead><tr>{headers.map(header=><th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row,index)=><tr key={index}>{row.map((cell,cellIndex)=><td key={cellIndex}>{cellIndex===2?<span className="tableStatus">{cell}</span>:cell}</td>)}</tr>)}</tbody></table></div>; }
