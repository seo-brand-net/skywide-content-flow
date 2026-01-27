import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

/**
 * PRODUCTION AUTH CALLBACK
 * This route handles the server-side exchange of a temporary auth 'code'
 * for a persistent user session/cookie.
 */
export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get("code")
    const next = searchParams.get("next") ?? "/dashboard"
    const error = searchParams.get("error")
    const error_description = searchParams.get("error_description")

    console.log('🔐 [AUTH CALLBACK] Triggered', { code: !!code, next, error })

    if (error) {
        console.error('❌ [AUTH CALLBACK] Supabase returned error:', error, error_description)
        return NextResponse.redirect(`${origin}/login?error=${error}&description=${encodeURIComponent(error_description || '')}`)
    }

    if (code) {
        const supabase = await createClient()
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

        if (!exchangeError) {
            console.log('✅ [AUTH CALLBACK] Session exchanged successfully')

            const forwardedHost = request.headers.get('x-forwarded-host')
            const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'

            // If we're on Vercel, use the forwarded host to avoid cross-origin redirect issues
            let baseUrl = origin
            if (forwardedHost && !origin.includes('localhost')) {
                baseUrl = `${forwardedProto}://${forwardedHost}`
            }

            const redirectUrl = new URL(next, baseUrl)
            console.log('🚀 [AUTH CALLBACK] Redirecting to:', redirectUrl.toString())

            return NextResponse.redirect(redirectUrl.toString())
        } else {
            console.error('❌ [AUTH CALLBACK] Token exchange error:', exchangeError.message)
            return NextResponse.redirect(`${origin}/login?error=exchange_error&message=${encodeURIComponent(exchangeError.message)}`)
        }
    }

    console.error('❌ [AUTH CALLBACK] No code found in URL')
    return NextResponse.redirect(`${origin}/login?error=no_code`)
}
