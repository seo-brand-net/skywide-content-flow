import { ReactNode } from 'react';
import Image from 'next/image';

interface AuthLayoutProps {
    children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
    return (
        <div className="terminal-theme min-h-screen bg-black scanlines animate-crt-flicker flex items-start justify-center p-4 md:p-8 pt-12 md:pt-16 animate-fade-in">
            <div className="w-full max-w-4xl">
                <div className="flex flex-col items-center justify-center space-y-6 md:space-y-8">

                    <div className="relative">
                        <Image
                            src="/skywide-logo.png"
                            alt="Skywide Logo"
                            width={350}
                            height={127}
                            className="w-64 md:w-[350px] h-auto drop-shadow-[0_0_20px_rgba(0,255,0,0.3)]"
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

                    {/* Main Content */}
                    <div className="w-full max-w-md">
                        {children}
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
