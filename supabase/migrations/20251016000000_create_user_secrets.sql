-- Create user_secrets table to store Google OAuth refresh tokens
CREATE TABLE user_secrets (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid REFERENCES auth.users(id) UNIQUE NOT NULL,
  google_refresh_token text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (Row Level Security)
ALTER TABLE user_secrets ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only read/update their own secrets
CREATE POLICY "Users can manage their own secrets"
  ON user_secrets
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
