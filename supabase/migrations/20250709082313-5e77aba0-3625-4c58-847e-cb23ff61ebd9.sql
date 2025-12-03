-- Create user_invitations table
CREATE TABLE user_invitations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invited_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'admin')),
  token text NOT NULL UNIQUE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  accepted_at timestamp with time zone,
  UNIQUE(email, status) -- Prevent duplicate pending invitations
);

-- Enable RLS on user_invitations
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- Only admins can create invitations
CREATE POLICY "Admins can create invitations" ON user_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Admins can view all invitations
CREATE POLICY "Admins can view invitations" ON user_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Allow admins to update invitation status (for accepting/expiring invitations)
CREATE POLICY "Admins can update invitations" ON user_invitations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Allow public access to read invitation by token (for registration page validation)
CREATE POLICY "Public can read invitation by token" ON user_invitations
  FOR SELECT USING (true);

-- Create index for faster token lookups
CREATE INDEX idx_user_invitations_token ON user_invitations(token);
CREATE INDEX idx_user_invitations_email_status ON user_invitations(email, status);