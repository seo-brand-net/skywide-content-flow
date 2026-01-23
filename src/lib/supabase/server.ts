import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export function createRouteHandlerClient({ cookies: cookieStore }: { cookies: typeof cookies }) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    return createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false,
        },
    });
}
