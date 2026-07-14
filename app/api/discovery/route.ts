import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const RequestSchema = z.object({
  answers: z.array(z.object({ question: z.string(), answer: z.string() })),
  messages: z.array(z.object({ role: z.enum(['agent','user']), content: z.string() })).optional()
});

const fallbackQuestions = [
  'What are the three most expensive operational problems in the property portfolio today?',
  'How are vacancies, tenant applications, leases and rental collections currently managed?',
  'Which municipal, maintenance or security failures create the highest financial or legal exposure?',
  'Which systems, spreadsheets, accounting tools, listing portals and WhatsApp processes are currently used?',
  'How reliable, complete and accessible is the portfolio data required for reporting and automation?',
  'Who owns technology decisions, operational process decisions and financial approval?',
  'Which capabilities would create measurable value within the first 90 days?',
  'What budget range and implementation capacity are available for a controlled pilot?',
  'What measurable outcomes would define success after six months?',
  'Are there any constraints, objections or dependencies that could prevent implementation?',
  'Which properties or buildings would provide the best representative pilot environment?'
];

function fallback(answers: {question:string; answer:string}[]) {
  if (answers.length < fallbackQuestions.length) {
    const answer = answers.at(-1)?.answer.toLowerCase() || '';
    let followup = fallbackQuestions[answers.length];
    if (answer.includes('municipal')) followup = 'You identified municipal exposure. How are statements, meters, disputes, allocations and payment deadlines currently verified and controlled?';
    if (answer.includes('whatsapp') || answer.includes('excel')) followup = 'You identified manual tools. Where is duplicate capture, missing evidence or reliance on a single person most severe?';
    if (answer.includes('arrears') || answer.includes('payment')) followup = 'What is the current collection rate, arrears ageing process and escalation path for non-payment?';
    return { complete: false, message: followup };
  }
  return {
    complete: true,
    message: 'The initial discovery is complete. I have generated an executive readiness snapshot for stakeholder review.',
    report: {
      scores: { technology_maturity: 42, operational_readiness: 55, risk_exposure: 73, transformation_opportunity: 88 },
      executive_summary: 'The portfolio presents a strong transformation opportunity. Current operations appear fragmented across manual communication, spreadsheets and specialist processes. A controlled pilot should first centralise property, tenant, collection, maintenance and municipal data before introducing advanced automation.',
      priority_risks: ['POPIA and tenant-data governance','Rental payment reconciliation and fraud controls','Municipal billing accuracy','Contractor accountability','Operational dependency on individuals'],
      recommended_pilot: ['Property and unit register','Tenant onboarding workflow','Collections and arrears dashboard','Maintenance ticketing','Municipal account monitoring','Owner executive dashboard'],
      decision_gates: ['Confirm executive sponsor and process owners','Select representative pilot properties','Approve data-processing and security controls','Agree success metrics and budget','Approve phased commercial model']
    }
  };
}

export async function POST(request: Request) {
  const parsed = RequestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid discovery payload' }, { status: 400 });
  const { answers } = parsed.data;
  if (!process.env.OPENAI_API_KEY) return NextResponse.json(fallback(answers));

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: `You are a senior property digital-transformation discovery consultant operating in South Africa. Conduct an adaptive, evidence-seeking interview covering stakeholder context, property operations, vacancies, rentals, collections, municipal accounts, maintenance, security, POPIA, technology maturity, data quality, governance, budget, capability and pilot readiness. Ask exactly one concise follow-up question at a time. Do not ask a generic question when the last answer exposes a specific risk or ambiguity. After 10-14 substantive answers, return complete=true and an executive report. Output JSON with either {complete:false,message:string} or {complete:true,message:string,report:{scores:{technology_maturity:number,operational_readiness:number,risk_exposure:number,transformation_opportunity:number},executive_summary:string,priority_risks:string[],recommended_pilot:string[],decision_gates:string[]}}.` },
      { role: 'user', content: JSON.stringify({ answers }) }
    ]
  });
  const content = completion.choices[0]?.message?.content;
  if (!content) return NextResponse.json(fallback(answers));
  return NextResponse.json(JSON.parse(content));
}
