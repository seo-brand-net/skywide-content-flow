-- Fix: RLS recursion on profiles table.
-- The old is_admin_user() queried public.profiles inside a SECURITY DEFINER function,
-- but the profiles SELECT policy also called is_admin_user(), creating infinite recursion.
-- Free tier's lower statement_timeout surfaces this as a timeout.
--
-- Fix: Drop the circular SELECT policy on profiles and replace it with a simple
-- auth.uid() = id check (users only ever need to read their OWN profile).
-- Admins reading other profiles should go through service role, not client RLS.

-- 1. Drop the recursive SELECT policy on profiles
DROP POLICY IF EXISTS "Users can view own profile or admins view all" ON public.profiles;

-- 2. Replace with a simple, non-recursive policy (no is_admin_user() call)
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- 3. Recreate is_admin_user() with proper SECURITY DEFINER + search_path to truly bypass RLS
--    (used by other tables like content_requests - keep it working correctly)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
$$;
