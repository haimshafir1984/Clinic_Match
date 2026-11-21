-- Creates a mutual like + match between a real registered account
-- (demo.walkthrough@example.com) and the demo clinic, so the Matches/Chat
-- screens show something real from an account you can actually log into.
-- Safe to re-run (ON CONFLICT DO NOTHING everywhere).

INSERT INTO swipes (swiper_id, swiped_id, type)
SELECT c.id, w.id, 'LIKE' FROM profiles c, profiles w
WHERE c.email = 'demo.clinic1@shiftmatch.test' AND w.email = 'demo.walkthrough@example.com'
ON CONFLICT (swiper_id, swiped_id) DO NOTHING;

INSERT INTO swipes (swiper_id, swiped_id, type)
SELECT w.id, c.id, 'LIKE' FROM profiles c, profiles w
WHERE c.email = 'demo.clinic1@shiftmatch.test' AND w.email = 'demo.walkthrough@example.com'
ON CONFLICT (swiper_id, swiped_id) DO NOTHING;

INSERT INTO matches (user_one_id, user_two_id)
SELECT c.id, w.id FROM profiles c, profiles w
WHERE c.email = 'demo.clinic1@shiftmatch.test' AND w.email = 'demo.walkthrough@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO messages (match_id, sender_id, content)
SELECT m.id, c.id, 'היי! ראיתי שאת/ה סייע/ת שיניים באזור תל אביב - יש לנו משמרת פנויה, מתאים?'
FROM matches m
JOIN profiles c ON c.id = m.user_one_id AND c.email = 'demo.clinic1@shiftmatch.test'
JOIN profiles w ON w.id = m.user_two_id AND w.email = 'demo.walkthrough@example.com'
WHERE NOT EXISTS (SELECT 1 FROM messages WHERE match_id = m.id);
