# Estate Agentic Discovery MVP

A conversational property digital-transformation discovery experience for Alberto, his partner and operational leadership.

## What it demonstrates

- Adaptive, one-question-at-a-time discovery
- Follow-up questions based on identified risks and ambiguity
- Needs, risk, technology maturity and capability assessment
- Multi-stakeholder-ready interview model
- Executive readiness scores and pilot recommendations
- Local rule-based fallback when no AI key is configured
- OpenAI-backed adaptive questioning when `OPENAI_API_KEY` is configured

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Agent behaviour

The backend asks targeted follow-up questions covering:

1. Stakeholder and portfolio context
2. Operational pain points and financial leakage
3. Rental, vacancy and collection processes
4. Maintenance, municipal and physical-security risk
5. POPIA, payment and document controls
6. Technology maturity, data quality and integrations
7. Internal capability, governance and budget
8. Pilot scope and measurable success criteria

After sufficient evidence is collected, the agent returns a structured executive report with readiness scores, priority risks, recommended pilot capabilities and decision gates.

## Recommended production extensions

- Supabase authentication and PostgreSQL persistence
- Unique secure assessment links per stakeholder
- Organisation, portfolio, property and session tenancy model
- Cross-stakeholder alignment and disagreement analysis
- Azure OpenAI or OpenAI structured outputs
- PDF/DOCX proposal generation
- Email and WhatsApp invitations and reminders
- CRM opportunity creation
- POPIA consent, retention and audit controls
- Rate limiting, moderation, observability and encrypted secrets

## Important

The current MVP deliberately avoids collecting identity documents, bank details or special personal information. Production deployment requires an approved privacy notice, consent model, retention policy, access-control design and data-processing agreement.
