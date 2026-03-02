-- ============================================================
-- ShiftMatch — pgAdmin4 Migration
-- Safe to run on production: no DROP, no DELETE, no data loss
-- Run once, in order
-- ============================================================

-- 1. הוסף עמודת industry לטבלת profiles
--    (אם כבר קיימת — הפקודה תיכשל בשקט)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS industry TEXT DEFAULT NULL;

-- 2. עדכן רשומות קיימות של תחום רפואה (כל הדומיינים הרפואיים → industry = 'medical')
UPDATE profiles
SET industry = 'medical'
WHERE industry IS NULL
  AND (
    workplace_types && ARRAY['dental','optics','aesthetics','physio']
    OR positions && ARRAY[
      'רופא שיניים','סייע/ת שיניים','שיננית','מזכירה רפואית','מנהל/ת מרפאה',
      'אופטומטריסט','אופטיקאי','יועץ/ת מכירות','מנהל/ת חנות',
      'רופא אסתטיקה','אחות','קוסמטיקאית','יועץ/ת יופי',
      'פיזיותרפיסט','הידרותרפיסט','מעסה','מזכיר/ה'
    ]
  );

-- 3. הוסף CHECK constraint על industry (מאפשר null = עדיין לא בחר)
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS check_profile_industry;

ALTER TABLE profiles
  ADD CONSTRAINT check_profile_industry
  CHECK (
    industry IS NULL OR
    industry IN ('medical','tech','education','construction','daily')
  );

-- 4. הוסף index על industry לשיפור מהירות ה-feed query
CREATE INDEX IF NOT EXISTS idx_profiles_industry
  ON profiles (industry);

-- 5. הוסף UNIQUE constraint על swipes (אם עוד לא קיים)
ALTER TABLE swipes
  DROP CONSTRAINT IF EXISTS unique_swipe_pair;

ALTER TABLE swipes
  ADD CONSTRAINT unique_swipe_pair UNIQUE (swiper_id, swiped_id);

-- 6. צור admin_stats view (אם עוד לא קיים — מתקן crash בפאנל ניהול)
CREATE OR REPLACE VIEW admin_stats AS
SELECT
  COUNT(*)                                           AS total_users,
  COUNT(*) FILTER (WHERE role = 'CLINIC')            AS total_clinics,
  COUNT(*) FILTER (WHERE role = 'STAFF')             AS total_workers,
  COUNT(*) FILTER (WHERE industry = 'medical')       AS medical_users,
  COUNT(*) FILTER (WHERE industry = 'tech')          AS tech_users,
  COUNT(*) FILTER (WHERE industry = 'education')     AS education_users,
  COUNT(*) FILTER (WHERE industry = 'construction')  AS construction_users,
  COUNT(*) FILTER (WHERE industry = 'daily')         AS daily_users,
  (SELECT COUNT(*) FROM matches WHERE is_closed = false) AS active_matches
FROM profiles;

-- 7. אינדקסים נוספים לביצועים
CREATE INDEX IF NOT EXISTS idx_swipes_swiper_swiped
  ON swipes (swiper_id, swiped_id);

CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON profiles (role);

CREATE INDEX IF NOT EXISTS idx_profiles_email
  ON profiles (email);

CREATE INDEX IF NOT EXISTS idx_messages_match_created
  ON messages (match_id, created_at ASC);

-- 8. הוסף DEFAULT + NOT NULL לשדות בטיחות (safe — רק אם אין NOT NULL)
ALTER TABLE profiles
  ALTER COLUMN is_blocked SET DEFAULT FALSE;

ALTER TABLE profiles
  ALTER COLUMN is_admin SET DEFAULT FALSE;

-- 9. הוסף CHECK constraint על role (מונע ערכים שגויים)
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS check_profile_role;

ALTER TABLE profiles
  ADD CONSTRAINT check_profile_role
  CHECK (role IN ('CLINIC', 'STAFF'));

-- 10. הוסף message length validation
ALTER TABLE messages
  DROP CONSTRAINT IF EXISTS check_message_length;

ALTER TABLE messages
  ADD CONSTRAINT check_message_length
  CHECK (char_length(content) BETWEEN 1 AND 2000);

-- ============================================================
-- בדיקה — הרץ לאחר ה-migration לאימות:
-- ============================================================
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'profiles'
-- ORDER BY ordinal_position;

-- SELECT * FROM admin_stats;
