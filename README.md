# MND-AI

MND-AI is a launch kit for building an AI service business around two related offers for local small businesses:

1. **AEO consultancy**: structure a business website so answer engines can cite it as a trustworthy answer.
2. **Hyper-local website concierge bots**: deploy narrow, task-oriented chat assistants that help visitors navigate a site, answer service questions, and hand off to booking or WhatsApp.

This repository gives you both:

- a **business operating playbook** for packaging and selling the service, and
- a **working MVP** that turns one business profile into AEO schema, FAQ assets, chatbot prompts, and lead handoff configuration.

## What is inside

- `index.html`, `styles.css`, `src/browser-app.js` - static browser demo
- `src/generator.js` - reusable asset-generation engine
- `scripts/generate-assets.mjs` - CLI to produce client deliverables from JSON
- `data/sample-business.json` - sample UAE local business profile
- `docs/business-plan.md` - business model, offer design, positioning
- `docs/delivery-playbook.md` - client onboarding and fulfillment workflow
- `docs/implementation-roadmap.md` - practical path from MVP to production service

## Core idea

Many small businesses have a website but are missing:

- structured schema that AI search tools can parse reliably
- clear FAQ and service content that matches user intent
- a concierge bot that turns website traffic into booked appointments or qualified leads

This project closes that gap by treating each business as a structured profile and generating everything needed to improve AI discoverability and on-site conversion.

## Quick start

### 1. Run the browser demo

```bash
npm start
```

Then open:

```text
http://localhost:4173
```

### 2. Generate files for a client profile

```bash
npm run generate:sample
```

This writes an `output/` directory containing:

- `organization.schema.json`
- `local-business.schema.json`
- `website.schema.json`
- `service.schema.json`
- `faq-page.schema.json` when FAQs exist
- `priority-questions.json`
- `answer-engine-brief.md`
- `chatbot-system-prompt.txt`
- `chatbot-knowledge-base.md`
- `chatbot-widget-config.json`

### 3. Generate from any business profile

```bash
npm run generate -- path/to/business.json path/to/output-directory
```

Example:

```bash
npm run generate -- data/sample-business.json output
```

## Business profile format

The generator expects a JSON object with the following primary fields:

- `businessName`
- `description`
- `category`
- `website`
- `services[]`
- `faq[]`
- `languages[]`
- `areasServed[]`
- `location{}`
- `openingHours[]`
- `trustSignals{}`
- `booking{}`

Use `data/sample-business.json` as the template for new clients.

## How to use this as a business

### Offer 1: AEO consultancy

Deliverables:

- schema markup plan
- homepage/local landing page recommendations
- FAQ rewrite aligned to real user questions
- service-page entity mapping
- answer-engine prompt targeting

### Offer 2: Local business concierge bot

Deliverables:

- chatbot system prompt
- retrieval-ready knowledge base
- suggested questions for the widget
- lead capture fields
- handoff rules to booking, WhatsApp, phone, or staff

## Suggested target customers

Start with verticals where:

- customer questions repeat often
- bookings or inquiries matter
- location trust matters
- websites exist but are weak

Best early niches:

- clinics
- dentists
- gyms
- salons
- cafes
- tailors
- cleaning services
- auto workshops
- repair services

## Recommended next steps

1. Pick one niche in one city.
2. Build 3 sample profiles from real businesses.
3. Generate schema + chatbot packs for each one.
4. Turn the best example into a one-page case-study style sales asset.
5. Add production integrations:
   - calendar booking
   - WhatsApp routing
   - CRM lead capture
   - analytics and event tracking

## Testing

Run:

```bash
npm test
```

## Notes

This repository intentionally stays dependency-light so it can serve as a simple starting point. It is best used as:

- a founder operating kit
- a demo for prospects
- a base for a more complete SaaS or agency delivery platform
