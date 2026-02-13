import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // IMPORTANT: Avoid writing any logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    // Add timeout to prevent 504 Gateway Timeouts if Supabase is unreachable
    const getUserWithTimeout = async () => {
        const timeoutPromise = new Promise<{ data: { user: null }, error: { message: string } }>((_, reject) => {
            setTimeout(() => reject(new Error('Auth check timed out')), 5000) // 5s timeout
        })
        return Promise.race([
            supabase.auth.getUser(),
            timeoutPromise
        ])
    }

    let user = null
    try {
        const { data } = await getUserWithTimeout() as any
        user = data.user
    } catch (e) {
        console.error('[Middleware] Auth check failed or timed out:', e)
        // Proceed as unauthenticated if timeout occurs
        user = null
    }

    const path = request.nextUrl.pathname

    // Bypassed routes (API routes should handle their own auth or be public)
    if (path.startsWith('/api/')) {
        return supabaseResponse
    }
    if (
        !user &&
        !path.startsWith('/login') &&
        !path.startsWith('/auth') &&
        !path.startsWith('/reset-password') &&
        !path.startsWith('/update-password') &&
        path !== '/'
    ) {
        // no user, potentially respond by redirecting the user to the login page
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // Auth routes handling
    // We allow authenticated users to access /register so they can complete invitation setup
    if (user && path.startsWith('/login')) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
    }

    // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
    // creating a new response object with NextResponse.next() make sure to:
    // 1. Pass the request in it, like so:
    //    const myNewResponse = NextResponse.next({ request })
    // 2. Copy over the cookies, like so:
    //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
    // 3. Change the myNewResponse object to fit your needs, but avoid changing
    //    the cookies!
    // 4. Finally: return myNewResponse
    // If this is not done, you may be causing the browser and server to go out
    // of sync and terminate the user's session.

    return supabaseResponse
}
