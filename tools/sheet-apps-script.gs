/**
 * 노인일자리 워크북 챗봇문의 기록 (Google Apps Script)
 *
 * 설치: script.google.com에서 새 프로젝트 → 이 코드 전체 붙여넣기
 *       → SECRET 값을 Vercel 환경변수 SHEET_WEBHOOK_SECRET과 똑같이 바꾸기, SHEET_ID에 시트 ID 넣기
 *       → setup 한 번 실행(시트·서식·드라이브 권한 준비)
 *       → 배포 → 새 배포 → 유형: 웹 앱, 실행: 나, 액세스: 모든 사용자 → 배포
 *       → 나온 웹 앱 URL을 Vercel 환경변수 SHEET_WEBHOOK_URL에 넣기
 *
 * 시트 구성 (없으면 자동으로 만든다)
 *   대화목록 : 대화 1건당 한 줄. '대화 보기'를 누르면 대화내용의 해당 대화로 이동
 *   대화내용 : 대화별로 묶여 있다. 한 줄 = 한 번 주고받은 말 (왼쪽 기관, 오른쪽 챗봇)
 *   견적요청 : 견적 요청 1건당 한 줄. 소속 이름을 누르면 그 기관의 대화로 이동.
 *              '메일 발송'(미발송/발송)과 '처리상태'는 담당자가 직접 고른다
 */

const SECRET = "여기에_비밀값";
// 시트 주소의 /d/와 /edit 사이 값
const SHEET_ID = "";
const TITLE = "노인일자리 워크북 챗봇문의 기록";

const LIST = "대화목록";
const LOG = "대화내용";
const QUOTES = "견적요청";

const HEAD = {
  [LIST]: ["대화번호", "시작", "마지막", "소속", "담당자", "연락처", "이메일", "메시지 수", "견적요청", "첫 질문", "대화 보기"],
  [LOG]: ["대화번호", "시각", "기관(방문자)", "챗봇"],
  [QUOTES]: ["접수시각", "접수번호", "소속 (누르면 대화)", "담당자", "연락처", "이메일", "1권", "2권", "3권", "총 권수", "배송비", "합계", "메일 발송", "처리상태", "대화 보기", "견적서"],
};
const WIDTH = {
  [LIST]: [110, 130, 130, 160, 80, 110, 170, 70, 70, 260, 80],
  [LOG]: [90, 130, 380, 460],
  [QUOTES]: [130, 130, 170, 80, 110, 170, 60, 60, 60, 70, 70, 90, 90, 90, 80, 90],
};

// 대화내용 색
const C_HEAD = "#DCE3EC"; // 대화 시작 줄
const C_USER = "#FFF3D6"; // 기관(방문자) 말
const C_BOT = "#E7F0FE"; // 챗봇 답변
const C_SYS = "#E6F4EA"; // 견적 접수 같은 알림
const MAIL_COL = 13;
const STATUS_COL = 14;

function ss_() {
  return SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActive();
}

function sheet_(name) {
  const ss = ss_();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, HEAD[name].length).setValues([HEAD[name]]).setFontWeight("bold").setBackground("#EDF2FA");
    sh.setFrozenRows(1);
    WIDTH[name].forEach((w, i) => sh.setColumnWidth(i + 1, w));
    if (name === LOG) formatLogSheet_(sh);
    if (name === QUOTES) formatQuoteSheet_(sh);
  }
  // 나중에 늘어난 머리글 칸을 채운다 (기존 시트용)
  const head = HEAD[name];
  if (sh.getLastColumn() < head.length) {
    for (let i = sh.getLastColumn(); i < head.length; i++) {
      sh.getRange(1, i + 1).setValue(head[i]).setFontWeight("bold").setBackground("#EDF2FA");
      sh.setColumnWidth(i + 1, WIDTH[name][i]);
    }
  }
  return sh;
}

function formatLogSheet_(sh) {
  sh.getRange("C:D").setWrap(true);
  sh.getRange("A:D").setVerticalAlignment("top");
  sh.getRange("A:B").setFontColor("#8A929C").setFontSize(9);
}

// 메일 발송: 미발송/발송 고르기 + 색 구분
function formatQuoteSheet_(sh) {
  const mail = sh.getRange(2, MAIL_COL, sh.getMaxRows() - 1, 1);
  mail.setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(["미발송", "발송"], true).setAllowInvalid(false).build(),
  );
  const status = sh.getRange(2, STATUS_COL, sh.getMaxRows() - 1, 1);
  status.setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(["대기", "진행중", "완료", "취소"], true).setAllowInvalid(true).build(),
  );
  const rules = sh.getConditionalFormatRules().filter((r) => {
    const a1 = r.getRanges().map((x) => x.getA1Notation()).join();
    return !/^M|^N/.test(a1);
  });
  const rule = (range, text, bg, fg) =>
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(text).setBackground(bg).setFontColor(fg).setBold(true).setRanges([range]).build();
  rules.push(
    rule(mail, "발송", "#D4EDDA", "#1E6B34"),
    rule(mail, "미발송", "#FDE2E1", "#B3261E"),
    rule(status, "완료", "#D4EDDA", "#1E6B34"),
    rule(status, "진행중", "#FFF3D6", "#8A5A00"),
    rule(status, "취소", "#EEEEEE", "#777777"),
  );
  sh.setConditionalFormatRules(rules);
  mail.setHorizontalAlignment("center");
  status.setHorizontalAlignment("center");
  sh.getRange(2, 12, sh.getMaxRows() - 1, 1).setNumberFormat("#,##0");
}

function now_() {
  return Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");
}

function findRows_(sh, col, value) {
  if (sh.getLastRow() < 1) return [];
  return sh
    .getRange(1, col, sh.getLastRow(), 1)
    .createTextFinder(value)
    .matchEntireCell(true)
    .findAll()
    .map((r) => r.getRow());
}

const q_ = (s) => String(s).replace(/"/g, '""');

function viewLink_(sid, label) {
  const gid = sheet_(LOG).getSheetId();
  return `=HYPERLINK("#gid=${gid}&range=A"&MATCH("${q_(sid)}",'${LOG}'!A:A,0),"${q_(label || "대화 보기")}")`;
}

function headText_(org, name) {
  return "■ " + (org ? org + (name ? " · " + name + " 담당자" : "") : "새 대화 (소속 미입력)");
}

// 대화내용 시트에 줄을 넣는다. rows: [{user, bot}] 또는 [{sys}]
function addMessages_(sid, rows) {
  const sh = sheet_(LOG);
  const found = findRows_(sh, 1, sid);
  let at;
  if (!found.length) {
    at = sh.getLastRow() + 1;
    if (at > 2) {
      sh.insertRowsAfter(at - 1, 1); // 대화 사이 빈 줄
      at++;
    }
    sh.getRange(at, 1, 1, 4).setValues([[sid, now_(), headText_(), ""]]);
    sh.getRange(at, 3, 1, 2).merge();
    sh.getRange(at, 1, 1, 4).setBackground(C_HEAD).setFontWeight("bold");
    sh.getRange(at, 1, 1, 2).setFontWeight("normal");
  } else {
    at = Math.max.apply(null, found);
  }
  sh.insertRowsAfter(at, rows.length);
  rows.forEach((r, i) => {
    const row = at + 1 + i;
    const range = sh.getRange(row, 1, 1, 4);
    range.breakApart().setFontWeight("normal").setBackground(null);
    if (r.sys) {
      range.setValues([[sid, now_(), r.sys, ""]]);
      sh.getRange(row, 3, 1, 2).merge().setBackground(C_SYS).setFontWeight("bold").setHorizontalAlignment("center");
    } else {
      range.setValues([[sid, now_(), r.user || "", r.bot || ""]]);
      sh.getRange(row, 3).setBackground(C_USER).setHorizontalAlignment("left");
      sh.getRange(row, 4).setBackground(r.bot ? C_BOT : null).setHorizontalAlignment("left");
    }
  });
}

function setLogHead_(sid, org, name) {
  if (!org) return;
  const sh = sheet_(LOG);
  const found = findRows_(sh, 1, sid);
  if (found.length) sh.getRange(Math.min.apply(null, found), 3).setValue(headText_(org, name));
}

function upsertList_(sid, info) {
  const sh = sheet_(LIST);
  const found = findRows_(sh, 1, sid);
  let row;
  if (!found.length) {
    row = sh.getLastRow() + 1;
    sh.getRange(row, 1, 1, 3).setValues([[sid, now_(), now_()]]);
    sh.getRange(row, 8).setValue(0);
    sh.getRange(row, 9).setValue("");
    if (info.firstQuestion) sh.getRange(row, 10).setValue(info.firstQuestion);
    sh.getRange(row, 11).setFormula(viewLink_(sid));
  } else {
    row = found[0];
    sh.getRange(row, 3).setValue(now_());
  }
  const set = (col, v) => v && sh.getRange(row, col).setValue(v);
  set(4, info.org);
  set(5, info.name);
  set(6, info.phone && "'" + String(info.phone).replace(/^'/, ""));
  set(7, info.email);
  if (info.addMessages) sh.getRange(row, 8).setValue((Number(sh.getRange(row, 8).getValue()) || 0) + info.addMessages);
  if (info.quote) sh.getRange(row, 9).setValue("요청함");
  if (info.org) {
    const v = sh.getRange(row, 4, 1, 2).getValues()[0];
    setLogHead_(sid, v[0], v[1]);
  }
}

// 견적서 PDF를 드라이브의 '상상력놀이터 견적서' 폴더에 저장한다. 공유 설정은 바꾸지 않으므로 이 계정(과 공유받은 사람)만 열 수 있다.
const PDF_FOLDER = "상상력놀이터 견적서";
function savePdf_(name, base64) {
  const it = DriveApp.getFoldersByName(PDF_FOLDER);
  const folder = it.hasNext() ? it.next() : DriveApp.createFolder(PDF_FOLDER);
  const fileName = String(name).slice(0, 150);
  const blob = Utilities.newBlob(Utilities.base64Decode(base64), "application/pdf", "quote.pdf");
  const file = folder.createFile(blob);
  file.setName(fileName); // blob 이름에 한글을 넣으면 깨지므로 만든 뒤 이름을 바꾼다
  return file.getUrl();
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.secret !== SECRET) return out_({ ok: false, error: "forbidden" });
    const sid = String(d.sessionId || "unknown").slice(0, 64);
    const f = d.form || {};

    if (d.type === "chat") {
      addMessages_(sid, [{ user: String(d.user || ""), bot: String(d.bot || "") }]);
      upsertList_(sid, { firstQuestion: d.user, addMessages: d.bot ? 2 : 1, org: f.org, name: f.name, phone: f.phone, email: f.email });
    } else if (d.type === "quote") {
      const c = d.customer || {};
      const q = d.quote || {};
      const qty = d.qty || {};
      const qs = sheet_(QUOTES);
      qs.appendRow([
        now_(), d.quoteNo, c.org, c.name, "'" + (c.phone || ""), c.email,
        qty.v1 || 0, qty.v2 || 0, qty.v3 || 0, q.totalQty || 0, q.shipping || 0, q.total || 0,
        d.mailed ? "발송" : "미발송", "대기", "",
      ]);
      const qrow = qs.getLastRow();
      if (sid !== "unknown") {
        qs.getRange(qrow, 3).setFormula(viewLink_(sid, c.org || "대화 보기"));
        qs.getRange(qrow, 15).setFormula(viewLink_(sid));
      }
      if (d.pdfBase64) {
        try {
          const url = savePdf_(d.pdfName || d.quoteNo + ".pdf", d.pdfBase64);
          qs.getRange(qrow, 16).setFormula(`=HYPERLINK("${url}","PDF 열기")`);
        } catch (err) {
          qs.getRange(qrow, 16).setValue("저장 실패: " + String(err).slice(0, 80));
        }
      }
      addMessages_(sid, [{ sys: `견적 요청 접수 ${d.quoteNo} · 총 ${q.totalQty}권 · 합계 ${Number(q.total || 0).toLocaleString("ko-KR")}원 · ${d.mailed ? "견적서 메일 발송됨" : "담당자 확인 후 발송 예정"}` }]);
      upsertList_(sid, { org: c.org, name: c.name, phone: c.phone, email: c.email, quote: true, addMessages: 1 });
    }
    return out_({ ok: true });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return out_({ ok: true, service: "sangsang-chat-log" });
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// 처음 한 번 실행: 시트 만들기, 제목·서식 적용, 드라이브 권한 승인
function setup() {
  ss_().rename(TITLE);
  [LIST, LOG, QUOTES].forEach(sheet_);
  formatQuoteSheet_(sheet_(QUOTES));
  DriveApp.getRootFolder();
}

// 한 번만 실행: 예전 형식(한 줄 = 메시지 하나)의 기록을 새 형식으로 바꾸고, 견적요청의 기존 줄도 새 형식에 맞춘다
function migrate() {
  setup();
  const ss = ss_();

  // 대화목록에서 대화번호별 소속·담당자
  const who = {};
  const lsh = sheet_(LIST);
  if (lsh.getLastRow() > 1) {
    lsh.getRange(2, 1, lsh.getLastRow() - 1, 5).getValues().forEach((r) => (who[r[0]] = { org: r[3], name: r[4] }));
  }

  // 대화내용 다시 쓰기
  const old = ss.getSheetByName(LOG);
  const rows = old && old.getLastRow() > 1 ? old.getRange(2, 1, old.getLastRow() - 1, 4).getValues() : [];
  const order = [];
  const bySid = {};
  rows.forEach(([sid, time, sender, text]) => {
    if (!sid) return;
    if (!bySid[sid]) {
      bySid[sid] = [];
      order.push(sid);
    }
    bySid[sid].push({ time, sender: String(sender), text: String(text) });
  });
  if (old) old.setName(LOG + "_예전_" + Utilities.formatDate(new Date(), "Asia/Seoul", "MMddHHmm"));
  const sh = sheet_(LOG); // 새 형식으로 새로 만든다
  const out = [];
  const kinds = [];
  order.forEach((sid, i) => {
    if (i > 0) {
      out.push(["", "", "", ""]);
      kinds.push("blank");
    }
    const msgs = bySid[sid];
    const w = who[sid] || {};
    out.push([sid, msgs[0].time, headText_(w.org, w.name), ""]);
    kinds.push("head");
    for (let k = 0; k < msgs.length; k++) {
      const m = msgs[k];
      if (m.sender.indexOf("대화 시작") >= 0) continue;
      if (m.sender === "방문자") {
        const next = msgs[k + 1];
        const bot = next && next.sender === "챗봇" ? next.text : "";
        if (bot) k++;
        out.push([sid, m.time, m.text, bot]);
        kinds.push("turn");
      } else if (m.sender === "챗봇") {
        out.push([sid, m.time, "", m.text]);
        kinds.push("turn");
      } else {
        out.push([sid, m.time, m.text, ""]);
        kinds.push("sys");
      }
    }
  });
  if (out.length) {
    if (sh.getMaxRows() < out.length + 1) sh.insertRowsAfter(sh.getMaxRows(), out.length + 1 - sh.getMaxRows());
    sh.getRange(2, 1, out.length, 4).setValues(out);
    kinds.forEach((k, i) => {
      const row = i + 2;
      if (k === "head") {
        sh.getRange(row, 3, 1, 2).merge();
        sh.getRange(row, 1, 1, 4).setBackground(C_HEAD);
        sh.getRange(row, 3).setFontWeight("bold");
      } else if (k === "sys") {
        sh.getRange(row, 3, 1, 2).merge().setBackground(C_SYS).setFontWeight("bold").setHorizontalAlignment("center");
      } else if (k === "turn") {
        if (out[i][2]) sh.getRange(row, 3).setBackground(C_USER);
        if (out[i][3]) sh.getRange(row, 4).setBackground(C_BOT);
      }
    });
  }

  // 대화목록·견적요청의 '대화 보기' 링크를 새 시트로 다시 건다
  if (lsh.getLastRow() > 1) {
    lsh.getRange(2, 1, lsh.getLastRow() - 1, 1).getValues().forEach((r, i) => {
      if (r[0]) lsh.getRange(i + 2, 11).setFormula(viewLink_(r[0]));
    });
  }
  const qs = sheet_(QUOTES);
  if (qs.getLastRow() > 1) {
    const n = qs.getLastRow() - 1;
    const mail = qs.getRange(2, MAIL_COL, n, 1).getValues();
    const forms = qs.getRange(2, 15, n, 1).getFormulas();
    const orgs = qs.getRange(2, 3, n, 1).getValues();
    for (let i = 0; i < n; i++) {
      const row = i + 2;
      if (mail[i][0] === "발송됨") qs.getRange(row, MAIL_COL).setValue("발송");
      const m = /MATCH\("([^"]+)"/.exec(forms[i][0] || "");
      if (m) {
        qs.getRange(row, 15).setFormula(viewLink_(m[1]));
        qs.getRange(row, 3).setFormula(viewLink_(m[1], orgs[i][0] || "대화 보기"));
      }
    }
  }
  return "ok";
}
