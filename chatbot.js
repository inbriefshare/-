// 상상력놀이터 상담 챗봇 위젯. index.html 템플릿 안에서 <script src="/chatbot.js">로 불러온다.
(function () {
  if (window.__sangsangChatbot) return;
  window.__sangsangChatbot = true;

  // <script src="/chatbot.js" data-launcher="always|desktop-only|none">
  //   desktop-only: 폭 720px 이하에서는 떠 있는 버튼을 숨긴다 (페이지가 SangsangChat.open()으로 연다)
  var SCRIPT = document.currentScript;
  var LAUNCHER = (SCRIPT && SCRIPT.getAttribute("data-launcher")) || "always";

  var BLUE = "#2454CC";
  var GREETING =
    "안녕하세요, 도서출판 상상력놀이터입니다. 노인일자리 안전교육 워크북 구매와 견적을 도와드려요. 상담을 시작하기 전에 아래 안내를 확인해 주세요.";
  var CONSENT_TEXT =
    "[필수] 개인정보 수집·이용 동의: 견적과 상담을 위해 소속 기관, 담당자 이름, 연락처, 이메일과 대화 내용을 수집·저장하며, 목적 달성 후 지체 없이 파기합니다.";
  var FIRST_QUESTION = "감사합니다. 먼저 소속 기관을 알려 주세요. (예: 서울종합복지관)";
  var PHONE = "010-8260-3318";
  var PRODUCTS = [
    { id: "v1", label: "1권 생활교통안전 편", note: "3시간 · 5,000원" },
    { id: "v2", label: "2권 자연재난 보건안전 편", note: "2시간 · 3,000원" },
    { id: "v3", label: "3권 대처요령·건강한 활동 편", note: "2시간 · 3,000원" },
  ];
  var SUGGESTIONS = [
    "견적은 어떻게 받나요?",
    "납품까지 얼마나 걸려요?",
    "혹한기 대체교육으로 쓸 수 있나요?",
    "가격이 궁금해요",
  ];

  var css =
    "#scb-root{position:fixed;right:20px;bottom:20px;z-index:2147483000;font-family:'Pretendard','Pretendard Variable',-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#14181F}" +
    "#scb-root *{box-sizing:border-box}" +
    "#scb-btn{display:flex;align-items:center;gap:8px;height:56px;padding:0 22px;border:0;border-radius:12px;background:" + BLUE + ";color:#fff;font-size:17px;font-weight:700;cursor:pointer;font-family:inherit}" +
    "#scb-btn:focus-visible,#scb-root button:focus-visible,#scb-input:focus-visible{outline:3px solid #F5B400;outline-offset:2px}" +
    "#scb-btn svg{width:24px;height:24px}" +
    "#scb-panel{display:none;flex-direction:column;width:380px;height:min(620px,calc(100vh - 40px));background:#fff;border-radius:18px;box-shadow:0 12px 40px rgba(20,24,31,.25);overflow:hidden}" +
    "#scb-root.open #scb-panel{display:flex}#scb-root.open #scb-btn{display:none}" +
    "#scb-head{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;background:" + BLUE + ";color:#fff}" +
    "#scb-head strong{font-size:17px}#scb-head span{display:block;font-size:13px;opacity:.85;margin-top:2px}" +
    "#scb-close{width:40px;height:40px;border:0;border-radius:20px;background:rgba(255,255,255,.15);color:#fff;font-size:22px;line-height:1;cursor:pointer}" +
    "#scb-log{flex:1;overflow-y:auto;padding:16px;background:#F4F5F7;display:flex;flex-direction:column;gap:10px}" +
    ".scb-msg{max-width:85%;padding:11px 14px;border-radius:14px;font-size:16px;line-height:1.6;white-space:pre-wrap;word-break:keep-all;overflow-wrap:anywhere}" +
    ".scb-bot{align-self:flex-start;background:#fff;border:1px solid #E2E5EA;border-top-left-radius:4px}" +
    ".scb-user{align-self:flex-end;background:" + BLUE + ";color:#fff;border-top-right-radius:4px}" +
    ".scb-msg a{color:" + BLUE + ";font-weight:600}.scb-user a{color:#fff}" +
    ".scb-typing{color:#5B6472}" +
    "#scb-sugg{display:flex;flex-wrap:wrap;gap:6px;padding:0 16px 10px;background:#F4F5F7}" +
    "#scb-sugg button{border:1px solid #C7CCD4;background:#fff;border-radius:16px;padding:7px 12px;font-size:14px;color:#1F2937;cursor:pointer;font-family:inherit}" +
    "#scb-form{display:flex;gap:8px;padding:12px;border-top:1px solid #E2E5EA;background:#fff}" +
    "#scb-input{flex:1;min-width:0;resize:none;height:48px;max-height:120px;padding:12px 14px;border:1px solid #C7CCD4;border-radius:12px;font-size:16px;font-family:inherit;line-height:1.5}" +
    "#scb-send{flex:none;height:48px;padding:0 16px;border:0;border-radius:12px;background:" + BLUE + ";color:#fff;font-size:16px;font-weight:700;cursor:pointer;font-family:inherit}" +
    "#scb-send:disabled{background:#94A3B8;cursor:default}" +
    "#scb-foot{padding:0 12px 10px;font-size:12px;color:#6B7280;background:#fff;text-align:center}" +
    "#scb-foot a{color:#5B6472}" +
    ".scb-card{align-self:stretch;background:#fff;border:2px solid " + BLUE + ";border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:9px;font-size:15px;position:relative}" +
    ".scb-card h4{margin:0;font-size:16px;color:" + BLUE + "}" +
    ".scb-card label{display:flex;flex-direction:column;gap:3px;font-size:13px;color:#4B5563;font-weight:600}" +
    ".scb-card input[type=text],.scb-card input[type=tel],.scb-card input[type=email],.scb-card input[type=number]{height:42px;padding:0 10px;border:1px solid #C7CCD4;border-radius:9px;font-size:16px;font-family:inherit;color:#14181F;font-weight:400;width:100%}" +
    ".scb-qty{display:grid;grid-template-columns:1fr 92px;gap:6px;align-items:center;font-size:14px;font-weight:400;color:#1F2937}" +
    ".scb-qty input{text-align:right}" +
    ".scb-book{display:flex;align-items:center;gap:8px;line-height:1.35}.scb-book img{width:34px;height:48px;object-fit:cover;border-radius:3px;box-shadow:0 1px 3px rgba(0,0,0,.25);flex:none}" +
    ".scb-book b{display:block;font-size:13.5px;font-weight:600}.scb-book small{display:block;font-size:12.5px;color:#5B6472}" +
    ".scb-sum{background:#F4F5F7;border-radius:9px;padding:9px 11px;font-size:14px;line-height:1.6}" +
    ".scb-sum b{font-size:17px;color:" + BLUE + "}" +
    ".scb-card .scb-consent{flex-direction:row;align-items:flex-start;gap:7px;font-weight:400;font-size:12.5px;line-height:1.5}" +
    ".scb-consent input{width:20px;height:20px;margin:0;flex:none}" +
    ".scb-card button.scb-submit{height:48px;border:0;border-radius:11px;background:" + BLUE + ";color:#fff;font-size:16px;font-weight:700;cursor:pointer;font-family:inherit}" +
    ".scb-card button.scb-submit:disabled{background:#94A3B8;cursor:default}" +
    ".scb-status{font-size:13.5px;color:#B42318}.scb-status:empty{display:none}" +
    ".scb-card input.scb-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}" +
    "@media (max-width:480px){#scb-root{right:12px;bottom:12px}#scb-root.open{right:0;bottom:0;left:0;top:0}#scb-panel{width:100%;height:100%;border-radius:0}}" +
    (LAUNCHER === "none" ? "#scb-btn{display:none!important}" : "") +
    (LAUNCHER === "desktop-only" ? "@media (max-width:720px){#scb-btn{display:none!important}}" : "");

  var history = []; // {role, content}
  var sessionId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : "s-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  var agreed = false;
  var mounted = false;
  var pending = null; // mount 전에 open()이 불리면 기억해 둔다
  var preferred = ""; // 페이지에서 고르고 들어온 권 (v1|v2|v3)
  var lastFocus = null;
  var PRODUCT_NAMES = { v1: "1권 생활교통안전 편", v2: "2권 자연재난 보건안전 편", v3: "3권 안전사고 대처요령·건강한 노인일자리 활동 편" };
  var busy = false;
  var root, log, input, send, sugg;

  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }

  // 텍스트를 안전하게 넣고 URL·전화번호·메일만 링크로 바꾼다.
  function renderText(node, text) {
    var re = /(https?:\/\/[^\s)]+)|(010-\d{4}-\d{4})|([\w.+-]+@[\w-]+\.[\w.]+)/g;
    var last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) node.appendChild(document.createTextNode(text.slice(last, m.index)));
      var a = el("a", null, m[0]);
      if (m[1]) { a.href = m[1]; a.target = "_blank"; a.rel = "noopener"; }
      else if (m[2]) a.href = "tel:" + m[2].replace(/-/g, "");
      else a.href = "mailto:" + m[3];
      node.appendChild(a);
      last = re.lastIndex;
    }
    if (last < text.length) node.appendChild(document.createTextNode(text.slice(last)));
  }

  function addMsg(role, text) {
    var d = el("div", { class: "scb-msg " + (role === "user" ? "scb-user" : "scb-bot") });
    renderText(d, text);
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
    return d;
  }

  function ask(text) {
    text = (text || "").trim();
    if (!text || busy || !agreed) return;
    busy = true;
    send.disabled = true;
    sugg.style.display = "none";
    addMsg("user", text);
    history.push({ role: "user", content: text });
    input.value = "";
    var typing = addMsg("bot", "답변을 준비하고 있어요…");
    typing.classList.add("scb-typing");

    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history, sessionId: sessionId, context: preferred ? { product: preferred } : undefined }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var reply = (data && data.reply) || "죄송합니다. 잠시 후 다시 시도해 주세요.";
        typing.remove();
        addMsg("bot", reply);
        if (data && !data.error) history.push({ role: "assistant", content: reply });
        else history.pop();
        if (data && data.form) addQuoteCard(data.form);
      })
      .catch(function () {
        typing.remove();
        history.pop();
        addMsg("bot", "연결이 원활하지 않습니다. 전화 010-8260-3318로 문의해 주세요.");
      })
      .then(function () {
        busy = false;
        send.disabled = false;
        input.focus();
      });
  }

  function won(n) { return Number(n || 0).toLocaleString("ko-KR"); }

  function postQuote(payload) {
    return fetch("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(function (r) { return r.json(); });
  }

  // 견적 요청 카드. 금액은 서버(/api/quote)가 계산한 값만 보여 준다.
  function addQuoteCard(pre) {
    pre = pre || {};
    var card = el("form", { class: "scb-card", novalidate: "" });
    card.appendChild(el("h4", null, "견적 요청 내용 확인"));

    function field(label, key, type, ph) {
      var l = el("label", null, label);
      var i = el("input", { type: type, placeholder: ph || "", maxlength: "100" });
      if (pre[key]) i.value = String(pre[key]);
      l.appendChild(i);
      card.appendChild(l);
      return i;
    }
    var org = field("소속 기관", "org", "text", "예: 서울종합복지관");
    var name = field("담당자 이름", "name", "text", "예: 홍길동");
    var phone = field("연락처", "phone", "tel", "예: 010-1234-5678");
    var email = field("견적서 받을 이메일", "email", "email", "예: name@korea.kr");

    var ql = el("div", null);
    ql.appendChild(el("label", null, "권별 수량"));
    var qtyBox = el("div", { class: "scb-qty" });
    var qty = {};
    PRODUCTS.forEach(function (p) {
      var lab = el("span", { class: "scb-book" });
      lab.appendChild(el("img", { src: "/images/covers/" + p.id + ".jpg", alt: "", width: "34", height: "48" }));
      var tx = el("span");
      tx.appendChild(el("b", null, p.label));
      tx.appendChild(el("small", null, p.note));
      lab.appendChild(tx);
      qtyBox.appendChild(lab);
      var i = el("input", { type: "number", min: "0", step: "1", inputmode: "numeric", "aria-label": p.label + " 권수", placeholder: "0" });
      if (pre[p.id]) i.value = String(pre[p.id]);
      qty[p.id] = i;
      qtyBox.appendChild(i);
    });
    ql.appendChild(qtyBox);
    card.appendChild(ql);

    var sum = el("div", { class: "scb-sum", "aria-live": "polite" }, "수량을 입력하면 금액이 계산됩니다.");
    card.appendChild(sum);

    var hp = el("input", { type: "text", class: "scb-hp", tabindex: "-1", autocomplete: "off", "aria-hidden": "true" });
    card.appendChild(hp);

    var status = el("div", { class: "scb-status", role: "status" });
    var submit = el("button", { type: "submit", class: "scb-submit" }, "견적 요청하기");
    card.appendChild(status);
    card.appendChild(submit);

    function qtyValues() {
      var q = {};
      for (var k in qty) q[k] = Math.max(0, Math.floor(Number(qty[k].value) || 0));
      return q;
    }
    var timer, seq = 0;
    function refresh() {
      clearTimeout(timer);
      timer = setTimeout(function () {
        var my = ++seq;
        postQuote({ action: "preview", qty: qtyValues() }).then(function (d) {
          if (my !== seq || !d || !d.ok) return;
          var q = d.quote;
          while (sum.firstChild) sum.removeChild(sum.firstChild);
          if (!q.totalQty) { sum.textContent = "수량을 입력하면 금액이 계산됩니다."; return; }
          sum.appendChild(document.createTextNode("총 " + won(q.totalQty) + "권 · 배송비 " + (q.shipping ? won(q.shipping) + "원" : "무료")));
          if (q.discounted) sum.appendChild(document.createTextNode(" · 5% 할인(-" + won(q.discountAmount) + "원)"));
          sum.appendChild(el("br"));
          sum.appendChild(document.createTextNode("합계 "));
          sum.appendChild(el("b", null, won(q.total) + "원"));
          sum.appendChild(document.createTextNode(" (부가세 면세)"));
        }).catch(function () {});
      }, 250);
    }
    for (var k in qty) qty[k].addEventListener("input", refresh);
    refresh();

    function resetButton() {
      submit.disabled = false;
      submit.textContent = "견적 요청하기";
    }
    card.onsubmit = function (e) {
      e.preventDefault();
      status.textContent = "";
      submit.disabled = true;
      submit.textContent = "보내는 중…";
      postQuote({
        action: "submit",
        sessionId: sessionId,
        customer: { org: org.value, name: name.value, phone: phone.value, email: email.value },
        qty: qtyValues(),
        consent: true,
        website: hp.value,
      })
        .then(function (d) {
          if (d && d.ok && d.quoteNo) {
            card.remove();
            addMsg("bot", d.mailed
              ? "견적서를 " + d.email + "(으)로 보내 드렸습니다. (접수번호 " + d.quoteNo + ", 합계 " + won(d.quote.total) + "원)\n메일이 보이지 않으면 스팸함을 확인해 주세요."
              : "견적 요청이 접수되었습니다. (접수번호 " + d.quoteNo + ", 합계 " + won(d.quote.total) + "원)\n담당자가 확인한 뒤 " + d.email + "(으)로 견적서를 보내드리겠습니다. 급하시면 " + PHONE + "로 연락 주세요.");
          } else {
            status.textContent = (d && d.message) || "발송하지 못했습니다. 잠시 후 다시 시도해 주세요.";
            resetButton();
          }
        })
        .catch(function () {
          status.textContent = "연결이 원활하지 않습니다. 010-8260-3318로 문의해 주세요.";
          resetButton();
        });
    };

    log.appendChild(card);
    log.scrollTop = log.scrollHeight;
    (org.value ? (name.value ? email : name) : org).focus();
  }

  function mount() {
    if (document.getElementById("scb-root")) return;
    root = el("div", { id: "scb-root" });
    root.appendChild(el("style", null, css));

    var btn = el("button", { id: "scb-btn", type: "button", "aria-label": "상담 챗봇 열기" });
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>';
    btn.appendChild(document.createTextNode("궁금한 점 물어보기"));

    var panel = el("div", { id: "scb-panel", role: "dialog", "aria-label": "상담 챗봇" });
    var head = el("div", { id: "scb-head" });
    var title = el("div");
    title.appendChild(el("strong", null, "상상력놀이터 상담"));
    title.appendChild(el("span", null, "워크북 구매·견적 안내"));
    var close = el("button", { id: "scb-close", type: "button", "aria-label": "챗봇 닫기" }, "×");
    head.appendChild(title);
    head.appendChild(close);

    log = el("div", { id: "scb-log", "aria-live": "polite" });
    sugg = el("div", { id: "scb-sugg" });
    SUGGESTIONS.forEach(function (q) {
      var b = el("button", { type: "button" }, q);
      b.onclick = function () { ask(q); };
      sugg.appendChild(b);
    });

    var form = el("form", { id: "scb-form" });
    input = el("textarea", { id: "scb-input", rows: "1", maxlength: "1000", placeholder: "질문을 입력하세요", "aria-label": "질문 입력" });
    send = el("button", { id: "scb-send", type: "submit" }, "보내기");
    form.appendChild(input);
    form.appendChild(send);

    var foot = el("div", { id: "scb-foot" });
    foot.appendChild(document.createTextNode("AI가 답변하며 틀릴 수 있습니다. 정확한 내용은 "));
    var fl = el("a", { href: "tel:" + PHONE.replace(/-/g, "") }, PHONE);
    foot.appendChild(fl);
    foot.appendChild(document.createTextNode("로 문의해 주세요."));

    panel.appendChild(head);
    panel.appendChild(log);
    panel.appendChild(sugg);
    panel.appendChild(form);
    panel.appendChild(foot);
    root.appendChild(btn);
    root.appendChild(panel);
    document.body.appendChild(root);

    addMsg("bot", GREETING);
    sugg.style.display = "none";
    input.disabled = true;
    send.disabled = true;
    input.placeholder = "동의 후 입력할 수 있어요";
    var gate = el("div", { class: "scb-card" });
    var gl = el("label", { class: "scb-consent" });
    var gc = el("input", { type: "checkbox" });
    gl.appendChild(gc);
    gl.appendChild(document.createTextNode(CONSENT_TEXT));
    var gb = el("button", { type: "button", class: "scb-submit" }, "동의하고 상담 시작하기");
    var gs = el("div", { class: "scb-status", role: "status" });
    gate.appendChild(gl);
    gate.appendChild(gs);
    gate.appendChild(gb);
    log.appendChild(gate);
    gb.onclick = function () {
      if (!gc.checked) { gs.textContent = "동의에 체크해 주세요. 동의하지 않으시면 " + PHONE + "로 전화 문의해 주세요."; return; }
      agreed = true;
      gate.remove();
      addMsg("bot", preferred
        ? "감사합니다. " + PRODUCT_NAMES[preferred] + " 견적을 도와드릴게요. 먼저 소속 기관을 알려 주세요. (예: 서울종합복지관)"
        : FIRST_QUESTION);
      sugg.style.display = "";
      input.disabled = false;
      send.disabled = false;
      input.placeholder = "여기에 입력하세요";
      input.focus();
    };

    openPanel = function (opts) {
      var product = opts && opts.product;
      if (product && PRODUCT_NAMES[product] && product !== preferred) {
        preferred = product;
        if (agreed) addMsg("bot", PRODUCT_NAMES[preferred] + " 견적을 원하시는군요. 필요한 권수와 아직 말씀하지 않은 정보를 알려 주세요.");
      }
      if (!root.classList.contains("open")) lastFocus = document.activeElement;
      root.classList.add("open");
      (agreed ? input : gc).focus();
    };
    btn.onclick = function () { openPanel(); };
    close.onclick = function () {
      root.classList.remove("open");
      var visible = function (n) { return n && n !== document.body && document.contains(n) && n.getClientRects().length > 0; };
      var back = visible(lastFocus) ? lastFocus : visible(btn) ? btn : null;
      if (back) back.focus();
      else if (document.activeElement && root.contains(document.activeElement)) document.activeElement.blur(); // 돌아갈 곳이 없으면 body로
    };
    closePanel = close.onclick;
    form.onsubmit = function (e) { e.preventDefault(); ask(input.value); };
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); ask(input.value); }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && root.classList.contains("open")) close.onclick();
    });
  }

  // 페이지에서 챗봇을 여는 함수: SangsangChat.open({ product: "v1" | "v2" | "v3" }), SangsangChat.close()
  var openPanel = null;
  var closePanel = null;
  window.SangsangChat = {
    open: function (opts) {
      if (openPanel) openPanel(opts || {});
      else pending = opts || {};
    },
    close: function () { if (closePanel) closePanel(); },
  };

  function start() {
    if (mounted) return;
    mounted = true;
    mount();
    if (pending) { var o = pending; pending = null; openPanel(o); }
  }
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start);
})();
