import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"
import { type EmailOtpType } from '@supabase/supabase-js'

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

    console.log('🔐 [AUTH CALLBACK] Triggered', { code: !!code, token_hash: !!token_hash, type, next, error })

    if (error) {
        console.error('❌ [AUTH CALLBACK] Supabase returned error:', error, error_description)
        return NextResponse.redirect(`${origin}/login?error=${error}&description=${encodeURIComponent(error_description || '')}`)
    }

    const supabase = await createClient()

    // 1. Handle token_hash verification (Most stable for Resend/Custom Emails)
    if (token_hash && type) {
        console.log('🔄 [AUTH CALLBACK] Verifying token_hash...')
        const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash,
            type,
        })

        if (!verifyError) {
            console.log('✅ [AUTH CALLBACK] Token verified successfully')
            return redirectToNext(request, origin, next)
        } else {
            console.error('❌ [AUTH CALLBACK] Token verification error:', verifyError.message)
            return NextResponse.redirect(`${origin}/login?error=verification_failed&message=${encodeURIComponent(verifyError.message)}`)
        }
    }

    // 2. Handle standard OAuth code exchange
    if (code) {
        console.log('🔄 [AUTH CALLBACK] Exchanging code for session...')
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

        if (!exchangeError) {
            console.log('✅ [AUTH CALLBACK] Code exchanged successfully')
            return redirectToNext(request, origin, next)
        } else {
            console.error('❌ [AUTH CALLBACK] Code exchange error:', exchangeError.message)
            return NextResponse.redirect(`${origin}/login?error=exchange_error&message=${encodeURIComponent(exchangeError.message)}`)
        }
    }

    console.error('❌ [AUTH CALLBACK] No valid authentication method found in URL')
    return NextResponse.redirect(`${origin}/login?error=no_auth_method`)
}

/**
 * Helper to handle cross-origin redirects correctly on Vercel
 */
function redirectToNext(request: Request, origin: string, next: string) {
    const forwardedHost = request.headers.get('x-forwarded-host')
    const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'

    let baseUrl = origin
    if (forwardedHost && !origin.includes('localhost')) {
        baseUrl = `${forwardedProto}://${forwardedHost}`
    }

    const redirectUrl = new URL(next, baseUrl)
    console.log('🚀 [AUTH CALLBACK] Redirecting to:', redirectUrl.toString())
    return NextResponse.redirect(redirectUrl.toString())
}
