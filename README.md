# 지연 · 2D/3D 장면 재구성 포트폴리오

Astro + MDX 정적 사이트와 같은 콘텐츠로 만드는 A4 PDF. 실시간 3DGS 뷰어는 실제 PLY 검증 후 추가한다.

## 실행

Node 22.23.4 이상이 필요하다. 이 폴더의 `.tools/`에 포터블 Node 24를 두었다(시스템 Node와 별개).

```bash
export PATH="$PWD/.tools/node-v24.22.1-win-x64:$PATH"
npm install
npm run dev            # 개발 서버: 공개 확인 전 그림도 표시
npm run build          # 배포 빌드: 공개 확인 전 그림 제외
ALLOW_REVIEW_ASSETS=true npm run build   # 검토용 빌드: 그림 포함 (배포 금지)
```

## 원고와 이미지

사이트 내용의 원고는 저장소 밖 `career-materials/portfolio_web/포트폴리오_경험정리.md` 하나다. 원고가 바뀌면 그에 맞춰 `src/content/**/*.mdx`와 `src/data/*`를 고친다. 경험 하나 = MDX 파일 하나 = 홈 카드 하나 = 상세 페이지 하나이며, 카드 정보는 각 MDX 머리의 `card`에 있다.

```bash
npm run images:import -- <원고폴더>/images   # 경험별 이미지 → src/assets/figures/{public|review}/projects/<경험 id>/
```

- figures.yaml에서 public인 그림만 `figures/public`으로, 나머지는 git 제외 폴더 `figures/review`로 들어간다.

## PDF 출력

```bash
PDF_PHONE="010-…" npm run pdf     # pdf/portfolio.pdf (A4, 쪽 번호 포함)
```

- 개발 서버 전용 `/print/` 문서를 설치된 Edge(없으면 Chrome)로 출력한다. 브라우저를 따로 내려받지 않는다.
- 웹과 같은 MDX·데이터를 쓰고, 비교 슬라이더·β 위젯은 정적 이미지로, Ablation 탐색·뷰어 자리는 생략된다.
- 전화번호는 환경변수로만 넣는다. `/print/`는 배포 빌드에 없고 `pdf/`는 git에서 제외된다.

## 배포 (GitHub Pages)

1. GitHub에 공개 저장소 `yeonnji.github.io`를 만든다.
2. 이 폴더를 그 저장소의 `main`으로 푸시한다.
3. 저장소 Settings → Pages → Source를 **GitHub Actions**로 바꾼다.
4. `.github/workflows/deploy.yml`이 타입 검사 → 빌드 → 공개 전 그림 폴더 검사 → 배포를 실행한다.

## 3DGS 뷰어 검증 (3단계, 개발 전용)

```bash
python tools/inspect_ply.py 표준.ply 제안.ply --stats   # 가우시안 수·SH 차수·Spark 메모리 추정·분포
npm run dev                                           # http://localhost:4321/lab/splat/
```

- Splat Lab(`/lab/splat/`)은 개발 서버에서만 등록된다(`astro.config.mjs`의 dev-only-lab). 배포 빌드에는 들어가지 않는다.
- PLY는 파일 선택으로 브라우저 안에서만 읽는다. `.lab/` 폴더(git 제외)에 두면 `/lab/file/?name=파일명` URL로도 불러올 수 있다.
- 측정: 디코딩 시간, 첫 프레임, 가우시안 수, Spark SH 차수, GPU 메모리 추정, FPS(창이 보일 때만 유효), cameras.json 시점, 기준 이미지 대비 PSNR.
- `tools/make_test_ply.py`는 동작 점검용 합성 PLY를 만든다(연구 결과 아님).

## 구조

```
src/
  content/research/*.mdx   연구 경험 상세 (/research/<id>/)
  data/metrics.json        모든 정량 수치 (출처·평가 조건·확인 상태 포함)
  data/claims.yaml         핵심 문장. unverified는 본문에서 쓰면 빌드 실패
  data/figures.yaml        결과 이미지 목록과 공개 상태
  data/publications.yaml   논문
  data/profile.ts          홈·PDF 표지 자기소개
  data/cv.ts               이력 타임라인
  content/work/*.mdx       그 밖의 경험 상세 (/projects/<id>/)
  components/interactive/  2단계 인터랙션 (Canvas 2D·일반 JS, React 없음)
    ImageCompare           같은 크기 두 이미지 겹쳐 비교, 사례·비교 쌍 전환
    BetaWeightMap          소프트 마스크로 w = 1 + βM 재계산 (학습 결과는 바뀌지 않음)
    AblationExplorer       측정한 5개 조건만 표시, 그 밖의 조합은 "측정하지 않음"
  assets/figures/public/   공개 확인된 그림
  assets/figures/review/   공개 확인 전 그림 (git 제외)
docs/verification-log.md   원문 대조 기록과 확인 필요 항목
docs/licenses.md           공개 범위와 그림 공개 절차
```

## 원칙

- 수치는 본문에 직접 쓰지 않고 `MetricTable`로 `metrics.json`을 불러온다.
- 결과 이미지는 논문의 원본 3DGS 렌더러 출력만 쓴다. 웹 렌더러 출력은 정량·정성 근거로 쓰지 않는다.
