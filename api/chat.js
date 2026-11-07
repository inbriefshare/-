import Anthropic from "@anthropic-ai/sdk";
import { waitUntil } from "@vercel/functions";
import { SYSTEM_PROMPT } from "./_prompt.js"; // 챗봇 지침은 이 파일에서 고친다
import { logToSheet, SESSION_RE } from "./_sheet.js";

// 상상력놀이터 노인일자리 안전교육 워크북 페이지용 상담 챗봇.
// 브라우저(chatbot.js)가 대화 기록을 보내면 Claude 답변 한 개를 돌려주고, 그 한 턴을 구글 시트에 기록한다.

const MODEL = process.env.CLAUDE_MODEL || "claude-haiku-5-5";
const MAX_TURNS = 30; // 대화 기록 최대 메시지 수
const MAX_CHARS = 1000; // 메시지 하나의 최대 글자 수
const PHONE = "010-8260-3318";

const client = new Anthropic(); // ANTHROPIC_API_KEY 환경변수 사용

// 견적 요청 확인 카드를 띄우는 도구. 금액 계산과 접수는 /api/quote가 한다.
const TOOLS = [
  {
    name: "submit_quote_request",
    description:
      "소속 기관, 담당자 이름, 연락처, 이메일, 권별 수량을 대화로 모두 받았을 때 호출한다. 화면에 확인 카드가 뜨고 방문자가 '견적 요청하기'를 누르면 접수된다. 대화에서 들은 값만 넣고 지어내지 않는다.",
    input_schema: {
      type: "object",
      properties: {
        org: { type: "string", description: "소속 기관명" },
        name: { type: "string", description: "담당자 이름" },
        phone: { type: "string", description: "연락처" },
        email: { type: "string", description: "견적서를 받을 이메일" },
        v1: { type: "integer", description: "1권 권수 (없으면 0)" },
        v2: { type: "integer", description: "2권 권수 (없으면 0)" },
        v3: { type: "integer", description: "3권 권수 (없으면 0)" },
      },
    },
  },
];
const FORM_REPLY = "말씀해 주신 내용을 아래 카드에 정리했습니다. 확인하시고 '견적 요청하기'를 눌러 주세요.";
const FALLBACK_REPLY = `죄송합니다. 지금은 답변을 드리기 어렵습니다. 전화(${PHONE})로 문의해 주세요.`;

// 같은 인스턴스 안에서의 간단한 사용 제한 (IP당 10분에 40회)
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (list.length >= 40) return true;
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return false;
}

function cleanMessages(raw) {
  if (!Array.isArray(raw)) return null;
  const msgs = raw
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim(),
    )
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  if (!msgs.length || msgs[msgs.length - 1].role !== "user") return null;
  return msgs;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "POST only" });
  }

  const messages = cleanMessages(req.body?.messages);
  if (!messages) return res.status(400).json({ error: "invalid messages" });
  const sessionId = SESSION_RE.test(req.body?.sessionId || "") ? req.body.sessionId : "unknown";

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) {
    return res.status(200).json({ reply: `질문이 너무 많이 들어오고 있습니다. 잠시 후 다시 시도하시거나 전화(${PHONE})로 문의해 주세요.`, error: true });
  }

  const userText = messages[messages.length - 1].content;
  const PRODUCT_NOTE = {
    v1: "1권(생활교통안전 편)",
    v2: "2권(자연재난 보건안전 편)",
    v3: "3권(안전사고 발생 시 대처요령·건강한 노인일자리 활동 편)",
  };
  const product = PRODUCT_NOTE[req.body?.context?.product];
  const system = product
    ? `${SYSTEM_PROMPT}

# 참고: 이 방문자는 페이지에서 ${product} 견적 버튼을 누르고 들어왔습니다. 권수를 물을 때 이 권을 먼저 제안하되, 다른 권도 함께 주문할 수 있다고 안내합니다.`
    : SYSTEM_PROMPT;
  const record = (bot, form) => waitUntil(logToSheet({ type: "chat", sessionId, user: userText, bot, form }));

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: "low" },
      cache_control: { type: "ephemeral" },
      system,
      tools: TOOLS,
      messages,
    });

    if (response.stop_reason === "refusal") {
      record(FALLBACK_REPLY);
      return res.status(200).json({ reply: FALLBACK_REPLY });
    }

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .replace(/\*\*(.+?)\*\*/g, "$1") // 챗봇 창은 마크다운을 그리지 않으므로 굵게·제목 기호를 지운다
      .replace(/^#{1,6}\s+/gm, "")
      .trim();

    const formCall = response.content.find((b) => b.type === "tool_use" && b.name === "submit_quote_request");
    if (formCall) {
      const form = formCall.input || {};
      const reply = text || FORM_REPLY;
      record(reply + " [확인 카드 표시]", form);
      return res.status(200).json({ reply, form });
    }

    const reply = text || FALLBACK_REPLY;
    record(reply);
    return res.status(200).json({ reply });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      console.error("rate limited", error.message);
    } else if (error instanceof Anthropic.AuthenticationError) {
      console.error("invalid ANTHROPIC_API_KEY");
    } else if (error instanceof Anthropic.APIError) {
      console.error(`API error ${error.status}:`, error.message);
    } else {
      console.error(error);
    }
    record("(오류로 답변하지 못함)");
    return res.status(200).json({ reply: FALLBACK_REPLY, error: true });
  }
}
