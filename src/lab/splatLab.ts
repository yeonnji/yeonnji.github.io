// Splat Lab: Spark로 실제 PLY를 불러 호환성·성능을 측정하는 개발 전용 도구.
// 검증 항목: V1 로드, V2 원본 렌더와의 차이(PSNR), V3 카메라 변환, V5 두 모델 동시 로드, V6 분할 비교 방식.
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type Spark = typeof import("@sparkjsdev/spark");
type SlotKey = "a" | "b";
type CamEntry = { id: number; img_name: string; width: number; height: number; position: number[]; rotation: number[][]; fx: number; fy: number };

// Spark PackedSplats 저장 형식 (packed-splats.md): SH0 16 B, SH1 +8 B, SH2 +16 B, SH3 +16 B
const SH_BYTES = [16, 24, 40, 56];
// OpenCV(+y 아래, +z 앞) → OpenGL(+y 위, -z 앞): X축 180° 회전
const FLIP = new THREE.Quaternion(1, 0, 0, 0);

export async function startLab(root: HTMLElement) {
  const $ = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;
  const logEl = $<HTMLOListElement>("[data-log]");
  const log = (msg: string) => {
    const li = document.createElement("li");
    li.textContent = `${new Date().toLocaleTimeString()} ${msg}`;
    logEl.prepend(li);
  };

  log("Spark 모듈 불러오는 중…");
  const t0 = performance.now();
  const spark: Spark = await import("@sparkjsdev/spark");
  log(`Spark 모듈 로드 ${(performance.now() - t0).toFixed(0)} ms`);

  const stage = $<HTMLElement>("[data-stage]");
  stage.dataset.mode = "split";
  const camera = new THREE.PerspectiveCamera(50, 16 / 10, 0.01, 1000);
  camera.position.set(0, 0, 3);
  const controls = new OrbitControls(camera, stage);
  controls.enableDamping = true;

  type Slot = {
    key: SlotKey;
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    mesh: InstanceType<Spark["SplatMesh"]> | null;
    info: Record<string, string | number>;
    infoEl: HTMLElement;
  };
  const slots = {} as Record<SlotKey, Slot>;
  for (const key of ["a", "b"] as SlotKey[]) {
    const canvas = $<HTMLCanvasElement>(`[data-canvas="${key}"]`);
    canvas.style.pointerEvents = "none";
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
    const scene = new THREE.Scene();
    scene.add(new spark.SparkRenderer({ renderer }));
    slots[key] = { key, renderer, scene, mesh: null, info: {}, infoEl: $(`[data-slot="${key}"] [data-info]`) };
  }

  const gpuName = (() => {
    const gl = slots.a.renderer.getContext();
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "알 수 없음";
  })();

  // ---------- 크기 ----------
  let dprMode = "1";
  let fixedSize: { w: number; h: number } | null = null; // PSNR 측정 중 고정 해상도
  const resize = () => {
    const r = stage.getBoundingClientRect();
    const dpr = dprMode === "dpr" ? window.devicePixelRatio : Number(dprMode);
    for (const s of Object.values(slots)) {
      s.renderer.setPixelRatio(fixedSize ? 1 : dpr);
      s.renderer.setSize(fixedSize?.w ?? r.width, fixedSize?.h ?? r.height, false);
    }
    if (!fixedSize) {
      camera.aspect = r.width / r.height;
      camera.updateProjectionMatrix();
    }
  };
  new ResizeObserver(resize).observe(stage);
  $<HTMLSelectElement>("[data-dpr]").addEventListener("change", (e) => {
    dprMode = (e.target as HTMLSelectElement).value;
    resize();
  });

  // ---------- 로드 ----------
  let flip = true;
  const applyFlip = () => {
    for (const s of Object.values(slots)) if (s.mesh) s.mesh.quaternion.copy(flip ? FLIP : new THREE.Quaternion());
  };
  const renderInfo = (s: Slot) => {
    s.infoEl.innerHTML = Object.entries(s.info)
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`)
      .join("");
    updateJson();
  };

  const load = async (s: Slot, source: { bytes: ArrayBuffer; name: string } | { url: string }) => {
    unload(s);
    const tStart = performance.now();
    s.info = { 상태: "디코딩 중…", 파일: "name" in source ? source.name : source.url };
    renderInfo(s);
    const heap0 = (performance as any).memory?.usedJSHeapSize as number | undefined;
    const mesh = new spark.SplatMesh(
      "bytes" in source ? { fileBytes: source.bytes, fileName: source.name } : { url: source.url },
    );
    s.mesh = mesh;
    s.scene.add(mesh);
    applyFlip();
    try {
      await mesh.initialized;
    } catch (err) {
      s.info.상태 = `실패: ${(err as Error).message}`;
      renderInfo(s);
      log(`${s.key.toUpperCase()} 로드 실패: ${(err as Error).message}`);
      return;
    }
    const tInit = performance.now() - tStart;
    const ps = mesh.packedSplats;
    const n = ps?.numSplats ?? 0;
    const ex = ps?.extra ?? {};
    const shDeg = ex.sh3 ? 3 : ex.sh2 ? 2 : ex.sh1 ? 1 : 0;
    // 첫 프레임까지 시간: 직접 한 번 렌더하고 GPU 작업이 끝날 때까지 기다린다 (rAF는 백그라운드에서 멈출 수 있음)
    s.renderer.render(s.scene, camera);
    s.renderer.getContext().finish();
    const tFirst = performance.now() - tStart;
    const heap1 = (performance as any).memory?.usedJSHeapSize as number | undefined;
    s.info = {
      상태: "완료",
      파일: "name" in source ? source.name : source.url,
      "파일 크기": "bytes" in source ? `${(source.bytes.byteLength / 2 ** 20).toFixed(1)} MB` : "(URL)",
      가우시안: n.toLocaleString(),
      "SH 차수 (Spark)": shDeg,
      "GPU 추정": `${((n * SH_BYTES[shDeg]!) / 2 ** 20).toFixed(1)} MB`,
      "디코딩 완료": `${tInit.toFixed(0)} ms`,
      "첫 프레임": `${tFirst.toFixed(0)} ms`,
      "JS 힙 증가": heap0 !== undefined && heap1 !== undefined ? `${((heap1 - heap0) / 2 ** 20).toFixed(1)} MB` : "측정 불가",
    };
    renderInfo(s);
    log(`${s.key.toUpperCase()} 로드: ${n.toLocaleString()} splats, SH${shDeg}, ${tInit.toFixed(0)} ms`);
  };

  const unload = (s: Slot) => {
    if (s.mesh) {
      s.scene.remove(s.mesh);
      s.mesh.dispose();
      s.mesh = null;
    }
    s.info = { 상태: "비어 있음" };
    renderInfo(s);
  };

  for (const key of ["a", "b"] as SlotKey[]) {
    const box = $(`[data-slot="${key}"]`);
    box.querySelector("[data-load]")!.addEventListener("click", async () => {
      const file = box.querySelector<HTMLInputElement>("[data-file]")!.files?.[0];
      const url = box.querySelector<HTMLInputElement>("[data-url]")!.value.trim();
      if (file) await load(slots[key], { bytes: await file.arrayBuffer(), name: file.name });
      else if (url) await load(slots[key], { url });
      else log("파일이나 URL을 지정하세요");
    });
    box.querySelector("[data-unload]")!.addEventListener("click", () => unload(slots[key]));
  }
  $<HTMLInputElement>("[data-flip]").addEventListener("change", (e) => {
    flip = (e.target as HTMLInputElement).checked;
    applyFlip();
    if (activeCam) setCamera(activeCam);
  });

  // ---------- 카메라 (3DGS cameras.json) ----------
  // cameras.json의 rotation은 camera-to-world 회전(OpenCV 규약), position은 카메라 중심.
  let cams: CamEntry[] = [];
  let activeCam: CamEntry | null = null;
  const camSelect = $<HTMLSelectElement>("[data-cam-select]");
  const setCamera = (c: CamEntry) => {
    activeCam = c;
    const R = c.rotation;
    const m = new THREE.Matrix4().set(
      R[0]![0]!, -R[0]![1]!, -R[0]![2]!, 0,
      R[1]![0]!, -R[1]![1]!, -R[1]![2]!, 0,
      R[2]![0]!, -R[2]![1]!, -R[2]![2]!, 0,
      0, 0, 0, 1,
    );
    const q = new THREE.Quaternion().setFromRotationMatrix(m);
    const p = new THREE.Vector3(...(c.position as [number, number, number]));
    if (flip) {
      q.premultiply(FLIP);
      p.applyQuaternion(FLIP);
    }
    camera.position.copy(p);
    camera.quaternion.copy(q);
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(c.height / (2 * c.fy)));
    camera.updateProjectionMatrix();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
    controls.target.copy(p).addScaledVector(forward, 1.0);
    camera.up.set(0, 1, 0).applyQuaternion(q);
    controls.update();
    log(`카메라 ${c.id} (${c.img_name}) · fovY ${camera.fov.toFixed(2)}° · ${c.width}×${c.height}`);
    updateJson();
  };
  $<HTMLInputElement>("[data-cams]").addEventListener("change", async (e) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    cams = JSON.parse(await f.text()) as CamEntry[];
    camSelect.innerHTML = `<option value="">자유 시점</option>` + cams.map((c, i) => `<option value="${i}">${c.id} · ${c.img_name}</option>`).join("");
    log(`cameras.json: ${cams.length}개`);
  });
  camSelect.addEventListener("change", () => {
    const i = camSelect.value;
    if (i === "") activeCam = null;
    else setCamera(cams[Number(i)]!);
  });

  // ---------- 분할 비교 ----------
  $<HTMLSelectElement>("[data-mode]").addEventListener("change", (e) => (stage.dataset.mode = (e.target as HTMLSelectElement).value));
  $<HTMLInputElement>("[data-split]").addEventListener("input", (e) => stage.style.setProperty("--pos", `${(e.target as HTMLInputElement).value}%`));

  // ---------- 렌더 루프와 FPS ----------
  let frames = 0;
  let fps = 0;
  let frameMs = 0;
  let last = performance.now();
  let windowStart = last;
  const loop = () => {
    const now = performance.now();
    frameMs = now - last;
    last = now;
    controls.update();
    const mode = stage.dataset.mode;
    if (mode !== "b") slots.a.renderer.render(slots.a.scene, camera);
    if (mode !== "a") slots.b.renderer.render(slots.b.scene, camera);
    frames++;
    if (now - windowStart >= 1000) {
      fps = (frames * 1000) / (now - windowStart);
      frames = 0;
      windowStart = now;
      renderMetrics();
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  const metricsEl = $<HTMLElement>("[data-metrics]");
  const metrics = () => {
    const total = Object.values(slots).reduce((sum, s) => sum + (s.mesh?.packedSplats?.numSplats ?? 0), 0);
    const size = new THREE.Vector2();
    slots.a.renderer.getDrawingBufferSize(size);
    return {
      FPS: `${fps.toFixed(1)} (창이 화면에 보이는 상태에서만 유효)`,
      "프레임 시간": `${frameMs.toFixed(1)} ms`,
      "보기 모드": stage.dataset.mode ?? "",
      "동시 표시 가우시안": total.toLocaleString(),
      "렌더 해상도": `${size.x}×${size.y}`,
      devicePixelRatio: window.devicePixelRatio,
      GPU: gpuName,
      "JS 힙": (performance as any).memory ? `${((performance as any).memory.usedJSHeapSize / 2 ** 20).toFixed(0)} MB` : "측정 불가",
      "GPU 메모리 실측": "Chrome 작업 관리자(Shift+Esc)의 'GPU 메모리' 열에서 확인",
    };
  };
  const renderMetrics = () => {
    metricsEl.innerHTML = Object.entries(metrics())
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`)
      .join("");
  };

  // ---------- 결과 JSON ----------
  const jsonEl = $<HTMLTextAreaElement>("[data-json]");
  const psnrResults: Record<string, unknown>[] = [];
  const updateJson = () => {
    jsonEl.value = JSON.stringify(
      {
        date: new Date().toISOString(),
        userAgent: navigator.userAgent,
        gpu: gpuName,
        spark: "2.4.0",
        flip,
        camera: activeCam ? { id: activeCam.id, img_name: activeCam.img_name } : "free",
        a: slots.a.info,
        b: slots.b.info,
        metrics: metrics(),
        psnr: psnrResults,
      },
      null,
      2,
    );
  };
  $("[data-copy]").addEventListener("click", () => {
    updateJson();
    navigator.clipboard.writeText(jsonEl.value).then(() => log("결과 JSON 복사됨"));
  });

  // ---------- 기준 이미지와 PSNR (V2) ----------
  let ref: ImageData | null = null;
  $<HTMLInputElement>("[data-ref]").addEventListener("change", async (e) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    const bmp = await createImageBitmap(f);
    const c = new OffscreenCanvas(bmp.width, bmp.height);
    const ctx = c.getContext("2d")!;
    ctx.drawImage(bmp, 0, 0);
    ref = ctx.getImageData(0, 0, bmp.width, bmp.height);
    log(`기준 이미지 ${bmp.width}×${bmp.height}`);
  });

  for (const btn of root.querySelectorAll<HTMLButtonElement>("[data-psnr]")) {
    btn.addEventListener("click", async () => {
      const s = slots[btn.dataset.psnr as SlotKey];
      if (!ref || !s.mesh) return log("기준 이미지와 해당 슬롯의 PLY가 모두 필요합니다");
      if (!activeCam) log("주의: cameras.json 시점을 고르지 않았습니다. 기준 이미지와 같은 시점이어야 의미가 있습니다");
      fixedSize = { w: ref.width, h: ref.height };
      camera.aspect = ref.width / ref.height;
      camera.updateProjectionMatrix();
      resize();
      // Spark의 정렬은 워커에서 비동기로 진행된다. 백그라운드 탭에서도 멈추지 않도록
      // rAF 대신 타이머로 직접 여러 번 렌더한 뒤 마지막 프레임을 읽는다.
      for (let i = 0; i < 20; i++) {
        s.renderer.render(s.scene, camera);
        await new Promise((r) => setTimeout(r, 50));
      }
      s.renderer.render(s.scene, camera);
      const c = new OffscreenCanvas(ref.width, ref.height);
      const ctx = c.getContext("2d")!;
      ctx.drawImage(s.renderer.domElement, 0, 0, ref.width, ref.height);
      const out = ctx.getImageData(0, 0, ref.width, ref.height);
      let se = 0;
      for (let i = 0; i < out.data.length; i += 4) {
        for (let k = 0; k < 3; k++) {
          const d = out.data[i + k]! - ref.data[i + k]!;
          se += d * d;
        }
      }
      const mse = se / ((out.data.length / 4) * 3);
      const psnr = mse === 0 ? Infinity : 10 * Math.log10((255 * 255) / mse);
      const result = { slot: s.key, camera: activeCam?.img_name ?? "free", size: `${ref.width}x${ref.height}`, psnr: Number(psnr.toFixed(2)) };
      psnrResults.push(result);
      log(`PSNR(${s.key.toUpperCase()} 웹 렌더 vs 기준) = ${psnr.toFixed(2)} dB · 논문 수치와 비교하는 값이 아님`);
      fixedSize = null;
      resize();
      updateJson();
    });
  }

  $("[data-shot]").addEventListener("click", () => {
    for (const s of Object.values(slots)) {
      if (!s.mesh) continue;
      const a = document.createElement("a");
      a.download = `splat-lab-${s.key}-${activeCam?.img_name ?? "free"}.png`;
      a.href = s.renderer.domElement.toDataURL("image/png");
      a.click();
    }
  });

  // 자동 테스트용: URL 쿼리 ?a=...&b=... 로 바로 불러오기
  const params = new URLSearchParams(location.search);
  const autoLoads = (["a", "b"] as SlotKey[]).filter((k) => params.get(k)).map((k) => load(slots[k], { url: params.get(k)! }));
  (window as any).__splatLab = { slots, camera, metrics, setCamera, ready: Promise.all(autoLoads) };
  resize();
  renderMetrics();
  updateJson();
}
