// 구글 시트(Apps Script 웹 앱)로 대화·견적 기록을 보낸다.
// 환경변수: SHEET_WEBHOOK_URL, SHEET_WEBHOOK_SECRET. 없으면 기록을 건너뛴다.

export const SESSION_RE = /^[a-zA-Z0-9-]{8,64}$/;

export async function logToSheet(payload) {
  const url = process.env.SHEET_WEBHOOK_URL;
  const secret = process.env.SHEET_WEBHOOK_SECRET;
  if (!url || !secret) return false;
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ secret, ...payload }),
      redirect: "follow",
      signal: AbortSignal.timeout(25000),
    });
    const text = await r.text();
    const ok = r.ok && /"ok":\s*true/.test(text);
    if (!ok) console.error("sheet log failed", r.status, text.slice(0, 200));
    return ok;
  } catch (e) {
    console.error("sheet log error", e.message);
    return false;
  }
}
