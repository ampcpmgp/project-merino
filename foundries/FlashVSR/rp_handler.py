# RunPod Serverless handler for FlashVSR
# 入力: { "input": { "video_url": "https://...", "scale": 2 } }
# 出力: { "output": { "status": "ok", "output_url": "https://..." } }
# 0.0.4: アップスケール結果を R2 にアップロードし、公開 URL を返す（file:// で返さない）

import runpod
import os
import subprocess
import time
import tempfile
import requests
import uuid
import urllib.parse

# ComfyUI のパス
COMFYUI_DIR = "/app/ComfyUI"
OUTPUT_DIR = "/app/outputs"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# R2（Cloudflare REST API）設定
# 認証情報はエンドポイントの環境変数から注入（イメージに埋め込まない）
CLOUDFLARE_R2_API_TOKEN = os.environ.get("CLOUDFLARE_R2_API_TOKEN", "")
CLOUDFLARE_ACCOUNT_ID = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")
R2_BUCKET = os.environ.get("R2_BUCKET", "project-merino-assets")
R2_PUBLIC_URL = os.environ.get("R2_PUBLIC_URL", "https://cdn.harinezumi-m.org")

# アップスケール結果の R2 キー接頭辞
R2_KEY_PREFIX = os.environ.get("R2_KEY_PREFIX", "flashvsr/")


def r2_put_object(key: str, data: bytes, content_type: str) -> bool:
    """Cloudflare REST API で R2 にオブジェクトを PUT する。"""
    if not CLOUDFLARE_R2_API_TOKEN or not CLOUDFLARE_ACCOUNT_ID:
        raise RuntimeError("R2 env vars missing (CLOUDFLARE_R2_API_TOKEN / CLOUDFLARE_ACCOUNT_ID)")
    url = (
        f"https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}"
        f"/r2/buckets/{R2_BUCKET}/objects/{key}"
    )
    resp = requests.put(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {CLOUDFLARE_R2_API_TOKEN}",
            "Content-Type": content_type,
        },
        timeout=300,
    )
    if resp.status_code != 200:
        raise RuntimeError(f"R2 PUT failed: {resp.status_code} {resp.text[:300]}")
    return True


def upload_to_r2(file_path: str) -> str:
    """ローカル出力ファイルを R2 へアップロードし、公開 CDN URL を返す。"""
    with open(file_path, "rb") as f:
        data = f.read()
    ext = os.path.splitext(file_path)[1].lstrip(".") or "mp4"
    key = f"{R2_KEY_PREFIX}{int(time.time())}_{uuid.uuid4().hex[:8]}.{ext}"
    r2_put_object(key, data, "video/mp4")
    return f"{R2_PUBLIC_URL}/{key}"


def upscale_video(video_path, scale=2, output_path=None):
    """FlashVSR CLI で動画をアップスケール"""
    if output_path is None:
        output_path = os.path.join(OUTPUT_DIR, f"upscaled_{int(time.time())}.mp4")

    # naxci1/ComfyUI-FlashVSR_Stable の cli_main.py を使用
    # 引数仕様: https://github.com/naxci1/ComfyUI-FlashVSR_Stable
    cmd = [
        "python", os.path.join(COMFYUI_DIR, "custom_nodes/ComfyUI-FlashVSR_Stable/cli_main.py"),
        "--input", video_path,
        "--output", output_path,
        "--model", "FlashVSR-v1.1",
        "--mode", "tiny",
        "--scale", str(scale),
        "--vae_model", "Wan2.1",
        "--attention_mode", "sparse_sage_attention",  # sageattention有効化（高速化・デフォルト）
        "--models_dir", os.path.join(COMFYUI_DIR, "models"),
        # OOM 対策: フレームチャンク + VAE/DiT タイル化（24GB Pro で 544x306 を安全に処理）
        "--frame_chunk_size", "50",
        "--tiled_vae",
        "--tiled_dit",
        "--tile_size", "256",
        "--tile_overlap", "24",
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=900)

    if result.returncode != 0:
        raise RuntimeError(f"FlashVSR failed: {result.stderr}")

    return output_path


def handler(event):
    """
    RunPod Serverless handler
    入力: { "input": { "video_url": "https://...", "scale": 2 } }
    """
    input_data = event.get("input", {})
    video_url = input_data.get("video_url")
    scale = input_data.get("scale", 2)

    if not video_url:
        return {"output": {"status": "error", "message": "video_url is required"}}

    try:
        # 動画をダウンロード
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            tmp_path = tmp.name
            response = requests.get(video_url, stream=True, timeout=300)
            response.raise_for_status()
            for chunk in response.iter_content(chunk_size=8192):
                tmp.write(chunk)

        # アップスケール実行
        output_path = upscale_video(tmp_path, scale=scale)

        # R2 にアップロードして公開 URL を返す（本番）
        output_url = upload_to_r2(output_path)

        # 一時ファイル削除
        os.unlink(tmp_path)
        try:
            os.unlink(output_path)
        except OSError:
            pass

        return {
            "output": {
                "status": "ok",
                "output_url": output_url,
                "scale": scale,
            }
        }

    except Exception as e:
        return {
            "output": {
                "status": "error",
                "message": str(e),
            }
        }


runpod.serverless.start({"handler": handler})
