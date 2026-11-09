// ─────────────────────────────────────────────────────────────
// 견적서에 들어가는 사업자 정보, 상품, 가격 규칙
// 따옴표 안의 글자와 숫자만 고치면 견적서와 챗봇 계산에 반영됩니다.
// 직인 이미지는 공개 저장소에 두지 않고 Vercel 환경변수 STAMP_PNG_BASE64에 넣습니다.
// ─────────────────────────────────────────────────────────────

export const SUPPLIER = {
  regNo: "128-38-98557",
  company: "인브리프 커뮤니케이션",
  brand: "도서출판 상상력놀이터",
  ceo: "이도원",
  address: "경기도 고양시 일산동구 정발산로 39 대양빌딩 607호",
  tel: "070-8227-4024",
  fax: "050-7711-3316",
  mobile: "010-8260-3318",
  email: "mango4024@naver.com",
  bank: "신한은행",
  account: "110-458-772833",
  holder: "이도원",
};

// 상품 목록 (id는 바꾸지 마세요)
export const PRODUCTS = [
  { id: "v1", name: "사례와 활동으로 알아보는 안전사고예방 1권 (생활교통안전편)", hours: 3, price: 5000 },
  { id: "v2", name: "사례와 활동으로 알아보는 안전사고예방 2권 (자연재난 보건안전편)", hours: 2, price: 3000 },
  { id: "v3", name: "사례와 활동으로 알아보는 안전사고예방 3권 (안전사고 발생 시 대처요령·건강한 노인일자리 활동편)", hours: 2, price: 3000 },
];

export const RULES = {
  freeShippingMinQty: 100, // 총 권수가 이 이상이면 배송비 무료
  shippingFee: 7000, // 그 미만일 때 배송비
  validDays: 30, // 견적 유효기간(일)
  maxQtyPerItem: 100000,
};

// 권수 {v1, v2, v3}를 받아 견적 금액을 계산한다. 금액 계산은 항상 이 함수만 쓴다.
export function computeQuote(qty) {
  const lines = [];
  let totalQty = 0;
  for (const p of PRODUCTS) {
    const n = Number(qty?.[p.id]) || 0;
    if (!Number.isInteger(n) || n < 0 || n > RULES.maxQtyPerItem) {
      throw new Error(`invalid quantity for ${p.id}`);
    }
    if (n > 0) {
      lines.push({ id: p.id, name: p.name, hours: p.hours, qty: n, listPrice: p.price });
      totalQty += n;
    }
  }
  // 수량 할인은 없다. 몇 권이든 정가로 계산한다.
  for (const l of lines) {
    l.unitPrice = l.listPrice;
    l.amount = l.unitPrice * l.qty;
  }
  const itemsTotal = lines.reduce((s, l) => s + l.amount, 0);
  const shipping = totalQty > 0 && totalQty < RULES.freeShippingMinQty ? RULES.shippingFee : 0;
  return {
    lines,
    totalQty,
    itemsTotal,
    shipping,
    total: itemsTotal + shipping,
  };
}
