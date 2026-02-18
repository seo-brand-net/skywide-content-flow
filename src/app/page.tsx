"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Fast-track recovery redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const isResetFlow = urlParams.get('type') === 'recovery' || hashParams.get('type') === 'recovery';

    if (isResetFlow) {
      router.push('/update-password' + window.location.search + window.location.hash);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="terminal-theme min-h-screen bg-black scanlines animate-crt-flicker flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-primary font-terminal terminal-glow tracking-wider">&gt; INITIALIZING...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="terminal-theme min-h-screen bg-black scanlines animate-crt-flicker flex items-start justify-center p-4 md:p-8 pt-12 md:pt-16 animate-fade-in">
      <div className="w-full max-w-4xl">
        <div className="flex flex-col items-center justify-center space-y-6 md:space-y-8">

          {/* Logo */}
          <div className="relative">
            <Image
              src="/skywide-logo.png"
              alt="Skywide Logo"
              width={550}
              height={200}
              className="w-80 md:w-[550px] h-auto drop-shadow-[0_0_20px_rgba(0,255,0,0.3)]"
              priority
            />
          </div>

          {/* System Info */}
          <div className="space-y-2 text-center terminal-glow text-primary font-terminal">
            <p className="text-lg md:text-2xl tracking-wider">
              Skywide Content Dashboard
            </p>
            <p className="text-base md:text-lg text-muted-foreground tracking-wider">
              Authorized Personnel Only
            </p>
          </div>

          {/* Enter Button */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-primary/20 blur-xl animate-slow-pulse group-hover:bg-primary/40 transition-all duration-300"></div>
            <Button
              variant="outline"
              size="lg"
              onClick={() => router.push(user ? '/dashboard' : '/login')}
              className="relative border-2 border-primary bg-black hover:bg-primary/10 text-primary terminal-glow font-terminal text-2xl md:text-3xl px-12 md:px-16 py-6 md:py-8 tracking-[0.3em] transition-all duration-300 hover:scale-105 animate-slow-pulse rounded-none"
            >
              &gt; ENTER_
            </Button>
          </div>

          {/* Footer Credits */}
          <div className="space-y-1 text-center">
            <p className="text-sm md:text-base text-muted-foreground font-terminal tracking-wider">
              ──────────────────────────────────
            </p>
            <p className="text-base md:text-xl terminal-glow-red text-secondary font-terminal tracking-wider">
              POWERED BY <span className="font-bold">SEO BRAND</span>
            </p>
            <p className="text-sm md:text-base text-muted-foreground font-terminal tracking-wider">
              ──────────────────────────────────
            </p>
          </div>

          {/* Bottom System Message */}
          <div className="terminal-glow text-primary text-base md:text-lg font-terminal tracking-wider opacity-70">
            <span className="animate-cursor-blink">Awaiting user input...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
