/* 리포트 마커 뷰어 - 공통 로직
   - GitHub API 래퍼 (private repo report-vault 접근)
   - PAT 관리 (localStorage)
   - 하이라이트 저장/병합
   모든 함수는 전역. 각 페이지 스크립트에서 사용한다. */

const RV = {
  OWNER: "tryingpig",
  REPO: "report-vault",
  API: "https://api.github.com",
  PAT_KEY: "rv_pat",
};

/* ── PAT 관리 ───────────────────────────────────────────── */
function getPat() { return localStorage.getItem(RV.PAT_KEY) || ""; }
function setPat(v) { localStorage.setItem(RV.PAT_KEY, (v || "").trim()); }
function clearPat() { localStorage.removeItem(RV.PAT_KEY); }

class AuthError extends Error {}

/* KST 타임스탬프 문자열 */
function nowKst() {
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  return d.toISOString().slice(0, 16).replace("T", " ");
}

/* ── base64 <-> UTF-8 ──────────────────────────────────── */
function decodeB64Utf8(b64) {
  const bin = atob((b64 || "").replace(/\s/g, ""));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}
function encodeUtf8B64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

/* ── GitHub API ────────────────────────────────────────── */
async function ghFetch(path, opts = {}) {
  const { accept = "application/vnd.github+json", method = "GET", body = null, cache } = opts;
  const headers = {
    Authorization: "Bearer " + getPat(),
    Accept: accept,
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const init = { method, headers };
  if (cache) init.cache = cache;   // 예: "no-store" (stale sha 방지)
  if (body) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  const res = await fetch(`${RV.API}/repos/${RV.OWNER}/${RV.REPO}/${path}`, init);
  if (res.status === 401) throw new AuthError("인증 실패 (PAT 확인)");
  return res;
}

/* reports.json 로드 (raw) */
async function loadReports() {
  const res = await ghFetch("contents/index/reports.json", {
    accept: "application/vnd.github.raw",
  });
  if (!res.ok) throw new Error("목록 로드 실패: " + res.status);
  return await res.json();
}

/* PDF 로드 (raw arraybuffer). pdfPath는 reports.json의 pdf_path */
async function loadPdf(pdfPath) {
  const res = await ghFetch("contents/" + pdfPath, {
    accept: "application/vnd.github.raw",
  });
  if (!res.ok) throw new Error("PDF 로드 실패: " + res.status);
  return await res.arrayBuffer();
}

/* Blob → base64 문자열 (data URI 접두 제거) */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result).split(",")[1] || "");
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}

/* Blob → data URL (이미지 표시용) */
function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}

/* 바이너리 파일(이미지 캡처 등)을 vault에 PUT. hid로 경로가 유일하므로 sha 불필요(신규) */
async function putBinaryFile(path, blob, message) {
  const content = await blobToBase64(blob);
  const res = await ghFetch("contents/" + path, {
    method: "PUT",
    body: { message: message || ("add " + path), content },
  });
  if (!res.ok) throw new Error("파일 업로드 실패: " + res.status);
  return await res.json();
}

/* vault의 이미지 파일을 받아 data URL로 (모아보기 캡처 표시용) */
async function fetchImageDataURL(path) {
  const res = await ghFetch("contents/" + path, { accept: "application/vnd.github.raw" });
  if (!res.ok) return null;
  return await blobToDataURL(await res.blob());
}

/* annotations 로드 → {sha, data}. 없으면 sha=null, 빈 배열 */
async function loadAnnotations(reportId) {
  const res = await ghFetch("contents/annotations/" + reportId + ".json");
  if (res.status === 404) {
    return { sha: null, data: { report_id: reportId, updated_at: "", highlights: [] } };
  }
  if (!res.ok) throw new Error("주석 로드 실패: " + res.status);
  const obj = await res.json();
  return { sha: obj.sha, data: JSON.parse(decodeB64Utf8(obj.content)) };
}

/* 원격 최신본과 로컬 상태를 hid 기준으로 병합
   - deletedHids: 로컬에서 지운 하이라이트
   - localHls: 로컬이 원하는 하이라이트 목록 */
function mergeHighlights(remoteData, localHls, deletedHids) {
  const byId = new Map();
  for (const h of remoteData.highlights || []) byId.set(h.hid, h);
  for (const hid of deletedHids) byId.delete(hid);
  for (const h of localHls) if (!byId.has(h.hid)) byId.set(h.hid, h);
  const merged = Array.from(byId.values());
  merged.sort((a, b) => a.page - b.page || (a.created_at < b.created_at ? -1 : 1));
  return merged;
}

/* annotations 저장. 409/422(sha 충돌) 시 최신 재조회+병합 후 1회 재시도.
   반환: {sha, highlights} 최신 상태 */
async function saveAnnotations(reportId, localHls, deletedHids, sha) {
  const build = (hls) => ({
    report_id: reportId,
    updated_at: nowKst(),
    highlights: hls,
  });

  const put = async (dataObj, curSha) => {
    const body = {
      message: `highlight: ${reportId} (${dataObj.highlights.length})`,
      content: encodeUtf8B64(JSON.stringify(dataObj, null, 2)),
    };
    if (curSha) body.sha = curSha;
    return await ghFetch("contents/annotations/" + reportId + ".json", {
      method: "PUT",
      body,
    });
  };

  let dataObj = build(localHls);
  let res = await put(dataObj, sha);

  if (res.status === 409 || res.status === 422) {
    const latest = await loadAnnotations(reportId);
    const merged = mergeHighlights(latest.data, localHls, deletedHids);
    dataObj = build(merged);
    res = await put(dataObj, latest.sha);
  }
  if (!res.ok) throw new Error("저장 실패: " + res.status);
  const j = await res.json();
  return { sha: j.content.sha, highlights: dataObj.highlights };
}

/* reports.json의 highlight_count 즉시 갱신 (비필수 — 실패해도 collect의 recount가 보정).
   sha 충돌(409/422) 시 최신 재조회 후 재시도. 뷰어/모아보기 공용. */
async function bumpCount(reportId, count) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await ghFetch("contents/index/reports.json", { cache: "no-store" });
      if (!res.ok) return;
      const obj = await res.json();
      const doc = JSON.parse(decodeB64Utf8(obj.content));
      const r = (doc.reports || []).find((x) => x.id === reportId);
      if (!r || r.highlight_count === count) return;
      r.highlight_count = count;
      const put = await ghFetch("contents/index/reports.json", {
        method: "PUT",
        body: {
          message: `count: ${reportId} ${count}`,
          content: encodeUtf8B64(JSON.stringify(doc, null, 2)),
          sha: obj.sha,
        },
      });
      if (put.ok) return;
      if (put.status !== 409 && put.status !== 422) return;   // 충돌 외 오류는 recount에 맡김
    } catch (e) { return; }
  }
}

/* ── PAT 게이트: 없으면 입력 오버레이 표시 ───────────────── */
function requirePat(onReady) {
  if (getPat()) {
    onReady();
    return;
  }
  showPatOverlay(onReady);
}

function showPatOverlay(onReady) {
  const ov = document.createElement("div");
  ov.className = "pat-overlay";
  ov.innerHTML = `
    <div class="pat-box">
      <h2>🔒 접근 토큰 입력</h2>
      <p>report-vault 전용 fine-grained PAT를 입력하세요. 이 기기에만 저장됩니다.</p>
      <input type="password" id="patInput" placeholder="github_pat_..." autocomplete="off">
      <button id="patSave">저장하고 열기</button>
      <div class="pat-err" id="patErr"></div>
    </div>`;
  document.body.appendChild(ov);
  const save = () => {
    const v = ov.querySelector("#patInput").value.trim();
    if (!v) { ov.querySelector("#patErr").textContent = "토큰을 입력하세요."; return; }
    setPat(v);
    ov.remove();
    onReady();
  };
  ov.querySelector("#patSave").onclick = save;
  ov.querySelector("#patInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") save();
  });
}

/* 공통 에러 핸들러: 인증 오류면 PAT 재입력 */
function handleError(err, retry) {
  console.error(err);
  if (err instanceof AuthError) {
    clearPat();
    showPatOverlay(retry);
  } else {
    alert(err.message || String(err));
  }
}

/* ── 텔레그램 전송 (모아보기 → 봇 DM/저장방) ─────────────────
   개인용: 봇 토큰·chat_id를 이 기기 localStorage에만 저장.
   api.telegram.org는 CORS 허용이라 브라우저에서 직접 sendMessage/sendPhoto 호출. */
RV.TG_TOKEN_KEY = "rv_tg_token";
RV.TG_CHAT_KEY = "rv_tg_chat";
RV.TG_CHAT_DEFAULT = "-1004346135391";   // 저장방 기본값(비밀 아님) — 토큰만 있으면 바로 전송
function getTgToken() { return localStorage.getItem(RV.TG_TOKEN_KEY) || ""; }
function getTgChat() { return localStorage.getItem(RV.TG_CHAT_KEY) || RV.TG_CHAT_DEFAULT; }
function setTgCreds(token, chat) {
  localStorage.setItem(RV.TG_TOKEN_KEY, (token || "").trim());
  localStorage.setItem(RV.TG_CHAT_KEY, (chat || "").trim());
}
function clearTgCreds() {
  localStorage.removeItem(RV.TG_TOKEN_KEY);
  localStorage.removeItem(RV.TG_CHAT_KEY);
}

class TgError extends Error {}

/* 텔레그램 Bot API 호출. method 예: "sendMessage". body는 객체(JSON) 또는 FormData. */
async function tgCall(method, body, _retry = 0) {
  const token = getTgToken();
  if (!token) throw new TgError("봇 토큰 없음");
  const init = { method: "POST" };
  if (body instanceof FormData) {
    init.body = body;
  } else {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  let j = null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, init);
    j = await res.json();
  } catch (e) {
    throw new TgError("네트워크 오류 — 연결을 확인하세요");
  }
  if (!j || !j.ok) {
    const code = j && j.error_code;
    // 429(속도제한): 텔레그램이 알려주는 retry_after만큼 쉬었다 재시도 → 연속 전송 누락 방지
    if (code === 429 && _retry < 5) {
      const wait = ((j.parameters && j.parameters.retry_after) || 1) * 1000 + 300;
      await new Promise((r) => setTimeout(r, wait));
      return tgCall(method, body, _retry + 1);
    }
    if (code === 401) throw new TgError("봇 토큰이 올바르지 않습니다");
    if (code === 400 && /chat not found/i.test(j.description || "")) {
      throw new TgError("chat_id를 찾을 수 없습니다 (봇에게 먼저 말을 걸어두세요)");
    }
    throw new TgError("텔레그램 오류: " + ((j && j.description) || "알 수 없음"));
  }
  return j.result;
}

/* 텍스트 메시지 (HTML parse_mode). 4096자 제한은 호출부에서 분할. */
async function tgSendMessage(text) {
  return tgCall("sendMessage", {
    chat_id: getTgChat(),
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
}

/* 사진 전송. blob + 캡션(HTML). */
async function tgSendPhoto(blob, caption) {
  const fd = new FormData();
  fd.append("chat_id", getTgChat());
  if (caption) { fd.append("caption", caption); fd.append("parse_mode", "HTML"); }
  fd.append("photo", blob, "clip.jpg");
  return tgCall("sendPhoto", fd);
}

/* vault 이미지 파일 → Blob (sendPhoto용) */
async function fetchImageBlob(path) {
  const res = await ghFetch("contents/" + path, { accept: "application/vnd.github.raw" });
  if (!res.ok) return null;
  return await res.blob();
}

/* 텔레그램 게이트: 봇 토큰만 있으면 통과(chat_id는 기본값 있음). 이 기기에서 최초 1회만 뜸. */
function requireTg(onReady) {
  if (getTgToken()) { onReady(); return; }
  showTgOverlay(onReady);
}

function showTgOverlay(onReady) {
  const escA = (s) => (s || "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const ov = document.createElement("div");
  ov.className = "pat-overlay";
  ov.innerHTML = `
    <div class="pat-box">
      <h2>✈️ 텔레그램 전송 설정</h2>
      <p><b>이 기기에서 처음 한 번만</b> 봇 토큰을 넣으면 됩니다(공개 사이트라 토큰을 저장 못 해요).
         저장 후엔 다시 안 뜹니다. 보내는 방은 정해져 있어 따로 입력 안 해도 돼요.</p>
      <input type="password" id="tgToken" placeholder="봇 토큰 (123456:ABC...)" autocomplete="off" value="${escA(getTgToken())}">
      <button id="tgSave">저장</button>
      <div class="pat-err" id="tgErr"></div>
    </div>`;
  document.body.appendChild(ov);
  const save = () => {
    const t = ov.querySelector("#tgToken").value.trim();
    if (!t) { ov.querySelector("#tgErr").textContent = "봇 토큰을 입력하세요."; return; }
    setTgCreds(t, getTgChat());   // chat_id는 고정 기본값 사용
    ov.remove();
    onReady();
  };
  ov.querySelector("#tgSave").onclick = save;
  ov.querySelectorAll("input").forEach((el) =>
    el.addEventListener("keydown", (e) => { if (e.key === "Enter") save(); }));
}

/* ── 전송 이력 (리포트별, 이 기기 기준) ─────────────────────
   한 번 보낸 리포트는 아이콘을 회색으로 표시하고 재전송 시 다시 확인받는다. */
/* 전송 이력은 vault 공유 파일(index/tg_sent.json)이 원본 → 모든 기기 공통.
   localStorage는 즉시표시용 캐시(오프라인/로딩 중 폴백). 메모리 TG_SENT가 렌더 기준. */
RV.TG_SENT_KEY = "rv_tg_sent";              // localStorage 캐시
RV.TG_SENT_PATH = "index/tg_sent.json";     // vault 공유 원본
let TG_SENT = new Set();

function saveTgSentCache() { localStorage.setItem(RV.TG_SENT_KEY, JSON.stringify([...TG_SENT])); }
function isTgSent(id) { return TG_SENT.has(id); }

/* 캐시에서 즉시 초기화(스크립트 로드 시 1회) */
try { TG_SENT = new Set(JSON.parse(localStorage.getItem(RV.TG_SENT_KEY) || "[]")); } catch (e) {}

/* vault 공유 목록을 받아 메모리+캐시 갱신(로드 시 호출). 실패하면 캐시 유지. */
async function fetchTgSentShared() {
  try {
    const res = await ghFetch("contents/" + RV.TG_SENT_PATH, { accept: "application/vnd.github.raw", cache: "no-store" });
    if (res.ok) {
      TG_SENT = new Set((await res.json()).ids || []);
      saveTgSentCache();
      return;
    }
    // 파일이 아직 없으면(404) 이 기기 캐시를 공유 원본으로 시드(기존 X 이력 보존)
    if (res.status === 404 && TG_SENT.size) {
      await ghFetch("contents/" + RV.TG_SENT_PATH, {
        method: "PUT",
        body: { message: "tg_sent init", content: encodeUtf8B64(JSON.stringify({ ids: [...TG_SENT] }, null, 2)) },
      });
    }
  } catch (e) { /* 네트워크 실패 시 캐시 유지 */ }
}

/* vault 파일에 id 추가/삭제 반영(sha 충돌 409/422 재시도). 비필수 — 실패해도 캐시엔 남음. */
async function persistTgSent(id, add) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      let sha = null, ids = [];
      const res = await ghFetch("contents/" + RV.TG_SENT_PATH, { cache: "no-store" });
      if (res.ok) { const o = await res.json(); sha = o.sha; try { ids = JSON.parse(decodeB64Utf8(o.content)).ids || []; } catch (e) {} }
      else if (res.status !== 404) return;
      const set = new Set(ids);
      if (add) set.add(id); else set.delete(id);
      const body = { message: `tg_sent ${add ? "+" : "-"}${id}`, content: encodeUtf8B64(JSON.stringify({ ids: [...set] }, null, 2)) };
      if (sha) body.sha = sha;
      const put = await ghFetch("contents/" + RV.TG_SENT_PATH, { method: "PUT", body });
      if (put.ok) return;
      if (put.status !== 409 && put.status !== 422) return;
    } catch (e) { return; }
  }
}

function markTgSent(id) { TG_SENT.add(id); saveTgSentCache(); persistTgSent(id, true); }
function unmarkTgSent(id) { TG_SENT.delete(id); saveTgSentCache(); persistTgSent(id, false); }

/* ── 즐겨찾기(⭐) ─────────────────────────────────────────
   tg_sent와 동일 구조: vault 공유 파일(index/bookmarks.json)이 원본 → 모든 기기 공통.
   localStorage는 즉시표시용 캐시. 메모리 BOOKMARKS가 렌더 기준. */
RV.BOOKMARK_KEY = "rv_bookmarks";            // localStorage 캐시
RV.BOOKMARK_PATH = "index/bookmarks.json";   // vault 공유 원본
let BOOKMARKS = new Set();

function saveBookmarkCache() { localStorage.setItem(RV.BOOKMARK_KEY, JSON.stringify([...BOOKMARKS])); }
function isBookmarked(id) { return BOOKMARKS.has(id); }

/* 캐시에서 즉시 초기화(스크립트 로드 시 1회) */
try { BOOKMARKS = new Set(JSON.parse(localStorage.getItem(RV.BOOKMARK_KEY) || "[]")); } catch (e) {}

/* vault 공유 목록을 받아 메모리+캐시 갱신(로드 시 호출). 실패하면 캐시 유지. */
async function fetchBookmarksShared() {
  try {
    const res = await ghFetch("contents/" + RV.BOOKMARK_PATH, { accept: "application/vnd.github.raw", cache: "no-store" });
    if (res.ok) {
      BOOKMARKS = new Set((await res.json()).ids || []);
      saveBookmarkCache();
      return;
    }
    // 파일이 아직 없으면(404) 이 기기 캐시를 공유 원본으로 시드(기존 별표 보존)
    if (res.status === 404 && BOOKMARKS.size) {
      await ghFetch("contents/" + RV.BOOKMARK_PATH, {
        method: "PUT",
        body: { message: "bookmarks init", content: encodeUtf8B64(JSON.stringify({ ids: [...BOOKMARKS] }, null, 2)) },
      });
    }
  } catch (e) { /* 네트워크 실패 시 캐시 유지 */ }
}

/* vault 파일에 id 추가/삭제 반영(sha 충돌 409/422 재시도). 비필수 — 실패해도 캐시엔 남음. */
async function persistBookmark(id, add) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      let sha = null, ids = [];
      const res = await ghFetch("contents/" + RV.BOOKMARK_PATH, { cache: "no-store" });
      if (res.ok) { const o = await res.json(); sha = o.sha; try { ids = JSON.parse(decodeB64Utf8(o.content)).ids || []; } catch (e) {} }
      else if (res.status !== 404) return;
      const set = new Set(ids);
      if (add) set.add(id); else set.delete(id);
      const body = { message: `bookmark ${add ? "+" : "-"}${id}`, content: encodeUtf8B64(JSON.stringify({ ids: [...set] }, null, 2)) };
      if (sha) body.sha = sha;
      const put = await ghFetch("contents/" + RV.BOOKMARK_PATH, { method: "PUT", body });
      if (put.ok) return;
      if (put.status !== 409 && put.status !== 422) return;
    } catch (e) { return; }
  }
}

/* 낙관적 토글: 메모리·캐시 즉시 반영 후 vault에 백그라운드 저장. 반영된 상태 반환. */
function toggleBookmark(id) {
  const add = !BOOKMARKS.has(id);
  if (add) BOOKMARKS.add(id); else BOOKMARKS.delete(id);
  saveBookmarkCache();
  persistBookmark(id, add);
  return add;
}

function tgEsc(s) {
  return (s == null ? "" : String(s)).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

/* 하이라이트 → 보기 좋은 텍스트: 읽기조각(segs) → rects+글자좌표 복원 → 저장 text.
   pageItems = {page: [{str,x,y,w,h}]} (없으면 segs/text만 사용). highlights.html displayText와 동일 로직. */
function hlDisplayText(h, pageItems) {
  if (h.segs && h.segs.length) return h.segs.join("\n");
  if (h.text) return h.text;
  const items = pageItems && pageItems[h.page];
  if (items && items.length && h.rects && h.rects.length) {
    const lines = [];
    for (const r of h.rects) {
      const inside = items.filter((it) => {
        const cx = it.x + it.w / 2, cy = it.y + it.h / 2;
        return cx >= r.x - 0.01 && cx <= r.x + r.w + 0.01 && cy >= r.y - 0.004 && cy <= r.y + r.h + 0.004;
      });
      const t = inside.map((it) => it.str).join("").replace(/\s+/g, " ").trim();
      if (t) lines.push(t);
    }
    if (lines.length) return lines.join("\n");
  }
  return h.text || "";
}

/* 모아보기 내용만 전송: 텍스트 하이라이트(인용, 4096자 분할) → 이미지 캡처 개별.
   제목은 커버(tgSendReport)에서 이미 보냈으므로 여기선 넣지 않는다. 반환 {texts, images}. */
async function tgSendHighlights(highlights, pageItems) {
  const sorted = highlights.slice().sort((a, b) => a.page - b.page);
  const texts = sorted.filter((h) => h.type !== "image");
  const images = sorted.filter((h) => h.type === "image" && h.clip);
  const blocks = texts.map((h) =>
    `<blockquote>(p.${h.page}) ${tgEsc(hlDisplayText(h, pageItems).replace(/\n/g, " "))}</blockquote>`);
  // 개별 전송은 best-effort: 인증오류(토큰)만 위로 던지고, 나머지 실패는 세고 계속.
  let failed = 0;
  const send = async (fn) => {
    try { await fn(); return true; }
    catch (e) {
      if (e instanceof TgError && /토큰|chat_id/.test(e.message)) throw e;
      console.error("tg 항목 전송 실패:", e); failed++; return false;
    }
  };
  let buf = "";
  const flush = async () => { if (buf.trim()) { await send(() => tgSendMessage(buf)); buf = ""; } };
  for (const b of blocks) {
    if ((buf + "\n\n" + b).length > 3800) await flush();
    buf = buf ? buf + "\n\n" + b : b;
  }
  await flush();
  let sentImg = 0;
  for (const h of images) {
    const blob = await fetchImageBlob(h.clip);
    if (blob && await send(() => tgSendPhoto(blob, `(p.${h.page}) ✂️ 캡처`))) sentImg++;
    await new Promise((r) => setTimeout(r, 350));   // 사진 연속 전송 시 속도제한(429) 완화
  }
  return { texts: texts.length, images: sentImg, failed };
}

/* 리포트 항목(reports.json entry)을 텔레그램으로: ① 제목 + 첫 페이지 이미지 → ② 모아보기 내용.
   index 카드에서 사용. 하이라이트 0개면 오류. */
async function tgSendReport(report) {
  const anno = await loadAnnotations(report.id);
  const hls = (anno.data && anno.data.highlights) || [];
  if (!hls.length) throw new Error("보낼 하이라이트가 없습니다");
  // 좌표(텍스트 복원용)
  let pageItems = null;
  if (report.layout_path) {
    try {
      const lr = await ghFetch("contents/" + report.layout_path, { accept: "application/vnd.github.raw", cache: "no-store" });
      if (lr.ok) {
        const j = await lr.json();
        pageItems = {};
        for (const [n, pg] of Object.entries((j && j.pages) || {})) {
          pageItems[n] = (pg.spans || []).map((s) => ({ str: s.s, x: s.x, y: s.y, w: s.w, h: s.h }));
        }
      }
    } catch (e) { /* 좌표 없으면 segs/text로 폴백 */ }
  }
  // ① 커버: 제목 + 기본 정보 + 첫 페이지 이미지(고해상 pages/1.jpg 우선, 없으면 썸네일)
  const info = [
    report.broker, report.sector,
    report.publish_date || (report.uploaded_at || "").slice(0, 10),
    report.pages ? report.pages + "p" : null,
    (report.size_mb != null) ? report.size_mb + "MB" : null,
  ].filter(Boolean).join(" · ");
  const caption = `📄 <b>${tgEsc(report.title || report.id)}</b>`
    + (info ? `\n${tgEsc(info)}` : "");
  const coverPath = (report.pages_dir ? report.pages_dir + "/1.jpg" : null) || report.thumb || null;
  // 커버도 best-effort: 인증오류만 위로, 사진 실패 시 제목 텍스트로 폴백
  const coverErr = (e) => { if (e instanceof TgError && /토큰|chat_id/.test(e.message)) throw e; console.error("커버 전송 실패:", e); };
  let coverSent = false;
  if (coverPath) {
    const blob = await fetchImageBlob(coverPath);
    if (blob) { try { await tgSendPhoto(blob, caption); coverSent = true; } catch (e) { coverErr(e); } }
  }
  if (!coverSent) { try { await tgSendMessage(caption); } catch (e) { coverErr(e); } }
  // ② 모아보기 내용
  const res = await tgSendHighlights(hls, pageItems);
  return res;   // 전송 이력(markTgSent)은 호출부에서 낙관적으로 처리
}
