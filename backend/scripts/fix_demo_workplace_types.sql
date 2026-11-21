-- The feed query requires workplace_types overlap when the viewer has any
-- set. demo.walkthrough's registration set workplace_types={dental} (from
-- the "רפואת שיניים" domain pick), but the demo clinics were seeded without
-- it, so they never matched. Backfill it on the dental-vertical demo clinics.
UPDATE profiles
SET workplace_types = ARRAY['dental']
WHERE email IN ('demo.clinic1@shiftmatch.test', 'demo.clinic4@shiftmatch.test', 'demo.clinic5@shiftmatch.test')
  AND (workplace_types IS NULL OR cardinality(workplace_types) = 0);
