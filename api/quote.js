import nodemailer from "nodemailer";
import { computeQuote, SUPPLIER, RULES } from "./_business.js";
import { buildQuotePdf, won, seoulDate } from "./_quotePdf.js";
import { logToSheet, SESSION_RE } from "./_sheet.js";

// 견적 요청 처리
// POST {action:"preview", qty:{v1,v2,v3}}            -> 금액 계산만
// POST {action:"submit", customer:{...}, qty, consent, sessionId} -> 견적 요청 접수 (시트 기록, 설정 시 메일 발송)
//
// 필요한 환경변수: NAVER_SMTP_USER(예: mango4024@naver.com), NAVER_SMTP_PASS(애플리케이션 비밀번호)
// 선택: STAMP_PNG_BASE64(직인 PNG를 base64로), QUOTE_BCC(사본 받을 주소, 기본은 보내는 주소)

const EMAIL_RE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]+$/;
const PHONE_RE = /^0\d{1,2}-?\d{3,4}-?\d{4}$/;

// 같은 인스턴스 안에서의 간단한 발송 제한 (IP당 10분에 3건, 인스턴스당 하루 100건)
const recent = new Map();
let dayKey = "";
let dayCount = 0;
function rateLimited(ip) {
  const now = Date.now();
  const list = (recent.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  const today = new Date().toISOString().slice(0, 10);
  if (today !== dayKey) {
    dayKey = today;
    dayCount = 0;
  }
  if (list.length >= 3 || dayCount >= 100) return true;
  list.push(now);
  recent.set(ip, list);
  dayCount++;
  return false;
}

const clean = (v, max) => String(v ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);

function readQty(raw) {
  const q = {};
  for (const id of ["v1", "v2", "v3"]) {
    const n = Number(raw?.[id] ?? 0);
    q[id] = Number.isFinite(n) ? Math.floor(n) : NaN;
  }
  return q;
}

function quoteNumber(date) {
  const d = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(date)
    .replace(/-/g, "");
  return `Q-${d}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

// 방문자에게 보여 주는 금액: 도서 금액만. 택배비는 별도(담당자가 최종 견적서에 넣는다).
// suggestedShipping·boxes는 시트에서 담당자가 참고하도록만 보낸다.
function summary(q) {
  return {
    lines: q.lines.map(({ id, name, qty, unitPrice, amount }) => ({ id, name, qty, unitPrice, amount })),
    totalQty: q.totalQty,
    itemsTotal: q.itemsTotal,
    total: q.itemsTotal,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "POST only" });
  }
  const body = req.body || {};

  let quote;
  try {
    quote = computeQuote(readQty(body.qty));
  } catch {
    return res.status(400).json({ ok: false, message: "권수를 다시 확인해 주세요." });
  }

  if (body.action === "preview") {
    return res.status(200).json({ ok: true, quote: summary(quote) });
  }
  // 미리보기 배포에서만: 메일 없이 견적서 PDF 견본을 바로 돌려준다 (양식 확인용)
  if (body.action === "sample" && process.env.VERCEL_ENV !== "production") {
    const stamp = process.env.STAMP_PNG_BASE64 ? Buffer.from(process.env.STAMP_PNG_BASE64, "base64") : undefined;
    const pdf = await buildQuotePdf({
      quoteNo: "Q-SAMPLE",
      date: new Date(),
      customer: { org: "서울종합복지관", name: "홍길동", phone: "010-1234-5678", email: "sample@example.com" },
      quote,
      stampPng: stamp,
    });
    res.setHeader("Content-Type", "application/pdf");
    return res.status(200).send(pdf);
  }

  // 시트에서 배송비를 적은 뒤 최종 견적서 PDF를 만든다 (시트 비밀값이 있어야 한다)
  if (body.action === "final") return finalPdf(body, quote, res);

  if (body.action !== "submit" && body.action !== "send") {
    return res.status(400).json({ ok: false, message: "invalid action" });
  }

  // 봇이 채우는 숨김 칸
  if (body.website) return res.status(200).json({ ok: true });

  const customer = {
    org: clean(body.customer?.org, 60),
    name: clean(body.customer?.name, 30),
    phone: clean(body.customer?.phone, 20),
    email: clean(body.customer?.email, 100),
  };
  const missing = [];
  if (!customer.org) missing.push("소속 기관");
  if (!customer.name) missing.push("담당자 이름");
  if (!PHONE_RE.test(customer.phone)) missing.push("연락처");
  if (!EMAIL_RE.test(customer.email)) missing.push("이메일");
  if (quote.totalQty === 0) missing.push("권수");
  if (missing.length) {
    return res.status(400).json({ ok: false, message: `${missing.join(", ")}을(를) 확인해 주세요.` });
  }
  if (body.consent !== true) {
    return res.status(400).json({ ok: false, message: "개인정보 수집·이용에 동의해 주세요." });
  }

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) {
    return res.status(429).json({ ok: false, message: "잠시 후 다시 시도해 주세요." });
  }

  const date = new Date();
  const quoteNo = quoteNumber(date);
  const sessionId = SESSION_RE.test(body.sessionId || "") ? body.sessionId : "unknown";

  // 견적서 PDF는 여기서 만들지 않는다. 담당자가 시트에 배송비를 적으면 시트가 action:"final"로 최종 견적서를 만든다.
  const mailed = false;

  const recorded = await logToSheet({
    type: "quote",
    sessionId,
    quoteNo,
    customer,
    qty: readQty(body.qty),
    quote: { ...summary(quote), boxes: quote.boxes, suggestedShipping: quote.shipping },
    mailed,
  });
  console.log("quote request", quoteNo, customer.org, quote.totalQty, quote.total, { recorded, mailed });

  if (!recorded && !mailed) {
    return res.status(502).json({
      ok: false,
      message: `접수 중 문제가 생겼습니다. 번거로우시겠지만 전화(${SUPPLIER.mobile})로 문의해 주세요.`,
    });
  }
  return res.status(200).json({ ok: true, quoteNo, email: customer.email, mailed, quote: summary(quote) });
}

async function finalPdf(body, quote, res) {
  const secret = process.env.SHEET_WEBHOOK_SECRET;
  if (!secret || body.secret !== secret) return res.status(403).json({ ok: false, message: "forbidden" });
  const shipping = Number(body.shipping);
  if (!Number.isInteger(shipping) || shipping < 0 || shipping > 10000000) {
    return res.status(400).json({ ok: false, message: "배송비는 0 이상의 정수로 적어 주세요." });
  }
  if (quote.totalQty === 0) return res.status(400).json({ ok: false, message: "권수가 없습니다." });
  const quoteNo = clean(body.quoteNo, 30) || "Q-UNKNOWN";
  const date = body.date && !Number.isNaN(Date.parse(body.date)) ? new Date(body.date) : new Date();
  const customer = {
    org: clean(body.customer?.org, 60),
    name: clean(body.customer?.name, 30),
    phone: clean(body.customer?.phone, 20),
    email: clean(body.customer?.email, 100),
  };
  const final = { ...quote, shipping, total: quote.itemsTotal + shipping };
  const stampPng = process.env.STAMP_PNG_BASE64 ? Buffer.from(process.env.STAMP_PNG_BASE64, "base64") : undefined;
  const pdf = await buildQuotePdf({ quoteNo, date, customer, quote: final, stampPng });
  const pdfName = `견적서_${customer.org}_${quoteNo}.pdf`.replace(/[\/:*?"<>|]/g, "_");
  return res.status(200).json({ ok: true, total: final.total, pdfName, pdfBase64: pdf.toString("base64") });
}

// 메일 자동 발송(결재 후 사용 예정): 최종 견적서 PDF를 받아 보낸다
async function sendQuoteMail({ quoteNo, date, customer, quote, pdf, pdfName }) {
  const user = process.env.NAVER_SMTP_USER;
  const pass = process.env.NAVER_SMTP_PASS;
  const fromAddress = user.includes("@") ? user : `${user}@naver.com`;
  const lines = quote.lines.map((l) => `- ${l.name}: ${won(l.qty)}권 × ${won(l.unitPrice)}원 = ${won(l.amount)}원`);
  lines.push(`- 택배비: ${won(quote.shipping)}원`);
  const text = [
    `${customer.org} ${customer.name} 담당자님, 안녕하세요.`,
    `${SUPPLIER.brand}입니다. 요청하신 안전워크북 견적서를 첨부해 드립니다.`,
    "",
    `견적번호: ${quoteNo} (${seoulDate(date)})`,
    ...lines,
    `- 합계: ${won(quote.total)}원 (부가세 면세)`,
    "",
    "기관 내부 결재 후 이 메일로 회신 주시면 제작을 진행하겠습니다.",
    "수량 변경이나 궁금한 점은 이 메일에 답장하시거나 아래 연락처로 문의해 주세요.",
    "",
    `${SUPPLIER.brand} (${SUPPLIER.company})`,
    `전화 ${SUPPLIER.mobile} / ${SUPPLIER.tel} · 메일 ${SUPPLIER.email}`,
  ]
    .filter((l, i, a) => l !== "" || a[i - 1] !== "")
    .join("\n");

  const transporter = nodemailer.createTransport({
    host: "smtp.naver.com",
    port: 465,
    secure: true,
    auth: { user: user.replace(/@naver\.com$/i, ""), pass }, // 네이버 SMTP는 아이디만 받는다
  });
  await transporter.sendMail({
    from: { name: SUPPLIER.brand, address: fromAddress },
    to: customer.email,
    bcc: process.env.QUOTE_BCC || fromAddress,
    subject: `[${SUPPLIER.brand}] 안전워크북 견적서 (${customer.org})`,
    text,
    attachments: [{ filename: pdfName, content: pdf, contentType: "application/pdf" }],
  });
}
