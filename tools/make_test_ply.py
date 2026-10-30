"""뷰어 테스트용 합성 3DGS PLY를 만든다 (연구 결과 아님). 표준 라이브러리만 사용.

원본 3DGS와 같은 속성 구성(x,y,z,nx,ny,nz,f_dc_0..2,f_rest_0..44,opacity,scale_0..2,rot_0..3)으로
구 표면 위 가우시안과 밝은 '광원' 덩어리를 만든다. 실제 데이터 없이 로더·SH·성능 측정 흐름을 점검하는 용도.

사용:
    python tools/make_test_ply.py .lab/synthetic.ply --count 300000 [--variant b]
"""

import argparse
import math
import random
import struct

SH_C0 = 0.28209479177387814


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("out")
    ap.add_argument("--count", type=int, default=300_000)
    ap.add_argument("--variant", choices=["a", "b"], default="a", help="b는 광원 가우시안을 더 작게 (비교 테스트용)")
    ap.add_argument("--seed", type=int, default=0)
    args = ap.parse_args()

    rng = random.Random(args.seed)
    n_rest = 45
    props = ["x", "y", "z", "nx", "ny", "nz", "f_dc_0", "f_dc_1", "f_dc_2"]
    props += [f"f_rest_{i}" for i in range(n_rest)]
    props += ["opacity", "scale_0", "scale_1", "scale_2", "rot_0", "rot_1", "rot_2", "rot_3"]
    rec = struct.Struct("<" + "f" * len(props))

    header = "ply\nformat binary_little_endian 1.0\n"
    header += f"element vertex {args.count}\n"
    header += "".join(f"property float {p}\n" for p in props)
    header += "end_header\n"

    light_scale = -3.2 if args.variant == "a" else -4.2
    with open(args.out, "wb") as f:
        f.write(header.encode("ascii"))
        for i in range(args.count):
            is_light = i % 50 == 0
            if is_light:
                # 구 위쪽의 밝은 덩어리
                x, y, z = (rng.gauss(0, 0.08) for _ in range(3))
                y -= 1.1
                color = (1.0, 0.97, 0.85)
                log_s = [light_scale + rng.gauss(0, 0.2)] * 3
                logit_a = 3.0
            else:
                u, v = rng.random(), rng.random()
                th, ph = 2 * math.pi * u, math.acos(2 * v - 1)
                x, y, z = math.sin(ph) * math.cos(th), math.cos(ph), math.sin(ph) * math.sin(th)
                color = (0.5 + 0.4 * math.sin(3 * th), 0.5 + 0.4 * math.cos(2 * ph), 0.6)
                log_s = [-4.6 + rng.gauss(0, 0.3) for _ in range(3)]
                logit_a = rng.gauss(1.5, 1.0)
            dc = [(c - 0.5) / SH_C0 for c in color]
            rest = [rng.gauss(0, 0.05) for _ in range(n_rest)]
            q = [rng.gauss(0, 1) for _ in range(4)]
            qn = math.sqrt(sum(c * c for c in q)) or 1
            f.write(rec.pack(x, y, z, 0, 0, 0, *dc, *rest, logit_a, *log_s, *(c / qn for c in q)))
    print(f"wrote {args.out}: {args.count} splats (variant {args.variant})")


if __name__ == "__main__":
    main()
