import { getCollection, type CollectionEntry } from "astro:content";

// 연구(research)와 그 밖의 경험(work)을 홈 목록 하나로 합친다. 순서는 card.order.
export type Experience =
  | { kind: "research"; id: string; path: string; entry: CollectionEntry<"research"> }
  | { kind: "work"; id: string; path: string; entry: CollectionEntry<"work"> };

export const categoryLabels = { "3d": "3D·그래픽스", ai: "AI·데이터", system: "시스템 개발" } as const;

/** 홈 프로젝트 영역 (분야별). card.group이 hidden인 경험은 어디에도 싣지 않는다 */
export const groups = [
  { id: "3d", title: categoryLabels["3d"], lead: "제1저자로 문제 정의부터 논문까지 맡은 3DGS 장면 복원 연구 2편입니다." },
  { id: "ai", title: categoryLabels.ai, lead: "영상·라벨 데이터를 검증하고, 모델을 학습·평가한 결과를 병원 관제시스템과 웹 화면에 붙였습니다." },
  { id: "system", title: categoryLabels.system, lead: "라이다 운용 프로그램, 이기종 장비 통합관제, 팀장으로 배포까지 맡은 웹 플랫폼입니다." },
] as const;

/** 홈·이력·상세 페이지에 싣는 경험 (hidden 제외) */
export async function getExperiences(): Promise<Experience[]> {
  return (await getAllExperiences()).filter((e) => e.entry.data.card.group !== "hidden");
}

async function getAllExperiences(): Promise<Experience[]> {
  const research = (await getCollection("research")).map(
    (entry) => ({ kind: "research", id: entry.id, path: `/research/${entry.id}/`, entry }) as const,
  );
  const work = (await getCollection("work")).map(
    (entry) => ({ kind: "work", id: entry.id, path: `/projects/${entry.id}/`, entry }) as const,
  );
  const ids = new Set<string>();
  for (const e of [...research, ...work]) {
    if (ids.has(e.id)) throw new Error(`경험 id 중복: ${e.id}`);
    ids.add(e.id);
  }
  return [...research, ...work].sort((a, b) => a.entry.data.card.order - b.entry.data.card.order);
}

/** 상세 페이지 아래의 이전·다음 경험 */
export async function neighbors(id: string) {
  const list = await getExperiences();
  const i = list.findIndex((e) => e.id === id);
  return { prev: list[i - 1], next: list[i + 1] };
}

export async function publicationsFor(id: string) {
  return (await getCollection("publications"))
    .filter((p) => p.data.experience === id)
    .sort((a, b) => a.data.order - b.data.order);
}
