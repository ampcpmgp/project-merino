# Version Information / バージョン情報

## v1.0.0 - Merino Memo Extension (2026-02-09)

### 新規追加 / New Features

#### Merino Memo Extension
- **メモ管理用Chrome拡張機能を追加**
  - テキストメモの保存・管理機能
  - 設定ダイアログ（フォントサイズ、自動保存）
  - 変数設定ダイアログ（変数の追加・編集・削除）

#### ダイアログ管理システム / Dialog Management System
- **適切なダイアログスタック管理**
  - DialogManagerクラスによる一元管理
  - ダイアログを開いた順序をスタックで管理
  - 新しいダイアログ追加時も簡単にメンテナンス可能

#### ESCキーハンドリング / ESC Key Handling
- **一つずつ確実にダイアログを閉じる**
  - ESCキー1回で最上位のダイアログのみを閉じる
  - ポップアップ→設定→変数設定と開いた場合、逆順で一つずつ閉じる
  - グローバルハンドラーで一貫した動作を保証

#### UI/UX改善 / UI/UX Improvements
- **洗練されたデザイン**
  - グラデーション背景とモダンなUI
  - スムーズなアニメーション効果
  - トースト通知でユーザーフィードバック

#### コード品質 / Code Quality
- **クリーンで読みやすい実装**
  - クラスベースの構造化されたコード
  - 明確な責任分離（DialogManager, Utils, MemoApp）
  - 詳細なコメントとドキュメント
  - メンテナンスしやすい設計

### ドキュメント / Documentation

- **CONTRIBUTING.md追加**
  - 開発ガイドライン
  - コーディング規約
  - バージョン管理ルール

- **tools/memo-extension/README.md追加**
  - インストール方法
  - 使用方法
  - アーキテクチャ説明
  - 新しいダイアログの追加方法

### 技術仕様 / Technical Specifications

- **使用技術**
  - Chrome Extension Manifest V3
  - Vanilla JavaScript (ES6+)
  - CSS3 (Flexbox, Animations)
  - Chrome Storage API

- **ファイル構成**
  ```
  tools/memo-extension/
  ├── manifest.json       # Chrome拡張マニフェスト
  ├── popup.html          # ポップアップHTML
  ├── memo.js             # メインロジック
  ├── styles.css          # スタイルシート
  ├── README.md           # 拡張機能のドキュメント
  └── images/             # アイコン画像
      ├── icon16.png
      ├── icon48.png
      └── icon128.png
  ```

### セキュリティ / Security

- ユーザーデータはローカルストレージに安全に保存
- 不要な権限は要求しない
- XSS対策済み

### 今後の展開 / Future Plans

- [ ] タグ機能の実装検討（現在は不要と判断し未実装）
- [ ] エクスポート/インポート機能
- [ ] マークダウンサポート
- [ ] 検索機能
- [ ] ショートカットキーカスタマイズ

---

## 変更履歴の形式 / Changelog Format

各バージョンには以下の情報を含めます：
- バージョン番号
- リリース日
- 新機能 (New Features)
- 改善点 (Improvements)
- バグ修正 (Bug Fixes)
- 破壊的変更 (Breaking Changes) ※該当する場合
