# FlashVSR

動画アップスケール用 RunPod Serverless Worker（FlashVSR + ComfyUI）。

## 概要

- [FlashVSR](https://github.com/1038lab/ComfyUI-FlashVSR) — 高品質動画超解像モデル
- ComfyUI のカスタムノードとして動作
- RunPod Serverless Flex Worker（RTX 4090）でデプロイ

## アーキテクチャ

```
AMANE API → RunPod Serverless Endpoint → FlashVSR handler → アップスケール結果
```

## Docker Build

```shell
cd foundries/FlashVSR

docker build --platform linux/amd64 -t ofuton/flashvsr:$(cat VERSION) -t ofuton/flashvsr:latest .
```

## Docker Push

```shell
docker push ofuton/flashvsr:latest
```

## RunPod デプロイ

1. RunPod ダッシュボード → Serverless → New Endpoint
2. 「Import from Docker Registry」を選択
3. Container Image: `ofuton/flashvsr:latest`
4. GPU: RTX 4090
5. Worker Type: Flex Worker
6. FlashBoot: 有効

または GitHub リポジトリを連携して自動ビルド:

1. RunPod ダッシュボード → Serverless → New Endpoint
2. 「Deploy from a GitHub repository」を選択
3. `ampcpmgp/project-merino` リポジトリを選択
4. Dockerfile Path: `foundries/FlashVSR/Dockerfile`
5. GPU: RTX 4090 / Flex Worker

## AMANE での使用

- エンドポイントID を `RUNPOD_ENDPOINT_ID` として Vercel 環境変数に設定
- APIキー を `RUNPOD_API_KEY` として Vercel 環境変数に設定
- AMANE API から RunPod Serverless API 経由でアップスケールリクエストを送信

## モデル

HuggingFace: https://huggingface.co/1038lab/FlashVSR

```
ComfyUI/models/FlashVSR/
├── Wan2_1-T2V-1_3B_FlashVSR_fp32.safetensors
├── Wan2_1_FlashVSR_TCDecoder_fp32.safetensors
├── Wan2_1_FlashVSR_LQ_proj_model_bf16.safetensors
├── Wan2.1_VAE.safetensors
└── Prompt.safetensors
```

## 参考

- [ComfyUI-FlashVSR (1038lab)](https://github.com/1038lab/ComfyUI-FlashVSR)
- [FlashVSR Stable (naxci1)](https://github.com/naxci1/ComfyUI-FlashVSR_Stable) — CLI版・VRAM最適化
- [FlashVSR Model (HuggingFace)](https://huggingface.co/1038lab/FlashVSR)
