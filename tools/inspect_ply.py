"""3DGS PLY 파일을 웹 뷰어(Spark)에 올리기 전에 점검한다. 표준 라이브러리만 사용.

사용:
    python tools/inspect_ply.py <baseline.ply> [<ours.ply> ...] [--stats] [--json out.json]

출력:
    - 가우시안 수, SH 차수, 속성 목록, 파일 크기
    - Spark PackedSplats 기준 GPU 메모리 추정 (SH0 16 B, +SH1 8 B, +SH2 16 B, +SH3 16 B / splat)
    - 여러 파일을 주면 동시 로드 합계와 Spark 권장 예산 대비 비교
    - --stats: 일부 가우시안을 표본으로 읽어 스케일·불투명도·밝기 분포 (속성 히트맵 정규화 범위 결정용)

추정치는 Spark 문서의 저장 형식에서 계산한 값이며, 실제 GPU 메모리는 브라우저 테스트 페이지에서 확인한다.
"""

import argparse
import json
import math
import os
import random
import struct
import sys

PLY_TYPES = {
    "char": "b", "uchar": "B", "short": "h", "ushort": "H", "int": "i", "uint": "I",
    "float": "f", "double": "d", "int8": "b", "uint8": "B", "int16": "h", "uint16": "H",
    "int32": "i", "uint32": "I", "float32": "f", "float64": "d",
}
SH_REST_TO_DEGREE = {0: 0, 9: 1, 24: 2, 45: 3}
SPARK_BYTES = {0: 16, 1: 24, 2: 40, 3: 56}
SH_C0 = 0.28209479177387814
# Spark performance.md 권장 예산 (splat 수)
BUDGETS = {"모바일(Android)": 2_000_000, "iPhone": 3_000_000, "데스크톱": 5_000_000}


def read_header(path):
    with open(path, "rb") as f:
        if f.readline().strip() != b"ply":
            raise ValueError("PLY 파일이 아닙니다")
        fmt, count, props, in_vertex = None, 0, [], False
        while True:
            line = f.readline()
            if not line:
                raise ValueError("end_header 없음")
            tok = line.decode("ascii", "replace").split()
            if not tok:
                continue
            if tok[0] == "format":
                fmt = tok[1]
            elif tok[0] == "element":
                in_vertex = tok[1] == "vertex"
                if in_vertex:
                    count = int(tok[2])
            elif tok[0] == "property" and in_vertex:
                if tok[1] == "list":
                    raise ValueError("vertex에 list 속성이 있음 (3DGS PLY가 아님)")
                props.append((tok[2], PLY_TYPES[tok[1]]))
            elif tok[0] == "end_header":
                return fmt, count, props, f.tell()


def summarize(path, want_stats, sample):
    fmt, n, props, offset = read_header(path)
    names = [p[0] for p in props]
    n_rest = sum(1 for p in names if p.startswith("f_rest_"))
    degree = SH_REST_TO_DEGREE.get(n_rest)
    required = ["x", "y", "z", "f_dc_0", "f_dc_1", "f_dc_2", "opacity",
                "scale_0", "scale_1", "scale_2", "rot_0", "rot_1", "rot_2", "rot_3"]
    missing = [r for r in required if r not in names]
    size = os.path.getsize(path)
    stride = struct.calcsize("<" + "".join(p[1] for p in props))
    info = {
        "file": os.path.basename(path),
        "format": fmt,
        "splats": n,
        "sh_rest": n_rest,
        "sh_degree": degree,
        "missing_required": missing,
        "file_mb": round(size / 2**20, 1),
        "bytes_per_splat_file": stride,
        "spark_gpu_mb_est": round(n * SPARK_BYTES.get(degree or 0, 16) / 2**20, 1),
        "extra_props": [p for p in names if p not in required and not p.startswith("f_rest_")],
    }
    if fmt != "binary_little_endian":
        info["warning"] = f"format={fmt} (3DGS 기본은 binary_little_endian)"
    if offset + stride * n != size:
        info["warning_size"] = f"헤더 기준 크기({offset + stride * n})와 실제 크기({size})가 다름"

    if want_stats and not missing and fmt == "binary_little_endian":
        rec = struct.Struct("<" + "".join(p[1] for p in props))
        idx = {nm: i for i, nm in enumerate(names)}
        rng = random.Random(0)
        picks = sorted(rng.sample(range(n), min(sample, n)))
        smax, alpha, bright = [], [], []
        with open(path, "rb") as f:
            for i in picks:
                f.seek(offset + i * stride)
                v = rec.unpack(f.read(stride))
                # 3DGS PLY: scale은 log, opacity는 logit, f_dc는 SH0 계수
                smax.append(math.exp(max(v[idx["scale_0"]], v[idx["scale_1"]], v[idx["scale_2"]])))
                alpha.append(1 / (1 + math.exp(-v[idx["opacity"]])))
                rgb = [0.5 + SH_C0 * v[idx[f"f_dc_{c}"]] for c in range(3)]
                bright.append(sum(min(1, max(0, c)) for c in rgb) / 3)
        info["stats_sample"] = len(picks)
        info["max_scale"] = pct(smax)
        info["opacity"] = pct(alpha)
        info["dc_brightness"] = pct(bright)
    return info


def pct(values):
    s = sorted(values)
    q = lambda p: s[min(len(s) - 1, int(p * (len(s) - 1)))]
    return {"p01": round(q(0.01), 5), "p50": round(q(0.5), 5), "p99": round(q(0.99), 5), "max": round(s[-1], 5)}


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")  # Windows 콘솔(cp949)에서 한글 깨짐 방지
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("ply", nargs="+")
    ap.add_argument("--stats", action="store_true", help="표본으로 스케일·불투명도·밝기 분포 계산")
    ap.add_argument("--sample", type=int, default=200_000)
    ap.add_argument("--json", help="결과를 JSON으로 저장")
    args = ap.parse_args()

    results = [summarize(p, args.stats, args.sample) for p in args.ply]
    for r in results:
        print(f"\n== {r['file']}")
        for k, v in r.items():
            if k != "file":
                print(f"  {k:22} {v}")

    if len(results) > 1:
        total = sum(r["splats"] for r in results)
        print("\n== 동시 로드 합계")
        print(f"  splats                 {total:,}")
        print(f"  file_mb (원본 PLY)      {sum(r['file_mb'] for r in results):.1f}")
        print(f"  spark_gpu_mb_est       {sum(r['spark_gpu_mb_est'] for r in results):.1f}")
        for name, budget in BUDGETS.items():
            mark = "OK" if total <= budget else "초과"
            print(f"  {name:18} 권장 {budget:>10,}  → {mark}")

    if args.json:
        with open(args.json, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        print(f"\nJSON 저장: {args.json}")


if __name__ == "__main__":
    sys.exit(main())
