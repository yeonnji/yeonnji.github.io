// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";

// 공개 확인 전 그림(src/assets/figures/review)을 빌드에 넣을지. 로컬 미리보기·PDF 검토용.
const allowReview = process.env.ALLOW_REVIEW_ASSETS === "true";

// GitHub Pages 사용자 사이트(yeonnji.github.io)를 기준으로 한다.
// 프로젝트 저장소로 배포할 경우 base를 "/<repo>/"로 바꾼다.
export default defineConfig({
  site: "https://yeonnji.github.io",
  base: "/",
  trailingSlash: "always",
  integrations: [
    mdx(),
    sitemap(),
    {
      // 3DGS 뷰어 검증용 실험 페이지(/lab/splat/)는 개발 서버에서만 등록해 배포 빌드에 섞이지 않게 한다.
      name: "dev-only-lab",
      hooks: {
        "astro:config:setup": ({ command, injectRoute }) => {
          if (command !== "dev") return;
          injectRoute({ pattern: "/lab/splat", entrypoint: "./src/lab/SplatLab.astro" });
          // .lab/ 폴더의 로컬 PLY를 /lab/file/?name=... 으로 제공 (개발 서버 전용)
          injectRoute({ pattern: "/lab/file", entrypoint: "./src/lab/file.ts" });
          // PDF 출력용 문서 (전화번호가 들어갈 수 있어 공개 사이트에는 만들지 않는다)
          injectRoute({ pattern: "/print", entrypoint: "./src/lab/Print.astro" });
        },
      },
    },
  ],
  vite: {
    define: { __ALLOW_REVIEW_ASSETS__: JSON.stringify(allowReview) },
  },
});
