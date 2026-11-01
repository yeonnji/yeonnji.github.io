// 홈 첫 화면과 PDF 표지에 쓰는 자기소개.
// 공개 웹에는 이메일만 싣는다. 전화번호는 PDF 출력본에서만 사용한다(PDF_PHONE 환경변수).
export const profile = {
  name: "지연",
  nameEn: "Yeon Ji",
  role: "장면 재구성 연구 · 소프트웨어 개발",
  field: "3D Gaussian Splatting · 장면 복원 · 센서·영상 시스템 개발",
  /** 소개 본문. 문장 하나가 문단 하나 (전문 분야에 전체 이름이 있어 본문은 3DGS로 줄인다) */
  intro: [
    "3DGS 기반 장면 복원을 연구하고, 라이다 운용 소프트웨어와 영상 AI 관제 연동 기능을 개발했습니다.",
    "문제가 생기면 처리 과정을 단계별로 살펴 원인을 찾고, 고친 뒤에는 목적에 맞는 검증 기준을 세워 실제로 개선됐는지 확인합니다.",
  ],
  /** 소개 문단 아래 굵게 표시하는 주요 언어·프레임워크 */
  stack: ["C#", "C++", "Python", "PyTorch"],
  email: "jyeon959@gmail.com",
  github: "https://github.com/yeonnji",
  /** public/ 아래 이력서 PDF. 파일이 없으면 링크를 싣지 않는다 */
  resume: "/resume.pdf",

  sections: {
    experiences: { title: "프로젝트", lead: "3D·그래픽스, AI·데이터, 시스템 개발 분야로 나눴고 제1저자 연구를 맨 앞에 두었습니다. 카드를 누르면 문제, 맡은 범위, 판단, 과정, 결과와 한계를 담은 상세 페이지로 이동합니다." },
    skills: {
      title: "역량·기술",
      lead: "할 수 있는 일과 사용한 기술, 실제로 수행한 범위를 함께 정리했습니다. 기술을 쓴 과정과 판단은 관련 프로젝트 링크에서 볼 수 있습니다.",
    },
    cv: { title: "이력" },
    contact: { title: "연락처" },
  },
} as const;
