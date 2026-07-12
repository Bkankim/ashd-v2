/**
 * KORIE → gold JSONL adapter.
 *
 * Input: a directory of KORIE OCR-split field-crop transcriptions
 * (`IMG#####_<Entity>.txt`, e.g. from the OCR Test split zip's `test/` dir).
 * KORIE annotates VALUE regions only, so a receipt's full raw text is not
 * available; we reconstruct a pseudo receipt per image from its field
 * transcriptions, in canonical receipt order.
 *
 * Honesty notes (measurement semantics):
 * - Total/Subtotal/TotalTax crops carry no label text; we render them with
 *   representative Korean labels ("합계"/"소계"/"부가세") since real receipts
 *   print labels the crops exclude. This measures VALUE parsing, not
 *   label discovery.
 * - Date crops keep their real OCR noise (e.g. "]2023-11-09", "'23-05-12").
 * - If the gold date cannot be confidently parsed by the adapter, the date
 *   line is omitted from the pseudo text (avoids unfair false positives).
 * - KORIE data itself must NOT be committed to this repo (research license).
 *
 * Usage:
 *   pnpm eval:korie -- --korie /path/to/korie-ocr/test [--out eval/gold/korie.jsonl]
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

interface Args {
  korie: string;
  out: string;
}

function parseArgs(argv: string[]): Args {
  let korie = "";
  let out = "eval/gold/korie.jsonl";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--korie" && argv[i + 1]) korie = argv[++i]!;
    else if (argv[i] === "--out" && argv[i + 1]) out = argv[++i]!;
  }
  if (!korie) {
    console.error("Usage: tsx eval/adapters/korie.ts --korie <dir> [--out file.jsonl]");
    process.exit(1);
  }
  return { korie, out };
}

/** Parse a noisy KORIE date transcription into YYYY-MM-DD, or null. */
export function parseKorieDate(raw: string): string | null {
  const cleaned = raw.trim().replace(/^[^\d']+/, "");
  const patterns: Array<[RegExp, (m: RegExpMatchArray) => [string, string, string]]> = [
    [/(\d{4})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})/, (m) => [m[1]!, m[2]!, m[3]!]],
    [/'?(\d{2})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})/, (m) => [`20${m[1]}`, m[2]!, m[3]!]],
    [/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/, (m) => [m[1]!, m[2]!, m[3]!]],
  ];
  for (const [re, pick] of patterns) {
    const m = cleaned.match(re);
    if (m) {
      const [y, mo, d] = pick(m);
      const mn = Number(mo);
      const dn = Number(d);
      const yn = Number(y);
      if (yn >= 2000 && yn <= 2100 && mn >= 1 && mn <= 12 && dn >= 1 && dn <= 31) {
        return `${y}-${String(mn).padStart(2, "0")}-${String(dn).padStart(2, "0")}`;
      }
    }
  }
  return null;
}

function parseKorieAmount(raw: string): number | null {
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return null;
  const n = parseInt(digits, 10);
  return n > 0 && n <= 1_000_000_000 ? n : null;
}

interface ReceiptFields {
  [entity: string]: string[];
}

function main() {
  const { korie, out } = parseArgs(process.argv.slice(2));

  const byImage = new Map<string, ReceiptFields>();
  for (const file of readdirSync(korie)) {
    if (!file.endsWith(".txt")) continue;
    const sep = file.indexOf("_");
    if (sep < 0) continue;
    const image = file.slice(0, sep);
    const entity = file.slice(sep + 1, -4);
    const text = readFileSync(join(korie, file), "utf8").trim();
    if (!text) continue;
    const fields = byImage.get(image) ?? {};
    (fields[entity] ??= []).push(text);
    byImage.set(image, fields);
  }

  const lines: string[] = [];
  let skipped = 0;

  for (const [image, fields] of [...byImage.entries()].sort()) {
    const merchant = fields["MerchantName"]?.[0] ?? null;
    const dateRaw = fields["TransactionDate"]?.[0] ?? null;
    const totalRaw = fields["Total"]?.[0] ?? null;

    const goldDate = dateRaw ? parseKorieDate(dateRaw) : null;
    const goldAmount = totalRaw ? parseKorieAmount(totalRaw) : null;

    // Need at least one scoreable field
    if (!merchant && !goldDate && !goldAmount) {
      skipped++;
      continue;
    }

    const textLines: string[] = [];
    if (merchant) textLines.push(merchant);
    for (const addr of fields["MerchantAddress"] ?? []) textLines.push(addr);
    for (const phone of fields["MerchantPhoneNumber"] ?? []) textLines.push(phone);
    // Only include the date line when its gold is parseable (see header note)
    if (dateRaw && goldDate) {
      textLines.push(`${dateRaw} ${fields["TransactionTime"]?.[0] ?? ""}`.trim());
    }
    for (const item of fields["Item_Unit_Price"] ?? []) textLines.push(item);
    for (const item of fields["Item_Total_Price"] ?? []) textLines.push(item);
    if (fields["Subtotal"]?.[0]) textLines.push(`소계 ${fields["Subtotal"][0]}`);
    if (fields["TotalTax"]?.[0]) textLines.push(`부가세 ${fields["TotalTax"][0]}`);
    if (totalRaw && goldAmount) textLines.push(`합계 ${totalRaw}`);

    if (textLines.length === 0) {
      skipped++;
      continue;
    }

    // Unknown fields (missing crops) are OMITTED — the eval skips absent keys
    // instead of scoring them as false positives (annotation gap ≠ true absence).
    const expected: Record<string, unknown> = {};
    if (merchant) expected.store = merchant;
    if (goldDate) expected.purchase_date = goldDate;
    if (goldAmount) expected.amount = goldAmount;

    lines.push(
      JSON.stringify({
        id: `korie-${image}`,
        raw_text: textLines.join("\n"),
        expected,
      }),
    );
  }

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, lines.join("\n") + "\n");
  console.log(`korie adapter: ${lines.length} examples written to ${out} (${skipped} skipped)`);
}

main();
