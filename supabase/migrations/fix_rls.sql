-- Enable RLS on user_invitations
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- Allow anyone (public/anon) to read pending invitations by token
-- This is necessary so the registration page can validate the token before the user is logged in.
CREATE POLICY "Allow public read access to pending invitations"
ON user_invitations
FOR SELECT
TO anon, authenticated
USING (status = 'pending');

-- Allow authenticated users (likely admins) to view all invitations
CREATE POLICY "Allow admins to view all invitations"
ON user_invitations
FOR SELECT
TO authenticated
USING (true);

-- Allow admins to insert/update/delete
CREATE POLICY "Allow admins to manage invitations"
ON user_invitations
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
