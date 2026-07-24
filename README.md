# tryingpig.github.io

노력하는뚱땡이의 학습공간 — 학습 리포트(STUDY)와 직접 만든 프로젝트를 모아둔 포털.
**Astro** 로 빌드하는 정적 사이트이며, GitHub Actions 가 `dist/` 를 GitHub Pages 로 배포한다.

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # → dist/
npm run preview  # 빌드 결과를 그대로 서빙
```

## 구조

```
src/
  pages/index.astro        홈. 빌드 타임에 글 목록을 만든다 (이 코드는 브라우저로 안 감)
  components/
    Nav / Hero / ProjectCard / Footer   .astro — JS 를 내보내지 않음
    ThemeToggle.astro                   다크/라이트 토글 (바닐라)
    PostList.tsx                        React 아일랜드 — 검색 + 페이저
  lib/
    icons.ts     ★ TOPIC_ICONS 주제→아이콘 매핑표 (봇이 자동으로 줄을 추가한다)
    posts.ts     public/study/*.html 의 <title> 추출 · 아이콘 결정 · 날짜 정렬
  styles/
    tokens.css   :root 디자인 토큰 (색·폰트)
    postlist.css PostList.tsx 용 (React 는 .astro scoped style 을 못 씀)

public/           ← 이 폴더가 곧 사이트 루트. 빌드하면 그대로 dist/ 로 복사된다
  study/*.html    리포트 원본. Astro 가 건드리지 않고 통과시킨다
  assets/px/      픽셀 아이콘 SVG + icons.json (원본 그리드)
  report-viewer/  증권사 리포트 뷰어 (독립 정적 앱)
  posts.json      글 목록 = 날짜 + 파일경로. 제목은 여기 없다 (HTML 에서 직접 읽음)
  projects.json   프로젝트 카드
```

경로 규칙: `public/study/x.html` → 배포 후 `https://tryingpig.github.io/study/x.html`.
`posts.json` 안의 `file` 값은 `public/` 을 뺀 `study/x.html` 형식을 쓴다.

## 왜 Astro 인가 (2026-07 이전)

이전에는 `index.html` 한 장이 브라우저에서 `posts.json` 을 읽고, **글 64개의 HTML(1.68MB)을
전부 내려받아 정규식으로 `<title>` 만 뽑아 쓰고 버렸다.** 글이 늘수록 홈이 무거워지는 구조였다.
지금은 그 작업을 빌드 타임에 한 번만 한다.

| 홈 첫 로딩 | 이전 | 현재 |
|---|---|---|
| 전송량 (gzip) | 590.7 KB | 71.8 KB |
| HTTP 요청 | 67 | 5 |
| 글 제목 확보 | 런타임 fetch 64회 | 빌드 타임 1회 |

## 자동화와의 연결

`telegram-report-bot` 이 이 레포에 직접 쓴다. 구조를 바꿀 때 같이 봐야 하는 지점:

- `bot.py` — `PUBLIC_DIR`, `_disk()`, `register_posts()`, 에이전트 프롬프트의 저장 경로
- `icons.py` — `MAP_REL`(= `src/lib/icons.ts`), `PX_REL`(= `public/assets/px`)
  새 주제의 아이콘을 그려 `TOPIC_ICONS` 에 매핑 한 줄을 자동 추가한다

봇이 푸시할 때마다 Actions 가 빌드한다. **빌드가 깨지면 배포가 멈추고 직전 배포본이 유지된다** —
`src/` 를 손댔으면 푸시 전에 `npm run build` 로 확인할 것.
