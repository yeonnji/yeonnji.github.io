import { getCollection, type CollectionEntry } from "astro:content";

// 연구(research)와 그 밖의 경험(work)을 홈 목록 하나로 합친다. 순서는 card.order.
export type Experience =
  | { kind: "research"; id: string; path: string; entry: CollectionEntry<"research"> }
  | { kind: "work"; id: string; path: string; entry: CollectionEntry<"work"> };

export const categoryLabels = { "3d": "3D·그래픽스", ai: "AI·데이터", system: "시스템 개발" } as const;

export async function getExperiences(): Promise<Experience[]> {
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
