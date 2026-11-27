/* 리포트 공용 스크립트 — <script src="/assets/report.js" defer></script>

   하는 일 두 가지.
   1) 테마 토글 버튼 동작 (초기 테마 적용은 각 리포트 <head> 의 인라인 스니펫이 맡는다.
      여기서 하면 흰 화면이 한 번 번쩍이므로 반드시 인라인이어야 한다)
   2) 목차 자동 연결 — h2 에 id 를 붙이고 .toc 의 항목을 앵커로 바꾼다.
      리포트를 쓸 때마다 id 를 손으로 다는 수고를 없애기 위함. */

(function () {
  'use strict';

  /* ── 1. 테마 토글 ── */
  var btn = document.querySelector('.theme-toggle');
  if (btn) {
    btn.addEventListener('click', function () {
      var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        try { localStorage.setItem('theme', 'light'); } catch (e) {}
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        try { localStorage.setItem('theme', 'dark'); } catch (e) {}
      }
    });
  }

  /* ── 2. 목차 자동 연결 ── */
  var toc = document.querySelector('.toc ol, .toc ul');
  var heads = document.querySelectorAll('.wrap > h2');
  if (!toc || !heads.length) return;

  // 이미 손으로 링크를 달아둔 문서는 건드리지 않는다
  if (toc.querySelector('a[href^="#"]')) return;

  var items = toc.querySelectorAll('li');

  // h2 에 먼저 id 를 준다 ("3. 주장 ①…" 처럼 번호로 시작하면 그 번호를 키로 삼는다)
  var byNumber = {};
  heads.forEach(function (h, i) {
    if (!h.id) h.id = 'sec-' + (i + 1);
    var m = (h.textContent || '').trim().match(/^(\d+)\s*[.)]/);
    if (m) byNumber[m[1]] = h.id;
  });

  /* 목차 항목 → 헤딩 짝짓기.
     번호로 맞추는 쪽이 우선이다. 본문에 목차에 없는 h2 가 섞여 있어도(예: 맺음말)
     순번만 믿고 이으면 한 칸씩 밀려 엉뚱한 곳으로 가기 때문이다.
     번호를 못 찾았고 개수도 다르면, 잘못 잇느니 그냥 두는 편이 낫다. */
  var sameCount = items.length === heads.length;
  items.forEach(function (li, i) {
    var target = byNumber[String(i + 1)] || (sameCount ? heads[i].id : null);
    if (!target) return;
    var a = document.createElement('a');
    a.href = '#' + target;
    while (li.firstChild) a.appendChild(li.firstChild);
    li.appendChild(a);
  });
})();

/* ── 3. Company Log 'AI 분석' 안에서 열렸을 때 (사용자 요청 2026-11-26) ──
   메인 페이지가 위쪽 메뉴를 그대로 두고 그 아래 칸(iframe)에 리포트를 띄운다.
   리포트 자체의 위쪽 줄은 겹치므로 숨기고, Company Log 페이지로 가는 링크(로고·차트·리포트)는 칸이 아니라 전체 화면에서 열리게. */
(function () {
  'use strict';
  var framed = false;
  try { framed = window.self !== window.top; } catch (e) { framed = true; }
  if (!framed) return;
  document.documentElement.classList.add('in-frame');
  document.querySelectorAll('a[href^="../"]').forEach(function (a) { a.target = '_top'; });
  document.querySelectorAll('a[href^="http"]').forEach(function (a) { if (!a.target) a.target = '_blank'; });
})();

/* ── 4. 칸 안의 '차트·리포트' = 메인 페이지 종목 칸으로 (사용자 요청 2026-11-26: 메뉴는 항상 위에) ──
   ../stock.html?code= 링크를 누르면 전체 화면을 바꾸지 않고 메인 주소만 #stock:코드 로 바꿔 메뉴 아래 종목 칸을 연다. */
(function () {
  'use strict';
  var top = null;
  try { if (window.self !== window.top) top = window.top; } catch (e) { top = null; }
  if (!top) return;
  document.addEventListener('click', function (e) {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;
    var a = e.target.closest && e.target.closest('a[href^="../stock.html?code="]'); if (!a) return;
    var m = a.getAttribute('href').match(/code=([0-9A-Za-z]+)/); if (!m) return;
    e.preventDefault();
    try { top.location.hash = 'stock:' + m[1]; } catch (er) { top.location.href = '../#stock:' + m[1]; }
  }, true);
})();

/* ── 5. 칸 안에서 같은 시리즈의 다른 리포트(같은 폴더 .html) 링크 → 메인 주소 #ai:파일 (2026-11-27) ──
   리포트는 비공개 저장소에서 읽어 칸에 직접 넣으므로(srcdoc) 칸이 그 주소로 직접 갈 수 없다. */
(function () {
  'use strict';
  var top = null;
  try { if (window.self !== window.top) top = window.top; } catch (e) { top = null; }
  if (!top) return;
  document.addEventListener('click', function (e) {
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button) return;
    var a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
    var h = a.getAttribute('href') || '';
    var m = h.match(/^(?:\.\/|https:\/\/tryingpig\.github\.io\/company-log\/ai\/)?([^\/?#:]+\.html)(#.*)?$/); if (!m) return;   // 파일명만 또는 옛 전체 주소
    e.preventDefault();
    try { top.location.hash = 'ai:' + encodeURIComponent(decodeURIComponent(m[1])); } catch (er) {}
  }, true);
})();
