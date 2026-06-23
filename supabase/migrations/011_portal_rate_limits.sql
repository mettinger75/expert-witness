-- DB-backed rate limiter for public portal endpoints (recover, add-contact).
-- There is no Redis in the stack, so throttling lives in Postgres.

CREATE TABLE IF NOT EXISTS portal_rate_limits (
  bucket text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  count int NOT NULL DEFAULT 0
);

-- Atomic windowed increment. Returns true if the request is allowed (the count
-- within the current window is <= p_max), false once the limit is exceeded.
CREATE OR REPLACE FUNCTION check_rate_limit(p_bucket text, p_max int, p_window_seconds int)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_count int;
BEGIN
  INSERT INTO portal_rate_limits (bucket, window_start, count)
    VALUES (p_bucket, now(), 1)
  ON CONFLICT (bucket) DO UPDATE
    SET count = CASE WHEN portal_rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
                     THEN 1 ELSE portal_rate_limits.count + 1 END,
        window_start = CASE WHEN portal_rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
                     THEN now() ELSE portal_rate_limits.window_start END
  RETURNING count INTO v_count;
  RETURN v_count <= p_max;
END;
$$;
