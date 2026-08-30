#!/usr/bin/env python3
# FlashVSR community worker（環境変数駆動・単発）
# 前提: R2一時認証情報 + 進捗をR2に書く + コミュニティサーバーに不要な権限を与えない
# 起動: 環境変数でジョブを完全指定。1ジョブ処理して終了。
# 0.0.6: Serverless handler → 環境変数駆動ワーカーに書き換え
#   - R2一時認証情報（S3 SigV4 + session token）で書き込み
#   - 進捗を1分ごとにR2へPUT（flashvsr/tmp/{job_id}/progress.json）
#   - 結果をR2へPUT（flashvsr/tmp/{job_id}/result.mp4）
#   - DBアクセス・ポーリング不要（ジョブは環境変数で完全指定）
# 0.0.7: 方式C（幅に応じて540/1080→4x/2x）のffmpeg前処理を追加
#   - 入力幅<540px: ffmpegで540pxに拡大→FlashVSR 4x→2160px
#   - 入力幅540〜1080px: FlashVSR 4x→2160px（超えたらdownscale）
#   - 入力幅>1080px: FlashVSR 2x→2160px（超えたらdownscale）
#   - ffmpeg前処理はワーカー内で完結（Vercelの300秒制約から解放）

import os
import json
import time
import subprocess
import tempfile
import threading
import urllib.request
import boto3
from botocore.client import Config

# ===== 環境変数から設定 =====
JOB_ID = os.environ.get("JOB_ID", "")
INPUT_URL = os.environ.get("INPUT_URL", "")
# SCALE は省略可。省略時は入力幅に応じて自動決定（方式C）
SCALE = int(os.environ.get("SCALE", "0"))

# R2 一時認証情報（AMANE API が発行・短命・スコープ限定）
R2_ENDPOINT = os.environ.get("R2_ENDPOINT", "")  # https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_BUCKET = os.environ.get("R2_BUCKET", "project-merino-assets")
R2_ACCESS_KEY = os.environ.get("R2_ACCESS_KEY", "")
R2_SECRET_KEY = os.environ.get("R2_SECRET_KEY", "")
R2_SESSION_TOKEN = os.environ.get("R2_SESSION_TOKEN", "")
R2_PREFIX = os.environ.get("R2_PREFIX", f"flashvsr/tmp/{JOB_ID}/")

# ComfyUI パス
COMFYUI_DIR = "/app/ComfyUI"
OUTPUT_DIR = "/app/outputs"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 進捗書き込み間隔（秒）: 1分ごと
PROGRESS_INTERVAL = 60

# 方式Cの閾値
PREPROCESS_MIN = 540  # 4xで2160pxになる最小幅（540×4=2160）
PREPROCESS_MAX = 1080  # 2xで2160pxになる最小幅（1080×2=2160）


def get_s3_client():
    """R2一時認証情報でS3クライアントを作成（SigV4 + session token）"""
    return boto3.client(
        "s3",
        endpoint_url=R2_ENDPOINT,
        aws_access_key_id=R2_ACCESS_KEY,
        aws_secret_access_key=R2_SECRET_KEY,
        aws_session_token=R2_SESSION_TOKEN,
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )


def write_progress(progress, status="processing"):
    """進捗をR2に書く（flashvsr/tmp/{job_id}/progress.json）"""
    s3 = get_s3_client()
    key = f"{R2_PREFIX}progress.json"
    body = json.dumps({
        "job_id": JOB_ID,
        "progress": progress,
        "status": status,
        "updated_at": int(time.time()),
    })
    s3.put_object(Bucket=R2_BUCKET, Key=key, Body=body, ContentType="application/json")


def upload_result(file_path):
    """結果をR2にアップロード（flashvsr/tmp/{job_id}/result.mp4）"""
    s3 = get_s3_client()
    ext = os.path.splitext(file_path)[1].lstrip(".") or "mp4"
    key = f"{R2_PREFIX}result.{ext}"
    with open(file_path, "rb") as f:
        s3.put_object(Bucket=R2_BUCKET, Key=key, Body=f, ContentType="video/mp4")
    return key


def download_video(url, dest):
    """入力動画をHTTPでダウンロード（AMANEのURLから）"""
    req = urllib.request.Request(url, headers={"User-Agent": "curl/8.4.0"})
    with urllib.request.urlopen(req, timeout=300) as resp, open(dest, "wb") as f:
        while True:
            chunk = resp.read(8192)
            if not chunk:
                break
            f.write(chunk)


def get_video_width(video_path):
    """ffprobeで動画の幅を取得"""
    result = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_streams", video_path],
        capture_output=True, text=True, timeout=30,
    )
    if result.returncode != 0:
        raise RuntimeError(f"ffprobe failed: {result.stderr}")
    streams = json.loads(result.stdout).get("streams", [])
    if not streams:
        raise RuntimeError("no video stream found")
    return streams[0].get("width", 0)


def ffmpeg_resize(video_path, target_width, output_path):
    """ffmpegで幅をtarget_widthにリサイズ（高さはアスペクト比維持・偶数）"""
    cmd = [
        "ffmpeg", "-y", "-i", video_path,
        "-vf", f"scale={target_width}:-2:flags=lanczos",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
        "-c:a", "copy",
        output_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=900)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg resize failed: {result.stderr}")
    return output_path


def decide_scale_and_preprocess(video_path):
    """
    方式C: 入力幅に応じてscaleと前処理を決定
    - 入力幅<540px: ffmpegで540pxに拡大→FlashVSR 4x→2160px
    - 入力幅540〜1080px: FlashVSR 4x→2160px（前処理なし）
    - 入力幅>1080px: FlashVSR 2x→2160px（前処理なし・超えたらdownscale）
    戻り値: (scale, 前処理済みパス or None)
    """
    width = get_video_width(video_path)
    print(f"[worker] input width: {width}px")

    # SCALE が明示指定されていればそれを使う（前処理なし）
    if SCALE > 0:
        return SCALE, None

    if width < PREPROCESS_MIN:
        # 540px未満: ffmpegで540pxに拡大→4x
        preprocessed = os.path.join(OUTPUT_DIR, f"pre_{JOB_ID}.mp4")
        ffmpeg_resize(video_path, PREPROCESS_MIN, preprocessed)
        print(f"[worker] preprocessed {width}px -> {PREPROCESS_MIN}px, scale=4")
        return 4, preprocessed
    elif width <= PREPROCESS_MAX:
        # 540〜1080px: 4x（前処理なし）
        print(f"[worker] {width}px in [540,1080], scale=4")
        return 4, None
    else:
        # >1080px: 2x（前処理なし・超えたらdownscale）
        print(f"[worker] {width}px > 1080, scale=2")
        return 2, None


def upscale_video(video_path, scale, output_path):
    """FlashVSR CLI で動画をアップスケール"""
    cmd = [
        "python", os.path.join(COMFYUI_DIR, "custom_nodes/ComfyUI-FlashVSR_Stable/cli_main.py"),
        "--input", video_path,
        "--output", output_path,
        "--model", "FlashVSR-v1.1",
        "--mode", "tiny",
        "--scale", str(scale),
        "--vae_model", "Wan2.1",
        "--attention_mode", "sparse_sage_attention",  # sageattention有効化
        "--models_dir", os.path.join(COMFYUI_DIR, "models"),
        # OOM 対策: フレームチャンク + VAE/DiT タイル化
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


def progress_heartbeat(stop_event):
    """1分ごとに進捗ハートビートをR2に書く（処理中）"""
    progress = 10
    while not stop_event.is_set():
        time.sleep(PROGRESS_INTERVAL)
        progress = min(progress + 10, 80)
        try:
            write_progress(progress, "processing")
        except Exception:
            pass


def main():
    # 必須環境変数の検証
    if not JOB_ID or not INPUT_URL:
        print(json.dumps({"status": "error", "message": "JOB_ID and INPUT_URL env vars required"}))
        return 1
    if not (R2_ACCESS_KEY and R2_SECRET_KEY and R2_SESSION_TOKEN and R2_ENDPOINT):
        print(json.dumps({"status": "error", "message": "R2 temp credentials env vars required"}))
        return 1

    stop_event = threading.Event()
    preprocessed_path = None
    try:
        # 進捗: 開始
        write_progress(0, "downloading")

        # 入力動画をダウンロード
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            tmp_path = tmp.name
        download_video(INPUT_URL, tmp_path)
        write_progress(10, "processing")

        # 方式C: 入力幅に応じてscaleと前処理を決定
        scale, preprocessed_path = decide_scale_and_preprocess(tmp_path)
        write_progress(20, "processing")

        # 進捗ハートビート開始（1分ごと）
        heartbeat = threading.Thread(target=progress_heartbeat, args=(stop_event,), daemon=True)
        heartbeat.start()

        # アップスケール（前処理済みがあればそれを使う）
        input_for_upscale = preprocessed_path or tmp_path
        output_path = os.path.join(OUTPUT_DIR, f"upscaled_{JOB_ID}.mp4")
        upscale_video(input_for_upscale, scale, output_path)

        # ハートビート停止
        stop_event.set()
        write_progress(90, "uploading")

        # 結果をR2へ
        result_key = upload_result(output_path)
        write_progress(100, "completed")

        # クリーンアップ
        os.unlink(tmp_path)
        if preprocessed_path and os.path.exists(preprocessed_path):
            os.unlink(preprocessed_path)
        try:
            os.unlink(output_path)
        except OSError:
            pass

        print(json.dumps({"status": "ok", "job_id": JOB_ID, "scale": scale, "result_key": result_key}))
        return 0
    except Exception as e:
        stop_event.set()
        try:
            write_progress(0, "failed")
        except Exception:
            pass
        print(json.dumps({"status": "error", "job_id": JOB_ID, "message": str(e)}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
