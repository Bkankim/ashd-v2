/**
 * LLM-based supplementary field extraction.
 * Supports dual provider: OpenAI and Anthropic via LLM_PROVIDER env.
 */

import type { ExtractedFields } from "./rule";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("extractors/llm");

const SYSTEM_PROMPT = `You are a Korean receipt/warranty document parser. Extract product information from OCR text.

Return a JSON object with ONLY the fields you can confidently extract. Do not guess.
Fields:
- title: product name (string)
- product_category: product category (string)
- purchase_date: purchase date in YYYY-MM-DD format (string)
- amount: price in KRW as integer (number)
- store: store/seller name (string)
- order_id: order number (string)
- refund_deadline: refund deadline in YYYY-MM-DD format (string)
- warranty_end_date: warranty expiration in YYYY-MM-DD format (string)
- as_contact: after-service contact phone number (string)

Only include fields where you are reasonably confident. Return valid JSON only.`;

interface LlmConfig {
  provider: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

function getLlmConfig(): LlmConfig {
  return {
    provider: process.env.LLM_PROVIDER ?? "openai",
    baseUrl: process.env.LLM_BASE_URL ?? "https://api.openai.com/v1",
    apiKey: process.env.LLM_API_KEY ?? "",
    model: process.env.LLM_MODEL ?? "gpt-4o-mini",
  };
}

export async function extractFieldsWithLlm(
  rawText: string,
  existingFields: ExtractedFields,
): Promise<ExtractedFields> {
  const config = getLlmConfig();
  if (!config.apiKey) {
    return {};
  }

  // Build prompt with context about what's already extracted
  const existingStr = Object.entries(existingFields)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(", ");

  const userPrompt = `OCR Text:
${rawText.substring(0, 3000)}

Already extracted fields: ${existingStr || "none"}

Extract any MISSING fields from the OCR text. Return JSON only.`;

  try {
    log.info({ provider: config.provider, model: config.model }, "Calling LLM");
    if (config.provider === "anthropic") {
      return await callAnthropic(config, userPrompt);
    }
    // Default: OpenAI-compatible API
    const result = await callOpenAI(config, userPrompt);
    log.info({ fieldCount: Object.values(result).filter(Boolean).length }, "LLM extraction done");
    return result;
  } catch (error) {
    log.error({ err: error }, "LLM extraction failed");
    return {};
  }
}

async function callOpenAI(
  config: LlmConfig,
  userPrompt: string,
): Promise<ExtractedFields> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) return {};

  return parseJsonSafely(content);
}

async function callAnthropic(
  config: LlmConfig,
  userPrompt: string,
): Promise<ExtractedFields> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model || "claude-3-5-haiku-20241022",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data?.content?.[0]?.text;
  if (!content) return {};

  return parseJsonSafely(content);
}

function parseJsonSafely(content: string): ExtractedFields {
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch?.[0]) return {};

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    const fields: ExtractedFields = {};

    if (typeof parsed.title === "string") fields.title = parsed.title;
    if (typeof parsed.product_category === "string")
      fields.product_category = parsed.product_category;
    if (typeof parsed.purchase_date === "string")
      fields.purchase_date = parsed.purchase_date;
    if (typeof parsed.amount === "number") fields.amount = parsed.amount;
    if (typeof parsed.store === "string") fields.store = parsed.store;
    if (typeof parsed.order_id === "string") fields.order_id = parsed.order_id;
    if (typeof parsed.refund_deadline === "string")
      fields.refund_deadline = parsed.refund_deadline;
    if (typeof parsed.warranty_end_date === "string")
      fields.warranty_end_date = parsed.warranty_end_date;
    if (typeof parsed.as_contact === "string")
      fields.as_contact = parsed.as_contact;

    return fields;
  } catch {
    return {};
  }
}
