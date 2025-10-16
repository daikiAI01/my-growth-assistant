-- 外部キー制約を削除して、認証システムなしでも動作するように修正
ALTER TABLE user_secrets DROP CONSTRAINT IF EXISTS user_secrets_user_id_fkey;

-- user_id カラムを単純なuuid型に変更（外部キー制約なし）
ALTER TABLE user_secrets ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE user_secrets ALTER COLUMN user_id SET DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;
