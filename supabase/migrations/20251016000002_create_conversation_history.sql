-- 会話履歴を保存するテーブル
CREATE TABLE conversation_history (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  line_user_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
  content text,
  tool_calls jsonb,
  tool_call_id text,
  name text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- インデックスを作成（会話履歴の取得を高速化）
CREATE INDEX idx_conversation_history_line_user_id ON conversation_history(line_user_id);
CREATE INDEX idx_conversation_history_created_at ON conversation_history(created_at DESC);

-- RLSを有効化（将来的に必要になる可能性があるため）
ALTER TABLE conversation_history ENABLE ROW LEVEL SECURITY;

-- 一旦全員がアクセスできるポリシーを設定（後で制限可能）
CREATE POLICY "Allow all access for now"
  ON conversation_history
  FOR ALL
  USING (true)
  WITH CHECK (true);
