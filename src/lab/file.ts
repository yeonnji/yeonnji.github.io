// 개발 서버 전용: 프로젝트의 .lab/ 폴더에 둔 PLY·SPZ 파일을 Splat Lab에 제공한다.
import type { APIRoute } from "astro";
import { readFile } from "node:fs/promises";
import path from "node:path";

// 쿼리 문자열을 읽어야 하므로 요청 시 실행한다 (개발 서버에서만 등록되는 경로라 빌드에는 영향 없음).
export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const name = url.searchParams.get("name") ?? "";
  // 하위 폴더나 상위 경로 접근을 막는다.
  if (!name || name !== path.basename(name)) return new Response("bad name", { status: 400 });
  try {
    const bytes = await readFile(path.join(process.cwd(), ".lab", name));
    return new Response(bytes, { headers: { "Content-Type": "application/octet-stream", "Cache-Control": "no-store" } });
  } catch {
    return new Response("not found", { status: 404 });
  }
};
