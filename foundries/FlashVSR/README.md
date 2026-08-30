# FlashVSR

動画アップスケール用 RunPod Serverless Worker（FlashVSR + ComfyUI）。

## 概要

- [FlashVSR](https://github.com/1038lab/ComfyUI-FlashVSR) — 高品質動画超解像モデル
- ComfyUI のカスタムノードとして動作
- RunPod Serverless Flex Worker（RTX 4090）でデプロイ

## アーキテクチャ

```
AMANE API → RunPod Serverless Endpoint → FlashVSR handler → アップスケール結果 → R2 (CDN)
```

- **sageattention 有効化**: `--attention_mode sparse_sage_attention`（RTX 4090で1.5-2x高速化）
- **R2 アップロード**: アップスケール結果を Cloudflare R2 にアップロードし、公開 CDN URL を返す（`file://` で返さない）

## 環境変数（R2 アップロード用）

エンドポイントの環境変数に設定（イメージに埋め込まない）:

| 変数 | 説明 |
|------|------|
| `CLOUDFLARE_R2_API_TOKEN` | Cloudflare R2 API トークン |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare アカウント ID |
| `R2_BUCKET` | バケット名（デフォルト `project-merino-assets`） |
| `R2_PUBLIC_URL` | 公開 CDN URL（デフォルト `https://cdn.harinezumi-m.org`） |
| `R2_KEY_PREFIX` | キー接頭辞（デフォルト `flashvsr/`） |

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

HuggingFace: https://huggingface.co/JunhaoZhuang/FlashVSR-v1.1

```
ComfyUI/models/FlashVSR/
├── LQ_proj_in.ckpt
├── TCDecoder.ckpt
├── diffusion_pytorch_model_streaming_dmd.safetensors
└── Wan2.1_VAE.pth  (or auto-downloads)
```

## 参考

- [ComfyUI-FlashVSR_Stable (naxci1)](https://github.com/naxci1/ComfyUI-FlashVSR_Stable) — CLI版・VRAM最適化
- [FlashVSR-v1.1 Model (HuggingFace)](https://huggingface.co/JunhaoZhuang/FlashVSR-v1.1)
