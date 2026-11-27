/* Company Log · AI 분석 — 기업분석 리포트를 외부 공유용 요약 카드 이미지로 (사용자 요청 2026-11-26)
   - Industry Log 카드 공유(industry-tracker/it/share.js)와 같은 방식: 보는 기기의 브라우저 안에서 html2canvas 로 그림을 만든다.
     서버·저장소에 아무것도 쓰지 않는다.
   - A안(사용자 선택) = 요약 카드: 표지(회사 로고·종목·제목·작성일) + 한눈에 보기(숫자 상자·결론) + 장마다 핵심 한 덩어리(첫 결론 + 대표 차트 1개).
   - 빼는 것(사용자 요청): '근거 보기' 접힌 부분 전부, 본문 괄호 출처((Epic AI 요약, 2026-11-11·한화투자증권) 같은 것), '출처:' 줄, 그림 설명, 부록.
   - 크기 1440×1800(4:5, Industry Log 1080×1350 보다 크게 — 사용자 요청). 맨 아래에 리포트 주소.
   - 기업분석(*_기업분석.html)에서만 켠다. 리포트 위쪽 줄에 '공유 카드' 버튼, AI 분석 보기 칸에선 메인 페이지 버튼이 window.AIShare() 를 부른다. */
(function () {
  'use strict';
  if (window.AIShare) return;
  // 메인 AI 분석 칸에 직접 넣은 리포트(srcdoc, 11-27 비공개 전환)는 주소가 없으므로 칸에 적어 둔 파일명을 쓴다
  var FILE = '';
  try { FILE = (window.frameElement && window.frameElement.dataset.file) || ''; } catch (e) {}
  if (!FILE) FILE = decodeURIComponent(location.pathname.split('/').pop() || '');
  if (!/_기업분석\.html$/.test(FILE)) return;

  var H2C = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  var W = 1440, HT = 1800, PAD = 104, TOP = 96, FOOT = 150, CAP = HT - TOP - FOOT - 40;
  // Company Log 로고(assets/logo.svg 와 같은 그림) — 파일로 넣으면 크기 정보가 없어 카드에서 사라져서, 크기·색을 박은 그림 코드로
  var LOGO_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M4 21V5.5L11 3v18M11 21V9l7 2.2V21" stroke="#0b0b0c" stroke-width="1.7"/><path d="M2.5 21h19" stroke="#0b0b0c" stroke-width="1.7"/>' +
    '<path d="M7 8v.1M7 11.5v.1M7 15v.1M14.5 14v.1M14.5 17.5v.1" stroke="#0b0b0c" stroke-width="2"/>' +
    '<path d="M3 15.5l5-4 4 2.5 8.5-8" stroke="#e34948" stroke-width="2.2"/><path d="M16.5 6h4v4" stroke="#e34948" stroke-width="2.2"/></svg>';

  var CSS = [
    '#ais-stage{position:absolute;left:-40000px;top:0;width:1460px}',
    ':where(#ais-stage) *{box-sizing:border-box;margin:0}',
    '#ais-stage{word-break:keep-all;overflow-wrap:break-word}',
    '.ais-page{width:1440px;height:1800px;background:#fffffc;padding:96px 104px 0;position:relative;overflow:hidden;display:flex;flex-direction:column;',
    ' font-family:"Pretendard Variable",Pretendard,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;color:#0b0b0c;letter-spacing:-.012em;margin-bottom:24px}',
    '.ais-page .bar{position:absolute;left:0;top:0;bottom:0;width:18px;background:#5b6bd8}',
    '.ais-body{flex:1;overflow:hidden;display:flex;flex-direction:column}',
    '.ais-foot{height:150px;display:flex;align-items:center;gap:24px;border-top:3px solid #e4e4da;font-size:32px;color:#667085;font-weight:500}',
    '.ais-foot .brand{display:flex;align-items:center;gap:16px;color:#0b0b0c;font-size:40px;font-weight:700;letter-spacing:-.03em}',
    '.ais-foot .brand svg{width:48px;height:48px;display:block;flex:none}',
    '.ais-foot .pn{margin-left:auto;flex:0 0 auto}',
    '.ais-cover{display:flex;flex-direction:column;flex:1}',
    '.ais-logo{width:200px;height:200px;border-radius:50%;background:#fff;border:3px solid #e4e4da;display:flex;align-items:center;justify-content:center;margin:40px 0 56px;overflow:hidden}',
    '.ais-logo img{width:150px;height:150px;object-fit:contain}',
    '.ais-logo .ini{font-size:96px;font-weight:800;color:#5b6bd8}',
    '.ais-kick{font-size:34px;color:#667085;font-weight:600;margin-bottom:26px}',
    '.ais-name{font-size:104px;font-weight:800;letter-spacing:-.045em;line-height:1.1}',
    '.ais-name small{font-size:48px;color:#667085;font-weight:500;margin-left:20px;letter-spacing:0}',
    '.ais-title{font-size:60px;font-weight:700;letter-spacing:-.035em;line-height:1.35;margin-top:44px}',
    '.ais-date{font-size:32px;color:#667085;margin-top:auto;padding-bottom:56px}',
    '.ais-date b{display:inline-block;background:#eef0fb;color:#3b4aa8;border-radius:99px;padding:6px 24px;margin-right:16px;font-size:30px}',
    '.ais-blk{margin-bottom:56px}',
    '.ais-blk h3{font-size:54px;font-weight:800;letter-spacing:-.035em;line-height:1.3;margin-bottom:28px;display:flex;gap:24px;align-items:flex-start}',
    '.ais-blk h3 .n{flex:0 0 76px;height:76px;border-radius:50%;background:#0b0b0c;color:#fff;font-size:38px;display:flex;align-items:center;justify-content:center;margin-top:-2px}',
    '.ais-blk p,.ais-blk li{font-size:43px;line-height:1.62;color:#22252a}',
    '.ais-blk ul{padding-left:52px}.ais-blk li{margin:10px 0}',
    '.ais-lead{font-size:46px;line-height:1.6;font-weight:600;background:#f4f5fc;border-left:12px solid #5b6bd8;border-radius:18px;padding:34px 40px}',
    '.ais-lead b,.ais-lead strong{color:#0b0b0c}',
    '.ais-kpis{display:flex;flex-wrap:wrap;gap:24px}',
    '.ais-kpi{width:604px;background:#f7f7f1;border:3px solid #e4e4da;border-radius:26px;padding:32px 36px}',
    '.ais-kpi .v{font-size:60px;font-weight:800;letter-spacing:-.035em}',
    '.ais-kpi .l{font-size:30px;color:#667085;margin-top:10px;line-height:1.45}',
    '.ais-fig{background:#fff;border:3px solid #e4e4da;border-radius:26px;padding:28px;margin-top:8px}',
    '.ais-fig svg{display:block;width:100%;height:auto}',
    '.ais-fig .t{font-size:32px;font-weight:700;margin-bottom:14px}',
  ].join('');

  // ── 출처·근거 빼기 ──
  var CITE = /\s*[(（](?=[^()（）]*(?:Epic\s*AI|epic\.ai|epic|company-log|Company Log|KIS|스탁이지|DART|공시|보도|리서치|증권|IR협의회|분기보고서|사업보고서|출처|기준일|요약|애널|컨센서스\s*\d|\d{4}[-.]\d{1,2}[-.]\d{1,2}))[^()（）]{0,90}[)）]/g;
  function cleanText(s) {
    s = s.replace(CITE, '');
    s = s.replace(/\s*[·,]?\s*출처\s*[:：][\s\S]*$/, '');
    return s.replace(/\s{2,}/g, ' ').replace(/\s+([,.)])/g, '$1');
  }
  function cleanNode(el) {
    el.querySelectorAll('details,script,style,.src,.foot,figcaption,sup,.kicker,.toc,button').forEach(function (n) { n.remove(); });
    el.querySelectorAll('a').forEach(function (a) { a.replaceWith(document.createTextNode(a.textContent)); });
    var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), t, list = [];
    while ((t = w.nextNode())) list.push(t);
    list.forEach(function (n) { n.nodeValue = cleanText(n.nodeValue); });
    return el;
  }
  function txt(el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); }
  function inDetails(el) { return !!(el && el.closest && el.closest('details')); }

  // 리포트 SVG 차트는 CSS 변수(var(--accent) 등)로 칠해져 있어 그림으로 옮기면 색이 사라진다 → 실제 색을 박아 넣은 사본
  function svgCopy(svg) {
    var c = svg.cloneNode(true), a = [svg].concat([].slice.call(svg.querySelectorAll('*'))), b = [c].concat([].slice.call(c.querySelectorAll('*')));
    a.forEach(function (o, i) {
      var cs = getComputedStyle(o), n = b[i];
      if (!n || !n.setAttribute) return;
      ['fill', 'stroke'].forEach(function (k) { var v = cs[k]; if (v && v !== 'none') n.setAttribute(k, v); else if (v === 'none') n.setAttribute(k, 'none'); });
      if (o.tagName === 'text' || o.tagName === 'tspan') { n.setAttribute('font-family', 'Pretendard Variable, Pretendard, Malgun Gothic, sans-serif'); n.setAttribute('font-weight', cs.fontWeight); n.setAttribute('font-size', cs.fontSize); }
      n.removeAttribute('class'); n.style && n.removeAttribute('style');
      if (cs.opacity && cs.opacity !== '1') n.setAttribute('opacity', cs.opacity);
    });
    var vb = svg.viewBox && svg.viewBox.baseVal, r = svg.getBoundingClientRect();
    var w0 = (vb && vb.width) || r.width || 600, h0 = (vb && vb.height) || r.height || 300;
    c.setAttribute('width', 1172); c.setAttribute('height', Math.round(1172 * h0 / w0));
    c.querySelectorAll('title').forEach(function (n) { n.remove(); });
    // 차트 안 출처 글자(「공시 분기보고서 …」, 'epic.ai', 'KIS' 등)도 뺀다 (사용자 요청: 출처 전부 빼기)
    c.querySelectorAll('text').forEach(function (n) { if (/출처|공시|보고서|epic|KIS|스탁이지|DART|보도|리서치|「/i.test(n.textContent || '')) n.remove(); });
    return c;
  }

  function sections() {
    var wrap = document.querySelector('.wrap'), out = [], cur = null;
    [].slice.call(wrap.children).forEach(function (el) {
      if (el.tagName === 'H2') { cur = {h: txt(el), els: []}; out.push(cur); return; }
      if (cur) cur.els.push(el);
    });
    return out;
  }

  function collect(meta) {
    var d = {pages: []}, secs = sections();
    // 표지
    var kick = txt(document.querySelector('.kicker')).split(' · ').slice(1).filter(function (x) { return !/\(\d{6}\)|AI 분석|쉬운 버전/.test(x); }).join(' · ');
    var h1 = txt(document.querySelector('h1')), t2 = (h1.split(/\s+—\s+|\s+— /)[1] || meta.sub || '').trim();
    d.cover = {name: meta.name || h1.split('(')[0], code: meta.code || meta.ticker || '', logo: meta.logo, kick: cleanText(kick), title: t2, date: (meta.date || '').slice(0, 10), easy: !!meta.easy};
    d.blocks = [];
    secs.forEach(function (s) {
      if (/^부록/.test(s.h)) return;
      var num = (s.h.match(/^(\d+)\s*[.)]/) || [])[1], head = s.h.replace(/^\d+\s*[.)]\s*/, '');
      var html = '';
      if (num === '0') {                                     // 한눈에 보기 = 숫자 상자 + 결론
        var kpi = s.els.filter(function (e) { return e.classList && e.classList.contains('kpi'); });
        var boxes = [];
        kpi.forEach(function (k) { k.querySelectorAll('.box').forEach(function (b) { boxes.push(b); }); });
        boxes = boxes.slice(0, 8);
        var big = s.els.filter(function (e) { return !inDetails(e) && e.matches && e.matches('.big,.callout,.lead'); })[0];
        // 요약 글은 한 장에 맞게 글자 크기를 줄여 넣고(fit), 숫자 상자는 다음 장 '숫자로 보기'로 따로
        d.blocks.push({html: '<div class="ais-blk"><h3><span class="n">0</span>' + esc(head) + '</h3>' +
          (big ? '<div class="ais-lead fit">' + cleanNode(big.cloneNode(true)).innerHTML + '</div>' : '') + '</div>', alone: true});
        if (boxes.length) d.blocks.push({html: '<div class="ais-blk"><h3>숫자로 보기</h3><div class="ais-kpis">' + boxes.map(function (b) {
          return '<div class="ais-kpi"><div class="v">' + esc(cleanText(txt(b.querySelector('.num')))) + '</div><div class="l">' + esc(cleanText(txt(b.querySelector('.lab')))) + '</div></div>';
        }).join('') + '</div></div>', alone: true});
        return;
      }
      var lead = s.els.filter(function (e) { return !inDetails(e) && e.matches && e.matches('.callout,.big,.lead,blockquote,p,ul.say') && txt(e).length > 25; })[0];
      var fig = null;
      s.els.some(function (e) {
        if (inDetails(e) || (e.tagName === 'DETAILS')) return false;
        var sv = e.tagName === 'svg' ? e : e.querySelector && e.querySelector('svg');
        if (sv && !inDetails(sv) && sv.getBoundingClientRect().width > 300) { fig = {svg: sv, t: txt(e.querySelector && e.querySelector('.t,.svgtitle,h4'))}; return true; }
        return false;
      });
      if (!lead && !fig) return;
      d.blocks.push({head: head, num: num || '', lead: lead ? cleanNode(lead.cloneNode(true)) : null, fig: fig});
    });
    return d;
  }

  function page(stage, i) {
    var p = document.createElement('div'); p.className = 'ais-page';
    // 맨 아래 = Company Log 로고 + 이름만 (11-26 사용자: 주소·'AI 분석' 글자는 빼기), 오른쪽 쪽 번호
    p.innerHTML = '<div class="bar"></div><div class="ais-body"></div><div class="ais-foot"><div class="brand">' + LOGO_SVG + 'Company Log</div><span class="pn"></span></div>';
    stage.appendChild(p); return p;
  }

  function build(d, stage) {
    var pages = [];
    // 1장: 표지
    var c = d.cover, p0 = page(stage);
    var logo = c.logo ? '<img src="' + esc(c.logo) + '" crossorigin="anonymous" alt="">' : '<span class="ini">' + esc((c.name || '?').slice(0, 1)) + '</span>';
    p0.querySelector('.ais-body').innerHTML = '<div class="ais-cover"><div class="ais-logo">' + logo + '</div>' +
      (c.kick ? '<div class="ais-kick">' + esc(c.kick) + '</div>' : '') +
      '<div class="ais-name">' + esc(c.name) + (c.code ? '<small>' + esc(c.code) + '</small>' : '') + '</div>' +
      '<div class="ais-title">' + esc(c.title) + '</div>' +
      '<div class="ais-date"><b>AI 분석' + (c.easy ? ' · 쉬운 버전' : '') + '</b>' + esc(c.date) + ' 작성</div></div>';
    pages.push(p0);
    // 나머지: 덩어리를 차례로 채워 넣고 넘치면 다음 장
    var cur = null;
    function fresh() { cur = page(stage); pages.push(cur); return cur.querySelector('.ais-body'); }
    var body = fresh();
    d.blocks.forEach(function (b) {
      var el = document.createElement('div');
      if (b.html) el.innerHTML = b.html;
      else {
        el.className = 'ais-blk';
        el.innerHTML = '<h3>' + (b.num ? '<span class="n">' + esc(b.num) + '</span>' : '') + esc(b.head) + '</h3>';
        if (b.lead) { var l = document.createElement('div'); l.className = b.lead.matches('.callout,.big,.lead,blockquote') ? 'ais-lead' : ''; l.innerHTML = b.lead.tagName === 'UL' ? b.lead.outerHTML : '<p>' + b.lead.innerHTML + '</p>'; if (l.className) l.innerHTML = b.lead.innerHTML; el.appendChild(l); }
        if (b.fig) { var f = document.createElement('div'); f.className = 'ais-fig'; if (b.fig.t) f.innerHTML = '<div class="t">' + esc(cleanText(b.fig.t)) + '</div>'; f.appendChild(svgCopy(b.fig.svg)); el.appendChild(f); }
      }
      if (b.alone && body.children.length) body = fresh();                              // 요약·숫자는 장을 혼자 씀
      body.appendChild(el);
      if (body.scrollHeight > body.clientHeight + 1 && body.children.length > 1) {   // 넘침 → 이 덩어리는 새 장으로
        body.removeChild(el); body = fresh(); body.appendChild(el);
      }
      var fit = el.querySelector('.ais-lead.fit');                                     // 요약 글: 한 장에 들어갈 때까지 글자를 줄임
      if (fit) { var fs = 46; while (body.scrollHeight > body.clientHeight + 1 && fs > 28) { fs -= 2; fit.style.fontSize = fs + 'px'; } }
      if (b.alone) body = fresh();
      if (body.scrollHeight > body.clientHeight + 1) {                                 // 한 장에도 안 들어가면 차트를 줄인다
        var sv = el.querySelector('.ais-fig svg');
        if (sv) { var over = body.scrollHeight - body.clientHeight + 8, h = sv.getBoundingClientRect().height; sv.style.height = Math.max(260, h - over) + 'px'; sv.style.width = 'auto'; sv.style.maxWidth = '100%'; sv.style.margin = '0 auto'; }
      }
    });
    if (!pages[pages.length - 1].querySelector('.ais-body').children.length) { pages.pop().remove(); }
    pages.forEach(function (p, i) { p.querySelector('.pn').textContent = (i + 1) + ' / ' + pages.length; });
    return pages;
  }

  function loadScript(u) {
    return new Promise(function (ok, no) {
      if (window.html2canvas) return ok();
      var s = document.createElement('script'); s.src = u; s.onload = ok;
      s.onerror = function () { no(new Error('이미지 도구를 불러오지 못했어요(인터넷 연결 확인)')); };
      document.head.appendChild(s);
    });
  }
  function imgsReady(root) {
    return Promise.all([].slice.call(root.querySelectorAll('img')).map(function (im) {
      return new Promise(function (ok) { if (im.complete && im.naturalWidth) return ok(); im.onload = im.onerror = ok; setTimeout(ok, 8000); });
    }));
  }

  var UICSS = '#ais-ui{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px}' +
    '#ais-ui .box{background:var(--card,#fff);color:var(--ink,#111);border-radius:14px;max-width:760px;width:100%;max-height:92vh;overflow:auto;padding:20px 22px;box-shadow:0 12px 40px rgba(0,0,0,.3)}' +
    '#ais-ui h3{margin:0 0 4px;font-size:18px;border:0;padding:0}#ais-ui .sub{margin:0 0 12px;color:var(--muted,#777);font-size:13.5px}' +
    '#ais-ui .thumbs{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px}' +
    '#ais-ui .thumbs img{width:100%;border:1px solid var(--line,#ddd);border-radius:8px;cursor:pointer;background:#fff}' +
    '#ais-ui .btns{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}' +
    '#ais-ui .btns button{font:inherit;font-size:14px;font-weight:600;padding:9px 16px;border-radius:9px;border:1px solid var(--line,#ccc);background:transparent;color:inherit;cursor:pointer}' +
    '#ais-ui .btns button.main{background:#5b6bd8;border-color:#5b6bd8;color:#fff}' +
    '#ais-ui .msg{margin-top:10px;font-size:13px;color:var(--muted,#777)}';
  var urls = [];
  function close() { var u = document.getElementById('ais-ui'); if (u) u.remove(); urls.forEach(function (x) { URL.revokeObjectURL(x); }); urls = []; var s = document.getElementById('ais-stage'); if (s) s.remove(); }
  function btn(box, label, cls, fn) { var b = document.createElement('button'); b.type = 'button'; b.textContent = label; if (cls) b.className = cls; b.onclick = fn; box.appendChild(b); return b; }

  var busy = false;
  window.AIShare = function () {
    if (busy) return; busy = true;
    ['ais-css', 'ais-uicss'].forEach(function (id, k) { if (!document.getElementById(id)) { var st = document.createElement('style'); st.id = id; st.textContent = k ? UICSS : CSS; document.head.appendChild(st); } });
    var u = document.getElementById('ais-ui'); if (u) u.remove();
    u = document.createElement('div'); u.id = 'ais-ui';
    u.innerHTML = "<div class='box' role='dialog' aria-label='공유 카드'><h3>공유 카드</h3><p class='sub'>만드는 중…</p><div class='thumbs'></div><div class='btns'></div><div class='msg'></div></div>";
    u.addEventListener('click', function (e) { if (e.target === u) close(); });
    document.body.appendChild(u);
    try {   // AI 분석 칸 안(칸이 리포트 길이만큼 늘어남)이면 화면에 보이는 곳에 맞춰 띄운다 (11-26)
      if (window.self !== window.top && window.frameElement) {
        var tw = window.top, r0 = window.frameElement.getBoundingClientRect();
        u.style.position = 'absolute'; u.style.top = Math.max(0, -r0.top) + 'px'; u.style.bottom = 'auto'; u.style.height = tw.innerHeight + 'px';
        u.querySelector('.box').style.maxHeight = Math.round(tw.innerHeight * 0.92) + 'px';
      }
    } catch (er) {}
    var sub = u.querySelector('.sub'), msg = u.querySelector('.msg'), files = [], d;
    var stage = document.createElement('div'); stage.id = 'ais-stage'; document.body.appendChild(stage);
    fetch('../data/ai_reports.json?m=' + Math.floor(Date.now() / 60000)).then(function (r) { return r.ok ? r.json() : {items: []}; }).catch(function () { return {items: []}; })
      .then(function (j) {
        var meta = (j.items || []).find(function (x) { return decodeURIComponent(x.url.split('/').pop()) === FILE; }) || {};
        d = collect(meta);
        return loadScript(H2C);
      }).then(function () {
        var pages = build(d, stage);
        return imgsReady(stage).then(function () { return pages; });
      }).then(function (pages) {
        var name = (d.cover.name || 'report').replace(/[\\/:*?"<>|\s]+/g, '_');
        return pages.reduce(function (pr, p, i) {
          return pr.then(function () {
            sub.textContent = '카드 만드는 중… ' + (i + 1) + ' / ' + pages.length;
            return window.html2canvas(p, {scale: 1, width: W, height: HT, backgroundColor: '#fffffc', logging: false, useCORS: true});
          }).then(function (cv) {
            return new Promise(function (ok, no) { cv.toBlob(function (b) { b ? ok(b) : no(new Error('이미지를 만들지 못했어요')); }, 'image/png'); });
          }).then(function (blob) {
            var f = new File([blob], 'CompanyLog_' + name + '_' + (i + 1) + '.png', {type: 'image/png'});
            files.push(f);
            var url = URL.createObjectURL(blob); urls.push(url);
            var t = document.createElement('img'); t.src = url; t.alt = (i + 1) + '장'; t.title = '눌러서 이 장 복사';
            t.onclick = function () {
              if (!(navigator.clipboard && window.ClipboardItem)) { msg.textContent = "이 브라우저는 이미지 복사를 지원하지 않아요. '모두 저장'을 써 주세요."; return; }
              navigator.clipboard.write([new ClipboardItem({'image/png': blob})]).then(function () { msg.textContent = (i + 1) + '장을 복사했어요. 대화창에 붙여 넣으면 돼요.'; },
                function () { msg.textContent = "복사하지 못했어요. '모두 저장'을 써 주세요."; });
            };
            u.querySelector('.thumbs').appendChild(t);
          });
        }, Promise.resolve());
      }).then(function () {
        stage.remove();
        sub.textContent = files.length + '장 · ' + d.cover.name + ' AI 분석';
        var btns = u.querySelector('.btns'), can = navigator.canShare && navigator.canShare({files: files});
        if (can) btn(btns, '텔레그램 등으로 보내기', 'main', function () {
          navigator.share({files: files, title: d.cover.name + ' AI 분석', text: d.cover.name + ' · ' + d.cover.title + ' · Company Log'}).catch(function (e) { if (e && e.name !== 'AbortError') msg.textContent = '보내지 못했어요: ' + e.message; });
        });
        btn(btns, '모두 저장', can ? '' : 'main', function () {
          files.forEach(function (f, i) { setTimeout(function () { var a = document.createElement('a'); a.href = urls[i]; a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); }, i * 350); });
          msg.textContent = '저장했어요. 여러 장을 한 번에 텔레그램에 끌어다 놓으면 앨범으로 가요.';
        });
        btn(btns, '닫기', '', close);
        if (!msg.textContent) msg.textContent = '미리보기를 누르면 그 장이 복사돼요.';
      }).catch(function (e) {
        sub.textContent = '만들지 못했어요'; msg.textContent = (e && e.message) || String(e);
        btn(u.querySelector('.btns'), '닫기', '', close);
        var s = document.getElementById('ais-stage'); if (s) s.remove();
      }).then(function () { busy = false; });
  };

  // 리포트를 따로 열었을 때: 위쪽 줄에 '공유 카드' 버튼 (AI 분석 칸 안에선 위쪽 줄이 숨으므로 메인 페이지 버튼이 부른다)
  function addBtn() {
    var bar = document.querySelector('.topbar-in'); if (!bar || document.getElementById('aisBtn')) return;
    var b = document.createElement('button'); b.type = 'button'; b.id = 'aisBtn'; b.className = 'ais-btn'; b.textContent = '공유 카드';
    b.title = '외부 공유용 요약 카드 이미지 만들기 (근거·출처 뺌)';
    b.onclick = function () { window.AIShare(); };
    var tg = bar.querySelector('.theme-toggle'); bar.insertBefore(b, tg || null);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addBtn); else addBtn();
})();
