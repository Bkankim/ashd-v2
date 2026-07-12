/**
 * Rule-based field extraction from OCR text.
 * Ported from Python v1 app/extractors/rule.py
 */

export interface ExtractedFields {
  title?: string;
  product_category?: string;
  purchase_date?: string;
  amount?: number;
  store?: string;
  order_id?: string;
  refund_deadline?: string;
  warranty_end_date?: string;
  as_contact?: string;
  source?: "manual" | "screenshot" | "kakao_share" | "email";
}

function validateAndFormat(year: string, month: string, day: string): string | undefined {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) {
    return undefined;
  }
  // Calendar round-trip: rejects Feb/Apr 31 etc. (Date.UTC rolls them over) —
  // otherwise Postgres `date` rejects the insert and fails the whole job.
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    return undefined;
  }
  return `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function parseDate(value: string): string | undefined {
  const cleaned = value.trim();
  const patterns = [
    /^(\d{4})-(\d{2})-(\d{2})$/,
    /^(\d{4})\/(\d{2})\/(\d{2})$/,
    /^(\d{4})\.(\d{2})\.(\d{2})$/,
    /^(\d{4})(\d{2})(\d{2})$/,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match && match[1] && match[2] && match[3]) {
      return validateAndFormat(match[1], match[2], match[3]);
    }
  }
  return undefined;
}

function parseAmount(value: string): number | undefined {
  const cleaned = value.replace(/[^0-9]/g, "");
  if (!cleaned) return undefined;
  const num = parseInt(cleaned, 10);
  if (isNaN(num) || num <= 0) return undefined;
  return num;
}

/**
 * 첫 줄이 상호로 볼 만한지 판정. 영수증 헤더 잡음(영수증/고객용/사업자 라벨,
 * 날짜/금액/전화번호 라인)을 배제한다. KORIE 실측 기반 휴리스틱.
 */
function isPlausibleStoreLine(line: string): boolean {
  if (line.length < 2 || line.length > 40) return false;
  if (!/[가-힣A-Za-z]/.test(line)) return false; // 문자 없는 순수 숫자/기호 라인
  if (/영수증|고객용|사업자|대표자?|간이|세금계산서|카드|승인|현금|교환|환불|POS|TEL|전화/i.test(line)) return false;
  if (/\d{4}\s*[-./년]\s*\d{1,2}/.test(line)) return false; // 날짜 라인
  if (/\d{2,3}-\d{3,4}-\d{4}/.test(line)) return false; // 전화번호 라인
  if (/^[0-9,.\s]+원?$/.test(line)) return false; // 금액 라인
  return true;
}

export function extractFieldsWithRules(rawText: string): ExtractedFields {
  const fields: ExtractedFields = {};
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Store name extraction — 우선순위:
  //  1) keyword:value 라벨 (상호/매장/판매처)
  //  2) 첫 줄 휴리스틱 — 실제 영수증은 첫 줄이 상호인 경우가 압도적
  //     (KORIE 314건 실측에서 브랜드 목록 방식 F1 9% → 첫줄 방식이 지배적 개선)
  //  3) 알려진 브랜드 패턴 (본문 중간에 상호가 있는 경우의 보루)
  for (const line of lines) {
    if (/상호|매장|판매처/.test(line)) {
      const parts = line.split(/[:：]/);
      if (parts.length >= 2 && parts[1]) {
        fields.store = parts[1].trim();
        break;
      }
    }
  }
  if (!fields.store && lines[0] && isPlausibleStoreLine(lines[0])) {
    fields.store = lines[0];
  }
  if (!fields.store) {
    const storePatterns = [
      /(?:홈플러스|이마트|코스트코|롯데마트|하나로마트|트레이더스)\s*\S+(?:점|센터)/,
      /(?:GS25|CU|세븐일레븐|이마트24|미니스톱)\s*\S+(?:점)?/,
      /(?:다이소|올리브영|무신사|쿠팡)\s*\S+(?:점|센터)?/,
      /(?:스타벅스|투썸플레이스|이디야|메가커피|빽다방|컴포즈)\s*\S+(?:점)?/,
    ];
    for (const pattern of storePatterns) {
      const match = rawText.match(pattern);
      if (match?.[0]) {
        fields.store = match[0].trim();
        break;
      }
    }
  }

  // Product title extraction — keyword:value 형식 + 상품명 다음 줄 패턴
  for (const line of lines) {
    if (/상품명|제품명|품목/.test(line)) {
      const parts = line.split(/[:：]/);
      if (parts.length >= 2 && parts[1]) {
        fields.title = parts[1].trim();
        break;
      }
    }
  }
  if (!fields.title) {
    for (let i = 0; i < lines.length; i++) {
      if (/^상품명/.test(lines[i] ?? "")) {
        const nextLine = lines[i + 1];
        if (nextLine && !/^[0-9-]+$/.test(nextLine) && !/단가|수량|금액/.test(nextLine)) {
          fields.title = nextLine.substring(0, 255);
          break;
        }
      }
    }
  }

  // Date extraction — 다양한 POS/OCR 날짜 형식 지원
  const datePatterns = [
    // 표준: YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD (+ OCR 공백 변형 "2023. 10. 25")
    /(\d{4})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{1,2})/,
    // POS 변형: 2026//06 19:48:00 (홈플러스 등 슬래시 + 공백 + 일자:시간)
    /(\d{4})\/{1,2}(\d{2})\s+(\d{2})[\s:]/,
    // 한국어: 2026년 06월 19일
    /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/,
    // 축약: 26/06/19, 26-06-19 (YY-MM-DD)
    /\b(\d{2})[./-](\d{2})[./-](\d{2})\b/,
    // 연속: YYYYMMDD
    /\b(\d{4})(\d{2})(\d{2})\b/,
  ];
  for (const pattern of datePatterns) {
    const match = rawText.match(pattern);
    if (match && match[1] && match[2] && match[3]) {
      let year = match[1];
      // YY → YYYY 변환
      if (year.length === 2) {
        year = `20${year}`;
      }
      const parsed = validateAndFormat(year, match[2], match[3]);
      if (parsed) {
        fields.purchase_date = parsed;
        break;
      }
    }
  }

  // Amount extraction — 결제대상금액/합계 우선, 그 외 첫 번째 "원" 매칭.
  // 캡처는 "5, 000" 같은 OCR 공백 삽입도 허용한다 (라인 내 한정).
  const totalPatterns = [
    /(?:결제대상금액|받으실금액|받을금액|합\s*계|총\s*금액|결제\s*금액|총\s*액)[:\s]*([0-9][0-9,. \t]*)/,
    /([0-9][0-9,]*)\s*원/,
  ];
  for (const pattern of totalPatterns) {
    const match = rawText.match(pattern);
    if (match?.[1]) {
      const amount = parseAmount(match[1]);
      if (amount !== undefined) {
        fields.amount = amount;
        break;
      }
    }
  }
  // 최후 폴백: 합계 라벨도 "원"도 없는 영수증. 정산부 라벨(소계/부가세 등)이
  // 있는데 총액 라인만 못 찾은 경우는 파싱 실패이지 총액 부재가 아니므로 기권.
  // 그 외에는 숫자로 끝나는 라인이 "정확히 하나"일 때만 총액 후보로 삼는다
  // — 품목 다건 영수증에서 품목가를 총액으로 오인하는 FP 차단 (KORIE 실측).
  const hasSettlementLabels = /소계|부가세|과세|면세|봉사료/.test(rawText);
  if (fields.amount === undefined && !hasSettlementLabels) {
    const candidates: number[] = [];
    for (const line of lines) {
      const m = line.match(/(?:^|\s)([1-9][0-9,]{2,})\s*$/);
      if (m?.[1]) {
        const amount = parseAmount(m[1]);
        if (amount !== undefined) candidates.push(amount);
      }
    }
    if (candidates.length === 1 && candidates[0] !== undefined) {
      fields.amount = candidates[0];
    }
  }

  // Order ID extraction
  const orderMatch = rawText.match(
    /(주문번호|Order\s*ID|NO)[:\s]*([A-Za-z0-9-]+)/i,
  );
  if (orderMatch?.[2]) {
    fields.order_id = orderMatch[2];
  }

  // AS contact (phone number) extraction
  const phoneMatch = rawText.match(/(\d{2,3}-\d{3,4}-\d{4})/);
  if (phoneMatch?.[1]) {
    fields.as_contact = phoneMatch[1];
  }

  // Product category — 키워드 기반 추론
  const categoryMap: Array<[RegExp, string]> = [
    [/식품|과자|음료|우유|빵|라면|커피|차\b|생수|주스|맥주|소주/, "식품"],
    [/의류|옷|셔츠|바지|자켓|코트|신발|운동화|슬리퍼/, "의류/패션"],
    [/가전|TV|냉장고|세탁기|에어컨|청소기|전자레인지/, "가전"],
    [/화장품|스킨|로션|클렌징|샴푸|린스|바디워시/, "뷰티/생활"],
    [/문구|필기|노트|연필|볼펜/, "문구"],
    [/가구|침대|소파|책상|의자/, "가구/인테리어"],
    [/홈플러스|이마트|코스트코|롯데마트|하나로/, "대형마트"],
    [/GS25|CU|세븐일레븐|이마트24|미니스톱/, "편의점"],
    [/스타벅스|투썸|이디야|메가커피|빽다방|카페/, "카페/음료"],
    [/다이소/, "생활용품"],
    [/올리브영/, "뷰티/생활"],
    [/배달의민족|요기요|쿠팡이츠/, "배달/음식"],
  ];
  if (!fields.product_category) {
    for (const [pattern, category] of categoryMap) {
      if (pattern.test(rawText)) {
        fields.product_category = category;
        break;
      }
    }
  }

  // Refund deadline extraction
  const refundMatch = rawText.match(/환불[\s:]*([0-9./-]{8,10})/);
  if (refundMatch?.[1]) {
    const parsed = parseDate(refundMatch[1]);
    if (parsed) {
      fields.refund_deadline = parsed;
    }
  }
  // 환불 기한 추론: "한달 이내" 등 텍스트에서
  if (!fields.refund_deadline && fields.purchase_date) {
    const refundDaysMatch = rawText.match(/(\d+)\s*일\s*이내/);
    const refundMonthMatch = rawText.match(/한\s*달|1\s*개월|30\s*일/);
    if (refundDaysMatch?.[1]) {
      const days = parseInt(refundDaysMatch[1], 10);
      if (days > 0 && days <= 365) {
        const base = new Date(fields.purchase_date);
        base.setDate(base.getDate() + days);
        fields.refund_deadline = base.toISOString().slice(0, 10);
      }
    } else if (refundMonthMatch) {
      const base = new Date(fields.purchase_date);
      base.setMonth(base.getMonth() + 1);
      fields.refund_deadline = base.toISOString().slice(0, 10);
    }
  }

  // Warranty end date extraction
  const warrantyMatch = rawText.match(/보증[\s:]*([0-9./-]{8,10})/);
  if (warrantyMatch?.[1]) {
    const parsed = parseDate(warrantyMatch[1]);
    if (parsed) {
      fields.warranty_end_date = parsed;
    }
  }

  // Fallback: 상품명 테이블 아래 첫 번째 제품 라인 → title
  if (!fields.title) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      // "01 뚜스뚜스" 같은 POS 상품 라인 패턴
      const itemMatch = line.match(/^\d{2}\s+(.+?)(?:\s+\d[\d,]*){0,3}\s*$/);
      if (itemMatch?.[1]) {
        fields.title = itemMatch[1].trim();
        break;
      }
    }
  }

  // Final fallback: first line as title
  if (!fields.title && lines.length > 0 && lines[0]) {
    fields.title = lines[0].substring(0, 255);
  }

  return fields;
}
