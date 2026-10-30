// 원고 폴더의 경험별 이미지를 저장소로 가져온다.
//   node scripts/import-images.mjs <이미지폴더>
// <이미지폴더>/<경험 id>/파일 → figures.yaml에서 그 파일을 쓰는 그림이 public이면 src/assets/figures/public/projects/<경험 id>/,
// 그 밖(review·미등록)이면 git에서 제외되는 src/assets/figures/review/projects/<경험 id>/로 복사한다.
import { readFile, readdir, mkdir, copyFile, rm, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";

const imagesDir = process.argv[2];
if (!imagesDir) {
  console.error("사용: node scripts/import-images.mjs <이미지폴더>");
  process.exit(1);
}

const figRoot = "src/assets/figures";
const imageExt = /\.(png|jpe?g|webp)$/i;
const ids = [...(await readdir("src/content/work")), ...(await readdir("src/content/research"))]
  .filter((n) => n.endsWith(".mdx"))
  .map((n) => n.replace(/\.mdx$/, ""));

const statusOf = new Map();
for (const fig of parse(await readFile("src/data/figures.yaml", "utf8")) ?? [])
  for (const p of Object.values(fig.panels)) statusOf.set(p.file, fig.status);

const same = async (a, b) => existsSync(b) && (await readFile(a)).equals(await readFile(b));
const copied = [];
const unregistered = [];
for (const id of ids) {
  const src = path.join(imagesDir, id);
  if (!existsSync(src)) continue;
  for (const f of (await readdir(src)).filter((f) => imageExt.test(f))) {
    const rel = `projects/${id}/${f}`;
    const status = statusOf.get(rel);
    if (!status) unregistered.push(rel);
    const dir = status === "public" ? "public" : "review";
    const other = path.join(figRoot, dir === "public" ? "review" : "public", rel);
    const to = path.join(figRoot, dir, rel);
    if (existsSync(other)) await rm(other);
    if (await same(path.join(src, f), to)) continue;
    await mkdir(path.dirname(to), { recursive: true });
    await copyFile(path.join(src, f), to);
    copied.push(`${to} (${Math.round((await stat(to)).size / 1024)} KB)`);
  }
}

console.log(`가져옴: ${copied.length}개`);
for (const c of copied) console.log(`  ${c}`);
if (unregistered.length) console.log(`\nfigures.yaml에 아직 없는 이미지 (review로 넣음):\n  ${unregistered.join("\n  ")}`);
