/* Company Log — 비공개 저장소 읽기 (2026-11-27, 사용자 요청: 공개 → 비공개, Industry Log 토큰 같이 쓰기)

   화면(index.html·stock.html·assets/)은 공개 포털(tryingpig.github.io/company-log/)에 있는 '껍데기'이고,
   데이터(data/…)와 AI 분석 리포트(ai/…)는 비공개 저장소 tryingpig/company-log 에만 있다.
   이 스크립트는 페이지에서 가장 먼저 실행되어 window.fetch 를 감싼다:
     · data/… · ai/… 를 읽는 요청 → 토큰을 붙여 GitHub API(contents, raw)로 보낸다. 나머지 요청은 그대로.
     · 토큰은 리포트 뷰어·Industry Log 와 같은 자리(이 기기 localStorage 'rv_pat'). 이 파일에는 토큰이 없다.
     · 토큰이 없거나 이 저장소를 못 읽으면 입력 창을 띄우고, 넣으면 기다리던 요청이 이어서 진행된다.
   PC에서 localhost 로 열면(로컬 확인) 옆 파일을 그대로 읽는다. ?api=1 이면 localhost 에서도 API 로.
   이 파일 이름·위치(assets/cl-data.js)는 리포트 칸(ai/…)이 <base> 로 찾아 쓰므로 바꾸지 말 것. */
(function () {
  'use strict';
  if (window.__clData) return;
  window.__clData = true;

  var OWNER = 'tryingpig', REPO = 'company-log', API = 'https://api.github.com', PAT_KEY = 'rv_pat';
  var me = document.currentScript && document.currentScript.src;
  var BASE = me ? me.replace(/assets\/cl-data\.js.*$/, '') : (location.origin + '/company-log/');   // 껍데기 뿌리(…/company-log/)
  var host = location.hostname;
  var API_MODE = /\.github\.io$/.test(host) || /[?&]api=1\b/.test(location.search) ||
                 (host === '' && /[?&]api=1\b/.test(document.referrer));
  try { if (!API_MODE && window.parent !== window && window.parent.__clApi) API_MODE = true; } catch (e) {}
  window.__clApi = API_MODE;
  var realFetch = window.fetch.bind(window);

  function getPat() { try { return localStorage.getItem(PAT_KEY) || ''; } catch (e) { return ''; } }
  function setPat(v) { try { localStorage.setItem(PAT_KEY, v); } catch (e) {} }

  // 요청 주소 → 저장소 안 경로(data/… · ai/…). 해당 없으면 null
  function repoPath(input) {
    var u;
    try { u = new URL(typeof input === 'string' ? input : input.url, document.baseURI); } catch (e) { return null; }
    if (u.href.indexOf(BASE) !== 0) return null;
    var p = decodeURIComponent(u.pathname.slice(new URL(BASE).pathname.length));
    return /^(data|ai)\//.test(p) ? p : null;
  }

  /* ── 토큰 입력 창 ── */
  var waiting = null;                 // 토큰을 기다리는 Promise
  function gate(msg) {
    if (waiting) { var m = document.getElementById('clGateMsg'); if (m && msg) m.textContent = msg; return waiting; }
    waiting = new Promise(function (resolve) {
      function build() {
        var d = document.createElement('div');
        d.id = 'clGate';
        d.innerHTML =
          '<div class="clg-box" role="dialog" aria-modal="true" aria-labelledby="clGateT">' +
          '<h2 id="clGateT">Company Log</h2>' +
          '<p id="clGateMsg"></p>' +
          '<label for="clGatePat">GitHub 토큰 (tryingpig/company-log 를 읽을 수 있어야 해요)</label>' +
          '<input id="clGatePat" type="password" autocomplete="off" spellcheck="false" placeholder="github_pat_… 또는 ghp_…">' +
          '<button type="button" id="clGateSave">저장하고 열기</button>' +
          '<p class="clg-err" id="clGateErr" hidden></p>' +
          '<p class="clg-note">토큰은 이 기기에만 저장돼요. 리포트 뷰어·Industry Log 와 같은 토큰을 씁니다.</p></div>';
        var st = document.createElement('style');
        st.textContent =
          '#clGate{position:fixed;inset:0;z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:12vh 16px 16px;' +
          'background:var(--bg,#fffffc);color:var(--text,#0b0b0c);font-family:"Pretendard Variable",Pretendard,"Malgun Gothic",sans-serif}' +
          '#clGate .clg-box{width:100%;max-width:30rem;padding:24px;border:1px solid var(--line,#e4e4da);border-radius:12px;line-height:1.7}' +
          '#clGate h2{margin:0 0 6px;font-size:1.25rem}#clGate p{margin:0 0 12px;color:var(--muted,#667085);font-size:.93rem}' +
          '#clGate label{font-size:.85rem}#clGate input{width:100%;box-sizing:border-box;margin-top:4px;padding:10px;font-size:1rem;' +
          'border:1px solid var(--line,#e4e4da);border-radius:8px;background:transparent;color:inherit}' +
          '#clGate button{margin-top:12px;padding:10px 18px;font-size:1rem;border:0;border-radius:8px;background:var(--text,#0b0b0c);color:var(--bg,#fffffc);cursor:pointer}' +
          '#clGate .clg-err{color:#b3443f;margin-top:10px}#clGate .clg-note{font-size:.8rem;margin-top:14px}';
        document.head.appendChild(st);
        document.body.appendChild(d);
        document.getElementById('clGateMsg').textContent = msg || '비공개 저장소라 열람용 GitHub 토큰이 필요해요.';
        var inp = document.getElementById('clGatePat'), err = document.getElementById('clGateErr');
        function save() {
          var v = inp.value.trim();
          if (!v) { err.textContent = '토큰을 넣어 주세요.'; err.hidden = false; return; }
          if (!/^[\x21-\x7e]+$/.test(v)) { err.textContent = '토큰에는 영문·숫자·기호만 들어가요. GitHub 에서 복사한 그대로 붙여 넣어 주세요.'; err.hidden = false; return; }
          err.hidden = true; inp.disabled = true;
          check(v).then(function (ok) {
            inp.disabled = false;
            if (ok !== true) { err.textContent = ok; err.hidden = false; return; }
            setPat(v); inp.value = ''; d.remove(); st.remove();
            try { sessionStorage.setItem('cl_ok', '1'); } catch (e) {}
            var w = waiting; waiting = null; resolve();
          });
        }
        document.getElementById('clGateSave').addEventListener('click', save);
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') save(); });
        setTimeout(function () { inp.focus(); }, 50);
      }
      if (document.body) build(); else document.addEventListener('DOMContentLoaded', build);
    });
    return waiting;
  }

  // 이 토큰으로 저장소를 읽을 수 있는지: true 또는 사람이 읽을 이유
  function check(pat) {
    return realFetch(API + '/repos/' + OWNER + '/' + REPO, {
      headers: {'Authorization': 'Bearer ' + pat, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'}, cache: 'no-store'
    }).then(function (r) {
      if (r.ok) return true;
      if (r.status === 401) return '토큰이 만료됐거나 잘못됐어요. 다시 넣어 주세요.';
      return '이 토큰으로는 tryingpig/company-log 를 읽을 수 없어요. 토큰 설정에서 이 저장소를 허용해 주세요. (' + r.status + ')';
    }).catch(function () { return '인터넷 연결을 확인해 주세요.'; });
  }

  // 페이지가 열릴 때 한 번: 토큰이 있고 이 저장소를 읽을 수 있는지 (탭 안에서는 한 번만 확인)
  var ready;
  if (!API_MODE) ready = Promise.resolve();
  else if (!getPat()) ready = gate();
  else {
    var ok = false; try { ok = sessionStorage.getItem('cl_ok') === '1'; } catch (e) {}
    ready = ok ? Promise.resolve() : check(getPat()).then(function (r) {
      if (r === true) { try { sessionStorage.setItem('cl_ok', '1'); } catch (e) {} return; }
      return gate(r);
    });
  }

  if (!API_MODE) return;
  window.fetch = function (input, init) {
    var p = repoPath(input);
    if (!p) return realFetch(input, init);
    var method = (init && init.method) || 'GET';
    return ready.then(function () {
      return realFetch(API + '/repos/' + OWNER + '/' + REPO + '/contents/' + p.split('/').map(encodeURIComponent).join('/'), {
        method: method,
        headers: {'Authorization': 'Bearer ' + getPat(), 'Accept': 'application/vnd.github.raw', 'X-GitHub-Api-Version': '2022-11-28'},
        cache: 'no-cache'
      });
    }).then(function (r) {
      if (r.status === 401) {                      // 쓰던 중 토큰이 만료됨 → 창을 띄우고 넣으면 다시
        try { sessionStorage.removeItem('cl_ok'); } catch (e) {}
        ready = gate('토큰이 만료됐어요. 새 토큰을 넣어 주세요.');
        return ready.then(function () { location.reload(); return r; });
      }
      return r;
    });
  };
  window.CL_resetToken = function () { ready = gate('새 토큰을 넣으면 이 기기에 저장된 토큰이 바뀌어요. 리포트 뷰어·Industry Log 도 같은 토큰을 써요.').then(function () { location.reload(); }); };
})();
