-- Run this command in your Supabase SQL Editor to remove the conflicting profile
-- This will resolve the "duplicate key value violates unique constraint" error (23505)

DELETE FROM profiles WHERE id = '110d67f4-2b6b-490c-bd0d-f190dfcb01d5';
