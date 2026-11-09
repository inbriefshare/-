// 견적서 PDF 생성 (견적서.xlsx Sheet1 양식을 옮긴 것)
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import PDFDocument from "pdfkit";
import { SUPPLIER, PRODUCTS, RULES } from "./_business.js";

const require = createRequire(import.meta.url);
const FONT_REGULAR = readFileSync(
  require.resolve("@expo-google-fonts/noto-sans-kr/400Regular/NotoSansKR_400Regular.ttf"),
);
const FONT_BOLD = readFileSync(
  require.resolve("@expo-google-fonts/noto-sans-kr/700Bold/NotoSansKR_700Bold.ttf"),
);

const BLACK = "#14171F";
const GRAY = "#59616B";
const LINE = "#8C949E";
const SHADE = "#EDF2FA";
const BLUE = "#2454CC";
const H = 841.89; // A4 높이. 아래 좌표는 왼쪽 아래가 (0,0)인 기준으로 쓴다.

export const won = (n) => n.toLocaleString("ko-KR");

// 1234000 -> "일백이십삼만사천"
export function koreanAmount(n) {
  if (n === 0) return "영";
  const digits = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
  const small = ["", "십", "백", "천"];
  const big = ["", "만", "억", "조"];
  let out = "";
  let group = 0;
  while (n > 0) {
    const chunk = n % 10000;
    if (chunk > 0) {
      let s = "";
      let c = chunk;
      for (let i = 0; i < 4 && c > 0; i++) {
        const d = c % 10;
        if (d > 0) s = digits[d] + small[i] + s;
        c = Math.floor(c / 10);
      }
      out = s + big[group] + out;
    }
    n = Math.floor(n / 10000);
    group++;
  }
  return out;
}

export function seoulDate(d = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "numeric", day: "numeric" })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}년 ${p.month}월 ${p.day}일`;
}

export async function buildQuotePdf({ quoteNo, date, customer, quote, stampPng }) {
  const doc = new PDFDocument({ size: "A4", margin: 0, info: { Title: `견적서 ${quoteNo}`, Author: SUPPLIER.brand } });
  doc.registerFont("R", FONT_REGULAR);
  doc.registerFont("B", FONT_BOLD);
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));
  const done = new Promise((res) => doc.on("end", res));

  const mkFont = (name) => ({ name, widthOfTextAtSize: (str, size) => doc.font(name).fontSize(size).widthOfString(str) });
  const R = mkFont("R");
  const B = mkFont("B");
  const L = 40;
  const RIGHT = 555;

  function text(str, x, y, { size = 10, font = R, color = BLACK, align = "left", maxWidth } = {}) {
    str = String(str ?? "");
    let s = size;
    if (maxWidth) while (s > 6 && font.widthOfTextAtSize(str, s) > maxWidth) s -= 0.5;
    const w = font.widthOfTextAtSize(str, s);
    const dx = align === "center" ? -w / 2 : align === "right" ? -w : 0;
    doc.font(font.name).fontSize(s).fillColor(color).text(str, x + dx, H - y, { baseline: "alphabetic", lineBreak: false });
  }
  function box(x, y, w, h, { fill, border = LINE, thickness = 0.7 } = {}) {
    doc.lineWidth(thickness).rect(x, H - y - h, w, h);
    if (fill) doc.fillAndStroke(fill, border);
    else doc.stroke(border);
  }

  // 제목
  text("견   적   서", L, 782, { size: 26, font: B });
  text("(공급받는자용)", L + 158, 786, { size: 10, color: GRAY });

  // 왼쪽: 견적 정보·수신
  const validUntil = seoulDate(new Date(date.getTime() + RULES.validDays * 86400000));
  const info = [
    ["견적번호", quoteNo],
    ["견적일자", seoulDate(date)],
    ["유효기간", `${validUntil}까지`],
  ];
  let y = 740;
  for (const [k, v] of info) {
    text(k, L, y, { size: 9.5, color: GRAY });
    text(v, L + 52, y, { size: 9.5 });
    y -= 16;
  }
  y -= 8;
  text(customer.org, L, y, { size: 14, font: B, maxWidth: 245 });
  y -= 20;
  text(`${customer.name} 담당자님 귀하`, L, y, { size: 11.5, maxWidth: 245 });
  y -= 16;
  text(`${customer.phone}  ·  ${customer.email}`, L, y, { size: 9, color: GRAY, maxWidth: 245 });
  y -= 22;
  text("아래와 같이 견적합니다.", L, y, { size: 10 });

  // 오른쪽: 공급자 표
  const tx = 300;
  const tw = RIGHT - tx;
  const lw = 56;
  const rowH = 23;
  let ty = 760;
  box(tx, ty, tw, 20, { fill: SHADE });
  text("공   급   자", tx + tw / 2, ty + 6, { size: 10, font: B, align: "center" });
  const rows = [
    ["등록번호", SUPPLIER.regNo],
    ["상호", `${SUPPLIER.company} (${SUPPLIER.brand})`],
    ["대표자", SUPPLIER.ceo],
    ["주소", SUPPLIER.address],
    ["전화", `${SUPPLIER.tel}   팩스 ${SUPPLIER.fax}`],
  ];
  let ceoRowY = 0;
  for (const [k, v] of rows) {
    ty -= rowH;
    box(tx, ty, lw, rowH, { fill: SHADE });
    box(tx + lw, ty, tw - lw, rowH);
    text(k, tx + lw / 2, ty + 8, { size: 9, color: GRAY, align: "center" });
    text(v, tx + lw + 6, ty + 8, { size: 9.5, font: k === "등록번호" || k === "대표자" ? B : R, maxWidth: tw - lw - 12 });
    if (k === "대표자") ceoRowY = ty;
  }
  if (stampPng) {
    try {
      const s = 30;
      const sx = tx + lw + 6 + B.widthOfTextAtSize(SUPPLIER.ceo, 9.5) + 8;
      doc.image(stampPng, sx, H - (ceoRowY + rowH / 2 + s / 2), { width: s, height: s });
    } catch (e) {
      console.error("stamp image failed", e.message);
    }
  }

  // 합계금액
  y = 578;
  box(L, y, RIGHT - L, 34, { fill: SHADE, border: BLACK, thickness: 1 });
  text("합계금액", L + 12, y + 13, { size: 11, font: B });
  text("(부가세 면세)", L + 64, y + 13, { size: 8.5, color: GRAY });
  text(`일금 ${koreanAmount(quote.total)}원정`, L + 140, y + 12, { size: 12.5, font: B, maxWidth: 230 });
  text(`₩ ${won(quote.total)}`, RIGHT - 12, y + 12, { size: 13, font: B, color: BLUE, align: "right" });

  // 품목 표
  const cols = [
    { t: "번호", w: 32, a: "center" },
    { t: "도서명", w: 218, a: "left" },
    { t: "인정시간", w: 52, a: "center" },
    { t: "수량", w: 55, a: "right" },
    { t: "단가", w: 70, a: "right" },
    { t: "공급가액", w: 88, a: "right" },
  ];
  const ih = 24;
  y -= 14 + ih;
  let x = L;
  for (const c of cols) {
    box(x, y, c.w, ih, { fill: SHADE });
    text(c.t, x + c.w / 2, y + 8, { size: 9.5, font: B, align: "center" });
    x += c.w;
  }
  const bodyRows = quote.lines.map((l, i) => [
    String(i + 1),
    l.name,
    `${l.hours}시간`,
    `${won(l.qty)}권`,
    won(l.unitPrice),
    won(l.amount),
  ]);
  bodyRows.push([
    String(bodyRows.length + 1),
    quote.shipping
      ? `배송비 (총 ${RULES.freeShippingMinQty}권 미만)`
      : `배송비 (총 ${RULES.freeShippingMinQty}권 이상 무료)`,
    "",
    "1",
    won(quote.shipping),
    won(quote.shipping),
  ]);
  while (bodyRows.length < 6) bodyRows.push(["", "", "", "", "", ""]);
  for (const r of bodyRows) {
    // 도서명에 부제 "(…)"가 있으면 두 줄로 쓴다
    const m = /^(.*?)\s*(\(.+\))$/.exec(r[1]);
    const rh = m ? 30 : ih;
    y -= rh;
    x = L;
    r.forEach((v, i) => {
      const c = cols[i];
      box(x, y, c.w, rh);
      const px = c.a === "center" ? x + c.w / 2 : c.a === "right" ? x + c.w - 6 : x + 6;
      if (i === 1 && m) {
        text(m[1], px, y + 17, { size: 9.5, maxWidth: c.w - 10 });
        text(m[2], px, y + 6, { size: 7.5, color: GRAY, maxWidth: c.w - 10 });
      } else {
        text(v, px, y + rh / 2 - 3.5, { size: 9.5, align: c.a, maxWidth: c.w - 10 });
      }
      x += c.w;
    });
  }
  y -= ih;
  const sumW = cols.slice(0, 3).reduce((s, c) => s + c.w, 0);
  box(L, y, sumW, ih, { fill: SHADE });
  text("합   계", L + sumW / 2, y + 8, { size: 10, font: B, align: "center" });
  box(L + sumW, y, cols[3].w, ih);
  text(`${won(quote.totalQty)}권`, L + sumW + cols[3].w - 6, y + 8, { size: 10, font: B, align: "right" });
  box(L + sumW + cols[3].w, y, cols[4].w + cols[5].w, ih);
  text(won(quote.total), RIGHT - 6, y + 8, { size: 10.5, font: B, align: "right" });

  // 비고
  y -= 30;
  text("비고", L, y, { size: 10.5, font: B });
  const hours = PRODUCTS.map((p) => (p.name.match(/\d+권/) || [p.name])[0] +` ${p.hours}시간`).join(" · ");
  const notes = [
    "도서(부가세 면세) 상품으로 부가세가 없습니다.",
    `총 ${RULES.freeShippingMinQty}권 이상 주문 시 배송비 무료(미만 시 ${won(RULES.shippingFee)}원)입니다.`,
    `안전교육 인정시간: ${hours}`,
    "기관 내부 결재 후 제작을 진행하며, 3~5일 이내 납품합니다. 상세 납품 일정은 별도로 안내드립니다.",
  ];
  for (const n of notes) {
    y -= 15;
    text(`·  ${n}`, L + 4, y, { size: 9, maxWidth: RIGHT - L - 4 });
  }

  // 입금 계좌
  y -= 34;
  box(L, y, RIGHT - L, 26, { fill: SHADE });
  text("입금 계좌", L + 12, y + 9, { size: 10, font: B });
  text(`${SUPPLIER.bank}   ${SUPPLIER.account}   예금주 ${SUPPLIER.holder}`, L + 80, y + 9, { size: 10.5, font: B });

  // 하단 문의
  text(
    `문의  ${SUPPLIER.mobile}  ·  ${SUPPLIER.email}  ·  ${SUPPLIER.brand}`,
    (L + RIGHT) / 2,
    48,
    { size: 9, color: GRAY, align: "center" },
  );

  doc.end();
  await done;
  return Buffer.concat(chunks);
}
