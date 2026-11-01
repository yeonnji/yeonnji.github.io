import { defineCollection } from "astro:content";
import { glob, file } from "astro/loaders";
import { z } from "astro/zod";

const link = z.object({ label: z.string(), href: z.url() });
const source = z.object({ doc: z.string(), location: z.string() });

// 홈 경험 목록의 카드. 경험 하나 = 카드 하나 = 상세 페이지 하나(연구는 /research/, 그 밖은 /projects/).
const card = z.object({
  order: z.number(),
  /** 비중. 홈 카드 크기는 모두 같고, compact는 PDF에서 목록에만 싣는다(feature: 강조 · normal: 일반 · compact: 간결) */
  size: z.enum(["feature", "normal", "compact"]),
  /** 경험의 성격. 카드와 상세 페이지 머리에 표시한다 */
  kind: z.enum(["연구", "산학과제", "연구실 과제", "실무", "팀 프로젝트", "수업 프로젝트"]),
  /** 홈에서 놓일 분야 영역 (lib/experiences.ts의 groups). hidden이면 홈·이력·이전/다음에서 빼고 상세 페이지도 만들지 않는다 */
  group: z.enum(["3d", "ai", "system", "hidden"]),
  /** 내용이 아직 부족한 프로젝트. 홈 카드에 '수정 예정' 표시 */
  draft: z.boolean().default(false),
  /** 보완할 내용. 상세 페이지 머리에 '수정 예정' 목록으로 표시 */
  todo: z.array(z.string()).optional(),
  /** 수행 내용과 결과 1~2문장 */
  blurb: z.string(),
  /** 본인 역할. 팀 프로젝트는 맡은 범위가 드러나게 */
  role: z.string(),
  period: z.string(),
  tags: z.array(z.string()).min(1).max(4),
  categories: z.array(z.enum(["3d", "ai", "system"])).min(1),
  /** 논문·수상 등 대표 성과 한 줄 */
  badge: z.string().optional(),
  /** 결과 이미지 썸네일 (figures.yaml). 1~2개 패널을 나란히 놓는다 */
  thumb: z
    .object({ figure: z.string(), panels: z.array(z.string()).min(1).max(2), labels: z.array(z.string()).optional() })
    .optional(),
  /** 이미지가 없을 때 표지에 그리는 간단한 구성도. mine은 본인 담당 */
  diagram: z.array(z.object({ label: z.string(), mine: z.boolean().default(false) })).optional(),
});

const research = defineCollection({
  loader: glob({ base: "./src/content/research", pattern: "**/*.mdx" }),
  schema: z.object({
    title: z.string(),
    headline: z.string(),
    summary: z.string(),
    card,
    period: z.string(),
    org: z.string(),
    role: z.string(),
    team: z.string(),
    venues: z.array(z.string()),
    stack: z.array(z.string()),
    links: z.array(link).default([]),
    keyMetric: z.object({ value: z.string(), label: z.string(), condition: z.string() }),
  }),
});

// 연구 외 경험의 상세 페이지 (/projects/<id>/)
const work = defineCollection({
  loader: glob({ base: "./src/content/work", pattern: "**/*.mdx" }),
  schema: z.object({
    title: z.string(),
    headline: z.string(),
    summary: z.string(),
    card,
    period: z.string(),
    org: z.string(),
    role: z.string(),
    team: z.string().optional(),
    stack: z.array(z.string()),
    links: z.array(link).default([]),
    keyMetric: z.object({ value: z.string(), label: z.string(), condition: z.string() }).optional(),
  }),
});

const metrics = defineCollection({
  loader: file("src/data/metrics.json"),
  schema: z.object({
    title: z.string(),
    status: z.enum(["verified"]),
    source,
    alsoIn: z.array(source).default([]),
    conditions: z.array(
      z.object({ label: z.string(), value: z.string(), status: z.enum(["verified", "pending"]) }),
    ),
    columns: z.array(
      z.object({
        key: z.string(),
        label: z.string(),
        unit: z.string().optional(),
        better: z.enum(["higher", "lower"]),
        digits: z.number(),
      }),
    ),
    rows: z.array(
      z.object({
        group: z.string().optional(),
        method: z.string(),
        ours: z.boolean().default(false),
        summary: z.boolean().default(false),
        values: z.record(z.string(), z.number()),
        /** ablation 행: 켜진 모듈 */
        flags: z.record(z.string(), z.boolean()).optional(),
      }),
    ),
    notes: z.array(z.string()).default([]),
    /** 그룹 안에서 가장 좋은 값을 굵게 표시할지 (기준선 표처럼 비교가 아닌 경우 false) */
    highlightBest: z.boolean().default(true),
  }),
});

const figures = defineCollection({
  loader: file("src/data/figures.yaml"),
  schema: z.object({
    status: z.enum(["public", "review", "private"]),
    kind: z.enum(["diagram", "document", "comparison", "grid", "screenshot"]),
    source,
    dataset: z.string(),
    license: z.string(),
    caption: z.string(),
    panels: z.record(z.string(), z.object({ file: z.string(), alt: z.string() })),
  }),
});

const claims = defineCollection({
  loader: file("src/data/claims.yaml"),
  schema: z
    .object({
      status: z.enum(["verified", "scoped", "unverified"]),
      text: z.string(),
      source: z.string().optional(),
      scope: z.string().optional(),
    })
    .refine((c) => c.status !== "verified" || c.source, { message: "verified claim needs source" })
    .refine((c) => c.status !== "scoped" || c.scope, { message: "scoped claim needs scope" }),
});

const publications = defineCollection({
  loader: file("src/data/publications.yaml"),
  schema: z.object({
    order: z.number(),
    year: z.number(),
    venue: z.string(),
    title: z.string(),
    titleEn: z.string().optional(),
    authors: z.string(),
    role: z.string(),
    award: z.string().optional(),
    doi: z.string().optional(),
    /** 이 논문을 보여줄 경험 상세 페이지 id */
    experience: z.string().optional(),
    links: z.array(link).default([]),
  }),
});

export const collections = { research, work, metrics, figures, claims, publications };
