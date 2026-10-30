# 3DGS 웹 뷰어 검증 기록 (3단계)

## Spark 2.4.0에서 확인한 사실 (문서·패키지 기준)

| 항목 | 내용 | 출처 |
|---|---|---|
| 라이선스·의존성 | MIT, `three >= 0.180` 하나. React 불필요 | npm 메타데이터 |
| 포맷 | PLY(원본 3DGS·압축 PLY), SPZ, SPLAT, KSPLAT, SOG, RAD | loading-splats.md |
| 저장 형식 | 위치 float16, 스케일·색은 8비트 양자화. 16 B/splat(SH0) ~ 56 B/splat(SH3) | packed-splats.md |
| SH 양자화 | SH1 7비트, SH2 8비트, SH3 6비트 | packed-splats.md |
| 정렬 | GPU에서 거리 읽기 → 워커에서 버킷 정렬. 정렬 결과가 한 프레임 늦게 반영 | system-design.md |
| 권장 예산 | Android 1–2M, iPhone 1–3M, 데스크톱 1–5M splats | performance.md |
| 번들 | 워커·WASM이 JS에 내장. `spark.module.min.js` 약 2.8 MB → 버튼을 누를 때 동적 import | dist 확인 |

**원본 3DGS 렌더러와 결과가 같다고 가정하면 안 되는 근거:** 양자화(특히 SH3 6비트, 위치 float16), 정렬 방식과 지연. 시점 의존 광원 표현이 연구 대상이므로 SH 양자화 영향을 V2에서 직접 측정한다.

## 합성 데이터로 확인한 것 (2026-10-28)

`tools/make_test_ply.py`로 만든 300k splat, SH3 PLY 두 개로 확인했다. **연구 결과가 아니라 도구 동작 점검이다.**

| 항목 | 결과 |
|---|---|
| 원본 3DGS 속성 구성 PLY 로드 (V1) | 성공. Spark가 SH3로 인식 |
| 디코딩 시간 | 0.6–1.2 s / 300k splat (71 MB) |
| 카메라 변환 (V3) | cameras.json 형식 C2W(OpenCV) → Three.js 변환과 X축 180° 뒤집기 후 위치·방향·fovY(45.24°) 계산값 일치 |
| PSNR 측정 경로 (V2) | 자기 렌더 대비 59.5 dB(정렬 비결정성으로 무한대 아님), 다른 모델 대비 27.0 dB |
| 배포 빌드 제외 | `/lab/`, Spark 코드 모두 dist에 없음 (dist 2.3 MB 유지) |
| FPS | **측정 무효.** 브라우저 패널이 숨겨진 상태라 프레임이 제한됨. 창이 보이는 상태에서 다시 측정 필요 |

## 실제 데이터로 남은 검증

| ID | 해야 할 일 | 필요한 것 |
|---|---|---|
| V1 | 실제 DrJohnson PLY 로드 | 표준 3DGS·제안 방법 `point_cloud.ply` (30k) |
| V2 | 같은 테스트 시점에서 Spark 렌더 vs 원본 렌더러 출력 PSNR | `cameras.json`, 원본 `render.py` 출력 이미지 |
| V3 | 광원 ROI 3개 시점 프리셋 | 그림 7 View 1–3에 해당하는 테스트 카메라 이름 |
| V4 | SPZ/SOG 압축 후 크기·ROI 화질 | V1 이후 |
| V5 | 두 모델 동시 로드: 다운로드 총량, GPU 메모리, 첫 프레임, FPS | 데스크톱 GPU, 노트북 내장 GPU, 휴대폰 각 1대 |
| V6 | 캔버스 2개(현재 방식) vs 한 캔버스 분할 | V5 결과에 따라 |
| V8 | Hugging Face 실제 데이터셋 저장소에서 로드 | 업로드는 공개 여부 결정 후 |
