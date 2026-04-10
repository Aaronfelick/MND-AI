import { generateBusinessAssets, serializeJson } from "./generator.js";

const profileInput = document.querySelector("#profile-input");
const generateButton = document.querySelector("#generate-button");
const loadSampleButton = document.querySelector("#load-sample-button");
const status = document.querySelector("#status");
const output = document.querySelector("#output");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderSummaryCard(title, items) {
  const list = items
    .filter((item) => item.value)
    .map(
      (item) => `
        <div class="summary-item">
          <span class="summary-label">${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
        </div>
      `
    )
    .join("");

  return `
    <article class="card">
      <h3>${escapeHtml(title)}</h3>
      <div class="summary-grid">
        ${list || '<p class="muted">No summary data available.</p>'}
      </div>
    </article>
  `;
}

function renderCodeCard(title, code, description = "") {
  return `
    <article class="card">
      <div class="card-header">
        <h3>${escapeHtml(title)}</h3>
        ${description ? `<p>${escapeHtml(description)}</p>` : ""}
      </div>
      <pre><code>${escapeHtml(code)}</code></pre>
    </article>
  `;
}

function renderListCard(title, description, items) {
  const listItems = items
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");

  return `
    <article class="card">
      <div class="card-header">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(description)}</p>
      </div>
      <ul class="bullet-list">
        ${listItems || "<li>No items available.</li>"}
      </ul>
    </article>
  `;
}

function setStatus(message, tone = "neutral") {
  status.textContent = message;
  status.dataset.tone = tone;
}

function renderAssets(assets) {
  const location =
    assets.profile.location.addressLocality ||
    assets.profile.areasServed[0] ||
    "UAE";
  const trustHighlights = [
    ...(assets.profile.trustSignals.certifications || []),
    ...(assets.profile.trustSignals.sustainability || []),
    ...(assets.profile.trustSignals.reviewHighlights || []),
  ];

  output.innerHTML = `
    <section class="section-grid">
      ${renderSummaryCard("Business summary", [
        { label: "Business", value: assets.profile.businessName },
        { label: "Category", value: assets.profile.category },
        { label: "Primary city", value: location },
        { label: "Areas served", value: assets.profile.areasServed.join(", ") },
        { label: "Languages", value: assets.profile.languages.join(", ") },
        {
          label: "Primary booking path",
          value:
            assets.profile.booking.url ||
            assets.profile.whatsapp ||
            assets.profile.website,
        },
      ])}
      ${renderSummaryCard("Offer readiness", [
        { label: "Services mapped", value: String(assets.profile.services.length) },
        { label: "FAQs mapped", value: String(assets.profile.faq.length) },
        {
          label: "Trust signals",
          value: trustHighlights.length ? String(trustHighlights.length) : "",
        },
        {
          label: "Schema type",
          value: assets.profile.schemaType,
        },
        {
          label: "Lead handoff",
          value:
            assets.profile.whatsapp ||
            assets.profile.phone ||
            assets.profile.email,
        },
      ])}
      ${renderListCard(
        "Priority AI-search questions",
        "These are the exact questions you want Google AI Overviews, ChatGPT, Perplexity, and Gemini to answer with this business.",
        assets.aeo.priorityQuestions
      )}
      ${renderCodeCard(
        "Answer engine brief",
        assets.aeo.answerEngineBrief,
        "Use this as the single-source business brief for content teams, AI assistants, and internal operators."
      )}
      ${renderCodeCard(
        "Organization JSON-LD",
        serializeJson(assets.structuredData.organization),
        "Embed this once on the website to strengthen organization-level trust and contact data."
      )}
      ${renderCodeCard(
        "LocalBusiness JSON-LD",
        serializeJson(assets.structuredData.localBusiness),
        "Place this on the homepage or location page."
      )}
      ${
        assets.structuredData.faqPage
          ? renderCodeCard(
              "FAQPage JSON-LD",
              serializeJson(assets.structuredData.faqPage),
              "Attach this to a well-written FAQ page with matching visible copy."
            )
          : ""
      }
      ${renderCodeCard(
        "Service JSON-LD",
        serializeJson(assets.structuredData.services),
        "Attach one service object per core offer or service page."
      )}
      ${renderCodeCard(
        "Chatbot system prompt",
        assets.chatbot.systemPrompt,
        "Use this as the base system prompt for a website concierge bot."
      )}
      ${renderCodeCard(
        "Chatbot knowledge base",
        assets.chatbot.knowledgeBase,
        "This can be injected into retrieval, prompt context, or a CMS-backed support assistant."
      )}
      ${renderCodeCard(
        "Widget config",
        serializeJson(assets.chatbot.widgetConfig),
        "Pass this to a front-end chat widget or lead-capture form."
      )}
    </section>
  `;
}

function generateFromEditor() {
  try {
    const rawProfile = JSON.parse(profileInput.value);
    const assets = generateBusinessAssets(rawProfile);
    renderAssets(assets);
    setStatus(
      `Generated AEO + chatbot assets for ${assets.profile.businessName}.`,
      "success"
    );
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function loadSample() {
  const response = await fetch("./data/sample-business.json");

  if (!response.ok) {
    throw new Error("Unable to load the sample business profile.");
  }

  const sampleProfile = await response.json();
  profileInput.value = `${JSON.stringify(sampleProfile, null, 2)}\n`;
  generateFromEditor();
}

generateButton.addEventListener("click", generateFromEditor);
loadSampleButton.addEventListener("click", () => {
  loadSample().catch((error) => setStatus(error.message, "error"));
});

loadSample()
  .then(() => {
    setStatus("Sample business loaded. Edit the profile and generate new assets.");
  })
  .catch((error) => {
    setStatus(error.message, "error");
  });
