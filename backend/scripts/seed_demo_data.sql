-- Demo data for visually checking the matching flow after a deploy.
-- Safe to re-run: every INSERT is keyed on a unique demo.* email and skips
-- rows that already exist. Does not touch any real user data.
--
-- Usage: run this once against the target Postgres (psql -f, or paste into
-- the Dokploy/Neon SQL console). All demo accounts use emails under
-- @shiftmatch.test and have no password_hash, so they can't log in — they
-- exist only to populate the swipe deck and show a match + a short chat.

-- Businesses (CLINIC)
-- workplace_types must be set to the exact WorkplaceDomain id (frontend/src/constants/domains.ts)
-- the feed query requires an overlap on it whenever the viewer's profile has one set.
INSERT INTO profiles (email, role, name, industry, workplace_types, required_position, positions, locations, salary_min, salary_max, job_type, experience_years, description, is_urgent)
VALUES
  ('demo.clinic1@shiftmatch.test', 'CLINIC', 'מרפאת שיניים דר'' כהן', 'medical', ARRAY['dental'], 'סייע/ת שיניים', ARRAY['סייע/ת שיניים'], ARRAY['תל אביב'], 50, 65, 'temporary', NULL, 'מרפאת שיניים פרטית, דרוש/ה סייע/ת למשמרות גמישות.', TRUE),
  ('demo.clinic2@shiftmatch.test', 'CLINIC', 'מסעדת הים הכחול', 'daily', ARRAY['restaurant'], 'מלצר/ית', ARRAY['מלצר/ית'], ARRAY['חיפה'], 45, 55, 'daily', NULL, 'מסעדת דגים על החוף, דרושים מלצרים למשמרות ערב.', FALSE),
  ('demo.clinic3@shiftmatch.test', 'CLINIC', 'מוקד שירות לקוחות TechCall', 'communication', ARRAY['call_center'], 'נציג/ת שירות', ARRAY['נציג/ת שירות'], ARRAY['רמת גן'], 40, 48, 'permanent', NULL, 'מוקד תמיכה טכנית, הכשרה ניתנת במקום.', FALSE)
ON CONFLICT (email) DO NOTHING;

-- Job seekers (STAFF)
INSERT INTO profiles (email, role, name, industry, workplace_types, positions, locations, salary_min, salary_max, job_type, experience_years, description, is_urgent)
VALUES
  ('demo.worker1@shiftmatch.test', 'STAFF', 'נועה לוי', 'medical', ARRAY['dental'], ARRAY['סייע/ת שיניים'], ARRAY['תל אביב', 'רמת גן'], 50, 60, 'temporary', 3, 'סייעת שיניים מוסמכת, זמינה למשמרות גמישות.', FALSE),
  ('demo.worker2@shiftmatch.test', 'STAFF', 'איתי שרון', 'daily', ARRAY['restaurant', 'bar'], ARRAY['מלצר/ית', 'ברמן/ית'], ARRAY['חיפה'], 45, 55, 'daily', 2, 'ניסיון במסעדנות ואירועים, זמין לערבים וסופ"ש.', FALSE),
  ('demo.worker3@shiftmatch.test', 'STAFF', 'מיכל ברק', 'communication', ARRAY['call_center'], ARRAY['נציג/ת שירות'], ARRAY['רמת גן', 'תל אביב'], 38, 45, 'permanent', 1, 'ניסיון שנה במוקד שירות, זמינה מיידית.', FALSE),
  ('demo.worker4@shiftmatch.test', 'STAFF', 'דניאל אזולאי', 'education', ARRAY['school'], ARRAY['מורה מחליף/ה למתמטיקה'], ARRAY['ירושלים'], NULL, NULL, 'daily', 4, 'מורה למתמטיקה, זמין/ה להחלפות יומיות.', FALSE),
  ('demo.worker5@shiftmatch.test', 'STAFF', 'שירה כהן', 'education', ARRAY['kindergarten'], ARRAY['גננת'], ARRAY['תל אביב'], NULL, NULL, 'permanent', 5, 'גננת מוסמכת, ניסיון של 5 שנים בגני ילדים.', FALSE)
ON CONFLICT (email) DO NOTHING;

-- One mutual like between clinic1 and worker1 -> produces a real match.
INSERT INTO swipes (swiper_id, swiped_id, type)
SELECT c.id, w.id, 'LIKE' FROM profiles c, profiles w
WHERE c.email = 'demo.clinic1@shiftmatch.test' AND w.email = 'demo.worker1@shiftmatch.test'
ON CONFLICT (swiper_id, swiped_id) DO NOTHING;

INSERT INTO swipes (swiper_id, swiped_id, type)
SELECT w.id, c.id, 'LIKE' FROM profiles c, profiles w
WHERE c.email = 'demo.clinic1@shiftmatch.test' AND w.email = 'demo.worker1@shiftmatch.test'
ON CONFLICT (swiper_id, swiped_id) DO NOTHING;

INSERT INTO matches (user_one_id, user_two_id)
SELECT c.id, w.id FROM profiles c, profiles w
WHERE c.email = 'demo.clinic1@shiftmatch.test' AND w.email = 'demo.worker1@shiftmatch.test'
ON CONFLICT DO NOTHING;

-- A short opening exchange on that match, so the chat screen isn't empty.
INSERT INTO messages (match_id, sender_id, content)
SELECT m.id, c.id, 'היי! ראיתי שאת סייעת שיניים מנוסה, יש לנו משמרת פנויה השבוע - מתאים?'
FROM matches m
JOIN profiles c ON c.id = m.user_one_id AND c.email = 'demo.clinic1@shiftmatch.test'
JOIN profiles w ON w.id = m.user_two_id AND w.email = 'demo.worker1@shiftmatch.test'
WHERE NOT EXISTS (SELECT 1 FROM messages WHERE match_id = m.id);

INSERT INTO messages (match_id, sender_id, content)
SELECT m.id, w.id, 'היי, בשמחה! אני זמינה בימי שני ורביעי, מתי המשמרת?'
FROM matches m
JOIN profiles c ON c.id = m.user_one_id AND c.email = 'demo.clinic1@shiftmatch.test'
JOIN profiles w ON w.id = m.user_two_id AND w.email = 'demo.worker1@shiftmatch.test'
WHERE (SELECT COUNT(*) FROM messages WHERE match_id = m.id) < 2;
