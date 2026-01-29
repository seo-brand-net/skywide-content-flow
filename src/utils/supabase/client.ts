import { createBrowserClient } from '@supabase/ssr'

let client: any = null;

export function createClient() {
    // Return a new client for server-side (required by Next.js SSR)
    if (typeof window === 'undefined') {
        return createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
    }

    // Singleton pattern for the browser
    if (!client) {
        console.log('[Supabase] 🔌 Initializing singleton browser client');
        client = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: true
                }
            }
        )
        // Add global debug reference
        if (typeof window !== 'undefined') {
            (window as any).__SUPABASE_CLIENT__ = client;
        }
    }
    return client;
}
