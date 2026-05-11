-- Phase 1: Extend clients table with service feature flags + GBP-specific fields
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS sitemap_url        text,
  ADD COLUMN IF NOT EXISTS industry           text,
  ADD COLUMN IF NOT EXISTS key_selling_point  text,
  ADD COLUMN IF NOT EXISTS gbp_enabled        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS content_enabled    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS indexing_enabled   boolean NOT NULL DEFAULT false;

-- Phase 1: Child table for locations (supports multi-location clients like Suncoast)
CREATE TABLE IF NOT EXISTS client_locations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  location_name  text NOT NULL,
  city           text NOT NULL,
  state          text NOT NULL,
  gbp_account_id text,
  sheet_tab_name text,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- RLS for client_locations: admins can do everything
ALTER TABLE client_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage client_locations"
  ON client_locations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Index for common query pattern: look up locations by client
CREATE INDEX IF NOT EXISTS idx_client_locations_client_id
  ON client_locations(client_id);
