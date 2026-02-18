interface LogoProps {
    size?: 'small' | 'default' | 'large';
    className?: string;
    showSubtitle?: boolean;
    variant?: 'default' | 'terminal';
}

export function Logo({ size = 'default', className = '', showSubtitle = true, variant = 'default' }: LogoProps) {
    const sizes = {
        small: {
            icon: 'w-6 h-6',
            title: 'text-lg',
            subtitle: 'text-[10px]',
            gap: 'gap-2'
        },
        default: {
            icon: 'w-8 h-8',
            title: 'text-xl',
            subtitle: 'text-xs',
            gap: 'gap-3'
        },
        large: {
            icon: 'w-12 h-12',
            title: 'text-3xl',
            subtitle: 'text-sm',
            gap: 'gap-4'
        }
    };

    const NetworkIcon = () => (
        <svg
            className={`${sizes[size].icon} ${variant === 'terminal' ? 'text-primary drop-shadow-[0_0_20px_rgba(0,255,0,0.3)]' : 'text-brand-cyan'}`}
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden="true"
        >
            <defs>
                <linearGradient id="networkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: variant === 'terminal' ? 'hsl(120, 100%, 50%)' : 'hsl(180, 100%, 70%)', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: variant === 'terminal' ? 'hsl(120, 100%, 35%)' : 'hsl(217, 91%, 60%)', stopOpacity: 1 }} />
                </linearGradient>
            </defs>
            {/* Central node */}
            <circle cx="16" cy="16" r="3" fill="url(#networkGradient)" />
            {/* Outer nodes */}
            <circle cx="8" cy="8" r="2" fill="url(#networkGradient)" />
            <circle cx="24" cy="8" r="2" fill="url(#networkGradient)" />
            <circle cx="8" cy="24" r="2" fill="url(#networkGradient)" />
            <circle cx="24" cy="24" r="2" fill="url(#networkGradient)" />
            {/* Connecting lines */}
            <line x1="16" y1="16" x2="8" y2="8" stroke="url(#networkGradient)" strokeWidth="1.5" />
            <line x1="16" y1="16" x2="24" y2="8" stroke="url(#networkGradient)" strokeWidth="1.5" />
            <line x1="16" y1="16" x2="8" y2="24" stroke="url(#networkGradient)" strokeWidth="1.5" />
            <line x1="16" y1="16" x2="24" y2="24" stroke="url(#networkGradient)" strokeWidth="1.5" />
        </svg>
    );

    if (variant === 'terminal') {
        return (
            <div className={`flex items-center ${sizes[size].gap} ${className}`}>
                <NetworkIcon />
                <div className="flex flex-col">
                    <h1 className={`font-bold font-terminal terminal-glow text-primary ${sizes[size].title} tracking-[0.3em]`}>
                        SKYWIDE
                    </h1>
                    {showSubtitle && (
                        <p className={`terminal-glow-red text-secondary font-terminal ${sizes[size].subtitle} tracking-wider`}>
                            POWERED BY SEOBRAND
                        </p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={`flex items-center ${sizes[size].gap} ${className}`}>
            <NetworkIcon />
            <div className="flex flex-col">
                <h1 className={`font-bold text-sidebar-foreground ${sizes[size].title}`}>
                    SKYWIDE
                </h1>
                {showSubtitle && (
                    <p className={`text-sidebar-foreground/70 ${sizes[size].subtitle}`}>
                        POWERED BY SEOBRAND
                    </p>
                )}
            </div>
        </div>
    );
}
