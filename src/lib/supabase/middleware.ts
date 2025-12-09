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

    // Do not write code between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    // IMPORTANT: DO NOT REMOVE auth.getUser()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const path = request.nextUrl.pathname

    // Protected Routes Handling
    // If no user and trying to access protected routes
    if (
        !user &&
        !path.startsWith('/login') &&
        !path.startsWith('/register') &&
        !path.startsWith('/auth') &&
        !path.startsWith('/reset-password') &&
        path !== '/'
    ) {
        // Redirect to login
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // Auth Routes Handling
    // If user exists and trying to access login/register
    if (user && (path.startsWith('/login') || path.startsWith('/register'))) {
        // Redirect to dashboard
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}
