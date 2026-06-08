import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  generateBusinessAssets,
  serializeJson,
} from "../src/generator.js";

function usage() {
  console.error(
    "Usage: node scripts/generate-assets.mjs <profile.json> <output-directory>"
  );
}

async function main() {
  const [, , profilePathArg, outputDirectoryArg] = process.argv;

  if (!profilePathArg || !outputDirectoryArg) {
    usage();
    process.exitCode = 1;
    return;
  }

  const profilePath = resolve(profilePathArg);
  const outputDirectory = resolve(outputDirectoryArg);
  const raw = await readFile(profilePath, "utf8");
  const profile = JSON.parse(raw);
  const assets = generateBusinessAssets(profile);

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(
    resolve(outputDirectory, "organization.schema.json"),
    serializeJson(assets.structuredData.organization)
  );
  await writeFile(
    resolve(outputDirectory, "local-business.schema.json"),
    serializeJson(assets.structuredData.localBusiness)
  );
  await writeFile(
    resolve(outputDirectory, "website.schema.json"),
    serializeJson(assets.structuredData.website)
  );
  await writeFile(
    resolve(outputDirectory, "service.schema.json"),
    serializeJson(assets.structuredData.services)
  );

  if (assets.structuredData.faqPage) {
    await writeFile(
      resolve(outputDirectory, "faq-page.schema.json"),
      serializeJson(assets.structuredData.faqPage)
    );
  }

  await writeFile(
    resolve(outputDirectory, "priority-questions.json"),
    serializeJson(assets.aeo.priorityQuestions)
  );
  await writeFile(
    resolve(outputDirectory, "answer-engine-brief.md"),
    `${assets.aeo.answerEngineBrief}\n`
  );
  await writeFile(
    resolve(outputDirectory, "chatbot-system-prompt.txt"),
    `${assets.chatbot.systemPrompt}\n`
  );
  await writeFile(
    resolve(outputDirectory, "chatbot-knowledge-base.md"),
    `${assets.chatbot.knowledgeBase}\n`
  );
  await writeFile(
    resolve(outputDirectory, "chatbot-widget-config.json"),
    serializeJson(assets.chatbot.widgetConfig)
  );

  console.log(`Generated business assets in ${outputDirectory}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
