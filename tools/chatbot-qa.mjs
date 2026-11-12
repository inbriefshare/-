// 예상 질문 점검: node qa.mjs <deployment-host> <out.md>
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
const [host, out] = process.argv.slice(2);
const Q = [
  "가격이 궁금해요",
  "1권이랑 2권 차이가 뭐예요?",
  "몇 권부터 주문할 수 있어요?",
  "참여자가 200명인데 얼마 정도 들까요?",
  "1권 150권, 3권 50권이면 총 얼마예요?",
  "배송비 따로 있나요?",
  "세금계산서나 계산서 발행되나요?",
  "카드 결제도 되나요?",
  "납품까지 얼마나 걸려요?",
  "다음 주 월요일까지 꼭 받아야 하는데 가능할까요?",
  "샘플 한 권 먼저 받아볼 수 있나요?",
  "PDF 파일 인쇄만 맡길 수 있나요?",
  "교육 인정시간은 공식적으로 인정되는 건가요?",
  "폭염 때 어르신 활동 안전수칙 알려주세요",
  "저희 기관 양식으로 견적서 받을 수 있나요?",
  "견적 유효기간이 어떻게 되나요?",
  "많이 사면 할인 되나요?",
  "저희 기관 이름이나 로고 넣어서 제작 가능해요?",
  "받고 나서 파손되면 교환되나요?",
  "오늘 날씨 어때요?",
  "입력한 개인정보는 어디에 쓰이나요?",
  "견적 받은 뒤에 수량 바꿀 수 있나요?",
];
const FLOW = ["시험복지관이에요", "홍길동입니다", "010-0000-0000", "test@example.com", "1권 120권, 2권 80권이요"];

function ask(sessionId, messages) {
  const body = JSON.stringify({ sessionId, messages });
  const r = execFileSync(
    "vercel",
    ["curl", "/api/chat", "--deployment", `https://${host}`, "--", "-s", "-X", "POST", "-H", '"Content-Type: application/json"', "--data-binary", "@-"],
    { input: body, encoding: "utf8", shell: true, env: { ...process.env, MSYS_NO_PATHCONV: "1" } },
  );
  return JSON.parse(r.slice(r.indexOf("{")));
}

const lines = [`# 예상 질문 점검 (${host})`, ""];
let i = 0;
for (const q of Q) {
  i++;
  const r = ask(`qa-${Date.now()}-${i}`, [{ role: "user", content: q }]);
  lines.push(`## ${i}. ${q}`, "", r.reply + (r.form ? "\n[카드]" : ""), "", `(${r.reply.length}자)`, "");
  process.stdout.write(".");
}
// 견적 흐름
const msgs = [];
const sid = `qa-${Date.now()}-flow`;
lines.push("## 견적 흐름", "");
for (const u of FLOW) {
  msgs.push({ role: "user", content: u });
  const r = ask(sid, msgs);
  msgs.push({ role: "assistant", content: r.reply });
  lines.push(`- 방문자: ${u}`, `- 챗봇: ${r.reply.replace(/\n/g, " / ")}${r.form ? " [카드: " + JSON.stringify(r.form) + "]" : ""}`);
}
writeFileSync(out, lines.join("\n"));
console.log("\ndone");
