require("dotenv").config({ quiet: true });

const fs = require("fs");
const path = require("path");
const Anthropic = require("@anthropic-ai/sdk");
const cors = require("cors");
const express = require("express");
const { readSheet } = require("read-excel-file/node");
const { PDFParse } = require("pdf-parse");

const PORT = Number(process.env.PORT) || 3000;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
const MAX_TOKENS = Number(process.env.MAX_TOKENS) || 1024;
const MAX_TOOL_LOOPS = 6;
const DATA_DIR = path.join(__dirname, "data");
const RATES_FILE = path.join(DATA_DIR, "rates.xlsx");

const RATE_COLUMN_ALIASES = {
  direction: ["direction"],
  mode: ["mode", "transport_mode", "shipping_mode"],
  carrier: ["carrier", "airline", "shipping_line"],
  container_type: ["container_type", "container", "container_kind", "handling_type"],
  min_weight: ["min_weight", "min", "minimum_weight", "min_kg", "min_cbm"],
  max_weight: ["max_weight", "max", "maximum_weight", "max_kg", "max_cbm"],
  destination: ["destination", "city", "country", "destination_city", "destination_country"],
  rate: ["rate", "price", "price_per_unit", "cost"],
  currency: ["currency"],
  unit: ["unit", "rate_unit"],
  notes: ["notes", "note", "description"]
};

const TOOLS = [
  {
    name: "get_freight_rate",
    description:
      "Look up a freight rate from the external Excel pricing matrix. Call this whenever the customer asks about a specific price, rate, or shipping cost.",
    input_schema: {
      type: "object",
      properties: {
        direction: {
          type: "string",
          enum: ["export", "import"],
          description: "Whether the shipment is going out (export) or coming in (import)."
        },
        mode: {
          type: "string",
          enum: ["air", "sea", "land"],
          description: "Transport mode."
        },
        carrier: {
          type: "string",
          description: "Carrier name if mentioned. Use 'any' if not specified."
        },
        container_type: {
          type: "string",
          description: "Container or handling type: standard, open_top, open_side, bulk, or any."
        },
        weight: {
          type: "number",
          description: "Weight in kg for air/land or volume in CBM for sea."
        },
        destination: {
          type: "string",
          description: "Destination city or country. Use 'any' if not specified."
        }
      },
      required: ["direction", "mode", "weight"]
    }
  }
];

let pricingMatrix = [];
let externalKnowledge = "";
let anthropic = null;

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeText(value, fallback = "any") {
  const text = String(value ?? fallback).trim().toLowerCase();
  return (text || fallback).replace(/\s+/g, "_");
}

function normalizeDestination(value) {
  const text = String(value ?? "any").trim().toLowerCase();
  return text || "any";
}

function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildHeaderMap(headerRow) {
  const normalizedHeaders = headerRow.map(normalizeHeader);
  const map = {};

  Object.entries(RATE_COLUMN_ALIASES).forEach(([field, aliases]) => {
    const normalizedAliases = aliases.map(normalizeHeader);
    const index = normalizedHeaders.findIndex((header) => normalizedAliases.includes(header));
    if (index >= 0) map[field] = index;
  });

  return map;
}

function getCell(row, headerMap, field, fallback = "") {
  const index = headerMap[field];
  return index === undefined ? fallback : row[index] ?? fallback;
}

async function loadRates() {
  if (!fs.existsSync(RATES_FILE)) {
    console.warn(`No pricing spreadsheet found at ${RATES_FILE}. Rate lookups will return custom quote guidance.`);
    return [];
  }

  const rows = await readSheet(RATES_FILE);
  if (!rows.length) return [];

  const headerMap = buildHeaderMap(rows[0]);
  const missingRequiredColumns = ["direction", "mode", "min_weight", "max_weight", "destination", "rate"]
    .filter((field) => headerMap[field] === undefined);

  if (missingRequiredColumns.length) {
    throw new Error(`rates.xlsx is missing required columns: ${missingRequiredColumns.join(", ")}`);
  }

  return rows.slice(1)
    .map((row, index) => {
      const mode = normalizeText(getCell(row, headerMap, "mode"));
      const rate = toNumber(getCell(row, headerMap, "rate"), NaN);

      if (!Number.isFinite(rate)) return null;

      return {
        row_number: index + 2,
        direction: normalizeText(getCell(row, headerMap, "direction")),
        mode,
        carrier: normalizeText(getCell(row, headerMap, "carrier"), "any"),
        container_type: normalizeText(getCell(row, headerMap, "container_type"), "any"),
        min_weight: toNumber(getCell(row, headerMap, "min_weight")),
        max_weight: toNumber(getCell(row, headerMap, "max_weight"), Number.POSITIVE_INFINITY),
        destination: normalizeDestination(getCell(row, headerMap, "destination", "any")),
        rate,
        currency: String(getCell(row, headerMap, "currency", "AED") || "AED").trim(),
        unit: normalizeText(getCell(row, headerMap, "unit", mode === "sea" ? "per_cbm" : "per_kg")),
        notes: String(getCell(row, headerMap, "notes", "") || "").trim()
      };
    })
    .filter(Boolean);
}

async function readPdfText(filePath) {
  const parser = new PDFParse({ data: fs.readFileSync(filePath) });

  try {
    const result = await parser.getText();
    return result.text || "";
  } finally {
    await parser.destroy();
  }
}

async function loadKnowledgeDocuments() {
  if (!fs.existsSync(DATA_DIR)) {
    console.warn(`No data directory found at ${DATA_DIR}. Business knowledge will be empty.`);
    return "";
  }

  const files = fs.readdirSync(DATA_DIR)
    .filter((file) => [".txt", ".pdf"].includes(path.extname(file).toLowerCase()))
    .sort();

  const chunks = [];

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const ext = path.extname(file).toLowerCase();

    try {
      const text = ext === ".pdf"
        ? await readPdfText(filePath)
        : fs.readFileSync(filePath, "utf8");

      if (text.trim()) {
        chunks.push(`SOURCE: ${file}\n${text.trim()}`);
      }
    } catch (error) {
      console.warn(`Could not load ${file}: ${error.message}`);
    }
  }

  return chunks.join("\n\n---\n\n");
}

function buildSystemPrompt() {
  return `You are SwiftFreight Assistant, a helpful AI customer service assistant for SwiftFreight UAE.

BUSINESS INFORMATION FROM EXTERNAL FILES:
${externalKnowledge || "No document knowledge has been loaded yet."}

YOUR RULES:
- Use only the business information from the external files and the get_freight_rate tool results.
- Never invent prices, transit times, services, policies, or contact details.
- Use get_freight_rate when the customer asks for a specific rate, price, quote, or cost.
- Extract direction, mode, carrier if mentioned, weight or CBM, container type if relevant, and destination before using the tool.
- After using the tool, explain the result naturally. Calculate totals when quantity is provided and mention that prices are estimates to confirm when booking.
- If a question is not covered, say you do not have that detail and share the listed WhatsApp or email contact if available in the external files.
- Be warm, friendly, and concise. Always offer a next step.
- Never say you are Claude or made by Anthropic. You are SwiftFreight Assistant.`;
}

function stringMatches(rowValue, requestedValue) {
  const row = normalizeDestination(rowValue);
  const requested = normalizeDestination(requestedValue);

  if (row === "any" || requested === "any") return true;
  return row === requested || row.includes(requested) || requested.includes(row);
}

function scoreRate(row, args) {
  const direction = normalizeText(args.direction, "");
  const mode = normalizeText(args.mode, "");
  const carrier = normalizeText(args.carrier, "any");
  const containerType = normalizeText(args.container_type, "any");
  const destination = normalizeDestination(args.destination || "any");
  const quantity = toNumber(args.weight, NaN);

  if (!direction || !mode || !Number.isFinite(quantity) || quantity <= 0) return -1;
  if (row.direction !== direction || row.mode !== mode) return -1;
  if (quantity < row.min_weight || quantity > row.max_weight) return -1;
  if (row.carrier !== "any" && carrier !== "any" && row.carrier !== carrier) return -1;
  if (row.container_type !== "any" && containerType !== "any" && row.container_type !== containerType) return -1;
  if (!stringMatches(row.destination, destination)) return -1;

  let score = 0;
  if (row.carrier !== "any" && row.carrier === carrier) score += 10;
  if (row.container_type !== "any" && row.container_type === containerType) score += 10;
  if (row.destination !== "any" && stringMatches(row.destination, destination)) score += 10;

  // Prefer generic rows when the user did not provide that filter.
  if (carrier === "any" && row.carrier === "any") score += 2;
  if (containerType === "any" && row.container_type === "any") score += 2;
  if (destination === "any" && row.destination === "any") score += 2;

  return score;
}

function executeTool(name, args) {
  if (name !== "get_freight_rate") return { error: "Unknown tool." };

  const direction = normalizeText(args.direction, "");
  const mode = normalizeText(args.mode, "");
  const carrier = normalizeText(args.carrier, "any");
  const containerType = normalizeText(args.container_type, "any");
  const destination = normalizeDestination(args.destination || "any");
  const quantity = toNumber(args.weight, NaN);

  if (!pricingMatrix.length) {
    return {
      found: false,
      message: "No rates are loaded. Ask the customer to contact SwiftFreight for a custom quote."
    };
  }

  const candidates = pricingMatrix
    .map((row) => ({ row, score: scoreRate(row, args) }))
    .filter((candidate) => candidate.score >= 0)
    .sort((a, b) => b.score - a.score);

  if (!candidates.length) {
    return {
      found: false,
      query: { direction, mode, carrier, container_type: containerType, quantity, destination },
      message: "No matching rate was found in rates.xlsx. The customer should contact SwiftFreight for a custom quote."
    };
  }

  const best = candidates[0].row;
  const estimatedTotal = Number((best.rate * quantity).toFixed(2));

  return {
    found: true,
    direction: best.direction,
    mode: best.mode,
    carrier: best.carrier === "any" ? "any available carrier" : best.carrier.replace(/_/g, " "),
    container_type: best.container_type,
    destination: best.destination,
    rate: best.rate,
    currency: best.currency,
    unit: best.unit,
    quantity_queried: quantity,
    estimated_total: estimatedTotal,
    notes: best.notes,
    source: `rates.xlsx row ${best.row_number}`
  };
}

function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter((message) => ["user", "assistant"].includes(message?.role) && typeof message.content === "string")
    .map((message) => ({
      role: message.role,
      content: message.content.slice(0, 5000)
    }))
    .slice(-20);
}

function getAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured. Copy .env.example to .env and add your key.");
  }

  if (!anthropic) {
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  return anthropic;
}

async function callAnthropic(messages) {
  return getAnthropicClient().messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: buildSystemPrompt(),
    tools: TOOLS,
    messages
  });
}

function extractTextReply(content) {
  if (!Array.isArray(content)) return "";
  return content
    .filter((block) => block.type === "text" && block.text)
    .map((block) => block.text)
    .join("\n")
    .trim();
}

async function createChatReply(clientMessages) {
  let messages = [...clientMessages];
  let response = await callAnthropic(messages);
  let loops = 0;

  while (response.stop_reason === "tool_use" && loops < MAX_TOOL_LOOPS) {
    loops += 1;
    messages.push({ role: "assistant", content: response.content });

    const toolResults = response.content
      .filter((block) => block.type === "tool_use")
      .map((block) => ({
        type: "tool_result",
        tool_use_id: block.id,
        content: JSON.stringify(executeTool(block.name, block.input || {}))
      }));

    messages.push({ role: "user", content: toolResults });
    response = await callAnthropic(messages);
  }

  if (loops >= MAX_TOOL_LOOPS) {
    throw new Error("Tool loop exceeded the safety limit.");
  }

  return extractTextReply(response.content) || "Sorry, I couldn't get a response. Please try again.";
}

async function startServer() {
  pricingMatrix = await loadRates();
  externalKnowledge = await loadKnowledgeDocuments();

  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.static(__dirname));

  app.get("/api/health", (req, res) => {
    res.json({
      ok: true,
      rates_loaded: pricingMatrix.length,
      knowledge_loaded: externalKnowledge.length > 0,
      model: MODEL
    });
  });

  app.post("/api/chat", async (req, res) => {
    const messages = sanitizeMessages(req.body?.messages);

    if (!messages.length || messages[messages.length - 1].role !== "user") {
      return res.status(400).json({ error: "Request body must include messages ending with a user message." });
    }

    try {
      const reply = await createChatReply(messages);
      res.json({ reply });
    } catch (error) {
      console.error("Chat request failed:", error);
      res.status(500).json({ error: error.message || "Chat request failed." });
    }
  });

  app.listen(PORT, () => {
    console.log(`BizBot V3 server running at http://localhost:${PORT}`);
    console.log(`Loaded ${pricingMatrix.length} pricing rows from data/rates.xlsx`);
    console.log(`Loaded ${externalKnowledge.length} characters of document knowledge`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start BizBot V3 server:", error);
  process.exit(1);
});
