const SCHEMA_CONTEXT = "https://schema.org";
const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function ensureArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function joinList(values) {
  return unique(values).join(", ");
}

function normalizeWebsite(url) {
  const website = String(url || "").trim();
  assert(website, "Profile must include a website URL.");

  try {
    const parsed = new URL(website);
    return parsed.href.endsWith("/") ? parsed.href.slice(0, -1) : parsed.href;
  } catch {
    throw new Error(`Invalid website URL: ${website}`);
  }
}

function normalizeLocation(location) {
  if (!isObject(location)) {
    return {};
  }

  return {
    ...location,
    coordinates: isObject(location.coordinates) ? location.coordinates : undefined,
  };
}

function normalizeService(service, index) {
  assert(service?.name, `Service at index ${index} is missing a name.`);

  return {
    ...service,
    slug: service.slug || slugify(service.name),
    keywords: unique(ensureArray(service.keywords)),
  };
}

function normalizeFaq(faq, index) {
  assert(faq?.question, `FAQ at index ${index} is missing a question.`);
  assert(faq?.answer, `FAQ at index ${index} is missing an answer.`);

  return faq;
}

export function normalizeProfile(rawProfile) {
  assert(isObject(rawProfile), "Business profile must be a JSON object.");
  assert(rawProfile.businessName, "Profile must include businessName.");
  assert(rawProfile.description, "Profile must include description.");
  assert(rawProfile.category, "Profile must include category.");

  const website = normalizeWebsite(rawProfile.website);
  const services = ensureArray(rawProfile.services).map(normalizeService);
  const faq = ensureArray(rawProfile.faq).map(normalizeFaq);
  const languages = unique(ensureArray(rawProfile.languages));
  const areasServed = unique(ensureArray(rawProfile.areasServed));
  const socialProfiles = unique(ensureArray(rawProfile.socialProfiles));
  const trustSignals = isObject(rawProfile.trustSignals) ? rawProfile.trustSignals : {};
  const booking = isObject(rawProfile.booking) ? rawProfile.booking : {};
  const location = normalizeLocation(rawProfile.location);
  const openingHours = ensureArray(rawProfile.openingHours).map((slot, index) => {
    assert(
      ensureArray(slot?.days).length > 0,
      `Opening-hours slot at index ${index} must include at least one day.`
    );
    assert(slot?.opens, `Opening-hours slot at index ${index} is missing opens.`);
    assert(slot?.closes, `Opening-hours slot at index ${index} is missing closes.`);

    return {
      ...slot,
      days: ensureArray(slot.days).filter((day) => DAY_NAMES.includes(day)),
    };
  });

  return {
    legalName: rawProfile.legalName || rawProfile.businessName,
    schemaType: rawProfile.schemaType || "LocalBusiness",
    slogan: rawProfile.slogan || "",
    priceRange: rawProfile.priceRange || "",
    currency: rawProfile.currency || "AED",
    image: rawProfile.image || "",
    email: rawProfile.email || "",
    phone: rawProfile.phone || "",
    whatsapp: rawProfile.whatsapp || "",
    foundingDate: rawProfile.foundingDate || "",
    businessName: rawProfile.businessName,
    description: rawProfile.description,
    category: rawProfile.category,
    website,
    services,
    faq,
    languages,
    areasServed,
    socialProfiles,
    trustSignals,
    booking,
    location,
    openingHours,
  };
}

function buildPostalAddress(location) {
  if (!location?.streetAddress && !location?.addressLocality) {
    return undefined;
  }

  return {
    "@type": "PostalAddress",
    streetAddress: location.streetAddress,
    addressLocality: location.addressLocality,
    addressRegion: location.addressRegion,
    postalCode: location.postalCode,
    addressCountry: location.addressCountry || "AE",
  };
}

function buildGeo(location) {
  if (!location?.coordinates?.latitude || !location?.coordinates?.longitude) {
    return undefined;
  }

  return {
    "@type": "GeoCoordinates",
    latitude: location.coordinates.latitude,
    longitude: location.coordinates.longitude,
  };
}

function buildOpeningHoursSpecification(openingHours) {
  return openingHours.flatMap((slot) =>
    slot.days.map((day) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: day,
      opens: slot.opens,
      closes: slot.closes,
    }))
  );
}

function buildContactPoint(profile) {
  const contactPoint = {
    "@type": "ContactPoint",
    contactType: "customer service",
    telephone: profile.phone,
    email: profile.email,
    availableLanguage: profile.languages,
    areaServed: profile.areasServed,
  };

  if (profile.whatsapp) {
    contactPoint.contactOption = "WhatsApp";
    contactPoint.url = profile.whatsapp;
  }

  return contactPoint;
}

function buildOfferCatalog(profile) {
  if (!profile.services.length) {
    return undefined;
  }

  return {
    "@type": "OfferCatalog",
    name: `${profile.businessName} services`,
    itemListElement: profile.services.map((service) => ({
      "@type": "Offer",
      name: service.name,
      description: service.description,
      url: service.url || profile.website,
      itemOffered: {
        "@type": "Service",
        name: service.name,
        description: service.description,
        serviceType: service.serviceType || service.name,
        areaServed: profile.areasServed.map((city) => ({
          "@type": "City",
          name: city,
        })),
      },
    })),
  };
}

function buildKeywords(profile) {
  const serviceKeywords = profile.services.flatMap((service) => service.keywords);
  const trustKeywords = [
    ...ensureArray(profile.trustSignals.certifications),
    ...ensureArray(profile.trustSignals.sustainability),
  ];

  return joinList([
    profile.businessName,
    profile.category,
    profile.location.addressLocality,
    ...profile.areasServed,
    ...serviceKeywords,
    ...trustKeywords,
  ]);
}

export function buildOrganizationSchema(rawProfile) {
  const profile = normalizeProfile(rawProfile);

  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "Organization",
    "@id": `${profile.website}#organization`,
    name: profile.businessName,
    legalName: profile.legalName,
    url: profile.website,
    logo: profile.image || undefined,
    description: profile.description,
    slogan: profile.slogan || undefined,
    foundingDate: profile.foundingDate || undefined,
    sameAs: profile.socialProfiles,
    contactPoint: buildContactPoint(profile),
  };
}

export function buildLocalBusinessSchema(rawProfile) {
  const profile = normalizeProfile(rawProfile);

  return {
    "@context": SCHEMA_CONTEXT,
    "@type": profile.schemaType,
    "@id": `${profile.website}#local-business`,
    name: profile.businessName,
    description: profile.description,
    url: profile.website,
    image: profile.image || undefined,
    telephone: profile.phone || undefined,
    email: profile.email || undefined,
    address: buildPostalAddress(profile.location),
    geo: buildGeo(profile.location),
    areaServed: profile.areasServed.map((city) => ({
      "@type": "City",
      name: city,
    })),
    hasOfferCatalog: buildOfferCatalog(profile),
    sameAs: profile.socialProfiles,
    openingHoursSpecification: buildOpeningHoursSpecification(profile.openingHours),
    priceRange: profile.priceRange || undefined,
    currenciesAccepted: profile.currency,
    paymentAccepted: joinList(ensureArray(profile.trustSignals.paymentMethods)) || undefined,
    keywords: buildKeywords(profile) || undefined,
    knowsLanguage: profile.languages,
  };
}

export function buildWebsiteSchema(rawProfile) {
  const profile = normalizeProfile(rawProfile);

  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "WebSite",
    "@id": `${profile.website}#website`,
    url: profile.website,
    name: profile.businessName,
    description: profile.description,
    inLanguage: profile.languages,
    publisher: {
      "@id": `${profile.website}#organization`,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: `${profile.website}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildServiceSchemas(rawProfile) {
  const profile = normalizeProfile(rawProfile);

  return profile.services.map((service) => ({
    "@context": SCHEMA_CONTEXT,
    "@type": "Service",
    "@id": `${profile.website}#service-${service.slug}`,
    serviceType: service.serviceType || service.name,
    name: service.name,
    description: service.description,
    provider: {
      "@id": `${profile.website}#local-business`,
    },
    areaServed: profile.areasServed.map((city) => ({
      "@type": "City",
      name: city,
    })),
    availableChannel: profile.whatsapp
      ? {
          "@type": "ServiceChannel",
          serviceUrl: profile.whatsapp,
        }
      : undefined,
    url: service.url || profile.website,
    keywords: joinList(service.keywords) || undefined,
  }));
}

export function buildFaqPageSchema(rawProfile) {
  const profile = normalizeProfile(rawProfile);

  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "FAQPage",
    "@id": `${profile.website}#faq`,
    mainEntity: profile.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function buildAnswerEngineBrief(rawProfile) {
  const profile = normalizeProfile(rawProfile);
  const city = profile.location.addressLocality || profile.areasServed[0] || "the UAE";
  const serviceLine = profile.services
    .map((service) => `- ${service.name}: ${service.description}`)
    .join("\n");
  const faqLine = profile.faq
    .map((item) => `- Q: ${item.question}\n  A: ${item.answer}`)
    .join("\n");

  return [
    `# ${profile.businessName}`,
    "",
    `> ${profile.description}`,
    "",
    "## Business facts",
    `- Category: ${profile.category}`,
    `- Website: ${profile.website}`,
    `- Primary location: ${city}`,
    `- Areas served: ${profile.areasServed.join(", ") || city}`,
    `- Languages: ${profile.languages.join(", ") || "English"}`,
    `- Booking path: ${profile.booking.url || profile.whatsapp || profile.website}`,
    "",
    "## Services",
    serviceLine || "- Add services to strengthen AEO coverage.",
    "",
    "## Trust signals",
    ...ensureArray(profile.trustSignals.certifications).map((item) => `- Certification: ${item}`),
    ...ensureArray(profile.trustSignals.sustainability).map((item) => `- Sustainability: ${item}`),
    ...ensureArray(profile.trustSignals.reviewHighlights).map((item) => `- Review highlight: ${item}`),
    "",
    "## Canonical questions and answers",
    faqLine || "- Add FAQs to increase answer-engine visibility.",
    "",
    "## Recommended AI-search prompts to target",
    ...buildPriorityQuestions(profile).map((question) => `- ${question}`),
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildPriorityQuestions(rawProfile) {
  const profile = normalizeProfile(rawProfile);
  const city = profile.location.addressLocality || profile.areasServed[0] || "Sharjah";
  const leadService = profile.services[0]?.name || profile.category;
  const trustAngle =
    ensureArray(profile.trustSignals.sustainability)[0] ||
    ensureArray(profile.trustSignals.certifications)[0] ||
    `trusted ${profile.category.toLowerCase()}`;

  return unique([
    `Who is the best ${profile.category.toLowerCase()} in ${city}?`,
    `Where can I book ${leadService.toLowerCase()} in ${city}?`,
    `Which ${profile.category.toLowerCase()} in ${city} is known for ${trustAngle.toLowerCase()}?`,
    `What services does ${profile.businessName} offer?`,
    `How do I contact ${profile.businessName}?`,
    `What are the opening hours for ${profile.businessName}?`,
  ]);
}

export function buildKnowledgeBase(rawProfile) {
  const profile = normalizeProfile(rawProfile);
  const locationSummary = [
    profile.location.streetAddress,
    profile.location.addressLocality,
    profile.location.addressRegion,
    profile.location.addressCountry || "AE",
  ]
    .filter(Boolean)
    .join(", ");

  const serviceSummary = profile.services
    .map((service) => `- ${service.name}: ${service.description}`)
    .join("\n");

  const faqSummary = profile.faq
    .map((item) => `- ${item.question}: ${item.answer}`)
    .join("\n");

  return [
    `# ${profile.businessName} knowledge base`,
    "",
    `## Overview`,
    profile.description,
    "",
    "## Contact",
    `- Website: ${profile.website}`,
    `- Phone: ${profile.phone || "Not provided"}`,
    `- Email: ${profile.email || "Not provided"}`,
    `- WhatsApp: ${profile.whatsapp || "Not provided"}`,
    "",
    "## Location",
    `- ${locationSummary || "Location not provided"}`,
    `- Areas served: ${profile.areasServed.join(", ") || "Not provided"}`,
    "",
    "## Services",
    serviceSummary || "- Add services.",
    "",
    "## Trust signals",
    ...ensureArray(profile.trustSignals.certifications).map((item) => `- Certification: ${item}`),
    ...ensureArray(profile.trustSignals.sustainability).map((item) => `- Sustainability: ${item}`),
    ...ensureArray(profile.trustSignals.reviewHighlights).map((item) => `- Review highlight: ${item}`),
    "",
    "## FAQs",
    faqSummary || "- Add FAQs.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildChatbotSystemPrompt(rawProfile) {
  const profile = normalizeProfile(rawProfile);

  return [
    `You are the website concierge for ${profile.businessName}, a ${profile.category} in ${profile.location.addressLocality || "the UAE"}.`,
    "",
    "Your job is to help visitors complete practical tasks quickly:",
    "1. Explain services in plain language.",
    "2. Answer questions using only the approved knowledge base.",
    "3. Recommend the next best action: book, call, WhatsApp, or visit a page.",
    "4. Capture lead details when a user wants a callback or appointment.",
    "",
    "Guardrails:",
    "- Do not invent pricing, guarantees, medical/legal advice, or unavailable services.",
    "- If information is missing, say so clearly and offer handoff to a human.",
    "- Prefer concise answers with one actionable next step.",
    `- If a user wants to book, direct them to ${profile.booking.url || profile.whatsapp || profile.website}.`,
    "",
    "High-priority intents:",
    ...buildPriorityQuestions(profile).map((item) => `- ${item}`),
  ].join("\n");
}

export function buildWidgetConfig(rawProfile) {
  const profile = normalizeProfile(rawProfile);

  return {
    brand: profile.businessName,
    greeting: `Hi, I can help you with services, location, hours, and bookings for ${profile.businessName}.`,
    captureFields: ["name", "phone", "email", "service_interest", "preferred_time"],
    suggestedQuestions: buildPriorityQuestions(profile),
    handoffChannels: {
      whatsapp: profile.whatsapp || null,
      phone: profile.phone || null,
      email: profile.email || null,
      bookingUrl: profile.booking.url || null,
    },
    escalationPolicy: {
      whenMissingInfo: "Offer human follow-up and capture lead details.",
      whenUrgent: "Recommend immediate phone or WhatsApp contact.",
      whenBookingIntent: "Send the user to the booking link or WhatsApp.",
    },
  };
}

export function generateBusinessAssets(rawProfile) {
  const profile = normalizeProfile(rawProfile);

  return {
    profile,
    structuredData: {
      organization: buildOrganizationSchema(profile),
      localBusiness: buildLocalBusinessSchema(profile),
      website: buildWebsiteSchema(profile),
      services: buildServiceSchemas(profile),
      faqPage: profile.faq.length ? buildFaqPageSchema(profile) : null,
    },
    aeo: {
      priorityQuestions: buildPriorityQuestions(profile),
      answerEngineBrief: buildAnswerEngineBrief(profile),
    },
    chatbot: {
      systemPrompt: buildChatbotSystemPrompt(profile),
      knowledgeBase: buildKnowledgeBase(profile),
      widgetConfig: buildWidgetConfig(profile),
    },
  };
}

export function serializeJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}
