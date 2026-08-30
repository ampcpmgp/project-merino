# FlashVSR

動画アップスケール用 RunPod Community Worker（FlashVSR + ComfyUI）。

## 概要

- [FlashVSR](https://github.com/1038lab/ComfyUI-FlashVSR) — 高品質動画超解像モデル
- ComfyUI のカスタムノードとして動作
- **環境変数駆動・単発ワーカー**（`community_worker.py`）— Serverless ではなくコミュニティ Pod で動作
- ジョブは環境変数で完全指定。1ジョブ処理して終了

## アーキテクチャ

```
AMANE API (Vercel)
  │ ①ジョブINSERT + R2一時認証情報発行
  ▼
Turso DB (ジョブキュー)
  │ ②ジョブ取得(読み取りのみ)
  ▼
コミュニティPod (community_worker.py)
  │ ③R2に進捗JSONをPUT(flashvsr/tmp/{job_id}/progress.json) 1分ごと
  │ ④処理完了 → R2に結果をPUT(flashvsr/tmp/{job_id}/result.mp4)
  ▼
AMANE API がR2から進捗・結果を読み取る
```

- **sageattention 有効化**: `--attention_mode sparse_sage_attention`（RTX 4090で1.5-2x高速化）
- **R2一時認証情報**: 短命・スコープ限定（`flashvsr/tmp/{job_id}/` への PutObject のみ）で書き込み。コミュニティサーバーに不要な権限（DBアクセス等）を一切与えない
- **進捗**: 1分ごとにR2へJSONをPUT（`progress.json`）

## 環境変数（ジョブ指定）

Pod 作成時に環境変数でジョブを完全指定:

| 変数 | 説明 |
|------|------|
| `JOB_ID` | ジョブID（必須） |
| `INPUT_URL` | 入力動画URL（必須） |
| `SCALE` | アップスケール倍率（省略可。省略時は入力幅に応じて自動決定） |
| `R2_ENDPOINT` | R2 S3エンドポイント（`https://<ACCOUNT_ID>.r2.cloudflarestorage.com`） |
| `R2_BUCKET` | バケット名（デフォルト `project-merino-assets`） |
| `R2_ACCESS_KEY` | R2一時認証情報のアクセスキーID |
| `R2_SECRET_KEY` | R2一時認証情報のシークレットキー |
| `R2_SESSION_TOKEN` | R2一時認証情報のセッショントークン |
| `R2_PREFIX` | キー接頭辞（デフォルト `flashvsr/tmp/{job_id}/`） |

## アップスケール戦略（方式C: 幅に応じて4x/2x）

`SCALE` を省略すると、入力幅に応じて自動決定:

| 入力幅 | 前処理 | FlashVSR scale | 出力幅 |
|--------|--------|----------------|--------|
| <540px | ffmpegで540pxに拡大 | 4x | 2160px |
| 540〜1080px | なし | 4x | 2160px |
| >1080px | なし | 2x | 2160px（超えたらdownscale） |

- **FlashVSRは4xが最適設計**（2xも動くが4xが品質・安定性で最適）
- コストは出力ピクセル数に比例（2160px出力なら方式間で差なし）
- ffmpeg前処理はワーカー内で完結（Vercelの300秒制約から解放）

## Docker Build

```shell
cd foundries/FlashVSR

docker build --platform linux/amd64 -t ofuton/flashvsr:$(cat VERSION) -t ofuton/flashvsr:latest .
```

## Docker Push

```shell
docker push ofuton/flashvsr:latest
```

## RunPod デプロイ（コミュニティ Pod）

1. RunPod ダッシュボード → Pods → New Pod
2. Container Image: `ofuton/flashvsr:latest`
3. GPU: RTX 4090（コミュニティ）
4. 環境変数にジョブを指定（上記テーブル）
5. 起動 → 1ジョブ処理して終了

## AMANE での使用

- AMANE API がジョブINSERT + R2一時認証情報発行
- コミュニティ Pod を起動（環境変数でジョブ指定）
- ワーカーが進捗・結果をR2に書き込む
- AMANE API がR2から進捗・結果を読み取る

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
- [Cloudflare R2 Temporary credentials](https://developers.cloudflare.com/r2/api/s3/temporary-credentials/) — 短命・スコープ限定のS3認証情報
