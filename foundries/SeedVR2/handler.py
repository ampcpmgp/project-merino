# SeedVR2 ローカルテスト用 handler（非RunPod・仮）
# コミュニティクラウドで実際に動くかを検証するためのCLI直叩き用。

import os
import subprocess
import sys

SEEDVR_DIR = "/app/SeedVR"


def upscale_cli(video_path, res_w=2160, res_h=1215, output_dir="/app/outputs"):
    """SeedVR2 公式 torchrun 推論をCLIとして実行。"""
    os.makedirs(output_dir, exist_ok=True)
    cmd = [
        "torchrun", "--nproc-per-node", "1",
        os.path.join(SEEDVR_DIR, "projects/inference_seedvr2_3b.py"),
        "--video_path", video_path,
        "--output_dir", output_dir,
        "--seed", "0",
        "--res_h", str(res_h),
        "--res_w", str(res_w),
        "--sp_size", "1",
    ]
    print(" ".join(cmd))
    return subprocess.call(cmd)


if __name__ == "__main__":
    # 使い方: python handler.py <video_path> [res_w] [res_h]
    video = sys.argv[1] if len(sys.argv) > 1 else None
    if not video:
        print("usage: python handler.py <video_path> [res_w] [res_h]")
        sys.exit(1)
    w = int(sys.argv[2]) if len(sys.argv) > 2 else 2160
    h = int(sys.argv[3]) if len(sys.argv) > 3 else 1215
    upscale_cli(video, w, h)
