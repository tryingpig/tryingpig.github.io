// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

// GitHub Pages(사용자 페이지)는 루트 도메인이라 base 는 '/'.
// 산출물은 dist/ 에 순수 정적 파일로만 떨어진다 → Actions 는 dist 만 업로드하면 된다.
export default defineConfig({
  site: 'https://tryingpig.github.io',

  build: {
    // study/*.html 처럼 이미 확장자가 있는 정적 파일과 충돌하지 않도록 파일 그대로 출력
    format: 'file',
  },

  integrations: [react()],
});