interface LogoProps {
  size?: 'small' | 'default' | 'large';
  className?: string;
  showSubtitle?: boolean;
}

export function Logo({ size = 'default', className = '', showSubtitle = true }: LogoProps) {
  const sizes = {
    small: { 
      icon: 'w-6 h-6', 
      title: 'text-lg', 
      subtitle: 'text-xs',
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
      className={`${sizes[size].icon} text-brand-cyan`} 
      viewBox="0 0 32 32" 
      fill="none"
      aria-hidden="true"
    >
      {/* Central node */}
      <circle cx="16" cy="16" r="3" fill="currentColor" />
      
      {/* Primary surrounding nodes */}
      <circle cx="16" cy="6" r="2.5" fill="currentColor" opacity="0.8" />
      <circle cx="26" cy="16" r="2.5" fill="currentColor" opacity="0.8" />
      <circle cx="16" cy="26" r="2.5" fill="currentColor" opacity="0.8" />
      <circle cx="6" cy="16" r="2.5" fill="currentColor" opacity="0.8" />
      
      {/* Secondary surrounding nodes */}
      <circle cx="22" cy="9" r="2" fill="currentColor" opacity="0.6" />
      <circle cx="22" cy="23" r="2" fill="currentColor" opacity="0.6" />
      <circle cx="10" cy="23" r="2" fill="currentColor" opacity="0.6" />
      <circle cx="10" cy="9" r="2" fill="currentColor" opacity="0.6" />
      
      {/* Connection lines */}
      <line x1="16" y1="13" x2="16" y2="9" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <line x1="19" y1="16" x2="23" y2="16" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <line x1="16" y1="19" x2="16" y2="23" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <line x1="13" y1="16" x2="9" y2="16" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <line x1="18" y1="14" x2="20" y2="11" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <line x1="18" y1="18" x2="20" y2="21" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <line x1="14" y1="18" x2="12" y2="21" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <line x1="14" y1="14" x2="12" y2="11" stroke="currentColor" strokeWidth="1" opacity="0.4" />
    </svg>
  );

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