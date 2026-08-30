# SeedVR2 Foundry (仮)

AMANE の2K/2160p 高品質動画アップスケール用。ByteDance-SEED の **SeedVR2**（ICLR2026）を RunPod で動かす。

## 概要

| 項目 | 内容 |
|------|------|
| モデル | `ByteDance-Seed/SeedVR2-3B`（Apache 2.0・ICLR2026） |
| タイプ | One-step Diffusion Transformer（video restoration/upscaling） |
| 出力 | 2160p 等、ターゲット解像度直接指定可能 |
| 単価 | fal: $0.001/MP（出力ベース）※ 自前GPUなら時間課金のみ |
| 公式リポ | `github.com/ByteDance-Seed/SeedVR` |

## 位置づけ（2026-08-30 時点）

- **FlashVSR**（$0.0005/MP・最安MP単価）がコスト最優位だが、長尺×2160pは自前0.25FPSで実用不可。
- **SeedVR2**（$0.001/MP・2倍単価）は2160p直接指定(`target_resolution:2160p`)・AI生成向き品質。長尺を自前GPUで安くやるならこちら。
- **現状は「仮」foundry**。Dockerfile・handler はコミュニティクラウドで最速チューニングする土台。

## 注意点（重要）

1. **GPU要件が重い**: 公式は H100-80G 1枚で `100x720x1280`、4枚で 1080p/2K。RTX 4090(24GB)での処理は**量子化版が必須**（fp16だと2160pxでOOMの恐れ）。
2. **推論が torchrun ベース**: `projects/inference_seedvr2_3b.py --video_path INPUT_FOLDER --output_dir OUT --res_w --res_h --sp_size N`。入力はフォルダ（フレーム列）想定。動画ファイルのままだとフレーム分解が必要。
3. **依存が重い**: `flash_attn==2.5.9.post1`・`apex` が必要。apex は公式提供 whl（cp310 / torch2.4.0 / cuda12.1）。
4. **ベースイメージ**: `pytorch/pytorch:2.4.0-cuda12.1-cudnn9-devel`（公式 apex whl のため torch 2.4.0/cuda12.1/python 3.10 に固定）。

## 量子化対応（重要・2026-08-30 時点調査）

SeedVR2 は **FP8 / INT8 / NVFP4(4bit) / MXFP8** の量子化版が存在する。`Comfy-Org/SeedVR2`（ComfyUI公式）が配布。

| サイズ | 量子化 | VRAM | 備考 |
|--------|--------|------|------|
| 3B | fp16 | 高(24GBでギリギリ) | 公式リポジトリ |
| **3B** | **fp8_e4m3fn** | 中 | **RTX4090で安全・推奨** |
| **3B** | **int8_convrot** | 中 | RTX4090で安全 |
| 3B | nvfp4(4bit) | 低 | 最軽量 |
| 7B | fp16 / fp8 / int8 | 高 | 高品質・更に重い |

### ⚠️ フォーマット整合性：量子化版は ComfyUI ネイティブ

- 量子化版（FP8/INT8 等）の .safetensors は **`Comfy-Org/SeedVR2` + ComfyUI のフォーマット**。
- 公式リポジトリ `ByteDance-Seed/SeedVR` の `inference_seedvr2_3b.py` は **fp16 版を想定**。
- → **量子化版を最速で使うなら ComfyUI で動かす方が自然**（FlashVSR foundry と同構成・モデルパス指定が扱いやすい）。
- 現 foundry は公式 torchrun ベース（fp16想定）。量子化版を使う場合は ComfyUI 構成（Comfy-Org/SeedVR2 モデル + ComfyUI-SeedVR2 ノード）に切り替えて handler を合わせる。
- Dockerfile は量子化版(FP8/INT8)を /models/seedvr2 にDLするが、**実際にロードするのは ComfyUI or 公式スクリプト、どちらかで経路を確定する必要あり**。

### 量子化で変わること

- **VRAM**: fp16→FP8/INT8 で約半分〜3分の1。RTX4090で2160pxが現実的に。
- **速度**: メモリ帯域が減るため、一般に FP8→INT8 で高速化の余地。要実測。
- **品質**: FP8/INT8 は fp16 よりわずかに落ちるが、実用上はほぼ同等（要目視確認）。

## デプロイ / チューニング手順

1. コミュニティクラウドで pod 起動（可能なら H100 / A6000 / 複数GPU）
2. ビルドが通るか確認（flash_attn / apex / モデルDL・量子化版）
3. `runpod_start_command.sh` で 5秒動画 → 2160px を実測 → FPS 計測
4. 設定・量子化(FP8/INT8)を変えて最速を探る（sp_size・フレーム分解・tiling）
5. 長尺(60分・2K 60fps)の実時間・コストを実測
6. **処理経路（公式torchrun vs ComfyUI）を量子化版に合わせて確定**

## VERSION

- 0.0.1（仮）
