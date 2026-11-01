// 홈 "이력" 데이터. 출처: career-materials/profile.md (2026-10 기준).
// 소속·기간·직무 같은 기록만 적고, 수행 과정과 성과는 projects로 프로젝트 상세 페이지에 연결한다.
// 각 소항목 안은 최신 활동부터 적는다.
// 자격번호·학점처럼 제출처마다 값이 다르거나 공개가 불필요한 항목은 싣지 않는다.
import { monthSpan } from "../lib/format";

export type CvItem = {
  title: string;
  period: string;
  meta?: string;
  desc?: string;
  href?: string;
  /** 관련 프로젝트 상세 페이지 (경험 id와 표시 이름) */
  projects?: { id: string; label: string }[];
  /** 홈 소개의 경력·연구활동 요약에 쓰는 역할 이름 */
  summary?: string;
  children?: CvItem[];
};
export type CvGroup = { id: string; title: string; items: CvItem[] };

const company: CvItem = {
  title: "㈜에이치아이엔티 기업부설연구소",
  period: monthSpan("2021.10", "2024.07"),
  meta: "정규직 · 선임연구원 · R&D, 시스템 SW·응용프로그램 개발",
  desc: "그 밖에 라이다·카메라 복합 경계 시스템의 QGIS 기반 지도 화면 개발 참여",
  summary: "시스템 SW 개발",
  projects: [
    { id: "lidar-ops", label: "라이다 운용 프로그램" },
    { id: "control-system", label: "이기종 장비 통합관제" },
  ],
};

const lab: CvItem = {
  title: "인하대학교 미디어인공지능연구실",
  period: monthSpan("2024.09", "2026.08"),
  meta: "석사과정 연구·산학과제 · 3D 장면 복원 연구",
  summary: "3D 장면 복원 연구",
  desc: "그 밖에 의료영상 산학과제에서 3D 심장 초음파 볼륨 렌더러 파라미터 실험·컬러맵 제작, Unity 선반 가상훈련 콘텐츠 기획·개발(연구실 과제), NPC 병렬 스케줄링 공동연구(제2저자) 참여",
  projects: [
    { id: "illumination-3dgs", label: "광원 복원 연구" },
    { id: "endoscopic-specular", label: "내시경 정반사 연구" },
    { id: "hospital-event", label: "병원 관제 연동" },
  ],
};

/** 회사 재직과 대학원 연구활동을 한 타임라인으로. 성격(정규직 / 석사과정 연구·산학과제)은 meta 첫머리로 구분한다 */
export const careerResearch: CvGroup = {
  id: "career-research",
  title: "경력 및 연구활동",
  items: [lab, company],
};

export const education: CvGroup = {
  id: "education",
  title: "학력",
  items: [
    {
      title: "인하대학교 대학원 전기컴퓨터공학과",
      period: "2024.09–2026.08",
      meta: "인공지능전공 · 공학석사",
      desc: "학위논문: 3차원 가우시안 스플래팅의 조명 복원 기법 연구",
      projects: [{ id: "illumination-3dgs", label: "관련 연구" }],
    },
    { title: "고려사이버대학교 소프트웨어공학과", period: "2022.03–2024.02", meta: "학사" },
    { title: "유한대학교 스마트콘텐츠학과", period: "2020.03–2022.02", meta: "모바일앱콘텐츠전공 · 전문학사" },
  ],
};

export const awards: CvGroup = {
  id: "awards",
  title: "수상",
  items: [
    {
      title: "MUE 2026 Best Paper Award",
      period: "2026.04",
      meta: "International Conference on Multimedia and Ubiquitous Engineering",
      projects: [{ id: "endoscopic-specular", label: "내시경 정반사 연구" }],
    },
    {
      title: "KCC 2025 우수논문상",
      period: "2025.07",
      meta: "한국정보과학회 · CG/HCI/AI·메타버스/가상증강현실 분야",
      projects: [{ id: "illumination-3dgs", label: "광원 복원 연구" }],
    },
    { title: "오픈소스 GIS 교육 우수상", period: "2023.02", meta: "한국국토정보공사 공간정보아카데미" },
    { title: "창업경진대회 장려상 (2회)", period: "2021.12 · 2020.12", meta: "유한대학교 · 팀 프로젝트 (어린이집 공기질 앱, 중국어 학습 앱)" },
  ],
};

/** 논문. 상세 데이터는 publications.yaml, 여기는 이력용 한 줄씩 (최신순) */
export const papers: CvGroup = {
  id: "papers",
  title: "논문",
  items: [
    {
      title: "3차원 가우시안 스플래팅의 조명 복원 기법 연구",
      period: "2026.08",
      meta: "인하대학교 공학석사학위논문",
      projects: [{ id: "illumination-3dgs", label: "광원 복원 연구" }],
    },
    {
      title: "3차원 가우시안 스플래팅에서의 조명 표현 개선법",
      period: "2026.04",
      meta: "정보과학회논문지 53(4) · 제1저자",
      projects: [{ id: "illumination-3dgs", label: "광원 복원 연구" }],
    },
    {
      title: "Removal of Specular Highlights in Endoscopic Images using 3D Gaussian Splatting",
      period: "2026.04",
      meta: "MUE 2026 · 제1저자 · Best Paper Award",
      projects: [{ id: "endoscopic-specular", label: "내시경 정반사 연구" }],
    },
    {
      title: "조도 중심 SfM 기법을 활용한 고정밀 Gaussian Splatting",
      period: "2025.07",
      meta: "KCC 2025 · 제1저자 · 우수논문상",
      projects: [{ id: "illumination-3dgs", label: "광원 복원 연구" }],
    },
    {
      title: "A Parallel Scheduling Method for Large-Scale NPC Management Based on State Classification",
      period: "2025.05",
      meta: "한국차세대컴퓨팅학회 학술대회 · 제2저자 (Unity DOTS 구현·실험 지원)",
    },
  ],
};

/** 특허. 발명자는 본인 포함 3인, 특허권자는 회사 */
export const patents: CvGroup = {
  id: "patents",
  title: "특허",
  items: [
    {
      title: "라이다 기반 실시간 감지 시스템의 데이터 처리를 가속화하는 방법",
      period: "2022.05 등록",
      meta: "제10-2400435호 · 공동발명자 (3인) · 특허권자 ㈜에이치아이엔티",
    },
  ],
};

export const certs: CvGroup = {
  id: "certs",
  title: "자격",
  items: [
    { title: "데이터분석 준전문가 (ADsP)", period: "2026.08", meta: "한국데이터산업진흥원" },
    { title: "정보처리기사", period: "2024.06", meta: "한국산업인력공단" },
  ],
};

export const training: CvGroup = {
  id: "training",
  title: "교육 · 학술 활동",
  items: [
    { title: "ICML 2026 · Pacific Graphics 2025 참석", period: "2026.07, 2025.10", meta: "머신러닝·컴퓨터그래픽스 분야 연구 발표·기술 세션 참석, 연구 동향 조사" },
    { title: "Web GIS를 활용한 공간정보서비스 개발", period: "2024.04", meta: "한국국토정보공사 공간정보아카데미 · 22시간" },
    { title: "공간정보 활용을 위한 Node.js 웹서버 프로그래밍", period: "2024.03", meta: "한국국토정보공사 공간정보아카데미 · 22시간" },
    { title: "오픈소스 GIS 서비스 개발자 입문", period: "2023.02", meta: "한국국토정보공사 공간정보아카데미 · 22시간" },
  ],
};

/** 홈 소개의 경력·연구활동 요약: 회사 재직과 대학원 연구활동을 나눠 소속·역할·기간만 */
export const background = [
  { tag: "실무 경력", it: company },
  { tag: "대학원 연구", it: lab },
].map(({ tag, it }) => ({ tag, role: it.summary!, org: it.title, period: it.period }));

/** 이력 영역의 두 열 (높이를 맞춰 배치). 왼쪽 경력 및 연구활동→논문→특허→자격, 오른쪽 학력→수상→교육·학술 활동 (PDF도 같은 구성) */
export const cvColumns: CvGroup[][] = [[careerResearch, papers, patents, certs], [education, awards, training]];
