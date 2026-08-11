-- Allow all authenticated users to add clients.
--
-- The unify-clients migration (20260711000000, applied to prod from the
-- unified-clients branch) made INSERT on public.clients admin-only via
-- is_admin_user(). But the Add Client button (AddClientModal) is shown to
-- every signed-in user on the Content Briefs page, so non-admins filling it
-- in got: "new row violates row-level security policy for table clients"
-- (reported by Natalie, 2026-08-11).
--
-- Decision: client creation is open to all authenticated users again;
-- UPDATE and DELETE stay admin-only.

DROP POLICY IF EXISTS "Admins can insert clients" ON public.clients;

CREATE POLICY "Authenticated users can insert clients"
  ON public.clients FOR INSERT
  TO authenticated
  WITH CHECK (true);
