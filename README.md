# My Growth Assistant

日々の活動と思考を記録するためのパーソナルアシスタントツール。

**最終更新**: 2025-10-10 | **Gitコミット**: ba2e41f

---

## 🎯 プロジェクト概要

Supabase Edge Functions + PostgreSQL + フロントエンド（HTML/CSS/JavaScript）で構築した、
個人の成長を記録・分析・可視化するダッシュボードアプリケーション。

**主な特徴**:
- 📝 日々の記録を簡単に保存
- 📊 キーワード分析・感情分析
- 📅 活動カレンダーで記録を可視化
- 🎯 目標管理とチャート表示
- 🎨 ライト/ダークテーマ切り替え
- 💬 LINE Bot統合

---

## ✅ 実装済み機能

### 1. ダッシュボード (`frontend/dashboard.html`)
- **カード型レイアウト**: 全機能を独立したカードに整理
- **ログ管理**: 検索・編集・削除機能
- **目標管理**: チェックボックスとドーナツチャート
- **アクティビティカレンダー**: ログがある日をハイライト
- **分析レポート**: トップ10キーワード・感情分析
- **テーマ切り替え**: ライト/ダークモード対応

### 2. データ入力
- **Webフォーム** (`frontend/index.html`): シンプルな入力画面
- **LINE Bot**: LINE Messaging API経由でメッセージを自動保存

### 3. バックエンド
- **Edge Functions**: Deno上で動作するサーバーレス関数
- **PostgreSQL**: Supabase管理のデータベース

---

## ⚠️ 既知の問題

### タグ付け機能（未動作）
ハッシュタグ（`#学習` など）を自動抽出してデータベースに保存する機能を実装中ですが、
現在タグが `null` として保存される問題があります。

**詳細**: `docs/TAG_FEATURE_TROUBLESHOOTING.md` 参照

---

## 📁 ファイル構造

```
my-growth-assistant/
├── frontend/
│   ├── index.html         # ログ入力フォーム
│   └── dashboard.html     # メインダッシュボード
├── backend/functions/
│   ├── line-webhook/      # LINE Bot
│   └── submit-log/        # ログ保存API
├── supabase/migrations/   # データベースマイグレーション
├── docs/
│   ├── DEVELOPMENT_LOG.md              # 詳細開発ログ
│   ├── TAG_FEATURE_TROUBLESHOOTING.md  # タグ機能課題
│   └── DEBUG_DIARY.md                  # 過去デバッグ記録
├── CURRENT_STATUS.md      # 現在の状態サマリー
└── README.md              # 本ファイル
```

---

## 🚀 使い方

### ダッシュボードを開く
1. `frontend/dashboard.html` をブラウザで開く
2. 以下の機能を利用:
   - 📊 **分析レポート**: キーワード・感情を自動分析
   - 📅 **カレンダー**: 記録した日をハイライト表示
   - 🎯 **目標管理**: 目標を追加・完了チェック
   - 📝 **ログ一覧**: 検索・編集・削除
   - 🎨 **テーマ切替**: 右上ボタンでライト/ダーク切替

### ログを記録
1. `frontend/index.html` をブラウザで開く
2. テキストを入力して「保存する」をクリック

---

## 🛠️ 技術スタック

- **フロントエンド**: HTML5, CSS3, Vanilla JavaScript
- **バックエンド**: Supabase Edge Functions (Deno)
- **データベース**: PostgreSQL (Supabase)
- **ライブラリ**:
  - Chart.js - ドーナツチャート
  - vanilla-calendar-pro - カレンダーUI
  - @supabase/supabase-js - Supabaseクライアント
- **フォント**: Google Fonts - Noto Sans JP

---

## 📚 ドキュメント

| ファイル | 内容 |
|---------|------|
| **CURRENT_STATUS.md** | 📊 現在の状態サマリー（最初に読むべき） |
| **docs/DEVELOPMENT_LOG.md** | 📝 全機能の詳細説明・実装履歴 |
| **docs/TAG_FEATURE_TROUBLESHOOTING.md** | 🐛 タグ機能の詳細なトラブルシューティング |
| **docs/DEBUG_DIARY.md** | 📖 過去のデバッグ履歴（LINE Bot統合時） |

---

## 🎨 スクリーンショット

### ダッシュボード（ライトテーマ）
- カード型レイアウトで各機能を整理
- 分析レポート、カレンダー、目標、ログが一画面に

### ダッシュボード（ダークテーマ）
- 右上のボタンで瞬時に切り替え
- CSS変数で全要素が自動的にテーマに追従

---

## 🔧 開発環境セットアップ

### 必要なツール
- Supabase CLI
- Git

### Edge Functionのデプロイ
```bash
SUPABASE_ACCESS_TOKEN=your_token \
supabase functions deploy submit-log \
--project-ref bbuydqtmzjgxxamtvtda
```

### データベースマイグレーション
```bash
SUPABASE_ACCESS_TOKEN=your_token \
supabase db push --include-all
```

---

## 📈 今後の予定

- [ ] タグ付け機能の修正（最優先）
- [ ] ログのページネーション
- [ ] 目標の期限設定
- [ ] 週次/月次レポート機能
- [ ] エクスポート機能（CSV/JSON）
- [ ] モバイルアプリ版の検討

---

## 🤝 貢献者

- **Daiki Takayama** - プロジェクトオーナー
- **Claude Code** - AI開発アシスタント

---

## 📞 サポート・トラブルシューティング

問題が発生した場合:
1. **CURRENT_STATUS.md** で現在の状態を確認
2. **docs/DEVELOPMENT_LOG.md** で詳細な実装内容を確認
3. **docs/TAG_FEATURE_TROUBLESHOOTING.md** でタグ機能の問題を確認
4. ブラウザのコンソール（F12）でエラーを確認
5. Supabase Dashboardでログを確認

---

## 🎓 学んだこと

このプロジェクトでは、LINE Messaging APIとSupabaseを正常に接続するために、
広範なデバッグプロセスが行われました。

完全な技術的内訳については、[プロジェクトデバッグ日誌](./docs/DEBUG_DIARY.md)を参照してください。

---

**Last Updated**: 2025-10-10
**Git Branch**: main
**Supabase Project**: bbuydqtmzjgxxamtvtda
