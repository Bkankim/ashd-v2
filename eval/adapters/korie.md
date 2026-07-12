# KORIE 어댑터 가이드 (공개 벤치마크 연결)

> 시드 골드셋을 **공개 한국어 영수증 벤치마크 KORIE**로 교체/확장해 *citable* 베이스라인을 만든다.
> ⚠️ 아직 미구현(문서만). 직접 KORIE 받아서 아래대로 변환하면 됨.

## KORIE란
- 한국어 소매 영수증 **748장** KIE 벤치마크 (스캔/OCR/정보추출).
- GitHub: `MahmoudSalah/KORIE` (Mathematics 2026 논문). 라이선스(연구용) 반드시 확인.
- 엔티티 스키마: `MerchantName, TransactionDate, Total, Subtotal, Price, Item, Quantity, MerchantPhoneNumber, ReceiptNumber, MerchantAddress, ...`

## 필드 매핑 (KORIE → ASHD)
| ASHD | KORIE | 변환 |
|---|---|---|
| `store` | `MerchantName` | 그대로 (정규화는 eval이 처리) |
| `purchase_date` | `TransactionDate` | **YYYY-MM-DD로 정규화 필요** (KORIE 포맷 확인 후) |
| `amount` | `Total` | 콤마·통화기호 제거 → 정수 |
| refund_deadline / warranty_end_date | *(없음)* | KORIE에 없음 → v2 자체 골드 |

## 변환 절차 (스케치)
1. KORIE 어노테이션을 로드(예제별 OCR 텍스트 + 엔티티).
2. 각 예제를 `{ id, raw_text(=OCR 텍스트), expected:{store,purchase_date,amount} }`로 변환.
3. `eval/gold/korie.jsonl`로 저장.
4. `run-eval.ts`의 gold 경로를 바꾸거나 인자로 받게 수정 → `pnpm eval`.

## 주의 (eval 설계 교훈)
- KORIE는 *영어/인니어 SROIE·CORD와 달리* 한국어라 ASHD 분포와 맞음 → **이 셋을 써야 의미 있음.**
- 단 KORIE도 네 실제 사용자 영수증 분포와 100% 같진 않다 → 가능하면 **실사용 영수증 일부도 골드에 섞어라.**
- 프로토콜은 SROIE식 **필드별 P/R/F1**(이미 `run-eval.ts`가 구현).
