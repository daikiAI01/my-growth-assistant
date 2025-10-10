# タグ付け機能 - トラブルシューティングガイド

## 📋 概要

**機能**: ログテキストから `#タグ名` 形式のハッシュタグを自動抽出し、データベースに保存する機能

**現在の状態**: ⚠️ **未動作** - タグが `null` として保存される

**最終試行日**: 2025-10-10

---

## 🎯 目標

ユーザーが「今日は勉強を頑張った #学習 #成長」と入力したとき、
データベースに以下のように保存されるべき：

```
content: "今日は勉強を頑張った #学習 #成長"
tags: ["#学習", "#成長"]
```

**実際の結果**:
```
content: "今日は勉強を頑張った #学習 #成長"
tags: null  ← ★問題
```

---

## 🔍 実装の詳細

### データベーススキーマ

**マイグレーションファイル**: `supabase/migrations/20251010125644_add_tags_to_logs.sql`

```sql
-- Add tags column to logs table
ALTER TABLE logs ADD COLUMN IF NOT EXISTS tags text[];
```

**適用状況**:
- ✅ マイグレーション実行済み
- ✅ `supabase db push --include-all` でデプロイ確認済み
- ✅ `tags` カラムはデータベースに存在

**テーブル構造**:
```sql
TABLE logs (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT NULL,    -- ★このカラム
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

---

### フロントエンド実装

**ファイル**: `frontend/index.html`

#### ハッシュタグ抽出ロジック

```javascript
// 行36: 正規表現でハッシュタグを抽出
const tags = content.match(/#\S+/g) || [];
console.log('Extracted tags:', tags);
```

**正規表現の説明**:
- `#` - ハッシュ記号で開始
- `\S+` - 空白以外の文字が1文字以上続く
- `g` - グローバルフラグ（すべてマッチ）
- `|| []` - マッチしない場合は空配列

**テストケース**:
| 入力 | 期待される出力 |
|------|----------------|
| "今日は勉強した #学習" | `["#学習"]` |
| "良い日だった #成長 #幸せ" | `["#成長", "#幸せ"]` |
| "#朝活 から始めた一日" | `["#朝活"]` |
| "タグなしのテキスト" | `[]` |

#### データ送信

```javascript
// 行39-40: ペイロード作成とログ出力
const payload = { content: content, tags: tags };
console.log('Sending payload:', JSON.stringify(payload));

// 行45-54: fetch APIでPOSTリクエスト
const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify(payload)
});
```

**期待される送信データ**:
```json
{
  "content": "今日は勉強を頑張った #学習 #成長",
  "tags": ["#学習", "#成長"]
}
```

---

### バックエンド実装

**ファイル**: `backend/functions/submit-log/index.ts`

```typescript
serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // リクエストボディを受信
    const body = await req.json();
    console.log("Received body:", JSON.stringify(body));

    // content と tags を抽出
    const { content, tags } = body;
    console.log("Parsed content:", content);
    console.log("Parsed tags:", JSON.stringify(tags));

    // Supabaseクライアント初期化
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // データベースに挿入
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

**ログ出力箇所**:
1. `Received body:` - 受信した生データ
2. `Parsed content:` - contentフィールド
3. `Parsed tags:` - tagsフィールド
4. `Inserting data:` - DBに送るデータ
5. `Insert successful:` - DB保存後のデータ
6. `Database error:` (エラー時) - DBエラー詳細
7. `Function error:` (エラー時) - 関数エラー

**デプロイ情報**:
```bash
SUPABASE_ACCESS_TOKEN=sbp_0c7fafaa0e57f01040ebe01dfd40447079bba45b \
supabase functions deploy submit-log --project-ref bbuydqtmzjgxxamtvtda
```

**最終デプロイ**: 2025-10-10

---

### ダッシュボードでのタグ表示

**ファイル**: `frontend/dashboard.html`

#### CSSスタイル

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

#### JavaScriptでの表示ロジック

```javascript
// ログ取得時にタグを表示
data.forEach(log => {
    const logItem = document.createElement('div');
    logItem.className = 'log-item';
    const logDate = new Date(log.created_at).toLocaleString('ja-JP');

    // タグがある場合はバッジを生成
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

**表示例**（動作する場合）:
```
今日は勉強を頑張った #学習 #成長
[#学習] [#成長]  ← 青いバッジで表示
```

---

## 🐛 試行した解決策（すべて失敗）

### 試行1: 手動JSONパース（失敗）

**日時**: 2025-10-10 初回

**変更内容**:
```typescript
// 変更前
const { content, tags } = await req.json();

// 変更後
const bodyText = await req.text();
const { content, tags } = JSON.parse(bodyText);
```

**理由**: `req.json()` の内部的な問題を疑った

**結果**: ❌ 変化なし。タグは依然として `null`

---

### 試行2: CORSヘッダー修正（失敗）

**日時**: 2025-10-10

**変更内容**:
```typescript
// タイポ修正（実際にはタイポはなかった）
'Access-Control-Allow-Origin': '*',
```

**結果**: ❌ 変化なし

---

### 試行3: 複数回の再デプロイ（失敗）

**日時**: 2025-10-10 複数回

**コマンド**:
```bash
supabase functions deploy submit-log --project-ref bbuydqtmzjgxxamtvtda
```

**試行回数**: 5回以上

**結果**: ❌ 変化なし。古いバージョンのキャッシュ問題を疑ったが解決せず

---

### 試行4: デバッグログの大量追加（進行中）

**日時**: 2025-10-10 最終

**変更内容**:
- フロントエンドに5箇所のconsole.log追加
- バックエンドに7箇所のconsole.log追加
- レスポンスデータに`data`フィールドを含める

**目的**: データフローの各段階で値を確認

**結果**: ⏸️ ユーザーの確認待ち

---

## 🔬 デバッグ手順（詳細版）

### ステップ1: フロントエンドでの確認

1. **ファイルを開く**:
   - `frontend/index.html` をブラウザで開く

2. **開発者ツールを起動**:
   - Windows/Linux: `F12` または `Ctrl+Shift+I`
   - Mac: `Cmd+Option+I`

3. **Consoleタブに移動**

4. **テストデータを入力**:
   ```
   今日は勉強を頑張った #学習 #成長
   ```

5. **保存ボタンをクリック**

6. **コンソールログを確認**:
   ```
   ✅ Extracted tags: Array(2)
      0: "#学習"
      1: "#成長"

   ✅ Sending payload: {"content":"今日は勉強を頑張った #学習 #成長","tags":["#学習","#成長"]}

   ✅ Response status: 200

   ❓ Success response: {message: "Log saved!", data: [...]}
   ```

7. **data配列の中身を展開して確認**:
   ```javascript
   data: Array(1)
     0: Object
       id: 123
       content: "今日は勉強を頑張った #学習 #成長"
       tags: null  // ← ★ここがnullなら問題
       created_at: "2025-10-10T..."
   ```

### ステップ2: バックエンドログの確認

1. **Supabase Dashboardを開く**:
   - URL: https://supabase.com/dashboard/project/bbuydqtmzjgxxamtvtda/functions

2. **submit-log 関数を選択**

3. **Logs タブをクリック**

4. **最新のログエントリを確認**:
   ```
   ✅ Received body: {"content":"今日は勉強を頑張った #学習 #成長","tags":["#学習","#成長"]}

   ✅ Parsed content: 今日は勉強を頑張った #学習 #成長

   ❓ Parsed tags: ["#学習","#成長"] または null

   ❓ Inserting data: {"content":"...","tags":["#学習","#成長"]} または null

   ❓ Database error: (エラーがあれば表示される)

   ❓ Insert successful: [{"id":123,"tags":null}] または [{"id":123,"tags":["#学習","#成長"]}]
   ```

### ステップ3: データベース直接確認

1. **Supabase SQL Editorを開く**:
   - URL: https://supabase.com/dashboard/project/bbuydqtmzjgxxamtvtda/sql

2. **クエリを実行**:
   ```sql
   SELECT
     id,
     content,
     tags,
     created_at
   FROM logs
   ORDER BY created_at DESC
   LIMIT 5;
   ```

3. **tags カラムの値を確認**:
   - `null` の場合: 問題あり
   - `{#学習,#成長}` の場合: 正常

### ステップ4: RLSポリシーの確認

1. **テーブルエディタを開く**:
   - https://supabase.com/dashboard/project/bbuydqtmzjgxxamtvtda/editor

2. **logs テーブルを選択**

3. **RLS (Row Level Security) タブを確認**:
   - RLSが有効な場合、ポリシーを確認
   - Service Role Keyで実行しているので通常は問題なし

---

## 💡 推測される原因

### 仮説1: Edge Functionのキャッシュ問題
**可能性**: ⭐⭐⭐⭐ (高)

**説明**:
- Supabase Edge Functionsは内部的にキャッシュを持つ可能性
- デプロイしても古いバージョンが実行される
- 特にWARNING: Docker is not running が表示された

**検証方法**:
- Supabaseダッシュボードで最新のデプロイ時刻を確認
- ログのタイムスタンプとデプロイ時刻を比較

**解決策**:
- Supabaseプロジェクトの再起動
- 関数の削除→再作成

---

### 仮説2: PostgreSQLのtext[]型変換問題
**可能性**: ⭐⭐⭐ (中)

**説明**:
- JavaScriptの配列がPostgreSQLのtext[]に正しく変換されていない
- Supabase JSクライアントの内部的な問題

**検証方法**:
```typescript
// 明示的にPOSTGRESTフォーマットに変換
const tags = ["#学習", "#成長"];
const insertData = {
  content: content,
  tags: `{${tags.join(',')}}` // PostgreSQL配列リテラル
};
```

---

### 仮説3: 環境変数の問題
**可能性**: ⭐⭐ (低)

**説明**:
- `SUPABASE_SERVICE_ROLE_KEY` が正しく設定されていない
- 権限不足でtags カラムに書き込めない

**検証方法**:
```bash
supabase secrets list --project-ref bbuydqtmzjgxxamtvtda
```

---

### 仮説4: マイグレーションの未適用
**可能性**: ⭐ (極めて低)

**説明**:
- `tags` カラムが実際には存在しない
- マイグレーションがリモートDBに適用されていない

**検証方法**:
```sql
-- SQL Editorで実行
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'logs';
```

**期待される結果**:
```
column_name | data_type
------------|----------
id          | bigint
content     | text
tags        | ARRAY   ← これがあればOK
created_at  | timestamp with time zone
```

---

## 📝 次に試すべきこと

### 1. PostgreSQL配列リテラル形式での送信

**ファイル**: `backend/functions/submit-log/index.ts`

```typescript
// 変更案
const { content, tags } = body;

// JavaScriptの配列をPostgreSQL配列リテラルに変換
let tagsFormatted = null;
if (tags && tags.length > 0) {
  tagsFormatted = `{${tags.join(',')}}`;
}

const { data, error } = await supabaseClient
  .from("logs")
  .insert({ content: content, tags: tagsFormatted });
```

---

### 2. 生SQLでの挿入テスト

**Supabase SQL Editorで実行**:
```sql
INSERT INTO logs (content, tags)
VALUES (
  'テストログ #テスト',
  ARRAY['#テスト']
);

SELECT * FROM logs ORDER BY created_at DESC LIMIT 1;
```

**期待される結果**:
- エラーなく挿入される
- tags に `{#テスト}` が保存される

---

### 3. 別テーブルへの分離（代替案）

**新しいスキーマ**:
```sql
-- tagsテーブルを作成
CREATE TABLE tags (
  id BIGSERIAL PRIMARY KEY,
  log_id BIGINT REFERENCES logs(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_tags_log_id ON tags(log_id);
CREATE INDEX idx_tags_tag ON tags(tag);
```

**挿入ロジック**:
```typescript
// ログを挿入
const { data: logData, error: logError } = await supabaseClient
  .from("logs")
  .insert({ content })
  .select()
  .single();

// タグを個別に挿入
if (tags && tags.length > 0) {
  const tagRecords = tags.map(tag => ({
    log_id: logData.id,
    tag: tag
  }));

  await supabaseClient
    .from("tags")
    .insert(tagRecords);
}
```

---

### 4. Supabaseサポートへの問い合わせ

**問い合わせ内容テンプレート**:
```
Subject: Edge Function から text[] 型のカラムに配列を保存できない

Environment:
- Project Ref: bbuydqtmzjgxxamtvtda
- Function Name: submit-log
- Database: PostgreSQL (Supabase managed)

Issue:
JavaScript配列をtext[]型のカラムに保存しようとしていますが、
常にnullとして保存されます。

Code:
const { data, error } = await supabaseClient
  .from("logs")
  .insert({ content: "test", tags: ["#tag1", "#tag2"] });

Expected: tags = ["#tag1", "#tag2"]
Actual: tags = null

Logs show no errors, and the function returns status 200.
The column exists and is of type text[].

Could you please help identify the issue?
```

---

## 📊 現在の状態まとめ

| 項目 | 状態 | 備考 |
|------|------|------|
| データベースマイグレーション | ✅ 完了 | tags カラム追加済み |
| フロントエンドのタグ抽出 | ✅ 動作 | 正規表現で正しく抽出 |
| フロントエンドからの送信 | ✅ 動作 | JSON形式で送信確認 |
| Edge Functionの受信 | ❓ 不明 | ログ確認が必要 |
| データベースへの保存 | ❌ 失敗 | nullとして保存される |
| ダッシュボードでの表示 | ✅ 実装済み | タグがあれば表示可能 |

---

## 🎓 学んだこと

1. **デバッグログの重要性**:
   - データフローの各段階でログを出力することが重要
   - JSON.stringify()で複雑なオブジェクトを可視化

2. **Edge Functionsの特性**:
   - デプロイ後も古いバージョンがキャッシュされる可能性
   - ログ確認が必須

3. **PostgreSQLのtext[]型**:
   - JavaScriptの配列が自動変換されることを期待したが、実際には問題発生
   - 明示的な変換が必要な可能性

4. **代替設計の重要性**:
   - 配列カラムが動作しない場合、別テーブルに分離する方法も有効

---

**最終更新**: 2025-10-10
**次回試行時**: 上記「次に試すべきこと」を順番に実施
