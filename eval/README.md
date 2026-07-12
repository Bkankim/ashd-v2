# ASHD 추출기 Eval

룰 추출기(`src/lib/extractors/rule.ts`)의 필드별 정확도를 측정하는 회귀-가드 eval.
스펙은 [`SDD.md`](./SDD.md).

## 실행
```bash
pnpm eval                       # 시드 골드셋(10건) 측정
pnpm eval -- --check            # 시드 F1을 baseline.json과 비교, 하락 시 exit 1 (CI 게이트)
pnpm eval -- --update-baseline  # 룰 개선 후 새 기준점 기록
pnpm eval -- --gold eval/gold/korie.jsonl   # KORIE 골드셋 측정 (로컬 전용)
```

## 출력
필드별 TP/FP/FN/TN + Precision/Recall/F1 표 + 약점 목록(어느 예제/필드가 틀렸나).

## 구조
```
eval/
├── SDD.md                  # 스펙 (스코프·정답판정·지표)
├── run-eval.ts             # 하니스 (gold 로드 → 추출기 실행 → 채점 → baseline 게이트)
├── baseline.json           # 시드셋 F1 기준점 (CI 회귀 게이트의 비교 대상, 커밋됨)
├── gold/receipts.jsonl     # 시드 골드셋 (정답 라벨, 1줄=1예제, 커밋됨)
├── gold/korie.jsonl        # KORIE 변환 골드셋 (로컬 생성, 커밋 금지 — .gitignore)
├── adapters/korie.ts       # KORIE OCR 스플릿 → gold JSONL 변환기
└── adapters/korie.md       # KORIE 연결 가이드 (원 문서)
```

## KORIE 벤치마크 (774장 한국어 영수증, 로컬 전용)

KORIE 데이터는 연구용 라이선스라 **레포에 커밋하지 않는다**. 로컬 절차:

```bash
# 1. OCR 스플릿(필드 크롭 전사) 다운로드 — github.com/MahmoudSalah/KORIE 의
#    "OCR Dataset" Google Drive 링크에서 Test(~18.6MB) zip을 받는다
curl -sL -o /tmp/korie-ocr-test \
  "https://drive.usercontent.google.com/download?id=1GtEzSUA2wTNfOujO67-JEZ_PLpJOdBhg&export=download&confirm=t"
mkdir -p /tmp/korie-ocr && cd /tmp/korie-ocr && unzip -o /tmp/../korie-ocr-test "*.txt"

# 2. 어댑터로 gold JSONL 생성 (프로젝트 루트에서)
pnpm eval:korie -- --korie /tmp/korie-ocr/test

# 3. 측정
pnpm eval -- --gold eval/gold/korie.jsonl
```

### 측정 의미론 (정직 노트)
- KORIE OCR 스플릿은 **필드 크롭 전사**(값 영역만)라 전체 영수증 원문이 없다.
  어댑터가 필드들을 영수증 순서로 이어붙인 **pseudo raw_text**를 만든다.
- `Total/Subtotal/TotalTax`는 값만 크롭돼 있어 대표 라벨(`합계`/`소계`/`부가세`)을
  붙여 렌더링한다 → amount 지표는 **값 파싱** 능력을 재는 것이지 라벨 발견 능력이 아니다.
- 어댑터가 MerchantName을 첫 줄에 놓으므로 store 지표는 첫줄-휴리스틱의
  **수용 동작**(진짜 상호를 잘못 배제하지 않는지)을 재는 것이지 위치 발견이 아니다.
- 날짜 크롭은 실제 OCR 노이즈(`]2023-11-09`, `'23-05-12`, `2023. 10. 25`)를
  그대로 담고 있어 date 지표는 실전 강건성을 잰다.
- 크롭이 누락된 필드는 `expected`에서 **키 자체를 생략**(unknown) → 채점 제외.
  시드셋의 명시적 `null`(진짜 부재)은 예측 시 FP로 채점 — 의미가 다르다.

### 실측 기록 (2026-07-05, OCR Test 스플릿 314예제)
| field | 개선 전 F1 | 개선 후 F1 |
|---|---|---|
| store | 9% (브랜드 목록 방식) | 100% (첫줄 휴리스틱, 위 노트 참고) |
| purchase_date | 89% | 99% |
| amount | 98% | 100% |

시드셋: 3필드 모두 100% (r5 일반상호, r10 원-없는-금액 miss 수정됨).

## 골드셋 추가법
`gold/receipts.jsonl`에 한 줄 추가:
```json
{"id":"r11","raw_text":"매장명...\n2026-01-02\n...원","expected":{"store":"매장명...","purchase_date":"2026-01-02","amount":12345}}
```
- `expected`는 **사람이 본 정답**(추출기 출력 아님). `null`이면 그 필드는 영수증에 없음.
  키를 아예 생략하면 unknown(채점 제외).
- `\n`으로 줄바꿈. 추가 후 `pnpm eval` 재실행.

## eval-driven 루프
1. `pnpm eval` → 약점 확인
2. `rule.ts` 해당 룰 개선 (예: 금액 키워드 추가)
3. `pnpm eval` 재실행 → 숫자 오르는지 확인
4. 개선 확정 시 `pnpm eval -- --update-baseline` → CI 게이트 기준점 갱신

## CI 게이트
`.github/workflows/eval.yml`이 PR마다 `pnpm eval -- --check`를 실행한다.
시드셋 필드별 F1이 `baseline.json`보다 낮아지면 CI가 실패한다.
KORIE 숫자는 기록용이며 게이트가 아니다 (데이터가 레포 밖이라 CI에서 실행 불가).

## 현재 스코프
- 필드 3종: `store · purchase_date · amount`
- `refund_deadline · warranty_end_date`는 ASHD 고유 필드 → 공개셋 부재 → 자체 골드 확장 예정
