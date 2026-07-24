import fs from 'node:fs';
import path from 'node:path';
import { TOPIC_ICONS, autoIconSvg } from './icons';

export type Post = {
  file: string;   // 'study/260720_....html'
  date: string;   // 'YYYY-MM-DD HH:MM'
  title: string;  // 리포트 HTML 의 <title>
  icon: string;   // '/assets/px/xxx.svg'
};

const PUBLIC = path.join(process.cwd(), 'public');
const AUTO_DIR = path.join(PUBLIC, 'assets', 'px', 'auto');

/* 아이콘 매칭이 안 되는 글은 파일명 해시로 픽셀 타일을 만들어 실제 .svg 로 떨궈둔다.
   기존 구현은 이걸 브라우저에서 data URI 로 만들었는데, 빌드 때 파일로 뽑으면
   HTML 이 얇아지고 브라우저 캐시도 탄다. 해시가 결정적이라 빌드마다 같은 파일이 나온다. */
function autoIconPath(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const name = (h >>> 0).toString(16).padStart(8, '0');
  const out = path.join(AUTO_DIR, `${name}.svg`);
  if (!fs.existsSync(out)) {
    fs.mkdirSync(AUTO_DIR, { recursive: true });
    fs.writeFileSync(out, autoIconSvg(seed), 'utf-8');
  }
  return `/assets/px/auto/${name}.svg`;
}

function resolveIcon(file: string): string {
  const hit = TOPIC_ICONS.find(([re]) => re.test(file));
  return hit ? `/assets/px/${hit[1]}.svg` : autoIconPath(file);
}

/* ★ 여기가 Astro 로 옮기는 핵심 이유 ★
   기존에는 이 <title> 추출을 브라우저가 했다. 홈에 들어올 때마다 study/*.html 64개를
   전부(1.68MB) 내려받아 정규식으로 제목만 뽑고 나머지는 버렸다.
   이제는 빌드할 때 서버에서 딱 한 번 읽고, 결과 제목만 HTML 에 박혀 나간다. */
export function loadPosts(): Post[] {
  const raw = JSON.parse(fs.readFileSync(path.join(PUBLIC, 'posts.json'), 'utf-8')) as
    { file: string; date: string }[];

  const posts: Post[] = [];
  for (const entry of raw) {
    const abs = path.join(PUBLIC, entry.file);
    if (!fs.existsSync(abs)) {
      console.warn(`[posts] posts.json 에 있으나 파일이 없음 — 건너뜀: ${entry.file}`);
      continue;
    }
    const html = fs.readFileSync(abs, 'utf-8');
    const m = html.match(/<title>(.*?)<\/title>/is);
    posts.push({
      file: entry.file,
      date: entry.date,
      title: m ? m[1].trim() : entry.file,
      icon: resolveIcon(entry.file),
    });
  }

  // 반대 방향 누락도 알려준다 — study/ 에 있는데 posts.json 에 등록 안 된 글
  const listed = new Set(raw.map((e) => e.file.replace(/^study\//, '')));
  for (const f of fs.readdirSync(path.join(PUBLIC, 'study'))) {
    if (f.endsWith('.html') && !listed.has(f)) {
      console.warn(`[posts] study/ 에 있으나 posts.json 에 없음 — 목록에서 빠짐: ${f}`);
    }
  }

  posts.sort((a, b) => b.date.localeCompare(a.date));
  return posts;
}

export type Project = {
  emoji?: string; name_en?: string; name_ko?: string; desc?: string; tag?: string; url: string;
  /** '/assets/px/proj/xxx.svg' — 없으면 emoji 로 폴백한다 */
  icon?: string;
};

export function loadProjects(): Project[] {
  return JSON.parse(fs.readFileSync(path.join(PUBLIC, 'projects.json'), 'utf-8'));
}
