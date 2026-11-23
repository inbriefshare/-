// 견적서 PDF 생성 (견적서.xlsx Sheet1 양식과 같은 모양)
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import PDFDocument from "pdfkit";
import { SUPPLIER, PRODUCTS, RULES } from "./_business.js";

const require = createRequire(import.meta.url);
const FONT_LIGHT = readFileSync(
  require.resolve("@expo-google-fonts/noto-sans-kr/300Light/NotoSansKR_300Light.ttf"),
);
const FONT_BOLD = readFileSync(
  require.resolve("@expo-google-fonts/noto-sans-kr/700Bold/NotoSansKR_700Bold.ttf"),
);

const BLACK = "#14171F";
const GRAY = "#59616B";

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

// 견적서.xlsx Sheet1의 칸 너비·행 높이·색·선을 그대로 옮겨 그린다.
// 열 B~J 너비(pt)와 행 높이(pt)는 엑셀 값에서 환산했다.
const COLS = { B: 25.7, C: 56.5, D: 38.8, E: 70.1, F: 16.0, G: 55.3, H: 106.0, I: 38.8, J: 95.8 };
const BLUE_FILL = "#DAEEF3"; // 엑셀 테마 색(강조5, 밝게 80%)
const PURPLE_FILL = "#E4DFEC"; // 엑셀 테마 색(강조4, 밝게 80%)
const HAIR = "#9AA0A6";
const ROW = 16.5; // 엑셀 기본 행 높이

export async function buildQuotePdf({ quoteNo, date, customer, quote, stampPng }) {
  const doc = new PDFDocument({ size: "A4", margin: 0, info: { Title: `견적서 ${quoteNo}`, Author: SUPPLIER.brand } });
  doc.registerFont("R", FONT_LIGHT);
  doc.registerFont("B", FONT_BOLD);
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));
  const done = new Promise((res) => doc.on("end", res));

  const width = (font, str, size) => doc.font(font).fontSize(size).widthOfString(str);
  // 열 위치 (왼쪽 여백 58pt에서 시작)
  const X = {};
  let cx = 58;
  for (const [k, w] of Object.entries(COLS)) {
    X[k] = cx;
    cx += w;
  }
  const END = cx;
  const left = (c) => X[c];
  const right = (c) => X[c] + COLS[c];

  // 위에서 잰 칸(top, 높이) 안에 글자를 세로 가운데로 그린다
  function cell(str, x1, x2, top, h, { size = 9, font = "R", align = "left", pad = 4, color = BLACK } = {}) {
    str = String(str ?? "");
    if (!str) return;
    let s = size;
    while (s > 5 && width(font, str, s) > x2 - x1 - pad * 2) s -= 0.25;
    const w = width(font, str, s);
    const x = align === "center" ? (x1 + x2 - w) / 2 : align === "right" ? x2 - pad - w : x1 + pad;
    const base = top + h / 2 + s * 0.36;
    doc.font(font).fontSize(s).fillColor(color).text(str, x, base, { baseline: "alphabetic", lineBreak: false });
  }
  function fill(x1, x2, top, h, color) {
    doc.rect(x1, top, x2 - x1, h).fill(color);
  }
  function hline(x1, x2, yy, kind = "hair") {
    doc
      .lineWidth(kind === "thin" ? 1 : 0.5)
      .moveTo(x1, yy)
      .lineTo(x2, yy)
      .stroke(kind === "thin" ? BLACK : HAIR);
  }

  // 행 높이 (엑셀 2~9행)
  const ROW_H = { 2: 21.75, 3: 14.25, 4: 15, 5: 21.75, 6: 21.75, 7: 21.75, 8: 16.5, 9: 21 };
  const T = {};
  let ty = 68;
  for (let r = 2; r <= 10; r++) {
    T[r] = ty;
    ty += ROW_H[r] || ROW;
  }
  const rh = (r) => ROW_H[r] || ROW;

  // ── 왼쪽 위: 제목·날짜·수신·합계
  cell("견적서", left("B"), right("D"), T[2], rh(2) + rh(3), { size: 24, pad: 2 });
  cell("(공급받는자용)", left("E"), right("E"), T[2], rh(2), { size: 6, align: "center" });
  const ymd = seoulDate(date).replace(/(\d+)년 (\d+)월 (\d+)일/, (_, y, m, d) => `${y}.${m.padStart(2, "0")}.${d.padStart(2, "0")}`);
  cell(ymd, left("B"), right("D"), T[4], rh(4), { size: 8.5, align: "right" });
  cell(`No. ${quoteNo}`, left("E"), right("E"), T[4], rh(4), { size: 6.5, align: "center", color: GRAY });
  cell(customer.org, left("B"), right("D"), T[5], rh(5), { size: 8.5, align: "center" });
  cell(customer.name ? `${customer.name} 담당자님` : "담당자님 귀하", left("B"), right("D"), T[6], rh(6), { size: 9, align: "center" });
  cell("합계", left("B"), right("C"), T[7], rh(7), { size: 10, font: "B", pad: 2 });
  cell(`₩${won(quote.total)}`, left("D"), right("E"), T[7], rh(7), { size: 10, font: "B", align: "right", pad: 2 });

  // ── 오른쪽 위: 공급자 표
  const sx1 = left("G");
  fill(sx1, END, T[2], rh(2), BLUE_FILL);
  hline(sx1, END, T[2], "thin");
  cell("공급자", sx1, END, T[2], rh(2), { font: "B" });
  hline(sx1, END, T[3]);
  const twoRows = rh(3) + rh(4);
  cell("상호", left("G"), right("G"), T[3], twoRows, { font: "B", align: "center" });
  cell(SUPPLIER.company, left("H"), right("H"), T[3] + 1, rh(3), { pad: 3 });
  cell(`(${SUPPLIER.brand})`, left("H"), right("H"), T[4] - 1, rh(4), { pad: 3 });
  cell("대표자", left("I"), right("I"), T[3], twoRows, { font: "B", align: "center" });
  cell(SUPPLIER.ceo, left("J"), right("J"), T[3], twoRows, { align: "center" });
  if (stampPng) {
    try {
      const s = 34;
      const nameRight = (left("J") + right("J") + width("R", SUPPLIER.ceo, 9)) / 2;
      doc.image(stampPng, nameRight - 8, T[3] + twoRows / 2 - s / 2, { width: s, height: s });
    } catch (e) {
      console.error("stamp image failed", e.message);
    }
  }
  hline(sx1, END, T[5]);
  cell("등록번호", left("G"), right("G"), T[5], rh(5), { font: "B" });
  cell(SUPPLIER.regNo, left("H"), END, T[5], rh(5), { pad: 3 });
  hline(sx1, END, T[6]);
  cell("주소", left("G"), right("G"), T[6], rh(6), { font: "B" });
  cell(SUPPLIER.address, left("H"), END, T[6], rh(6), { pad: 3 });
  hline(sx1, END, T[7]);
  cell("전화번호", left("G"), right("G"), T[7], rh(7), { font: "B" });
  cell(SUPPLIER.tel, left("H"), right("H"), T[7], rh(7), { pad: 3 });
  cell("팩스", left("I"), right("I"), T[7], rh(7), { font: "B" });
  cell(SUPPLIER.fax, left("J"), right("J"), T[7], rh(7), { pad: 3 });
  hline(sx1, END, T[8], "thin");

  // ── 품목 표 머리
  const L = left("B");
  fill(L, END, T[9], rh(9), BLUE_FILL);
  hline(L, END, T[9], "thin");
  cell("도서명", left("B"), right("F"), T[9], rh(9), { font: "B", align: "center" });
  cell("수량", left("G"), right("G"), T[9], rh(9), { font: "B", align: "center" });
  cell("단가", left("H"), right("H"), T[9], rh(9), { font: "B", align: "center" });
  cell("공급가액", left("J"), right("J"), T[9], rh(9), { font: "B", align: "center" });

  // ── 품목 (엑셀처럼 도서명 한 줄, 부제 한 줄)
  const rows = [];
  for (const l of quote.lines) {
    const m = /^(.*?)\s*(\(.+\))$/.exec(l.name);
    const main = (m ? m[1] : l.name).replace(/(\d)권$/, "$1");
    rows.push([main, won(l.qty), won(l.unitPrice), won(l.amount)]);
    if (m) rows.push([m[2], "", "", ""]);
  }
  rows.push([quote.shipping ? "택배비" : "택배비 (무료)", "", "", won(quote.shipping)]);
  const itemRows = Math.max(9, rows.length);
  for (let i = 0; i < itemRows; i++) {
    const top = T[10] + i * ROW;
    hline(L, END, top);
    const r = rows[i];
    if (!r) continue;
    cell(r[0], left("B"), right("F"), top, ROW, { align: "center" });
    cell(r[1], left("G"), right("G"), top, ROW, { align: "center" });
    cell(r[2], left("H"), right("H"), top, ROW, { align: "right" });
    cell(r[3], left("J"), right("J"), top, ROW, { align: "right" });
  }

  // ── 합계 행
  const sumTop = T[10] + itemRows * ROW;
  fill(L, END, sumTop, ROW, BLUE_FILL);
  hline(L, END, sumTop);
  cell("합계", left("B"), right("C"), sumTop, ROW, { font: "B", align: "center" });
  cell(won(quote.totalQty), left("G"), right("G"), sumTop, ROW, { align: "center" });
  cell(won(quote.total), left("J"), right("J"), sumTop, ROW, { align: "right" });

  // ── 입금 정보 (보라색 두 줄)
  const payTop = sumTop + ROW;
  fill(L, END, payTop, ROW * 2, PURPLE_FILL);
  hline(L, END, payTop);
  cell("입금액", left("B"), right("C"), payTop, ROW, { font: "B", align: "center" });
  cell(won(quote.total), left("D"), right("E"), payTop, ROW, { font: "B", align: "center" });
  cell(`거래은행 ${SUPPLIER.bank.replace(/은행$/, "")}`, left("F"), right("G"), payTop, ROW, { font: "B", align: "center" });
  cell("계좌번호", left("H"), right("H"), payTop, ROW, { font: "B", align: "center" });
  cell(SUPPLIER.account, left("I"), right("J"), payTop, ROW, { font: "B", align: "center" });
  cell("예금주", left("G"), right("G"), payTop + ROW, ROW, { font: "B", align: "center" });
  cell(SUPPLIER.holder, left("H"), right("J"), payTop + ROW, ROW, { font: "B", align: "center" });
  hline(L, END, payTop + ROW * 2, "thin");

  // ── 표 아래 안내 (엑셀에는 없는 줄: 유효기간·부가세·문의)
  const validUntil = seoulDate(new Date(date.getTime() + RULES.validDays * 86400000));
  let ny = payTop + ROW * 2 + 12;
  for (const line of [
    `· 견적 유효기간: ${validUntil}까지     · 도서(면세) 상품으로 부가세가 없습니다.`,
    `· 문의: ${SUPPLIER.mobile} · ${SUPPLIER.email}`,
  ]) {
    cell(line, L, END, ny, 12, { size: 7.5, color: GRAY, pad: 0 });
    ny += 12;
  }

  doc.end();
  await done;
  return Buffer.concat(chunks);
}
