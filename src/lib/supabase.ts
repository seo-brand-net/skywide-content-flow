import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://sgwocrvftiwxofvykmhh.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnd29jcnZmdGl3eG9mdnlrbWhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5OTY3MDAsImV4cCI6MjA2NzU3MjcwMH0.FLxwNZ4i7gu_5-IUykJCPQMwSxPHMLuT-RAoF48Flo8";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
        storage: (typeof window !== 'undefined') ? localStorage : undefined,
        persistSession: true,
        autoRefreshToken: true,
    }
});
