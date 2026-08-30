# RunPod Serverless handler for SeedVR2
# 入力: { "input": { "video_url": "https://...", "res_w": 2160, "res_h": 1215 } }
# 出力: { "output": { "status": "ok", "output_url": "https://..." } }
# 0.0.1: アップスケール結果を R2(非公開) へアップロードし、署名無し公開URLではなく
#        キー(または Vercel が署名URL化する前提のオブジェクトキー)を返す。

import runpod
import os
import subprocess
import time
import tempfile
import requests
import uuid
import shutil

COMFYUI_DIR = "/app"
SEEDVR_DIR = "/app/SeedVR"
OUTPUT_DIR = "/app/outputs"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# R2 (Cloudflare REST API) 設定 — コミュニティクラウドではシークレットを入れない前提のため
# このファイルでは空許容。Vercel が署名URLを発行して pod はそれに PUT する形に差し替える想定。
CLOUDFLARE_R2_API_TOKEN = os.environ.get("CLOUDFLARE_R2_API_TOKEN", "")
CLOUDFLARE_ACCOUNT_ID = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")
R2_BUCKET = os.environ.get("R2_BUCKET", "project-merino-assets")
R2_PUBLIC_URL = os.environ.get("R2_PUBLIC_URL", "https://cdn.harinezumi-m.org")


def r2_put_object(key: str, data: bytes, content_type: str) -> bool:
    if not CLOUDFLARE_R2_API_TOKEN or not CLOUDFLARE_ACCOUNT_ID:
        raise RuntimeError("R2 env vars missing (CLOUDFLARE_R2_API_TOKEN / CLOUDFLARE_ACCOUNT_ID)")
    url = (
        f"https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}"
        f"/r2/buckets/{R2_BUCKET}/objects/{key}"
    )
    resp = requests.put(
        url,
        data=data,
        headers={"Authorization": f"Bearer {CLOUDFLARE_R2_API_TOKEN}", "Content-Type": content_type},
        timeout=300,
    )
    if resp.status_code != 200:
        raise RuntimeError(f"R2 PUT failed: {resp.status_code} {resp.text[:300]}")
    return True


def upload_to_r2(file_path: str) -> str:
    with open(file_path, "rb") as f:
        data = f.read()
    ext = os.path.splitext(file_path)[1].lstrip(".") or "mp4"
    key = f"seedvr2/{int(time.time())}_{uuid.uuid4().hex[:8]}.{ext}"
    r2_put_object(key, data, "video/mp4")
    return f"{R2_PUBLIC_URL}/{key}"


def upscale_video(video_path, res_w=2160, res_h=1215, output_dir=None):
    """SeedVR2 (torchrun) で動画をアップスケール。
    SeedVR2 公式推論は 入力フォルダ(フレーム列) → 出力フォルダ。
    動画ファイルのまま渡す場合は ComfyUI ノード or フレーム分解が必要。
    ※ 仮実装: 現時点ではフレーム分解せず、入力動画を指定。後で公式手順に合わせて修正。
    """
    if output_dir is None:
        output_dir = os.path.join(OUTPUT_DIR, f"seedvr_out_{int(time.time())}")
    os.makedirs(output_dir, exist_ok=True)

    # SeedVR2 公式推論 (torchrun)。入力は動画フォルダ、出力はフォルダ。
    # 現状は 1GPU 想定。コミュニティクラウドのGPU枚数に応じて --nproc-per-node を調整。
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
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=3600)

    if result.returncode != 0:
        raise RuntimeError(f"SeedVR2 failed: {result.stderr}")

    return output_dir


def handler(event):
    input_data = event.get("input", {})
    video_url = input_data.get("video_url")
    res_w = input_data.get("res_w", 2160)
    res_h = input_data.get("res_h", 1215)

    if not video_url:
        return {"output": {"status": "error", "message": "video_url is required"}}

    try:
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            tmp_path = tmp.name
            response = requests.get(video_url, stream=True, timeout=300)
            response.raise_for_status()
            for chunk in response.iter_content(chunk_size=8192):
                tmp.write(chunk)

        output_dir = upscale_video(tmp_path, res_w=res_w, res_h=res_h)

        # 出力ディレクトリ内の動画ファイルを探してR2へ
        # (SeedVR2 はフレーム画像列 or 動画出力。ここでは 1つ目の動画を拾う想定)
        output_url = None
        for f in sorted(os.listdir(output_dir)):
            if f.endswith((".mp4", ".webm", ".mov")):
                output_url = upload_to_r2(os.path.join(output_dir, f))
                break

        os.unlink(tmp_path)
        if output_url is None:
            return {"output": {"status": "error", "message": "no output video found in output_dir"}}

        return {"output": {"status": "ok", "output_url": output_url, "res_w": res_w, "res_h": res_h}}

    except Exception as e:
        return {"output": {"status": "error", "message": str(e)}}


runpod.serverless.start({"handler": handler})
