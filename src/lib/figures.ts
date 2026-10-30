import type { ImageMetadata } from "astro";
import { getEntry } from "astro:content";
import { existsSync } from "node:fs";

declare const __ALLOW_REVIEW_ASSETS__: boolean;

// 그림 파일은 공개 여부에 따라 폴더를 나눈다.
//   src/assets/figures/public/  : 공개 확인된 그림 (항상 번들)
//   src/assets/figures/review/  : 공개 확인 전 그림 (git에 올리지 않음, 개발 서버·미리보기 빌드에서만 번들)
// 배포 빌드에서는 아래 조건식이 상수 false가 되어 review 이미지의 import 자체가 제거된다.
const publicModules = import.meta.glob<{ default: ImageMetadata }>("/src/assets/figures/public/**/*.{png,jpg,jpeg,webp}");
const reviewModules =
  import.meta.env.DEV || __ALLOW_REVIEW_ASSETS__
    ? import.meta.glob<{ default: ImageMetadata }>("/src/assets/figures/review/**/*.{png,jpg,jpeg,webp}")
    : {};

/** review 상태 그림을 보여줄지. 개발 서버이거나 ALLOW_REVIEW_ASSETS=true로 빌드한 경우만. */
export const showReview = import.meta.env.DEV || __ALLOW_REVIEW_ASSETS__;

export type ResolvedPanel = { key: string; alt: string; image: ImageMetadata | null };

export async function loadFigure(id: string) {
  const entry = await getEntry("figures", id);
  if (!entry) throw new Error(`figures.yaml에 없는 그림: ${id}`);
  const { data } = entry;
  const visible = data.status === "public" || (data.status === "review" && showReview);
  const dir = data.status === "public" ? "public" : "review";

  const panels: Record<string, ResolvedPanel> = {};
  for (const [key, p] of Object.entries(data.panels)) {
    const path = `/src/assets/figures/${dir}/${p.file}`;
    let image: ImageMetadata | null = null;
    if (visible) {
      const loader = (dir === "public" ? publicModules : reviewModules)[path];
      if (!loader) throw new Error(`그림 파일 없음: ${path} (${id}, status=${data.status})`);
      image = (await loader()).default;
    } else if (data.status !== "private" && !existsSync(`.${path}`) && process.env.CI !== "true") {
      // 로컬에서는 숨김 상태여도 파일이 제자리에 있는지 확인한다 (CI에는 review 폴더가 없다).
      console.warn(`[figures] 파일 없음: ${path} (${id})`);
    }
    panels[key] = { key, alt: p.alt, image };
  }
  return { id, ...data, visible, isReview: data.status === "review", panels };
}

export type LoadedFigure = Awaited<ReturnType<typeof loadFigure>>;
