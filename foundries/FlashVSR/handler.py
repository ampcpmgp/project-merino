# FlashVSR handler（ComfyUI経由・非RunPod用）
# ローカルテスト用・ComfyUI API を呼び出してアップスケール

import json
import requests
import time
import os

COMFYUI_API = os.environ.get("COMFYUI_API", "http://localhost:8188")
OUTPUT_DIR = "/app/outputs"
os.makedirs(OUTPUT_DIR, exist_ok=True)


def upscale_via_comfyui(video_path, scale=2, output_path=None):
    """ComfyUI API経由でFlashVSRアップスケール"""
    if output_path is None:
        output_path = os.path.join(OUTPUT_DIR, f"upscaled_{int(time.time())}.mp4")

    # FlashVSR ワークフロー JSON
    workflow = {
        "1": {
            "class_type": "FlashVSR",
            "inputs": {
                "video": video_path,
                "scale": scale,
            }
        },
        "2": {
            "class_type": "SaveVideo",
            "inputs": {
                "video": ["1", 0],
                "output_path": output_path,
            }
        }
    }

    # ComfyUI API にワークフローを送信
    response = requests.post(f"{COMFYUI_API}/prompt", json={"prompt": workflow})
    if response.status_code != 200:
        raise RuntimeError(f"ComfyUI API error: {response.text}")

    prompt_id = response.json().get("prompt_id")

    # 完了待ち
    while True:
        status = requests.get(f"{COMFYUI_API}/history/{prompt_id}").json()
        if prompt_id in status:
            outputs = status[prompt_id].get("outputs", {})
            if "2" in outputs:
                return output_path
        time.sleep(1)


def handler(input_data):
    """ローカルテスト用 handler"""
    video_path = input_data.get("video_path")
    scale = input_data.get("scale", 2)

    if not video_path:
        return {"status": "error", "message": "video_path is required"}

    try:
        output_path = upscale_via_comfyui(video_path, scale=scale)
        return {
            "status": "ok",
            "output_path": output_path,
            "scale": scale,
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
