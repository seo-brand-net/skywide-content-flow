import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import { type EmailOtpType } from '@supabase/supabase-js'
import { cookies } from "next/headers"

/**
 * PRODUCTION AUTH CALLBACK
 * This route handles the server-side exchange of a temporary auth 'code'
 * OR a 'token_hash' for a persistent user session/cookie.
 */
export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get("code")
    const token_hash = searchParams.get("token_hash")
    const type = searchParams.get("type") as EmailOtpType | null
    const next = searchParams.get("next") ?? "/dashboard"
    const error = searchParams.get("error")
    const error_description = searchParams.get("error_description")

    console.log('🔐 [AUTH CALLBACK] Triggered', {
        url: request.url,
        code: !!code,
        token_hash: !!token_hash,
        type,
        next,
        error,
        origin
    })

    if (error) {
        console.error('❌ [AUTH CALLBACK] Supabase returned error:', error, error_description)
        const redirectTarget = `${origin}/login?error=${error}&description=${encodeURIComponent(error_description || '')}`
        console.log('🚀 [AUTH CALLBACK] Redirecting to error page:', redirectTarget)
        return NextResponse.redirect(redirectTarget)
    }

    const cookieStore = await cookies()
    const response = NextResponse.next()

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    )
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // 0. Check for existing session (Handles cases where Supabase already verified the user)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (user && !userError) {
        console.log('✅ [AUTH CALLBACK] Existing user found, proceeding to:', next)
        return redirectToNext(request, origin, next, response)
    }

    // 1. Handle token_hash verification (Most stable for Resend/Custom Emails)
    if (token_hash && type) {
        console.log('🔄 [AUTH CALLBACK] Verifying token_hash...')
        const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash,
            type,
        })

        if (!verifyError) {
            console.log('✅ [AUTH CALLBACK] Token verified successfully. Redirecting to:', next)
            return redirectToNext(request, origin, next, response)
        } else {
            console.error('❌ [AUTH CALLBACK] Token verification error:', verifyError.message, verifyError)
            const errorUrl = `${origin}/login?error=verification_failed&message=${encodeURIComponent(verifyError.message)}`
            console.log('🚀 [AUTH CALLBACK] Redirecting to:', errorUrl)
            return NextResponse.redirect(errorUrl)
        }
    }

    // 2. Handle standard OAuth code exchange
    if (code) {
        console.log('🔄 [AUTH CALLBACK] Exchanging code for session...')
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

        if (!exchangeError) {
            console.log('✅ [AUTH CALLBACK] Code exchanged successfully')
            return redirectToNext(request, origin, next, response)
        } else {
            console.error('❌ [AUTH CALLBACK] Code exchange error:', exchangeError.message)
            return NextResponse.redirect(`${origin}/login?error=exchange_error&message=${encodeURIComponent(exchangeError.message)}`)
        }
    }

    console.error('❌ [AUTH CALLBACK] No valid authentication method found in URL and no active session')
    return NextResponse.redirect(`${origin}/login?error=no_auth_method&next=${encodeURIComponent(next)}`)
}

/**
 * Helper to handle cross-origin redirects correctly on Vercel
 */
function redirectToNext(request: Request, origin: string, next: string, response: NextResponse) {
    const forwardedHost = request.headers.get('x-forwarded-host')
    const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'

    let baseUrl = origin

    // In Next.js App Router, request.url's origin might be internal. 
    // We prefer the origin from the URL object if it's not localhost, or the forwarded host.
    if (forwardedHost && !origin.includes('localhost')) {
        baseUrl = `${forwardedProto}://${forwardedHost}`
    }

    try {
        const redirectUrl = new URL(next, baseUrl)
        console.log('🚀 [AUTH CALLBACK] Final Redirect URL:', redirectUrl.toString())

        // Create the redirect response
        const finalRedirect = NextResponse.redirect(redirectUrl.toString())

        // IMPORTANT: Copy over all cookies from the response object we used for verification
        // This is what persists the session!
        response.cookies.getAll().forEach(cookie => {
            const { name, value, ...options } = cookie
            finalRedirect.cookies.set(name, value, options)
        })

        return finalRedirect
    } catch (e) {
        console.error('❌ [AUTH CALLBACK] Failed to construct redirect URL:', e)
        return NextResponse.redirect(`${baseUrl}${next.startsWith('/') ? '' : '/'}${next}`)
    }
}
