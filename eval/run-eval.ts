/**
 * ASHD 추출기 eval — SDD.md 기반.
 * 룰 추출기를 골드셋에 돌려 필드별 Precision/Recall/F1를 출력한다.
 *
 * 실행:
 *   pnpm eval                         # 시드 골드셋 측정
 *   pnpm eval -- --gold eval/gold/korie.jsonl   # KORIE 골드셋 측정 (로컬 전용)
 *   pnpm eval -- --check              # 시드셋 F1을 eval/baseline.json과 비교, 하락 시 exit 1
 *   pnpm eval -- --update-baseline    # 현재 시드셋 점수를 baseline으로 기록
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { extractFieldsWithRules } from "../src/lib/extractors/rule.ts";

const FIELDS = ["store", "purchase_date", "amount"] as const;
type Field = (typeof FIELDS)[number];

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_GOLD = join(here, "gold", "receipts.jsonl");
const BASELINE_PATH = join(here, "baseline.json");

// --- args
const argv = process.argv.slice(2);
let goldPath = DEFAULT_GOLD;
let check = false;
let updateBaseline = false;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--gold" && argv[i + 1]) goldPath = resolve(argv[++i]!);
  else if (argv[i] === "--check") check = true;
  else if (argv[i] === "--update-baseline") updateBaseline = true;
}
const isSeedGold = resolve(goldPath) === resolve(DEFAULT_GOLD);

// S2. 필드별 정규화
const normalize: Record<Field, (v: unknown) => string | null> = {
  store: (v) => (v == null ? null : String(v).trim().toLowerCase().replace(/\s+/g, "")),
  purchase_date: (v) => (v == null ? null : String(v).trim()),
  amount: (v) => (v == null ? null : String(Number(v))),
};

interface GoldRow {
  id: string;
  raw_text: string;
  expected: Partial<Record<Field, unknown>>;
}

const gold: GoldRow[] = readFileSync(goldPath, "utf8")
  .split("\n")
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l));

type Stat = { tp: number; fp: number; fn: number; tn: number };
const stats: Record<Field, Stat> = {
  store: { tp: 0, fp: 0, fn: 0, tn: 0 },
  purchase_date: { tp: 0, fp: 0, fn: 0, tn: 0 },
  amount: { tp: 0, fp: 0, fn: 0, tn: 0 },
};

const misses: string[] = [];

for (const ex of gold) {
  const pred = extractFieldsWithRules(ex.raw_text) as Record<string, unknown>;
  for (const f of FIELDS) {
    // 키 부재 = unknown(채점 제외, KORIE 어노테이션 갭) / 명시적 null = 진짜 부재(FP 채점)
    if (!(f in (ex.expected ?? {}))) continue;
    const g = normalize[f](ex.expected?.[f] ?? null);
    const p = normalize[f](pred[f] ?? null);
    const s = stats[f];
    if (g !== null && p !== null && g === p) s.tp++;
    else if (g !== null && p !== null && g !== p) {
      s.fp++; s.fn++;
      misses.push(`${ex.id} ${f}: gold=${g} pred=${p} (틀림)`);
    } else if (g !== null && p === null) {
      s.fn++;
      misses.push(`${ex.id} ${f}: gold=${g} pred=∅ (놓침)`);
    } else if (g === null && p !== null) {
      s.fp++;
      misses.push(`${ex.id} ${f}: gold=∅ pred=${p} (헛것)`);
    } else s.tn++;
  }
}

function prf(s: Stat) {
  const P = s.tp + s.fp ? s.tp / (s.tp + s.fp) : 1;
  const R = s.tp + s.fn ? s.tp / (s.tp + s.fn) : 1;
  const F = P + R ? (2 * P * R) / (P + R) : 0;
  return { P, R, F };
}
const pct = (x: number) => `${(x * 100).toFixed(0)}%`.padStart(4);

console.log(`\nASHD rule-extractor eval — ${gold.length} examples (3 fields) [${goldPath}]\n`);
console.log("field          TP FP FN TN |   P    R   F1");
console.log("-".repeat(48));
const scores: Record<Field, number> = { store: 0, purchase_date: 0, amount: 0 };
for (const f of FIELDS) {
  const s = stats[f];
  const { P, R, F } = prf(s);
  scores[f] = F;
  console.log(
    `${f.padEnd(14)} ${String(s.tp).padStart(2)} ${String(s.fp).padStart(2)} ${String(s.fn).padStart(2)} ${String(s.tn).padStart(2)} | ${pct(P)} ${pct(R)} ${pct(F)}`,
  );
}
if (misses.length) {
  console.log(`\n약점 (${misses.length}):`);
  const shown = misses.slice(0, 40);
  for (const m of shown) console.log("  - " + m);
  if (misses.length > shown.length) console.log(`  … ${misses.length - shown.length} more`);
}
console.log("");

// --- baseline gate (seed gold only)
if (updateBaseline) {
  if (!isSeedGold) {
    console.error("--update-baseline은 시드 골드셋에서만 허용된다.");
    process.exit(1);
  }
  writeFileSync(BASELINE_PATH, JSON.stringify(scores, null, 2) + "\n");
  console.log(`baseline updated: ${BASELINE_PATH}`);
}

if (check) {
  if (!isSeedGold) {
    console.error("--check는 시드 골드셋 회귀 게이트다. KORIE 숫자는 기록용.");
    process.exit(1);
  }
  if (!existsSync(BASELINE_PATH)) {
    console.error("baseline.json이 없다. 먼저 --update-baseline으로 기록해라.");
    process.exit(1);
  }
  const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as Record<Field, number>;
  const EPS = 1e-9;
  let failed = false;
  for (const f of FIELDS) {
    const base = baseline[f] ?? 0;
    if (scores[f] < base - EPS) {
      console.error(`REGRESSION ${f}: F1 ${(scores[f] * 100).toFixed(1)}% < baseline ${(base * 100).toFixed(1)}%`);
      failed = true;
    }
  }
  if (failed) process.exit(1);
  console.log("baseline check passed.");
}
