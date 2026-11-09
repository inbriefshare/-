/**
 * 상상력놀이터 챗봇 기록용 구글 시트 스크립트 (Google Apps Script)
 *
 * 설치: 구글 시트 → 확장 프로그램 → Apps Script → 이 코드 전체 붙여넣기
 *       → SECRET 값을 Vercel 환경변수 SHEET_WEBHOOK_SECRET과 똑같이 바꾸기
 *       → 배포 → 새 배포 → 유형: 웹 앱, 실행: 나, 액세스: 모든 사용자 → 배포
 *       → 나온 웹 앱 URL을 Vercel 환경변수 SHEET_WEBHOOK_URL에 넣기
 *
 * 시트 구성 (없으면 자동으로 만든다)
 *   대화목록 : 대화 1건당 한 줄. '대화 보기'를 누르면 대화내용의 해당 대화로 이동
 *   대화내용 : 대화별로 메시지가 모여 있다
 *   견적요청 : 견적 요청 1건당 한 줄. '처리상태'는 담당자가 직접 고쳐 쓴다
 */

const SECRET = "여기에_비밀값";
// 시트와 따로 만든 스크립트(script.google.com에서 새 프로젝트)라면 시트 주소의 /d/와 /edit 사이 값을 넣는다
const SHEET_ID = "";

const LIST = "대화목록";
const LOG = "대화내용";
const QUOTES = "견적요청";

const HEAD = {
  [LIST]: ["대화번호", "시작", "마지막", "소속", "담당자", "연락처", "이메일", "메시지 수", "견적요청", "첫 질문", "대화 보기"],
  [LOG]: ["대화번호", "시각", "보낸 사람", "내용"],
  [QUOTES]: ["접수시각", "접수번호", "소속", "담당자", "연락처", "이메일", "1권", "2권", "3권", "총 권수", "배송비", "합계", "메일 발송", "처리상태", "대화 보기", "견적서"],
};
const WIDTH = {
  [LIST]: [110, 130, 130, 160, 80, 110, 170, 70, 70, 260, 80],
  [LOG]: [110, 130, 80, 560],
  [QUOTES]: [130, 130, 160, 80, 110, 170, 60, 60, 60, 70, 70, 90, 80, 90, 80, 90],
};

function sheet_(name) {
  const ss = SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, HEAD[name].length).setValues([HEAD[name]]).setFontWeight("bold").setBackground("#EDF2FA");
    sh.setFrozenRows(1);
    WIDTH[name].forEach((w, i) => sh.setColumnWidth(i + 1, w));
    if (name === LOG) sh.getRange("D:D").setWrap(true);
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

function now_() {
  return Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");
}

function findRows_(sh, col, value) {
  return sh
    .getRange(1, col, sh.getLastRow(), 1)
    .createTextFinder(value)
    .matchEntireCell(true)
    .findAll()
    .map((r) => r.getRow());
}

function viewLink_(sid) {
  const gid = sheet_(LOG).getSheetId();
  return `=HYPERLINK("#gid=${gid}&range=A"&MATCH("${sid}",'${LOG}'!A:A,0),"대화 보기")`;
}

// 대화 한 건의 메시지를 대화내용 시트의 그 대화 묶음 끝에 넣는다 (묶음이 없으면 맨 아래에 새로 만든다)
function addMessages_(sid, rows) {
  const sh = sheet_(LOG);
  const found = findRows_(sh, 1, sid);
  const values = rows.map((r) => [sid, now_(), r[0], r[1]]);
  if (!found.length) {
    const start = sh.getLastRow() + 1;
    sh.getRange(start, 1, 1, 4).setValues([[sid, now_(), "■ 대화 시작", ""]]).setFontWeight("bold").setBackground("#F4F5F7");
    sh.getRange(start + 1, 1, values.length, 4).setValues(values);
    return;
  }
  const last = Math.max.apply(null, found);
  sh.insertRowsAfter(last, values.length);
  sh.getRange(last + 1, 1, values.length, 4).setValues(values).setFontWeight("normal").setBackground(null);
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
      const rows = [["방문자", String(d.user || "")]];
      if (d.bot) rows.push(["챗봇", String(d.bot)]);
      addMessages_(sid, rows);
      upsertList_(sid, { firstQuestion: d.user, addMessages: rows.length, org: f.org, name: f.name, phone: f.phone, email: f.email });
    } else if (d.type === "quote") {
      const c = d.customer || {};
      const q = d.quote || {};
      const qty = d.qty || {};
      sheet_(QUOTES).appendRow([
        now_(), d.quoteNo, c.org, c.name, "'" + (c.phone || ""), c.email,
        qty.v1 || 0, qty.v2 || 0, qty.v3 || 0, q.totalQty || 0, q.shipping || 0, q.total || 0,
        d.mailed ? "발송됨" : "미발송", "대기", "",
      ]);
      const qs = sheet_(QUOTES);
      const qrow = qs.getLastRow();
      if (sid !== "unknown") qs.getRange(qrow, 15).setFormula(viewLink_(sid));
      if (d.pdfBase64) {
        try {
          const url = savePdf_(d.pdfName || d.quoteNo + ".pdf", d.pdfBase64);
          qs.getRange(qrow, 16).setFormula(`=HYPERLINK("${url}","PDF 열기")`);
        } catch (err) {
          qs.getRange(qrow, 16).setValue("저장 실패: " + String(err).slice(0, 80));
        }
      }
      addMessages_(sid, [["시스템", `견적 요청 접수 ${d.quoteNo} · 총 ${q.totalQty}권 · 합계 ${q.total}원 · ${d.mailed ? "견적서 메일 발송됨" : "담당자 확인 후 발송 예정"}`]]);
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

// 처음 한 번 실행해 시트를 만들어 둘 때 쓴다 (선택)
// 드라이브 권한 승인도 이 함수를 한 번 실행하면 된다
function setup() {
  [LIST, LOG, QUOTES].forEach(sheet_);
  DriveApp.getRootFolder();
}
