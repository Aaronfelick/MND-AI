import test from "node:test";
import assert from "node:assert/strict";

import sampleProfile from "../data/sample-business.json" with { type: "json" };
import {
  buildChatbotSystemPrompt,
  buildLocalBusinessSchema,
  buildPriorityQuestions,
  generateBusinessAssets,
} from "./generator.js";

test("generateBusinessAssets returns the expected top-level sections", () => {
  const assets = generateBusinessAssets(sampleProfile);

  assert.equal(assets.profile.businessName, "Green Stitch Tailoring");
  assert.ok(Array.isArray(assets.structuredData.services));
  assert.ok(Array.isArray(assets.aeo.priorityQuestions));
  assert.match(assets.chatbot.systemPrompt, /website concierge/);
});

test("LocalBusiness schema includes service catalog and keywords", () => {
  const schema = buildLocalBusinessSchema(sampleProfile);

  assert.equal(schema["@type"], "LocalBusiness");
  assert.equal(schema.hasOfferCatalog.itemListElement.length, 3);
  assert.match(schema.keywords, /sustainable tailor/i);
  assert.equal(schema.address.addressLocality, "Sharjah");
});

test("Priority questions reflect city and trust angle", () => {
  const questions = buildPriorityQuestions(sampleProfile);

  assert.ok(
    questions.some((question) =>
      question.includes("Which sustainable tailor in Sharjah is known for")
    )
  );
  assert.ok(
    questions.some((question) =>
      question.includes("Where can I book alterations and repairs in Sharjah?")
    )
  );
});

test("Chatbot prompt routes booking intent to booking channel", () => {
  const prompt = buildChatbotSystemPrompt(sampleProfile);

  assert.match(prompt, /https:\/\/greenstitch\.ae\/book/);
  assert.match(prompt, /Do not invent pricing/);
});
