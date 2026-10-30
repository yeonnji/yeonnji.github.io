// 포트폴리오 PDF를 만든다: Astro 개발 서버를 띄워 /print/를 열고, 설치된 Edge(없으면 Chrome)로 A4 PDF를 출력한다.
// 사용: PDF_PHONE="010-…" node scripts/pdf.mjs [출력경로]
// 전화번호는 환경변수로만 받아 저장소에 남기지 않는다.
import { dev } from "astro";
import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const out = path.resolve(process.argv[2] ?? "pdf/portfolio.pdf");
await mkdir(path.dirname(out), { recursive: true });

const server = await dev({ root: process.cwd(), logLevel: "warn", server: { port: 4399 } });
const base = `http://localhost:${server.address.port}`;

let browser;
for (const channel of ["msedge", "chrome"]) {
  try {
    browser = await chromium.launch({ channel });
    break;
  } catch {
    // 다음 브라우저 시도
  }
}
if (!browser) {
  await server.stop();
  throw new Error("Edge나 Chrome을 찾지 못했습니다");
}

try {
  const page = await browser.newPage();
  await page.goto(`${base}/print/`, { waitUntil: "networkidle", timeout: 120_000 });
  // 지연 로딩 이미지를 모두 불러오고 글꼴이 준비될 때까지 기다린다.
  await page.evaluate(async () => {
    for (const img of document.images) img.loading = "eager";
    const pending = [...document.images].filter((img) => !img.complete);
    await Promise.all(
      pending.map(
        (img) =>
          new Promise((resolve) => {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
          }),
      ),
    );
    await document.fonts.ready;
  });
  await page.pdf({
    path: out,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate:
      '<div style="width:100%;font-size:7pt;color:#8a8f98;text-align:center;font-family:sans-serif"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
  });
  console.log(`PDF 저장: ${out}`);
} finally {
  await browser.close();
  await server.stop();
}
