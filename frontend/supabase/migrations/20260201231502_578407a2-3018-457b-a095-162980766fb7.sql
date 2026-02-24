-- Fix 1: Update profiles SELECT policy to only show profiles relevant for matching
-- (authenticated users can view profiles of the opposite role for matching)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view profiles for matching"
ON public.profiles
FOR SELECT
USING (
  -- Users can always view their own profile
  auth.uid() = user_id
  OR
  -- Authenticated users can view profiles of different role for matching
  (
    auth.uid() IS NOT NULL
    AND role != (
      SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
    )
  )
);

-- Fix 2: Add policy so users can see likes they received (for matching functionality)
CREATE POLICY "Users can view likes they received"
ON public.likes
FOR SELECT
USING (
  to_user_id IN (
    SELECT profiles.id
    FROM profiles
    WHERE profiles.user_id = auth.uid()
  )
);