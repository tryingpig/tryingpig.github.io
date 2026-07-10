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
