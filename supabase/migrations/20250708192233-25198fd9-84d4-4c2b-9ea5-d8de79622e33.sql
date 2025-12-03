-- Add new columns to existing profiles table for admin role system
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS full_name text,
ADD COLUMN IF NOT EXISTS role text DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Create content_requests table
CREATE TABLE public.content_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  article_title text NOT NULL,
  title_audience text NOT NULL,
  seo_keywords text NOT NULL,
  article_type text NOT NULL CHECK (article_type IN ('Website', 'Blogs')),
  client_name text NOT NULL,
  creative_brief text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  webhook_sent boolean DEFAULT false,
  webhook_response text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on content_requests table
ALTER TABLE public.content_requests ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check if user is admin (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- RLS Policy: Users can view their own requests OR admins can view all
CREATE POLICY "Users can view own requests or admins view all" ON public.content_requests
  FOR SELECT USING (
    auth.uid() = user_id OR public.is_admin_user()
  );

-- RLS Policy: Users can insert their own requests
CREATE POLICY "Users can insert own requests" ON public.content_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Admins can update any request status, users cannot update
CREATE POLICY "Admins can update request status" ON public.content_requests
  FOR UPDATE USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- Update existing profiles RLS policies to work with admin roles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- New profiles RLS policies with admin access
CREATE POLICY "Users can view own profile or admins view all" ON public.profiles
  FOR SELECT USING (
    auth.uid() = id OR public.is_admin_user()
  );

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Update the existing handle_new_user function to populate email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email, full_name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'display_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- Create trigger for updating updated_at on content_requests
CREATE TRIGGER update_content_requests_updated_at
  BEFORE UPDATE ON public.content_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();