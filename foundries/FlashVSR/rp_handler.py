# RunPod Serverless handler for FlashVSR
# 入力: { "input": { "video_url": "https://...", "scale": 2 } }
# 出力: { "output": { "status": "ok", "output_url": "https://..." } }

import runpod
import os
import subprocess
import time
import tempfile
import requests

# ComfyUI のパス
COMFYUI_DIR = "/app/ComfyUI"
OUTPUT_DIR = "/app/outputs"
os.makedirs(OUTPUT_DIR, exist_ok=True)


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
        "--attention_mode", "sdpa",  # flash-attn ビルド失敗時のフォールバック
        "--models_dir", os.path.join(COMFYUI_DIR, "models/FlashVSR"),
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)

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
            response = requests.get(video_url, stream=True)
            response.raise_for_status()
            for chunk in response.iter_content(chunk_size=8192):
                tmp.write(chunk)

        # アップスケール実行
        output_path = upscale_video(tmp_path, scale=scale)

        # 結果を返す（URL or base64）
        # ※ 本番では R2 にアップロードして URL を返す
        output_url = f"file://{output_path}"

        # 一時ファイル削除
        os.unlink(tmp_path)

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
