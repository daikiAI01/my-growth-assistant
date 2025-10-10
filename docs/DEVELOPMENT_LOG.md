# My Growth Assistant - 開発ログ

## プロジェクト概要

日々の活動と思考を記録するためのパーソナルアシスタントツール。
Supabase Edge Functions + PostgreSQL + フロントエンド（HTML/CSS/JavaScript）で構築。

---

## 実装済み機能

### ✅ 1. LINE Bot統合
- **実装日**: 2025年初期
- **機能**: LINE Messaging APIを使用してメッセージを受信し、Supabaseに保存
- **ファイル**:
  - `backend/functions/line-webhook/index.ts`
- **ステータス**: 正常動作

### ✅ 2. Web入力フォーム
- **実装日**: 2025年初期
- **機能**: シンプルなテキストエリアから日々の記録を保存
- **ファイル**:
  - `frontend/index.html`
  - `backend/functions/submit-log/index.ts`
- **ステータス**: 正常動作

### ✅ 3. ダッシュボード - 基本機能
- **実装日**: 2025年初期
- **機能**:
  - ログの一覧表示（日付降順）
  - ログの検索機能（キーワードでLIKE検索）
  - ログの編集機能（モーダルで編集）
  - ログの削除機能（確認ダイアログ付き）
- **ファイル**: `frontend/dashboard.html`
- **ステータス**: 正常動作

### ✅ 4. 目標管理機能
- **実装日**: 2025年初期
- **機能**:
  - 目標の追加（モーダルから入力）
  - チェックボックスで完了/未完了を切り替え
  - Chart.jsでドーナツチャート表示（完了率）
  - データベースに状態を永続化
- **テーブル**: `goals` (id, content, is_completed, created_at)
- **ファイル**: `frontend/dashboard.html` (lines 353-361, 583-633)
- **ステータス**: 正常動作

### ✅ 5. アクティビティカレンダー
- **実装日**: 2025年中期
- **機能**:
  - vanilla-calendar-proライブラリ使用
  - ログが存在する日付をハイライト表示
  - 日本語ローカライゼーション
- **ライブラリ**: `vanilla-calendar-pro`
- **ファイル**: `frontend/dashboard.html` (lines 508-542)
- **ステータス**: 正常動作

### ✅ 6. 分析レポート機能
- **実装日**: 2025年中期
- **機能**:
  - トップ10キーワード抽出（単語頻度分析）
  - 感情分析（ポジティブ/ネガティブ/普通）
  - 日本語テキスト対応
- **実装方法**:
  - 正規表現でテキスト分割: `/[\s、。！？「」\n]+/`
  - ポジティブワード: ['良い', 'すごい', '楽しい', '嬉しい', '成功', '達成', '頑張った', '最高', '良かった', 'できた', '完成']
  - ネガティブワード: ['悪い', 'ダメ', '辛い', '悲しい', '失敗', '問題', '難しい', 'できない', '困難']
- **ファイル**: `frontend/dashboard.html` (lines 459-505)
- **ステータス**: 正常動作

### ✅ 7. テーマ切り替え機能
- **実装日**: 2025年後期
- **機能**:
  - ライト/ダークテーマの切り替え
  - CSS変数（カスタムプロパティ）で実装
  - localStorage に設定を保存
  - OSのダークモード設定を自動検出
- **CSS変数**:
  - `--bg-color`, `--text-color`, `--card-bg-color`, `--border-color`
  - `--subtle-text-color`, `--accent-color`, `--shadow-color`
  - `--input-bg`, `--modal-overlay`, `--goal-bg`, `--goal-border`
- **ファイル**: `frontend/dashboard.html` (lines 16-41, 396-410)
- **ステータス**: 正常動作

### ✅ 8. カード型レイアウト
- **実装日**: 2025年10月10日
- **機能**:
  - 全機能を独立した`.card`コンポーネントに整理
  - 最大幅800pxのコンテナで中央配置
  - 各セクションに絵文字アイコン追加
  - レスポンシブデザイン対応
- **ファイル**: `frontend/dashboard.html` (lines 53-104, 338-372)
- **ステータス**: 正常動作

---

## 🚧 開発中・未解決機能

### ⚠️ タグ付け機能（未動作）

**実装期間**: 2025年10月10日（複数回試行）

#### データベース側の準備
✅ **完了**: マイグレーションファイル作成
- **ファイル**: `supabase/migrations/20251010125644_add_tags_to_logs.sql`
- **内容**:
  ```sql
  ALTER TABLE logs ADD COLUMN IF NOT EXISTS tags text[];
  ```
- **適用状況**: マイグレーション適用済み（`supabase db push`で確認）

#### フロントエンド実装 (frontend/index.html)

**現在のコード** (lines 29-76):
```javascript
button.addEventListener('click', async () => {
    const content = textarea.value.trim();
    if (!content) {
        alert('何か入力してください。');
        return;
    }

    // ハッシュタグ抽出（正規表現）
    const tags = content.match(/#\S+/g) || [];
    console.log('Extracted tags:', tags);

    const payload = { content: content, tags: tags };
    console.log('Sending payload:', JSON.stringify(payload));

    button.textContent = '保存中...';
    button.disabled = true;

    try {
        const response = await fetch(FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify(payload)
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error response:', errorData);
            throw new Error(errorData.message || '保存に失敗しました。');
        }

        const responseData = await response.json();
        console.log('Success response:', responseData);

        alert('保存しました！タグ: ' + (tags.length > 0 ? tags.join(', ') : 'なし'));
        textarea.value = '';
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    } finally {
        button.textContent = '保存する';
        button.disabled = false;
    }
});
```

**デバッグポイント**:
- `Extracted tags:` でタグが抽出されているか確認
- `Sending payload:` で正しいJSON形式で送信されているか確認
- `Response status:` でHTTPステータスコード確認

#### バックエンド実装 (backend/functions/submit-log/index.ts)

**現在のコード** (全体):
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Received body:", JSON.stringify(body));

    const { content, tags } = body;
    console.log("Parsed content:", content);
    console.log("Parsed tags:", JSON.stringify(tags));

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const insertData = { content: content, tags: tags };
    console.log("Inserting data:", JSON.stringify(insertData));

    const { data, error } = await supabaseClient
      .from("logs")
      .insert(insertData)
      .select();

    if (error) {
      console.error("Database error:", JSON.stringify(error));
      throw error;
    }

    console.log("Insert successful, returned data:", JSON.stringify(data));

    return new Response(JSON.stringify({ message: "Log saved!", data: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error("Function error:", err.message);
    return new Response(JSON.stringify({ message: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
```

**デバッグポイント**:
- `Received body:` でリクエストボディが正しく受信されているか
- `Parsed tags:` でタグが正しく解析されているか
- `Inserting data:` でDBに送るデータが正しいか
- `Database error:` でDBエラーの詳細を確認
- `Insert successful:` で保存されたデータを確認

**デプロイ状況**:
- 最終デプロイ日時: 2025年10月10日
- デプロイコマンド:
  ```bash
  SUPABASE_ACCESS_TOKEN=sbp_0c7fafaa0e57f01040ebe01dfd40447079bba45b \
  supabase functions deploy submit-log --project-ref bbuydqtmzjgxxamtvtda
  ```
- デプロイ結果: 成功

#### ダッシュボードでのタグ表示実装 (frontend/dashboard.html)

**CSSスタイル** (lines 254-268):
```css
.log-tags {
    margin-top: 0.5rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.tag {
    display: inline-block;
    background-color: var(--accent-color);
    color: white;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 0.85rem;
}
```

**JavaScriptでのタグ表示** (lines 672-695):
```javascript
data.forEach(log => {
    const logItem = document.createElement('div');
    logItem.className = 'log-item';
    const logDate = new Date(log.created_at).toLocaleString('ja-JP');

    let tagsHtml = '';
    if (log.tags && log.tags.length > 0) {
        const tagBadges = log.tags.map(tag => `<span class="tag">${tag}</span>`).join('');
        tagsHtml = `<div class="log-tags">${tagBadges}</div>`;
    }

    logItem.innerHTML = `
        <div class="log-item-header">
            <div class="log-date">${logDate}</div>
            <div class="log-actions">
                <button class="edit-btn" data-id="${log.id}">編集</button>
                <button class="delete-btn" data-id="${log.id}">削除</button>
            </div>
        </div>
        <div class="log-content">${log.content}</div>
        ${tagsHtml}
    `;
    logsContainer.appendChild(logItem);
});
```

#### 既知の問題点

1. **タグがnullで保存される**
   - フロントエンドでは正しくタグが抽出されている
   - バックエンドに送信される
   - しかしDBには`null`として保存される

2. **過去に試した解決策（すべて失敗）**
   - `req.text()` + `JSON.parse()` での手動パース
   - CORS ヘッダーの修正
   - 複数回のデプロイ
   - Edge Function のキャッシュクリア試行

3. **推測される原因**
   - Edge Function の古いバージョンがキャッシュされている可能性
   - Supabase側の内部的な問題
   - PostgreSQLのtext[]型への変換エラー
   - Row Level Security (RLS) ポリシーの問題

#### デバッグ方法

1. **フロントエンド（ブラウザコンソール）**:
   ```
   frontend/index.html を開く
   → ブラウザの開発者ツール（F12）を開く
   → テキストに「今日は勉強した #学習」と入力
   → 保存ボタンをクリック
   → コンソールで以下を確認:
      - Extracted tags: ["#学習"]
      - Sending payload: {"content":"今日は勉強した #学習","tags":["#学習"]}
      - Response status: 200
      - Success response: {message: "Log saved!", data: [...]}
   ```

2. **バックエンド（Supabase Dashboard）**:
   ```
   https://supabase.com/dashboard/project/bbuydqtmzjgxxamtvtda/functions
   → submit-log を選択
   → Logs タブを開く
   → 以下のログを確認:
      - Received body: {"content":"...","tags":["#学習"]}
      - Parsed tags: ["#学習"]
      - Inserting data: {"content":"...","tags":["#学習"]}
      - Insert successful: [{"id":123,"content":"...","tags":["#学習"],...}]
   ```

3. **データベース（Supabase SQL Editor）**:
   ```sql
   SELECT id, content, tags, created_at
   FROM logs
   ORDER BY created_at DESC
   LIMIT 5;
   ```
   → `tags`カラムが`null`か配列かを確認

#### 次のステップ（未実施）

1. Supabaseダッシュボードから手動でログを確認
2. Edge Functionのログを詳細に確認
3. 必要に応じてSupabaseサポートに問い合わせ
4. 代替実装（tagsを別テーブルに分ける）を検討

---

## 技術スタック

### フロントエンド
- **HTML5 + CSS3 + Vanilla JavaScript**
- **ライブラリ**:
  - Chart.js (v4.x) - ドーナツチャート
  - vanilla-calendar-pro - カレンダーUI
  - @supabase/supabase-js (v2) - Supabaseクライアント
- **フォント**: Google Fonts - Noto Sans JP

### バックエンド
- **Supabase Edge Functions** (Deno runtime)
- **Deno標準ライブラリ**: std@0.168.0
- **環境変数**:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `LINE_CHANNEL_SECRET` (LINE Bot用)
  - `LINE_CHANNEL_ACCESS_TOKEN` (LINE Bot用)

### データベース
- **PostgreSQL** (Supabase managed)
- **テーブル構造**:

  **logs テーブル**:
  ```sql
  CREATE TABLE logs (
    id BIGSERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    tags TEXT[] DEFAULT NULL,  -- ★追加済み（未動作）
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```

  **goals テーブル**:
  ```sql
  CREATE TABLE goals (
    id BIGSERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```

### デプロイ
- **Edge Functions**: Supabase CLI経由でデプロイ
- **フロントエンド**: 静的ファイル（ローカルまたはホスティング）
- **プロジェクトID**: `bbuydqtmzjgxxamtvtda`

---

## ファイル構造

```
my-growth-assistant/
├── backend/
│   └── functions/
│       ├── line-webhook/
│       │   └── index.ts          # LINE Bot webhook handler
│       └── submit-log/
│           └── index.ts          # ログ保存API（タグ対応版）
├── frontend/
│   ├── index.html               # ログ入力フォーム（タグ抽出機能付き）
│   └── dashboard.html           # メインダッシュボード
├── supabase/
│   └── migrations/
│       └── 20251010125644_add_tags_to_logs.sql  # tagsカラム追加
├── docs/
│   ├── DEBUG_DIARY.md          # 過去のデバッグ履歴
│   └── DEVELOPMENT_LOG.md      # 本ファイル
└── README.md                    # プロジェクト概要
```

---

## 環境情報

- **OS**: macOS (Darwin 24.6.0)
- **作業ディレクトリ**: `/Users/daikitakayama/code/my-growth-assistant`
- **Gitリポジトリ**: 初期化済み
- **Supabaseプロジェクト**:
  - URL: https://bbuydqtmzjgxxamtvtda.supabase.co
  - Project Ref: bbuydqtmzjgxxamtvtda

---

## 変更履歴

### 2025-10-10
- ✅ カード型レイアウトへの全面リニューアル
- ✅ テーマ切り替え機能の完成
- 🚧 タグ付け機能の実装試行（未解決）
- ✅ dashboard.htmlのタグ表示UI実装
- ✅ 詳細なデバッグログの追加

### 2025年中期
- ✅ アクティビティカレンダー実装
- ✅ 分析レポート機能実装（キーワード・感情分析）
- ✅ 目標管理機能のチャート追加

### 2025年初期
- ✅ LINE Bot統合
- ✅ 基本的なCRUD機能実装
- ✅ 検索機能実装

---

## 参考リンク

- **Supabase Dashboard**: https://supabase.com/dashboard/project/bbuydqtmzjgxxamtvtda
- **Edge Functions管理**: https://supabase.com/dashboard/project/bbuydqtmzjgxxamtvtda/functions
- **データベースエディタ**: https://supabase.com/dashboard/project/bbuydqtmzjgxxamtvtda/editor

---

## 開発メモ

### タグ機能について
- 正規表現 `/#\S+/g` でハッシュタグを抽出
- 空白を含まない文字列を#の後ろから抽出
- 例: "今日は勉強した #学習 #成長" → ["#学習", "#成長"]

### CSS変数の利点
- テーマ切り替えが容易
- メンテナンス性が高い
- すべての要素が自動的にテーマに追従

### デバッグのベストプラクティス
- フロントエンド: ブラウザコンソールで詳細ログ
- バックエンド: console.log()でJSON.stringify()
- データベース: SQL Editorで直接確認

---

**最終更新**: 2025-10-10
**作成者**: Daiki Takayama (with Claude Code)
