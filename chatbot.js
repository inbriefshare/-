// 상상력놀이터 "워크북 견적 도우미" 위젯. index.html에서 <script src="/chatbot.js">로 불러온다.
// 처음부터 견적 입력 카드(소속·이메일·권별 수량)를 띄우고, 아래 대화창에서는 견적에 필요한 짧은 질문만 받는다.
(function () {
  if (window.__sangsangChatbot) return;
  window.__sangsangChatbot = true;

  // <script src="/chatbot.js" data-mount="#quote-widget">  : 페이지 안 그 자리에 바로 펼쳐서 넣는다 (지금 홈페이지 방식)
  // <script src="/chatbot.js" data-launcher="always|desktop-only|none"> : data-mount가 없으면 오른쪽 아래 떠 있는 버튼으로 연다
  var SCRIPT = document.currentScript;
  var MOUNT = SCRIPT && SCRIPT.getAttribute("data-mount");
  var LAUNCHER = (SCRIPT && SCRIPT.getAttribute("data-launcher")) || "always";

  var KAKAO_ON = false; // 카카오톡 문의는 당분간 닫아 둔다. 다시 열 때 true로 (api/_prompt.js 8번 연락처도 같이)
  var KAKAO = "https://qr.kakao.com/talk/_zshh42ZMpCt5Zl.HQZ3Cy5N.gg-"; // 카카오톡 mango4024 친구 추가

  var BLUE = "#2454CC";
  var NAME = "워크북 견적 도우미";
  var TAGLINE = "소속·이메일·권수를 알려 주시면 견적서를 보내드려요";
  var GREETING =
    "안녕하세요, 도서출판 상상력놀이터 워크북 견적 도우미예요. 아래 카드에 소속 기관, 견적서 받을 이메일, 필요한 권수를 적어 주시면 담당자가 확인해 견적서를 보내드려요.";
  var CONSENT_TEXT =
    "[필수] 개인정보 수집·이용 동의: 견적 발송을 위해 소속 기관, 이메일과 대화 내용을 수집·저장하며, 목적 달성 후 지체 없이 파기합니다.";
  var PHONE = "010-8260-3318";
  var PRODUCTS = [
    { id: "v1", label: "1권 생활교통안전 편", note: "3시간 · 5,000원" },
    { id: "v2", label: "2권 자연재난 보건안전 편", note: "2시간 · 3,000원" },
    { id: "v3", label: "3권 대처요령·건강한 활동 편", note: "2시간 · 3,000원" },
  ];
  var SUGGESTIONS = ["가격이 궁금해요", "납품까지 얼마나 걸려요?", "결제는 어떻게 하나요?"];

  var css =
    "#scb-root{position:fixed;right:20px;bottom:20px;z-index:2147483000;font-family:'Pretendard','Pretendard Variable',-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#14181F}" +
    "#scb-root *{box-sizing:border-box}" +
    "#scb-btn{display:flex;align-items:center;gap:8px;height:56px;padding:0 22px;border:0;border-radius:12px;background:" + BLUE + ";color:#fff;font-size:17px;font-weight:700;cursor:pointer;font-family:inherit}" +
    "#scb-btn:focus-visible,#scb-root button:focus-visible,#scb-input:focus-visible{outline:3px solid #F5B400;outline-offset:2px}" +
    "#scb-btn svg{width:24px;height:24px}" +
    "#scb-panel{display:none;flex-direction:column;width:min(440px,calc(100vw - 40px));height:min(720px,calc(100vh - 40px));background:#fff;border-radius:18px;box-shadow:0 12px 40px rgba(20,24,31,.25);overflow:hidden}" +
    "#scb-root.open #scb-panel{display:flex}#scb-root.open #scb-btn{display:none}" +
    // 페이지 안에 넣는 방식
    "#scb-root.inline{position:static;z-index:auto;width:100%}" +
    "#scb-root.inline #scb-panel{display:flex;width:100%;height:min(820px,calc(100vh - 120px));min-height:560px;border:1px solid #D5DAE1;box-shadow:0 8px 28px rgba(20,24,31,.10)}" +
    "#scb-head{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;background:" + BLUE + ";color:#fff}" +
    "#scb-head strong{font-size:18px}#scb-head span{display:block;font-size:13.5px;opacity:.9;margin-top:2px}" +
    "#scb-close{width:40px;height:40px;border:0;border-radius:20px;background:rgba(255,255,255,.15);color:#fff;font-size:22px;line-height:1;cursor:pointer}" +
    "#scb-log{flex:1;overflow-y:auto;padding:16px;background:#F4F5F7;display:flex;flex-direction:column;gap:10px}" +
    ".scb-msg{max-width:85%;padding:11px 14px;border-radius:14px;font-size:16px;line-height:1.6;white-space:pre-wrap;word-break:keep-all;overflow-wrap:anywhere}" +
    ".scb-bot{align-self:flex-start;background:#fff;border:1px solid #E2E5EA;border-top-left-radius:4px}" +
    ".scb-user{align-self:flex-end;background:" + BLUE + ";color:#fff;border-top-right-radius:4px}" +
    ".scb-msg a{color:" + BLUE + ";font-weight:600}.scb-user a{color:#fff}" +
    ".scb-skel{width:72%;display:flex;flex-direction:column;gap:9px;padding:14px 16px}" +
    ".scb-skel i{display:block;height:12px;border-radius:6px;background:linear-gradient(90deg,#E3E7EE 25%,#F4F6FA 50%,#E3E7EE 75%);background-size:200% 100%;animation:scb-shim 1.3s linear infinite}" +
    ".scb-skel i:nth-child(1){width:92%}.scb-skel i:nth-child(2){width:100%}.scb-skel i:nth-child(3){width:58%}" +
    ".scb-skel span{font-size:13px;color:#6B7280;margin-top:2px}" +
    "@keyframes scb-shim{from{background-position:200% 0}to{background-position:-200% 0}}" +
    "@media (prefers-reduced-motion:reduce){.scb-skel i{animation:none}}" +
    "#scb-sugg{display:flex;flex-wrap:wrap;gap:6px;padding:8px 16px 10px;background:#F4F5F7;border-top:1px solid #E2E5EA}" +
    "#scb-sugg b{width:100%;font-size:13px;color:#5B6472;font-weight:600}" +
    "#scb-sugg button{border:1px solid #C7CCD4;background:#fff;border-radius:16px;padding:7px 12px;font-size:14px;color:#1F2937;cursor:pointer;font-family:inherit}" +
    "#scb-form{display:flex;gap:8px;padding:12px;border-top:1px solid #E2E5EA;background:#fff}" +
    "#scb-input{flex:1;min-width:0;resize:none;height:48px;max-height:120px;padding:12px 14px;border:1px solid #C7CCD4;border-radius:12px;font-size:16px;font-family:inherit;line-height:1.5}" +
    "#scb-send{flex:none;height:48px;padding:0 16px;border:0;border-radius:12px;background:" + BLUE + ";color:#fff;font-size:16px;font-weight:700;cursor:pointer;font-family:inherit}" +
    "#scb-send:disabled{background:#94A3B8;cursor:default}" +
    "#scb-foot{padding:0 12px 10px;font-size:12px;color:#6B7280;background:#fff;text-align:center}" +
    "#scb-foot a{color:#5B6472}" +
    ".scb-card{align-self:stretch;background:#fff;border:2px solid " + BLUE + ";border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:10px;font-size:15px;position:relative;transition:box-shadow .3s}" +
    ".scb-card.flash{box-shadow:0 0 0 4px rgba(36,84,204,.25)}" +
    ".scb-card h4{margin:0;font-size:17px;color:" + BLUE + "}" +
    ".scb-card .scb-sub{margin:-4px 0 2px;font-size:13.5px;color:#5B6472;line-height:1.5}" +
    ".scb-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}" +
    "@media (max-width:560px){.scb-row{grid-template-columns:1fr}}" +
    ".scb-card label{display:flex;flex-direction:column;gap:3px;font-size:13px;color:#4B5563;font-weight:600}" +
    ".scb-card input[type=text],.scb-card input[type=email],.scb-card input[type=number]{height:44px;padding:0 10px;border:1px solid #C7CCD4;border-radius:9px;font-size:16px;font-family:inherit;color:#14181F;font-weight:400;width:100%}" +
    ".scb-qty{display:grid;grid-template-columns:1fr 96px;gap:6px;align-items:center;font-size:14px;font-weight:400;color:#1F2937}" +
    ".scb-qty input{text-align:right}" +
    ".scb-book{display:flex;align-items:center;gap:8px;line-height:1.35}.scb-book img{width:34px;height:48px;object-fit:cover;border-radius:3px;box-shadow:0 1px 3px rgba(0,0,0,.25);flex:none}" +
    ".scb-book b{display:block;font-size:13.5px;font-weight:600}.scb-book small{display:block;font-size:12.5px;color:#5B6472}" +
    ".scb-sum{background:#F4F5F7;border-radius:9px;padding:9px 11px;font-size:14px;line-height:1.6}" +
    ".scb-sum b{font-size:17px;color:" + BLUE + "}" +
    ".scb-card .scb-consent{flex-direction:row;align-items:flex-start;gap:7px;font-weight:400;font-size:12.5px;line-height:1.5}" +
    ".scb-consent input{width:20px;height:20px;margin:0;flex:none}" +
    ".scb-card button.scb-submit{height:50px;border:0;border-radius:11px;background:" + BLUE + ";color:#fff;font-size:17px;font-weight:700;cursor:pointer;font-family:inherit}" +
    ".scb-card button.scb-submit:disabled{background:#94A3B8;cursor:default}" +
    ".scb-again{align-self:flex-start;border:1px solid " + BLUE + ";background:#fff;color:" + BLUE + ";border-radius:10px;padding:9px 14px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit}" +
    ".scb-status{font-size:13.5px;color:#B42318}.scb-status:empty{display:none}" +
    ".scb-card input.scb-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}" +
    "@media (max-width:480px){#scb-root:not(.inline){right:12px;bottom:12px}#scb-root.open:not(.inline){right:0;bottom:0;left:0;top:0}#scb-root.open:not(.inline) #scb-panel{width:100%;height:100%;border-radius:0}" +
    "#scb-root.inline #scb-panel{height:auto;min-height:0;border-radius:14px}#scb-root.inline #scb-log{flex:none;overflow:visible}#scb-log{padding:12px}.scb-card{padding:13px}}" +
    (LAUNCHER === "none" ? "#scb-btn{display:none!important}" : "") +
    (LAUNCHER === "desktop-only" ? "@media (max-width:720px){#scb-btn{display:none!important}}" : "");

  var history = []; // {role, content}
  var sessionId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : "s-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  var agreed = false;
  var mounted = false;
  var pending = null; // mount 전에 open()이 불리면 기억해 둔다
  var preferred = ""; // 페이지에서 고르고 들어온 권 (v1|v2|v3)
  var lastFocus = null;
  var busy = false;
  var ready = false; // 처음 화면을 다 그린 뒤 true
  var root, log, input, send, sugg;
  var card = null; // 지금 떠 있는 견적 카드 { el, fill(pre), focus(product) }

  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    return e;
  }

  // 텍스트를 안전하게 넣고 URL·전화번호·메일(·카카오톡 아이디)만 링크로 바꾼다.
  function renderText(node, text) {
    var re = KAKAO_ON
      ? /(https?:\/\/[^\s)]+)|(010-\d{4}-\d{4})|([\w.+-]+@[\w-]+\.[\w.]+)|(카카오톡\s?\(?mango4024\)?)/g
      : /(https?:\/\/[^\s)]+)|(010-\d{4}-\d{4})|([\w.+-]+@[\w-]+\.[\w.]+)/g;
    var last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) node.appendChild(document.createTextNode(text.slice(last, m.index)));
      var a = el("a", null, m[0]);
      if (m[1]) { a.href = m[1]; a.target = "_blank"; a.rel = "noopener"; }
      else if (m[2]) a.href = "tel:" + m[2].replace(/-/g, "");
      else if (m[4]) { a.href = KAKAO; a.target = "_blank"; a.rel = "noopener"; }
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
    // 휴대폰처럼 대화 칸이 따로 스크롤되지 않을 때는 페이지를 새 말까지 내린다 (처음 인사는 제외)
    if (ready && log.scrollHeight <= log.clientHeight + 1) d.scrollIntoView({ block: "nearest", behavior: "smooth" });
    return d;
  }

  // 페이지는 움직이지 않고 대화 칸 안에서만 그 요소가 보이게 스크롤한다
  function scrollLogTo(node) {
    var top = node.getBoundingClientRect().top - log.getBoundingClientRect().top + log.scrollTop - 12;
    log.scrollTop = Math.max(0, top);
  }

  function setAgreed(v) {
    agreed = !!v;
    input.disabled = !agreed;
    send.disabled = !agreed || busy;
    input.placeholder = agreed ? "궁금한 점이나 견적 정보를 입력하세요" : "카드 아래 개인정보 동의에 체크하면 입력할 수 있어요";
    if (card) card.setConsent(agreed);
  }

  function ask(text) {
    text = (text || "").trim();
    if (!text || busy) return;
    if (!agreed) {
      if (card) { card.focusConsent(); card.status("개인정보 동의에 체크해 주세요. 동의하지 않으시면 " + PHONE + "로 전화 문의해 주세요."); }
      return;
    }
    busy = true;
    send.disabled = true;
    addMsg("user", text);
    history.push({ role: "user", content: text });
    input.value = "";
    // 답변을 기다리는 동안: 답이 들어올 자리에 회색 줄(스켈레톤)이 반짝이며 채워진다
    var typing = el("div", { class: "scb-msg scb-bot scb-skel", role: "status" });
    typing.appendChild(el("i"));
    typing.appendChild(el("i"));
    typing.appendChild(el("i"));
    var tlabel = el("span", null, "답변을 준비하고 있어요");
    typing.appendChild(tlabel);
    log.appendChild(typing);
    log.scrollTop = log.scrollHeight;
    var slow = setTimeout(function () { tlabel.textContent = "조금만 기다려 주세요. 내용을 정리하고 있어요"; }, 6000);

    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history, sessionId: sessionId, context: preferred ? { product: preferred } : undefined }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var reply = (data && data.reply) || "죄송합니다. 잠시 후 다시 시도해 주세요.";
        clearTimeout(slow);
        typing.remove();
        addMsg("bot", reply);
        if (data && !data.error) history.push({ role: "assistant", content: reply });
        else history.pop();
        if (data && data.form) {
          if (!card) newCard();
          card.fill(data.form);
          card.show();
        }
      })
      .catch(function () {
        clearTimeout(slow);
        typing.remove();
        history.pop();
        addMsg("bot", "연결이 원활하지 않습니다. 위 카드로 견적을 요청하시거나 전화 " + PHONE + "로 문의해 주세요.");
      })
      .then(function () {
        busy = false;
        send.disabled = !agreed;
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

  // 견적 입력 카드. 처음부터 떠 있고, 대화로 받은 값은 이 카드에 채운다. 금액은 서버(/api/quote)가 계산한 값만 보여 준다.
  function newCard() {
    var form = el("form", { class: "scb-card", novalidate: "" });
    form.appendChild(el("h4", null, "견적 요청"));
    form.appendChild(el("p", { class: "scb-sub" }, "필요한 권에만 수량을 적어 주세요. 담당자가 확인한 뒤 택배비를 포함한 견적서를 이메일로 보내드려요."));

    function field(parent, label, type, ph, attrs) {
      var l = el("label", null, label);
      var a = { type: type, placeholder: ph || "", maxlength: "100" };
      for (var k in attrs || {}) a[k] = attrs[k];
      var i = el("input", a);
      l.appendChild(i);
      parent.appendChild(l);
      return i;
    }
    var row = el("div", { class: "scb-row" });
    var org = field(row, "소속 기관", "text", "예: 서울종합복지관", { autocomplete: "organization" });
    var email = field(row, "견적서 받을 이메일", "email", "예: name@korea.kr", { autocomplete: "email" });
    form.appendChild(row);

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
      qty[p.id] = i;
      qtyBox.appendChild(i);
    });
    ql.appendChild(qtyBox);
    form.appendChild(ql);

    var sum = el("div", { class: "scb-sum", "aria-live": "polite" }, "수량을 입력하면 금액이 계산됩니다.");
    form.appendChild(sum);

    var cl = el("label", { class: "scb-consent" });
    var cc = el("input", { type: "checkbox" });
    cc.checked = agreed;
    cl.appendChild(cc);
    cl.appendChild(document.createTextNode(CONSENT_TEXT));
    form.appendChild(cl);
    cc.addEventListener("change", function () { setAgreed(cc.checked); if (cc.checked) status.textContent = ""; });

    var hp = el("input", { type: "text", class: "scb-hp", tabindex: "-1", autocomplete: "off", "aria-hidden": "true" });
    form.appendChild(hp);

    var status = el("div", { class: "scb-status", role: "status" });
    var submit = el("button", { type: "submit", class: "scb-submit" }, "견적 요청하기");
    form.appendChild(status);
    form.appendChild(submit);

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
          sum.appendChild(document.createTextNode("총 " + won(q.totalQty) + "권 · 도서 금액 "));
          sum.appendChild(el("b", null, won(q.itemsTotal) + "원"));
          sum.appendChild(document.createTextNode(" (부가세 면세)"));
          sum.appendChild(el("br"));
          sum.appendChild(document.createTextNode("택배비는 별도이며, 최종 견적서에 포함해 보내드려요."));
        }).catch(function () {});
      }, 250);
    }
    for (var k in qty) qty[k].addEventListener("input", refresh);

    function resetButton() {
      submit.disabled = false;
      submit.textContent = "견적 요청하기";
    }
    form.onsubmit = function (e) {
      e.preventDefault();
      status.textContent = "";
      if (!cc.checked) { status.textContent = "개인정보 동의에 체크해 주세요. 동의하지 않으시면 " + PHONE + "로 전화 문의해 주세요."; cc.focus(); return; }
      submit.disabled = true;
      submit.textContent = "보내는 중…";
      postQuote({
        action: "submit",
        sessionId: sessionId,
        customer: { org: org.value, email: email.value },
        qty: qtyValues(),
        consent: true,
        website: hp.value,
      })
        .then(function (d) {
          if (d && d.ok && d.quoteNo) {
            form.remove();
            card = null;
            addMsg("bot", "견적 요청이 접수되었습니다. (접수번호 " + d.quoteNo + ", 도서 금액 " + won(d.quote.itemsTotal) + "원)\n담당자가 택배비를 포함한 최종 견적서를 " + d.email + "(으)로 보내드리겠습니다. 급하시면 " + PHONE + "로 연락 주세요.");
            var again = el("button", { type: "button", class: "scb-again" }, "다른 견적 요청하기");
            again.onclick = function () { again.remove(); newCard(); card.show(); card.focus(); };
            log.appendChild(again);
            log.scrollTop = log.scrollHeight;
          } else {
            status.textContent = (d && d.message) || "접수하지 못했습니다. 잠시 후 다시 시도해 주세요.";
            resetButton();
          }
        })
        .catch(function () {
          status.textContent = "연결이 원활하지 않습니다. 잠시 후 다시 시도하시거나 " + PHONE + "로 문의해 주세요.";
          resetButton();
        });
    };

    log.appendChild(form);

    card = {
      el: form,
      fill: function (pre) {
        pre = pre || {};
        if (pre.org) org.value = String(pre.org);
        if (pre.email) email.value = String(pre.email);
        var any = false;
        PRODUCTS.forEach(function (p) { if (pre[p.id] != null && pre[p.id] !== "") any = true; });
        if (any) PRODUCTS.forEach(function (p) { qty[p.id].value = pre[p.id] ? String(pre[p.id]) : ""; });
        refresh();
      },
      show: function () {
        scrollLogTo(form);
        form.classList.add("flash");
        setTimeout(function () { form.classList.remove("flash"); }, 1200);
      },
      focus: function (product) {
        var t = !org.value ? org : product && qty[product] ? qty[product] : !email.value ? email : qty.v1;
        t.focus({ preventScroll: true });
      },
      focusConsent: function () { cc.focus(); },
      setConsent: function (v) { cc.checked = v; },
      status: function (t) { status.textContent = t; },
    };
    return card;
  }

  function mount() {
    if (document.getElementById("scb-root")) return;
    var host = MOUNT ? document.querySelector(MOUNT) : null;
    var inline = !!host;
    root = el("div", { id: "scb-root" });
    if (inline) root.className = "inline open";
    root.appendChild(el("style", null, css));

    var btn = null;
    if (!inline) {
      btn = el("button", { id: "scb-btn", type: "button", "aria-label": NAME + " 열기" });
      btn.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>';
      btn.appendChild(document.createTextNode("견적 받기"));
    }

    var panel = el("div", inline ? { id: "scb-panel", role: "region", "aria-label": NAME } : { id: "scb-panel", role: "dialog", "aria-label": NAME });
    var head = el("div", { id: "scb-head" });
    var title = el("div");
    title.appendChild(el("strong", null, NAME));
    title.appendChild(el("span", null, TAGLINE));
    head.appendChild(title);
    var close = null;
    if (!inline) {
      close = el("button", { id: "scb-close", type: "button", "aria-label": "닫기" }, "×");
      head.appendChild(close);
    }

    log = el("div", { id: "scb-log", "aria-live": "polite" });
    sugg = el("div", { id: "scb-sugg" });
    sugg.appendChild(el("b", null, "궁금한 점이 있으면 물어보세요"));
    SUGGESTIONS.forEach(function (q) {
      var b = el("button", { type: "button" }, q);
      b.onclick = function () { ask(q); };
      sugg.appendChild(b);
    });

    var form = el("form", { id: "scb-form" });
    input = el("textarea", { id: "scb-input", rows: "1", maxlength: "1000", "aria-label": "질문 입력" });
    send = el("button", { id: "scb-send", type: "submit" }, "보내기");
    form.appendChild(input);
    form.appendChild(send);

    var foot = el("div", { id: "scb-foot" });
    foot.appendChild(document.createTextNode("AI가 답변하며 틀릴 수 있습니다. 자세한 내용은 "));
    foot.appendChild(el("a", { href: "tel:" + PHONE.replace(/-/g, "") }, PHONE));
    foot.appendChild(document.createTextNode("로 문의해 주세요."));

    panel.appendChild(head);
    panel.appendChild(log);
    panel.appendChild(sugg);
    panel.appendChild(form);
    panel.appendChild(foot);
    if (btn) root.appendChild(btn);
    root.appendChild(panel);
    (host || document.body).appendChild(root);

    addMsg("bot", GREETING);
    newCard();
    setAgreed(false);
    ready = true;

    openPanel = function (opts) {
      var product = opts && opts.product;
      if (product && PRODUCTS.some(function (p) { return p.id === product; })) preferred = product;
      if (!card) newCard();
      if (inline) {
        scrollLogTo(card.el);
        root.scrollIntoView({ block: "start", behavior: "smooth" });
        setTimeout(function () { card.focus(preferred); }, 350);
        return;
      }
      if (!root.classList.contains("open")) lastFocus = document.activeElement;
      root.classList.add("open");
      card.focus(preferred);
    };
    if (btn) btn.onclick = function () { openPanel(); };
    if (close) {
      close.onclick = function () {
        root.classList.remove("open");
        var visible = function (n) { return n && n !== document.body && document.contains(n) && n.getClientRects().length > 0; };
        var back = visible(lastFocus) ? lastFocus : visible(btn) ? btn : null;
        if (back) back.focus();
        else if (document.activeElement && root.contains(document.activeElement)) document.activeElement.blur(); // 돌아갈 곳이 없으면 body로
      };
      closePanel = close.onclick;
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && root.classList.contains("open")) close.onclick();
      });
    }
    form.onsubmit = function (e) { e.preventDefault(); ask(input.value); };
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); ask(input.value); }
    });
  }

  // 페이지에서 여는 함수: SangsangChat.open({ product: "v1" | "v2" | "v3" }), SangsangChat.close()
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
  if (MOUNT) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
    else start();
  } else if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start);

  if (!KAKAO_ON) return;
  // 카카오톡 프로필 QR 링크는 휴대폰에서만 카카오톡 앱으로 바로 열린다.
  // PC에서 누르면 카카오 홈페이지로 가 버리므로, 대신 QR 창을 띄워 휴대폰으로 스캔하게 한다.
  var isPhone = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
  var kakaoBox = null;
  function closeKakao() {
    if (!kakaoBox) return;
    kakaoBox.remove();
    kakaoBox = null;
  }
  function openKakao() {
    if (kakaoBox) return;
    kakaoBox = el("div", { id: "scb-kakao", role: "dialog", "aria-modal": "true", "aria-label": "카카오톡 문의" });
    kakaoBox.style.cssText = "position:fixed;inset:0;z-index:2147483600;background:rgba(20,24,31,.55);display:flex;align-items:center;justify-content:center;padding:20px;font-family:inherit";
    var box = el("div");
    box.style.cssText = "background:#fff;border-radius:16px;padding:28px 28px 22px;max-width:340px;width:100%;text-align:center;color:#14181F;font-family:'Pretendard',-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.25)";
    var h = el("p", null, "카카오톡으로 문의하기");
    h.style.cssText = "margin:0 0 6px;font-size:20px;font-weight:700";
    var sub = el("p", null, "휴대폰 카메라나 카카오톡으로 QR을 스캔하면 바로 친구 추가할 수 있어요.");
    sub.style.cssText = "margin:0 0 16px;font-size:15px;line-height:1.5;color:#4B5563;word-break:keep-all";
    var img = el("img", { src: "/images/kakao-qr.png", alt: "카카오톡 mango4024 친구 추가 QR 코드", width: "220", height: "220" });
    img.style.cssText = "display:block;margin:0 auto 12px;width:220px;height:220px";
    var id = el("p", null, "카카오톡 ID: mango4024");
    id.style.cssText = "margin:0 0 18px;font-size:16px;font-weight:700";
    var x = el("button", { type: "button" }, "닫기");
    x.style.cssText = "border:0;background:#FEE500;color:#191919;font-weight:700;font-size:16px;border-radius:10px;padding:12px 0;width:100%;cursor:pointer;font-family:inherit";
    x.onclick = closeKakao;
    box.appendChild(h); box.appendChild(sub); box.appendChild(img); box.appendChild(id); box.appendChild(x);
    kakaoBox.appendChild(box);
    kakaoBox.addEventListener("click", function (e) { if (e.target === kakaoBox) closeKakao(); });
    document.body.appendChild(kakaoBox);
    x.focus();
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href*="qr.kakao.com/talk"]');
    if (!a || isPhone) return;
    e.preventDefault();
    openKakao();
  }, true);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeKakao(); });
})();
