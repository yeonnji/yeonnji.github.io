// 홈 '역량·기술' 영역. 역량 하나에 실제 사용한 기술과 수행 범위, 근거가 되는 경험 상세 페이지를 묶는다.
// 수행 범위는 각 경험 상세의 '담당 범위와 협업'에 적힌 내용 안에서만 쓴다. 기존 코드를 분석·실험한 범위는 그렇게 밝힌다.
export interface Skill {
  name: string;
  tech: string[];
  /** 실제 활용 범위 1~2문장 */
  scope: string;
  /** 근거 경험: 경험 id와 이 역량에서 보여줄 짧은 이름 */
  links: { id: string; label: string }[];
}

export const skills: Skill[] = [
  {
    name: "3D 장면 복원",
    tech: ["Python", "PyTorch", "3D Gaussian Splatting", "COLMAP"],
    scope:
      "Inria 3DGS 구현을 바탕으로 광원 번짐과 정반사 문제에 맞춘 방법을 설계하고, SfM 입력 준비·가중 손실·정반사 추정 등 학습 코드를 직접 수정했습니다. 표준 3DGS와 비교했고, 광원 연구에서는 구성요소 제거 실험으로 각 요소의 효과를 확인했습니다.",
    links: [
      { id: "illumination-3dgs", label: "광원 복원 연구" },
      { id: "endoscopic-specular", label: "내시경 정반사 연구" },
    ],
  },
  {
    name: "AI 모델 개발·데이터 검증",
    tech: ["Python", "PyTorch", "Transformers"],
    scope:
      "XLM-RoBERTa·ViT 특징을 결합하는 멀티모달 분류 모델의 구조를 수정하고, 등급 거리 벌점과 라벨이 있는 위험요소만 반영하는 손실 함수를 구현해 학습·평가했습니다. 병원 과제에서는 라벨 구간과 원본 영상 시각을 대조해 불일치를 찾고 수정 라벨 기준으로 재처리했습니다.",
    links: [
      { id: "argus", label: "게임 연령등급 분류" },
      { id: "hospital-event", label: "병원 영상 데이터 검증" },
    ],
  },
  {
    name: "응용프로그램 개발",
    tech: ["C#", ".NET", "WinForms", "TCP · JSON"],
    scope:
      "라이다 상태 표시, ENABLE·BLOCK 제어, 센서 설정 변경 화면과 통신 지연 표시를 개발하고, 최종 버전에서 최대 16채널 선택·표시와 설정 저장·불러오기를 구현했습니다. 다른 개발자가 만든 3D 그래픽 기능은 인수해 유지보수했습니다.",
    links: [{ id: "lidar-ops", label: "라이다 운용 프로그램" }],
  },
  {
    name: "백엔드·시스템 연동",
    tech: ["C++", "Node.js", "ASP.NET Core", "MariaDB", "PostgreSQL"],
    scope:
      "이상행동 판정 결과를 별도 스레드로 관제시스템에 보내는 C++ 전송 모듈, 이기종 장비의 상태·이벤트를 수집·저장해 화면에 전달하는 Node.js 백엔드, 분석 이력의 검색·상세·주간 요약을 제공하는 ASP.NET Core API를 개발했습니다.",
    links: [
      { id: "hospital-event", label: "병원 관제 연동" },
      { id: "control-system", label: "이기종 장비 통합관제" },
      { id: "railink", label: "철도 복합물류 플랫폼" },
    ],
  },
];
