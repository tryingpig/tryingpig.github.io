/* Industry Log 카드 공유: 카드 하나를 1080x1350 이미지 여러 장으로 만들어 공유 창(텔레그램 등)으로 보낸다.
   - 카드 화면(DOM)에서 글·그림을 그대로 읽는다. 내용·토큰은 이 파일에 없다.
   - 이미지는 보는 기기의 브라우저 안에서 만든다(html2canvas). 서버·저장소에 아무것도 쓰지 않는다.
   - 원본: industry-tracker/it/share.js. 산업 쪽 HTML에 그대로 들어가고, 뷰어 껍데기 폴더에도 같은 사본을 둔다. */
(function () {
  if (window.ILShare) return;
  var H2C = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
  var W = 1080, HT = 1350, PAD_T = 72, FOOT = 110, CAP = HT - PAD_T - FOOT, IMG_W = 920 - 48;

  var CSS = [
    "#ils-stage{position:absolute;left:-30000px;top:0;width:1100px}",
    ":where(#ils-stage) *{box-sizing:border-box;margin:0}",
    ".ils-page{width:1080px;height:1350px;background:#fffffc;padding:72px 80px 0;position:relative;overflow:hidden;display:flex;flex-direction:column;",
    " font-family:'Pretendard Variable',Pretendard,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#0b0b0c;letter-spacing:-.012em;margin-bottom:20px}",
    ".ils-page .bar{position:absolute;left:0;top:0;bottom:0;width:14px;background:#f2c230}",
    ".ils-body{flex:1;overflow:hidden;display:flex;flex-direction:column}",
    ".ils-foot{height:110px;display:flex;align-items:center;gap:20px;border-top:2px solid #e4e4da;font-size:26px;color:#667085;font-weight:500}",
    ".ils-foot b{color:#0b0b0c;font-weight:700;letter-spacing:-.03em}",
    ".ils-foot .ils-brand{min-width:0}.ils-foot .ils-tg{margin-left:12px;font-size:21px;color:#a6adb8;font-weight:400;letter-spacing:-.01em}",
    ".ils-foot .src{font-size:20px;color:#8a93a3;margin-top:6px}.ils-foot .pn{margin-left:auto;flex:0 0 auto}",
    ".ils-cover{padding-bottom:40px;margin-bottom:44px;border-bottom:2px solid #e4e4da}",
    ".ils-cemo{width:120px;height:120px;border-radius:28px;background:#f7f7f1;border:2px solid #e4e4da;display:flex;align-items:center;justify-content:center;font-size:68px;margin-bottom:32px}",
    ".ils-cover h1{font-size:68px;font-weight:700;letter-spacing:-.04em;line-height:1.2}",
    ".ils-badge{display:inline-block;font-size:26px;font-weight:700;background:#fde68a;border-radius:99px;padding:4px 18px;margin-right:12px}",
    ".ils-meta{font-size:28px;color:#667085;margin:18px 0 34px}",
    ".ils-one{font-size:40px;line-height:1.6;font-weight:500}",
    "#ils-stage mark{background:#fde68a;color:inherit;font-weight:700}",
    ".ils-blk{margin-bottom:38px}",
    ".ils-blk h3{font-size:39px;font-weight:700;letter-spacing:-.03em;line-height:1.35;display:flex;gap:20px;margin-bottom:20px}",
    ".ils-blk h3 .n{flex:0 0 56px;height:56px;border-radius:50%;background:#0b0b0c;color:#fff;font-size:30px;display:flex;align-items:center;justify-content:center;margin-top:2px}",
    ".ils-blk p{font-size:34px;line-height:1.65;color:#22252a}",
    ".ils-tag{display:inline-block;font-size:24px;font-weight:700;background:#0b0b0c;color:#fff;border-radius:8px;padding:2px 12px;margin-right:14px;vertical-align:4px}",
    ".ils-fig{background:#f7f7f1;border:2px solid #e4e4da;border-radius:22px;padding:22px}",
    ".ils-fig .im{display:block;margin:0 auto;background:#fff;border-radius:10px}",
    ".ils-fig .cap{font-size:24px;color:#667085;margin-top:14px}",
    ".ils-blk h4{font-size:30px;color:#667085;font-weight:600;margin-bottom:24px}",
    ".ils-kns{display:flex;flex-wrap:wrap;gap:20px}",
    ".ils-kn{width:450px;background:#f7f7f1;border:2px solid #e4e4da;border-radius:22px;padding:28px}",
    ".ils-kn .v{font-size:44px;font-weight:700;letter-spacing:-.03em}",
    ".ils-kn .l{font-size:26px;font-weight:600;margin:10px 0 8px}",
    ".ils-kn .w{font-size:24px;color:#667085;line-height:1.5}",
    ".ils-watch li{list-style:none;font-size:30px;line-height:1.6;padding:18px 0 18px 50px;position:relative;border-bottom:2px solid #eeeee6}",
    ".ils-watch{padding:0}.ils-watch .e{position:absolute;left:0;top:20px;font-size:28px}",
    ".ils-chg{background:#f7f7f1;border:2px solid #e4e4da;border-radius:22px;padding:26px 30px}",
    ".ils-chg strong{font-size:32px;font-weight:700}",
    ".ils-ba{display:flex;align-items:center;gap:18px;margin:16px 0}",
    ".ils-ba div{flex:1;font-size:28px;font-weight:600}.ils-ba .who{display:block;font-size:22px;color:#667085;font-weight:500}",
    ".ils-ba .arrow{flex:0 0 auto;font-size:30px;color:#667085}",
    ".ils-chg p{font-size:28px}",
    ".ils-terms{margin-top:auto;margin-bottom:24px;background:#f7f7f1;border:2px solid #e4e4da;border-radius:22px;padding:24px 30px}",
    ".ils-terms .th{font-size:24px;font-weight:600;color:#667085;margin-bottom:10px}",
    ".ils-terms .t{font-size:27px;line-height:1.55;color:#22252a;padding:6px 0}.ils-terms .t b{font-weight:700;margin-right:14px}",
    /* 미리보기 창 */
    "#ils-ui{position:fixed;inset:0;z-index:1000;background:rgba(10,10,10,.55);display:flex;align-items:flex-end;justify-content:center;font-family:'Pretendard Variable',Pretendard,sans-serif}",
    "#ils-ui .box{width:100%;max-width:560px;max-height:88vh;overflow:auto;background:#fffffc;color:#0b0b0c;border-radius:18px 18px 0 0;padding:18px 18px calc(18px + env(safe-area-inset-bottom,0px))}",
    "@media (min-width:700px){#ils-ui{align-items:center}#ils-ui .box{border-radius:18px}}",
    "#ils-ui h3{font-size:1.05rem;margin:0 0 4px}#ils-ui .sub{font-size:.85rem;color:#667085;margin:0 0 12px}",
    "#ils-ui .thumbs{display:flex;gap:8px;overflow-x:auto;padding-bottom:6px}",
    "#ils-ui .thumbs img{height:170px;border:1px solid #e4e4da;border-radius:8px;cursor:pointer;flex:0 0 auto}",
    "#ils-ui .btns{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}",
    "#ils-ui button{font:inherit;font-size:.95rem;font-weight:600;padding:11px 16px;border-radius:99px;border:1px solid #e4e4da;background:#f7f7f1;color:#0b0b0c;cursor:pointer}",
    "#ils-ui button.main{background:#0b0b0c;color:#fffffc;border-color:#0b0b0c;flex:1}",
    "#ils-ui .msg{font-size:.85rem;color:#667085;margin-top:10px;min-height:1.2em}"
  ].join("\n");

  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function txt(el) { return el ? el.textContent.replace(/\s+/g, " ").trim() : ""; }
  // 카드 글 → 공유용 글: 근거 접기·링크는 빼고, 굵은 글씨는 형광펜으로
  function rich(el, drop) {
    if (!el) return "";
    var c = el.cloneNode(true);
    c.querySelectorAll("details,.tag,script" + (drop ? "," + drop : "")).forEach(function (n) { n.remove(); });
    c.querySelectorAll("a").forEach(function (a) { a.replaceWith(document.createTextNode(a.textContent)); });
    // 굵은 글씨 → 형광펜. 줄이 바뀌는 형광펜은 이미지 도구가 잘못 그려서 낱말마다 따로 칠한다
    c.querySelectorAll("b,strong").forEach(function (b) {
      var f = document.createDocumentFragment();
      var ws = b.textContent.match(/\s*\S+/g) || [];
      ws.forEach(function (w, i) {   // 낱말 앞 빈칸은 첫 낱말만 밖으로, 나머지는 함께 칠해 낱말 사이가 끊겨 보이지 않게
        var lead = i === 0 ? w.match(/^\s*/)[0] : "";
        if (lead) f.appendChild(document.createTextNode(lead));
        var m = document.createElement("mark"); m.textContent = w.slice(lead.length); f.appendChild(m);
      });
      b.replaceWith(f);
    });
    return c.innerHTML.trim();
  }
  function loadScript(u) {
    return new Promise(function (ok, no) {
      if (window.html2canvas) return ok();
      var s = document.createElement("script"); s.src = u; s.onload = ok;
      s.onerror = function () { no(new Error("이미지 도구를 불러오지 못했어요(인터넷 연결 확인)")); };
      document.head.appendChild(s);
    });
  }
  function imgReady(img) {
    var p = (window.IL_loadImage && img.getAttribute("data-path") && !img.getAttribute("src")) ? window.IL_loadImage(img) : Promise.resolve();
    return p.then(function () {
      return new Promise(function (ok) { if (img.complete && img.naturalWidth) return ok(); img.addEventListener("load", ok, { once: true }); img.addEventListener("error", ok, { once: true }); setTimeout(ok, 8000); });
    });
  }

  function collect(card) {
    var q = function (s) { return card.querySelector(s); };
    var note = q(".note"), plus = card.classList.contains("plus");
    var kids = note ? Array.prototype.slice.call(note.children) : [];
    var after = function (label) {  // 제목(h5) 바로 다음 덩어리
      for (var i = 0; i < kids.length - 1; i++) if (kids[i].tagName === "H5" && txt(kids[i]).indexOf(label) === 0) return kids[i + 1];
      return null;
    };
    var d = {
      ind: txt(document.querySelector(".pick>summary .cur")) || txt(document.querySelector("header h1")),
      emo: txt(q("summary .cemo")), title: txt(q("summary .tname")), badge: plus ? "보강" : "",
      meta: txt(q("summary .upd")), one: rich(q("summary .one")), blocks: [], terms: [], brokers: []
    };
    var figs = [];
    function fig(f) {
      var img = f.querySelector("img"); if (!img) return;
      var b = { fig: img, cap: txt(f.querySelector(".who")) }; d.blocks.push(b); figs.push(img);
    }
    kids.forEach(function (k) {
      if (k.matches("section.para")) {
        var h = k.querySelector("h4"), num = txt(h && h.querySelector(".num"));
        var head = h ? txt(h).replace(num, "").trim() : "";
        d.blocks.push({ html: "<div class='ils-blk'><h3><span class='n'>" + esc(num) + "</span>" + esc(head) + "</h3><p>" + rich(k.querySelector(".ptxt>p")) + "</p></div>" });
        var f = k.querySelector(":scope>figure"); if (f) fig(f);
      } else if (k.matches("ul.uitems")) {
        k.querySelectorAll(":scope>li").forEach(function (li) {
          d.blocks.push({ html: "<div class='ils-blk'><p><span class='ils-tag'>" + esc(txt(li.querySelector(".tag"))) + "</span>" + rich(li) + "</p></div>" });
        });
      }
    });
    note && note.querySelectorAll(":scope>.chg, :scope>div>.chg").forEach(function (c) {
      var who = c.querySelectorAll(".ba .who"), val = c.querySelectorAll(".ba .val");
      d.blocks.push({ html: "<div class='ils-blk'><div class='ils-chg'><span class='ils-tag'>" + esc(txt(c.querySelector(".chead .tag"))) + "</span><strong>" + esc(txt(c.querySelector(".chead strong"))) + "</strong>" +
        "<div class='ils-ba'><div><span class='who'>" + esc(txt(who[0])) + "</span>" + esc(txt(val[0])) + "</div><div class='arrow'>→</div><div><span class='who'>" + esc(txt(who[1])) + "</span>" + esc(txt(val[1])) + "</div></div>" +
        "<p>" + rich(c.querySelector(":scope>p")) + "</p></div></div>" });
    });
    if (plus) { var mf = after("그림"); mf && mf.querySelectorAll("figure").forEach(fig); }
    var nums = note && note.querySelector(":scope>.nums");
    if (nums) {
      var kn = Array.prototype.map.call(nums.querySelectorAll(".numc"), function (n) {
        return "<div class='ils-kn'><div class='v'>" + esc(txt(n.querySelector(".nv"))) + "</div><div class='l'>" + esc(txt(n.querySelector(".nl"))) + "</div><div class='w'>" + esc(txt(n.querySelector(".nw"))) + "</div></div>";
      }).join("");
      d.blocks.push({ html: "<div class='ils-blk'><h4>기억할 숫자</h4><div class='ils-kns'>" + kn + "</div></div>" });
    }
    var w = after("앞으로 확인할 것");
    if (w) d.blocks.push({ html: "<div class='ils-blk'><h4>앞으로 확인할 것</h4><ul class='ils-watch'>" + Array.prototype.map.call(w.querySelectorAll("li"), function (li) { return "<li><span class='e'>👀</span>" + rich(li) + "</li>"; }).join("") + "</ul></div>" });
    var dl = note && note.querySelector(":scope>dl");
    if (dl) dl.querySelectorAll("dt").forEach(function (dt) {
      var name = txt(dt), m = name.match(/^(.+?)\((.+)\)$/), dd = dt.nextElementSibling;
      d.terms.push({ term: m ? m[2] : name, def: txt(dd), keys: m ? [m[1].trim(), m[2].trim()] : [name] });
    });
    var seen = {};
    card.querySelectorAll(".note>.srcs .who").forEach(function (s) { var b = txt(s).split(" · ")[0]; if (b && !seen[b]) { seen[b] = 1; d.brokers.push(b); } });
    d.figs = figs;
    return d;
  }

  function sizeImg(im, maxH) {
    var r = (im.naturalHeight || 1) / (im.naturalWidth || 1), w = IMG_W, h = w * r;
    if (h > maxH) { h = maxH; w = h / r; }
    im.style.width = Math.round(w) + "px"; im.style.height = Math.round(h) + "px";
  }

  function layout(d, stage) {
    var src = document.createElement("div"); src.style.width = "920px"; stage.appendChild(src);
    src.insertAdjacentHTML("beforeend", "<div class='ils-cover'>" + (d.emo ? "<div class='ils-cemo'>" + esc(d.emo) + "</div>" : "") + "<h1>" + esc(d.title) + "</h1>" +
      "<div class='ils-meta'>" + (d.badge ? "<span class='ils-badge'>" + esc(d.badge) + "</span>" : "") + esc([d.ind, d.meta].filter(Boolean).join(" · ")) + "</div>" +
      "<p class='ils-one'>" + d.one + "</p></div>");
    d.blocks.forEach(function (b) {
      if (b.html) { src.insertAdjacentHTML("beforeend", b.html); return; }
      var box = document.createElement("div"); box.className = "ils-blk";
      box.innerHTML = "<div class='ils-fig'><img class='im' alt=''><div class='cap'>" + esc(b.cap) + "</div></div>";
      var im = box.querySelector("img"); im.src = b.fig.currentSrc || b.fig.src; im.setAttribute("data-r", "1");
      src.appendChild(box);
    });
    var ims = Array.prototype.slice.call(src.querySelectorAll("img.im"));
    return Promise.all(ims.map(function (im) { return new Promise(function (ok) { if (im.complete) return ok(); im.onload = im.onerror = ok; }); })).then(function () {
      ims.forEach(function (im) { sizeImg(im, 480); });
      return (document.fonts && document.fonts.ready) || null;
    }).then(function () {
      var items = Array.prototype.slice.call(src.children);
      var H = items.map(function (e) { var cs = getComputedStyle(e); return e.getBoundingClientRect().height + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom); });
      var plan = function (c) { var g = [[]], used = 0; H.forEach(function (h, k) { if (used + h > c && g[g.length - 1].length) { g.push([]); used = 0; } g[g.length - 1].push(k); used += h; }); return g; };
      var N = plan(CAP).length, lo = Math.max.apply(null, H.concat([1])), hi = CAP;
      if (lo < CAP) while (hi - lo > 4) { var m = (lo + hi) / 2; if (plan(m).length <= N) hi = m; else lo = m; }
      var groups = plan(Math.max(hi, Math.min(lo, CAP)));
      var foot = "Industry Log";
      var pages = groups.map(function (g) {
        var p = document.createElement("div"); p.className = "ils-page";
        p.innerHTML = "<div class='bar'></div><div class='ils-body'></div><div class='ils-foot'><div class='ils-brand'><div><b>🏭 Industry Log</b><span class='ils-tg'>(텔레그램 : 마켓타이쿤 https://t.me/+NNb91uySqThjMTA1)</span></div></div><span class='pn'></span></div>";
        stage.appendChild(p); var body = p.querySelector(".ils-body"); g.forEach(function (k) { body.appendChild(items[k]); }); return p;
      });
      src.remove();
      var over = function (b) { return b.scrollHeight > b.clientHeight + 1; };
      var used = {};
      pages.forEach(function (p) {   // 빈 곳: 그 장 본문에 처음 나온 용어 풀이
        var b = p.querySelector(".ils-body"), t = b.textContent, box = null;
        d.terms.forEach(function (tm, k) {
          if (used[k] || !tm.keys.some(function (x) { return x && t.indexOf(x) >= 0; })) return;
          if (!box) { var last = b.lastElementChild; if (last) last.style.marginBottom = "24px"; box = document.createElement("div"); box.className = "ils-terms"; box.innerHTML = "<div class='th'>📖 이 장의 용어</div>"; b.appendChild(box); }
          var el = document.createElement("div"); el.className = "t"; el.innerHTML = "<b>" + esc(tm.term) + "</b>" + esc(tm.def); box.appendChild(el);
          if (over(b)) box.removeChild(el); else used[k] = 1;
        });
        if (box && box.children.length < 2) { box.remove(); }
        b.querySelectorAll("img.im").forEach(function (im) {   // 남은 곳: 그림을 키운다
          var lo2 = 480, hi2 = 900;
          while (hi2 - lo2 > 8) { var m2 = (lo2 + hi2) / 2; sizeImg(im, m2); if (over(b)) hi2 = m2; else lo2 = m2; }
          sizeImg(im, lo2);
        });
        if (b.children.length === 1 && b.querySelector(".ils-fig")) b.style.justifyContent = "center";
      });
      if (d.brokers.length) pages[pages.length - 1].querySelector(".ils-foot .ils-brand").insertAdjacentHTML("beforeend", "<div class='src'>" + esc(d.brokers.join(" · ")) + " 리포트를 바탕으로 정리</div>");
      pages.forEach(function (p, i) { p.querySelector(".pn").textContent = (i + 1) + " / " + pages.length; });
      return pages;
    });
  }

  function ui() {
    var u = document.getElementById("ils-ui"); if (u) u.remove();
    u = document.createElement("div"); u.id = "ils-ui";
    u.innerHTML = "<div class='box' role='dialog' aria-label='카드 공유'><h3>공유 이미지</h3><p class='sub'>만드는 중…</p><div class='thumbs'></div><div class='btns'></div><div class='msg'></div></div>";
    u.addEventListener("click", function (e) { if (e.target === u) close(); });
    document.body.appendChild(u); return u;
  }
  var urls = [];
  function close() { var u = document.getElementById("ils-ui"); if (u) u.remove(); urls.forEach(function (x) { URL.revokeObjectURL(x); }); urls = []; var s = document.getElementById("ils-stage"); if (s) s.remove(); }
  function btn(box, label, cls, fn) { var b = document.createElement("button"); b.type = "button"; b.textContent = label; if (cls) b.className = cls; b.onclick = fn; box.appendChild(b); return b; }

  var busy = false;
  window.ILShare = function (card) {
    if (busy || !card) return; busy = true;
    var u = ui(), sub = u.querySelector(".sub"), msg = u.querySelector(".msg");
    if (!document.getElementById("ils-css")) { var st = document.createElement("style"); st.id = "ils-css"; st.textContent = CSS; document.head.appendChild(st); }
    var old = document.getElementById("ils-stage"); if (old) old.remove();
    var stage = document.createElement("div"); stage.id = "ils-stage"; document.body.appendChild(stage);
    var d, files = [];
    var imgs = Array.prototype.slice.call(card.querySelectorAll(".note img"));
    loadScript(H2C).then(function () {
      d = collect(card);
      return Promise.all(d.figs.map(imgReady));
    }).then(function () { return layout(d, stage); }).then(function (pages) {
      var name = (d.title || "card").replace(/[\\/:*?"<>|\s]+/g, "_");
      return pages.reduce(function (pr, p, i) {
        return pr.then(function () {
          sub.textContent = "이미지 만드는 중… " + (i + 1) + " / " + pages.length;
          return window.html2canvas(p, { scale: 1, width: W, height: HT, backgroundColor: "#fffffc", logging: false, useCORS: true });
        }).then(function (cv) {
          return new Promise(function (ok, no) { cv.toBlob(function (b) { b ? ok(b) : no(new Error("이미지를 만들지 못했어요")); }, "image/png"); });
        }).then(function (blob) {
          var f = new File([blob], "IndustryLog_" + name + "_" + (i + 1) + ".png", { type: "image/png" });
          files.push(f);
          var url = URL.createObjectURL(blob); urls.push(url);
          var t = document.createElement("img"); t.src = url; t.alt = (i + 1) + "장"; t.title = "눌러서 이 장 복사";
          t.onclick = function () {
            if (!(navigator.clipboard && window.ClipboardItem)) { msg.textContent = "이 브라우저는 이미지 복사를 지원하지 않아요. '모두 저장'을 써 주세요."; return; }
            navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]).then(function () { msg.textContent = (i + 1) + "장을 복사했어요. 텔레그램 대화창에 붙여 넣으면 돼요."; },
              function () { msg.textContent = "복사하지 못했어요. '모두 저장'을 써 주세요."; });
          };
          u.querySelector(".thumbs").appendChild(t);
        });
      }, Promise.resolve());
    }).then(function () {
      stage.remove();
      sub.textContent = files.length + "장 · " + d.title;
      var btns = u.querySelector(".btns"), text = d.title + " · " + d.ind + " · Industry Log";
      if (navigator.canShare && navigator.canShare({ files: files })) {
        btn(btns, "텔레그램 등으로 보내기", "main", function () {
          navigator.share({ files: files, title: d.title, text: text }).catch(function (e) { if (e && e.name !== "AbortError") msg.textContent = "보내지 못했어요: " + e.message; });
        });
      }
      btn(btns, "모두 저장", navigator.canShare && navigator.canShare({ files: files }) ? "" : "main", function () {
        files.forEach(function (f, i) {
          setTimeout(function () { var a = document.createElement("a"); a.href = urls[i]; a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); }, i * 350);
        });
        msg.textContent = "저장했어요. 여러 장을 한 번에 텔레그램에 끌어다 놓으면 앨범으로 가요.";
      });
      btn(btns, "닫기", "", close);
      if (!msg.textContent) msg.textContent = "미리보기를 누르면 그 장이 복사돼요.";
    }).catch(function (e) {
      sub.textContent = "만들지 못했어요"; msg.textContent = (e && e.message) || String(e);
      btn(u.querySelector(".btns"), "닫기", "", close);
      var s = document.getElementById("ils-stage"); if (s) s.remove();
    }).then(function () { busy = false; });
  };
})();
