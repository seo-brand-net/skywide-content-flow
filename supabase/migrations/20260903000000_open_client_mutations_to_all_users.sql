-- Open client + client_locations mutations to all authenticated users.
--
-- The unify-clients migration (20260711000000) made UPDATE/DELETE on
-- public.clients and ALL on public.client_locations admin-only via
-- is_admin_user(). That turned out to be more restrictive than the product
-- needs: any signed-in team member should be able to manage client config
-- (service toggles, workbook/folder URLs, etc.) and locations, not just
-- admins — mirroring the INSERT policy already opened up for clients in
-- 20260811120000_allow_authenticated_insert_clients.sql.
--
-- Decision: clients and client_locations are fully read/write for every
-- authenticated user. No admin-only policy remains on either table.

DROP POLICY IF EXISTS "Admins can update clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can delete clients" ON public.clients;

CREATE POLICY "Authenticated users can update clients"
  ON public.clients FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete clients"
  ON public.clients FOR DELETE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage client_locations" ON public.client_locations;

CREATE POLICY "Authenticated users can insert client_locations"
  ON public.client_locations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update client_locations"
  ON public.client_locations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete client_locations"
  ON public.client_locations FOR DELETE
  TO authenticated
  USING (true);
