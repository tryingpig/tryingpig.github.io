/* 주제별 픽셀 아이콘 매핑 — 기존 index.html 의 TOPIC_ICONS 표를 그대로 옮겼다.
   파일명으로 주제를 찾는다. 위에서부터 먼저 걸리는 규칙이 이김.
   새 주제 추가: pixel-icon 스킬로 public/assets/px/<이름>.svg 를 뽑고 여기 한 줄 추가.
   차이점 — 이 표는 이제 브라우저로 내려가지 않는다. 빌드할 때만 쓰인다. */
export const TOPIC_ICONS: [RegExp, string][] = [
  [/보툴리눔톡신/, 'toxin'],
  [/휴젤/, 'hugel'],
  [/인텍플러스/, 'intekplus'],
  [/전력공조냉각/, 'cooling'],
  [/FCBGA/i, 'fcbga'],
  [/유리기판/, 'glass'],
  [/MLCC/i, 'mlcc'],
  [/삼성전기/, 'samsungsem'],
  [/SKT|데이터센터/i, 'datacenter'],
  [/효성중공업|SST/i, 'transformer'],
  [/메가프로젝트/, 'mega'],
  [/리밸런싱/, 'rebalance'],
  [/800VDC/i, 'vdc800'],
  [/_hbs_/i, 'hbs'],
  [/_hbf_/i, 'hbf'],
  [/_cpo_/i, 'cpo'],
  [/지스케일러|zscaler/i, 'zscaler'],
  [/AI에이전트/, 'aiagent'],
  [/대덕전자/, 'daeduk'],
  [/AI반도체|DSP|NPU/i, 'npu'],
  [/동국제약|마데카솔|더마코스메틱/, 'dongkook'],
  [/행동주의|타깃스크리닝|월가의암살자|위임장/i, 'proxycard'],
  [/클라우드스트라이크|크라우드스트라이크|crowdstrike/i, 'crowdstrike'],
  [/팔로알토|palo\s*alto|PANW/i, 'paloalto'],
  [/AIRAN|AI[_ ]?RAN/i, 'celltower'],
  [/에치에프알|HFR/i, 'opticalfiber'],
];

/* 매칭되는 주제가 없을 때 — 파일명 해시로 색과 무늬가 정해지는 픽셀 타일.
   좌우 대칭이라 아이덴티콘처럼 보이고, 글마다 색이 달라 회색 문서가 줄줄이 서지 않는다.
   기존과 동일한 해시(FNV-1a + xorshift)라 같은 파일명이면 같은 그림이 나온다. */
export function autoIconSvg(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  let r = h >>> 0;
  const rnd = () => (r = Math.imul(r ^ (r >>> 15), 2246822507) >>> 0) / 4294967296;
  const hue = (h >>> 0) % 360;
  const fg = `hsl(${(hue + 8) % 360},70%,70%)`;

  let cells = '';
  for (let y = 3; y <= 12; y++) {
    for (let x = 3; x <= 7; x++) {
      if (rnd() > 0.45) {
        cells += `<rect x="${x}" y="${y}" width="1" height="1"/>`
              +  `<rect x="${15 - x}" y="${y}" width="1" height="1"/>`;
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">`
    + `<defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1">`
    + `<stop offset="0" stop-color="hsl(${hue},42%,13%)"/>`
    + `<stop offset="1" stop-color="hsl(${(hue + 28) % 360},46%,26%)"/></linearGradient></defs>`
    + `<rect width="16" height="16" fill="url(#b)"/><g fill="${fg}">${cells}</g></svg>`;
}
