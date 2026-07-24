import { useEffect, useMemo, useRef, useState } from 'react';
import type { Post } from '../lib/posts';
import '../styles/postlist.css';

/* 아일랜드 ② — 검색 + 페이지당 개수 + 페이지네이션.
   Astro 가 이 컴포넌트를 빌드 타임에 한 번 렌더해 HTML 로 굽고(= 첫 화면엔 이미 글이 들어있음),
   브라우저에서 hydrate 해 검색/페이저를 살린다. 데이터는 props 로 들어오므로 fetch 가 없다.
   Hero·Nav·Footer 는 client: 지시어가 없어 React 가 아예 실려 나가지 않는다. */

const PER_PAGE_OPTIONS = [10, 20, 50, 100];

interface Props {
  posts: Post[];
  /** 처음 보여줄 개수. 사용자가 우상단에서 바꿀 수 있다. */
  perPage?: number;
}

export default function PostList({ posts, perPage: initialPerPage = 10 }: Props) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(initialPerPage);
  const [ppOpen, setPpOpen] = useState(false);
  const ppRef = useRef<HTMLDivElement>(null);

  // 드롭다운: 바깥 클릭 / Esc 로 닫는다
  useEffect(() => {
    if (!ppOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!ppRef.current?.contains(e.target as Node)) setPpOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPpOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [ppOpen]);

  // 검색 대상 문자열을 미리 만들어둔다 (제목 + 파일명, 기존 동작과 동일)
  const indexed = useMemo(
    () => posts.map((p) => ({ post: p, hay: (p.title + ' ' + p.file).toLowerCase() })),
    [posts]
  );

  const matched = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? indexed.filter((e) => e.hay.includes(q)) : indexed;
  }, [indexed, query]);

  const pages = Math.max(1, Math.ceil(matched.length / perPage));
  const current = Math.min(page, pages);
  const slice = matched.slice((current - 1) * perPage, (current - 1) * perPage + perPage);

  function go(next: number) {
    setPage(Math.min(pages, Math.max(1, next)));
    document.getElementById('study')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* 헤더의 개수 표시. 예전에는 index.astro 가 전체 개수를 정적으로 박아둬서
     검색으로 3건만 남아도 계속 64 로 보였다 → 검색 중일 때는 '걸린 수 / 전체'. */
  const countLabel = query.trim()
    ? `${matched.length} / ${posts.length}`
    : String(posts.length).padStart(2, '0');

  return (
    <>
      <div className="sec-head">
        <h2>Study &amp; Writings</h2>
        <span className="count">{countLabel}</span>
      </div>

      <div className="list-controls">
        <div className="search-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="search posts… (제목 검색)"
            autoComplete="off"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          />
        </div>

        {/* 한 페이지에 몇 개씩 뿌릴지 — 드롭다운. 바꾸면 첫 페이지로 되돌린다 */}
        <div className={`per-page${ppOpen ? ' open' : ''}`} ref={ppRef}>
          <button
            type="button"
            className="pp-trigger"
            aria-haspopup="listbox"
            aria-expanded={ppOpen}
            aria-label={`페이지당 글 수, 현재 ${perPage}개`}
            onClick={() => setPpOpen((v) => !v)}
          >
            <span className="pp-label">show</span>
            <span className="pp-value">{perPage}</span>
            <svg className="pp-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <ul className="pp-menu" role="listbox" aria-label="페이지당 글 수">
            {PER_PAGE_OPTIONS.map((n) => (
              <li key={n} role="option" aria-selected={n === perPage}>
                <button
                  type="button"
                  className={n === perPage ? 'active' : ''}
                  onClick={() => { setPerPage(n); setPage(1); setPpOpen(false); }}
                >
                  {n}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <ul className="posts">
        {slice.length === 0 ? (
          <li className="empty">검색 결과가 없습니다.</li>
        ) : (
          slice.map(({ post: p }) => (
            <li key={p.file}>
              {/* 같은 사이트 안의 글이라 현재 탭에서 연다 — 새 탭으로 열면 탭이 계속 쌓인다 */}
              <a href={'/' + p.file}>
                <img className="p-thumb" src={p.icon} alt="" width={62} height={62} loading="lazy" />
                <span className="p-body">
                  <span className="p-title">{p.title}</span>
                  <span className="p-date">{p.date}</span>
                </span>
              </a>
            </li>
          ))
        )}
      </ul>

      {pages > 1 && (
        <div className="pager">
          <button disabled={current === 1} onClick={() => go(current - 1)}>← prev</button>
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              className={i + 1 === current ? 'active' : ''}
              onClick={() => go(i + 1)}
            >
              {i + 1}
            </button>
          ))}
          <button disabled={current === pages} onClick={() => go(current + 1)}>next →</button>
        </div>
      )}
    </>
  );
}
