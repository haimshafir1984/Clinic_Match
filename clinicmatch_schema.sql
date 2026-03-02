CREATE TYPE swipe_type AS ENUM ('LIKE', 'PASS');

CREATE TABLE IF NOT EXISTS profiles (
  id                      BIGSERIAL PRIMARY KEY,
  email                   TEXT        NOT NULL UNIQUE,
  role                    TEXT        NOT NULL CHECK (role IN ('CLINIC', 'STAFF')),
  name                    TEXT        NOT NULL DEFAULT '',
  position                TEXT,
  positions               TEXT[]      DEFAULT '{}',
  workplace_types         TEXT[]      DEFAULT '{}',
  location                TEXT,
  salary_info             INTEGER,
  availability            JSONB       DEFAULT '{}',
  screening_questions     TEXT[]      DEFAULT '{}',
  is_auto_screener_active BOOLEAN     NOT NULL DEFAULT FALSE,
  is_urgent               BOOLEAN     NOT NULL DEFAULT FALSE,
  is_blocked              BOOLEAN     NOT NULL DEFAULT FALSE,
  is_admin                BOOLEAN     NOT NULL DEFAULT FALSE,
  is_premium              BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS swipes (
  id         BIGSERIAL PRIMARY KEY,
  swiper_id  BIGINT      NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  swiped_id  BIGINT      NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       swipe_type  NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_swipe_pair UNIQUE (swiper_id, swiped_id)
);

CREATE TABLE IF NOT EXISTS matches (
  id           BIGSERIAL PRIMARY KEY,
  user_one_id  BIGINT      NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_two_id  BIGINT      NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_closed    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_match_pair
  ON matches (
    LEAST(user_one_id, user_two_id),
    GREATEST(user_one_id, user_two_id)
  );

CREATE TABLE IF NOT EXISTS messages (
  id         BIGSERIAL PRIMARY KEY,
  match_id   BIGINT      NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id  BIGINT      NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content    TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email
  ON profiles (email);

CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON profiles (role);

CREATE INDEX IF NOT EXISTS idx_swipes_swiper_swiped
  ON swipes (swiper_id, swiped_id);

CREATE INDEX IF NOT EXISTS idx_matches_users
  ON matches (user_one_id, user_two_id);

CREATE INDEX IF NOT EXISTS idx_messages_match_created
  ON messages (match_id, created_at ASC);

CREATE OR REPLACE VIEW admin_stats AS
SELECT
  COUNT(*)                                               AS total_users,
  COUNT(*) FILTER (WHERE role = 'CLINIC')                AS total_clinics,
  COUNT(*) FILTER (WHERE role = 'STAFF')                 AS total_workers,
  (SELECT COUNT(*) FROM matches WHERE is_closed = FALSE) AS active_matches
FROM profiles;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
