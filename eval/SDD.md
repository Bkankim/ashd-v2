# ASHD 추출기 Eval — SDD (Spec-Driven Design) v1

> **목적:** 룰 추출기(`src/lib/extractors/rule.ts`)의 필드별 정확도를 *숫자로* 측정하고 회귀를 막는다.
> "eval-driven" 주장을 실물로 증명하는 작업. 기존 기능은 건드리지 않음(추가만).

## S1. 스코프 (v1)
- 대상 함수: `extractFieldsWithRules(rawText) → ExtractedFields` (순수 함수, import 0, 무API·무GPU)
- 평가 필드 **3종**: `store · purchase_date · amount`
  - (refund_deadline·warranty_end_date = ASHD 고유 필드 → 공개셋 부재 → v2에서 자체 골드)

## S2. "정답" 판정 규칙 (필드별)
| 필드 | 정규화 | 일치 기준 |
|---|---|---|
| `store` | trim → 소문자 → 공백제거 | 정규화 후 완전일치 |
| `purchase_date` | (추출기가 이미 YYYY-MM-DD 정규화) | 문자열 완전일치 |
| `amount` | 숫자화 | 정수 완전일치 |

## S3. 지표 (필드별, SROIE식)
각 (예제, 필드)에 대해:
- gold=V, 추출=V → **TP**
- gold=V, 추출=W(≠V) → **FP** + **FN**
- gold=V, 추출=null → **FN**
- gold=null, 추출=값 → **FP**
- gold=null, 추출=null → TN
- **Precision = TP/(TP+FP)** · **Recall = TP/(TP+FN)** · **F1 = 2PR/(P+R)**

## S4. 골드셋
- 포맷: JSONL — `{"id","raw_text","expected":{"store","purchase_date","amount"}}`
- v1 시드: 대표 한국어 영수증 예제(이 레포 `eval/gold/receipts.jsonl`). 추출기의 실제 패턴(홈플러스/GS25/스타벅스, POS 날짜형식, 결제대상금액) 커버.
- **공개 벤치마크 경로:** 시드를 **KORIE**(한국어 영수증 748장, GitHub MahmoudSalah/KORIE)로 교체/확장. 어댑터 매핑: `MerchantName→store · TransactionDate→purchase_date · Total→amount`. 라이선스(연구용) 확인 후.

## S5. 목적·합격선
- 게이트 아님. **베이스라인 측정 + 회귀 방지.** 첫 실행 숫자를 기록으로 박고, 추출기 수정 시 재실행해 하락 감지.

## S6. TDD 흐름
1. RED: 골드셋 작성(정답을 먼저 고정). 점수 미지.
2. GREEN: `eval/run-eval.ts` 작성 → 실행 → 필드별 P/R/F1 표 출력.
3. REFACTOR: 약한 필드(낮은 recall)의 룰 개선 → 재실행으로 개선 확인.

## 실행
```bash
# tsx 또는 node 타입스트립
npx tsx eval/run-eval.ts        # 또는: node --experimental-strip-types eval/run-eval.ts
```
