# Roadmap

## 開発タスク (Development Tasks)

### LoRA開発 (LoRA Development)
- [ ] FramePack
  - [ ] データセット収集・前処理
  - [ ] 学習
  - [ ] 評価・調整
- [ ] ACE-Step
  - [ ] データセット収集・前処理
  - [ ] 学習
  - [ ] 評価・調整

### インフラ (Infrastructure)
- [ ] LGTM画像・CDNサーバー
  - [ ] 要件定義・技術選定
  - [ ] サーバーサイド実装
  - [ ] フロントエンド実装
  - [ ] CDN設定
  - [ ] デプロイと動作確認
- [ ] 共同作業環境の整備
  - [ ] 素材共有ストレージ
    - [ ] サービス選定（Google Drive, S3など）
    - [ ] 権限設定とフォルダ構成定義
  - [ ] コミュニケーションツール
    - [ ] Slack/Discord等の導入
    - [ ] チャンネル設計
  - [ ] タスク管理
    - [ ] GitHub Projects/Trello等の導入
    - [ ] ボード・リストの設計

### テストブランチ開発 (Test Branch Development)
- [ ] 機能実装
  - [ ] ComfyUI_Predict2_Video2World の実装
  - [ ] ComfyUI_Wan2_1_FusionX_I2V_LoRA の実装
  - [ ] ComfyUI_Wan2_1_FusionX_I2V_Native の実装
  - [ ] ComfyUI_Wan2_1_FusionX_Phantom の実装
  - [ ] ComfyUI_Wan2_1_FusionX_VACE の実装
- [ ] 品質向上
  - [ ] 既存機能のバグ修正
  - [ ] 新機能のバグ修正
  - [ ] UI/UXの改善
  - [ ] レスポンシブ対応
- [ ] テスト
  - [ ] ユニットテスト作成
  - [ ] E2Eテスト作成
- [ ] CI/CD
  - [ ] GitHub Actions ビルドパイプライン構築
    - [ ] Dockerイメージのビルドとプッシュ
  - [ ] GitHub Actions テスト自動化パイプライン構築
    - [ ] 静的解析の導入
  - [ ] GitHub Actions デプロイパイプライン構築
    - [ ] ステージング環境への自動デプロイ
    - [ ] 本番環境への手動デプロイ

## MV制作フロー (MV Production Flow)

### プリプロダクション (Pre-production)
- [ ] 企画・コンセプト決定
- [ ] 絵コンテ作成
- [ ] デザイン
  - [ ] キャラクターデザイン
  - [ ] 背景デザイン
- [ ] 素材収集
  - [ ] 音源
  - [ ] 3Dモデル
  - [ ] その他アセット

### プロダクション (Production)
- [ ] 3Dレイアウト
- [ ] アニメーション
- [ ] VFX
- [ ] ライティング・レンダリング

### ポストプロダクション (Post-production)
- [ ] コンポジット (合成)
- [ ] 編集
- [ ] カラーグレーディング
- [ ] 音響
  - [ ] 音響効果 (SE)
  - [ ] MA (Multi Audio)

### 納品 (Delivery)
- [ ] 最終チェック
- [ ] エンコード
- [ ] 納品
