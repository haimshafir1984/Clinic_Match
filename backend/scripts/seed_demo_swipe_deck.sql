-- Two more dental clinics in Tel Aviv so demo.walkthrough@example.com (a
-- worker registered as סייע/ת שיניים in תל אביב) has cards to actually
-- swipe left/right on. Safe to re-run (ON CONFLICT DO NOTHING).

INSERT INTO profiles (email, role, name, industry, workplace_types, required_position, positions, locations, salary_min, salary_max, job_type, description, is_urgent)
VALUES
  ('demo.clinic4@shiftmatch.test', 'CLINIC', 'מרפאת שיניים סמייל סנטר', 'medical', ARRAY['dental'], 'סייע/ת שיניים', ARRAY['סייע/ת שיניים'], ARRAY['תל אביב'], 55, 70, 'daily', 'מרפאה מודרנית במרכז תל אביב, דרוש/ה סייע/ת למשמרות בוקר.', FALSE),
  ('demo.clinic5@shiftmatch.test', 'CLINIC', 'המרפאה השכונתית', 'medical', ARRAY['dental'], 'סייע/ת שיניים', ARRAY['סייע/ת שיניים'], ARRAY['תל אביב'], 48, 58, 'temporary', 'מרפאת שכונה חמה, אווירה משפחתית, גמישות בשעות.', TRUE)
ON CONFLICT (email) DO NOTHING;
