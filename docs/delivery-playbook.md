## Delivery playbook

Use this process for every client engagement.

### 1. Discovery and audit

Collect:

- Website URL
- Google Business Profile URL
- Core services
- Cities/areas served
- WhatsApp/phone/booking links
- FAQs asked on calls or in WhatsApp
- Trust signals: certifications, reviews, sustainability claims, awards

Audit:

- Does the site already use JSON-LD?
- Are service pages distinct and descriptive?
- Is contact and location data consistent across the site?
- Is there an FAQ page with direct, answerable wording?
- Is there a clear booking or contact CTA?

### 2. Build the source-of-truth profile

Create a JSON profile for the client using the sample in `data/sample-business.json`.

Minimum required fields:

- `businessName`
- `description`
- `category`
- `website`
- `services`
- `faq`

Strongly recommended:

- `areasServed`
- `languages`
- `location`
- `trustSignals`
- `booking`

### 3. Generate the asset pack

Run:

```bash
npm run generate -- data/client.json output/client-name
```

Deliverables produced:

- Organization schema
- LocalBusiness schema
- Website schema
- Service schema
- FAQ schema
- Priority AI-search questions
- Answer-engine brief
- Chatbot system prompt
- Chatbot knowledge base
- Widget config

### 4. Publish AEO upgrades

Implement:

1. Homepage or location-page LocalBusiness schema
2. Organization schema in the global layout
3. Service schema on each core service page
4. FAQPage schema on an FAQ page with matching visible copy
5. Better page copy for the top AI-search questions

Best practices:

- Use the same business facts everywhere
- Keep all claims factual and supportable
- Add city and service combinations naturally, not as keyword stuffing
- Make contact/booking flows obvious

### 5. Deploy the concierge bot

Bot objectives:

- Help visitors find the right page/service
- Answer top FAQs
- Capture leads
- Route users to booking, phone, or WhatsApp

Bot implementation options:

- Embedded third-party website chat widget
- Custom front-end widget using the generated prompt and config
- CMS-integrated assistant with retrieval from the knowledge base

Guardrails:

- Do not invent pricing if absent
- Do not provide regulated advice beyond approved content
- Always provide a human handoff
- Log unanswered questions for content improvement

### 6. Measure success

Track before/after:

- Form submissions
- WhatsApp starts
- Calls from site visitors
- Booking conversions
- FAQ interactions
- AI search mentions/citations
- Visibility for long-tail local service questions

### 7. Expand the account

After the first deployment:

- Add more service pages
- Add more FAQ coverage
- Create neighborhood- or city-specific landing pages
- Add review snippets and testimonial summaries
- Integrate live booking or CRM capture
- Offer monthly monitoring and optimization
