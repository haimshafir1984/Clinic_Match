CREATE TYPE swipe_type AS ENUM ('LIKE', 'PASS');

CREATE TABLE IF NOT EXISTS profiles (
  id                      BIGSERIAL PRIMARY KEY,
  email                   TEXT        NOT NULL UNIQUE,
  role                    TEXT        NOT NULL CHECK (role IN ('CLINIC', 'STAFF')),
  name                    TEXT        NOT NULL DEFAULT '',
  position                TEXT,
  required_position       TEXT,
  positions               TEXT[]      DEFAULT '{}',
  workplace_types         TEXT[]      DEFAULT '{}',
  industry                TEXT,
  location                TEXT,
  description             TEXT,
  radius_km               INTEGER,
  experience_years        INTEGER,
  availability_date       DATE,
  availability_days       TEXT[]      DEFAULT '{}',
  availability_hours      TEXT,
  salary_min              INTEGER,
  salary_max              INTEGER,
  salary_info             INTEGER,
  availability            JSONB       DEFAULT '{}',
  job_type                TEXT,
  screening_questions     TEXT[]      DEFAULT '{}',
  is_auto_screener_active BOOLEAN     NOT NULL DEFAULT FALSE,
  is_urgent               BOOLEAN     NOT NULL DEFAULT FALSE,
  avatar_url              TEXT,
  logo_url                TEXT,
  is_blocked              BOOLEAN     NOT NULL DEFAULT FALSE,
  is_admin                BOOLEAN     NOT NULL DEFAULT FALSE,
  is_premium              BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS required_position TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS radius_km INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS experience_years INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS availability_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS availability_days TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS availability_hours TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS salary_min INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS salary_max INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS job_type TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS logo_url TEXT;

UPDATE profiles
SET required_position = COALESCE(required_position, position)
WHERE role = 'CLINIC' AND required_position IS NULL;

UPDATE profiles
SET salary_min = COALESCE(salary_min, salary_info),
    salary_max = COALESCE(salary_max, salary_info)
WHERE salary_info IS NOT NULL AND (salary_min IS NULL OR salary_max IS NULL);

UPDATE profiles
SET availability_date = COALESCE(availability_date, NULLIF(availability->>'start_date', '')::date),
    availability_days = CASE
      WHEN availability_days IS NULL OR cardinality(availability_days) = 0
      THEN COALESCE((SELECT ARRAY(SELECT jsonb_array_elements_text(availability->'days'))), '{}')
      ELSE availability_days
    END,
    availability_hours = COALESCE(availability_hours, NULLIF(availability->>'hours', ''))
WHERE availability IS NOT NULL;

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

CREATE INDEX IF NOT EXISTS idx_profiles_workplace_types
  ON profiles USING GIN (workplace_types);

CREATE INDEX IF NOT EXISTS idx_profiles_positions
  ON profiles USING GIN (positions);

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

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_matches_updated_at ON matches;
CREATE TRIGGER trg_matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
