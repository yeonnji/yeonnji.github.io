export const fmt = (v: number, digits: number) => v.toFixed(digits);

/** 기준(3DGS) 대비 변화. 높을수록 좋은 지표는 +, 낮을수록 좋은 지표는 감소폭을 보여준다. */
export function delta(base: number, ours: number, digits: number) {
  const d = ours - base;
  const sign = d > 0 ? "+" : d < 0 ? "−" : "±";
  return `${sign}${Math.abs(d).toFixed(digits)}`;
}

/** BASE_URL을 붙인 내부 링크 */
export const href = (path: string) => `${import.meta.env.BASE_URL.replace(/\/$/, "")}${path}`;

/** 경력·연구활동 기간: "YYYY.MM–YYYY.MM (N년 N개월)". 시작월과 종료월을 모두 포함해 센다(2021.10–2024.07 = 34개월). */
export function monthSpan(start: string, end: string) {
  const [y1, m1] = start.split(".").map(Number);
  const [y2, m2] = end.split(".").map(Number);
  const n = (y2 - y1) * 12 + (m2 - m1) + 1;
  if (!(n > 0)) throw new Error(`기간 오류: ${start}–${end}`);
  const len = [Math.floor(n / 12) && `${Math.floor(n / 12)}년`, n % 12 && `${n % 12}개월`].filter(Boolean).join(" ");
  return `${start}–${end} (${len})`;
}
