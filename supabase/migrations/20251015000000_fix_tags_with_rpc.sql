-- Create a function to insert logs with tags
-- This function properly handles text[] arrays from JavaScript
CREATE OR REPLACE FUNCTION insert_log_with_tags(
  p_content TEXT,
  p_tags TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  content TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO logs (content, tags)
  VALUES (p_content, p_tags)
  RETURNING logs.id, logs.content, logs.tags, logs.created_at;
END;
$$;
