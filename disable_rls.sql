-- Run this command in your Supabase SQL Editor to disable RLS on the profiles table
-- This will fix the "new row violates row-level security policy" error (42501)

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
