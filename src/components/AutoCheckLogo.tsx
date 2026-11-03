import React from 'react';

export type LogoVariant = 'horizontal' | 'vertical' | 'icon' | 'original-cropped';
export type LogoTheme = 'dark' | 'light';

interface AutoCheckLogoProps {
  variant?: LogoVariant;
  theme?: LogoTheme;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'splash';
  className?: string;
  showSubtitle?: boolean;
}

/**
 * AutoCheckLogo: High-fidelity scalable brand logo.
 * Supports horizontal (for navbar), vertical (for splash/login), icon-only,
 * and seamlessly transparent or dark-themed variants.
 */
export const AutoCheckLogo: React.FC<AutoCheckLogoProps> = ({
  variant = 'horizontal',
  theme = 'dark',
  size = 'md',
  className = '',
  showSubtitle = false,
}) => {
  // Sizing definitions
  const sizeMap = {
    sm: { height: 28, iconSize: 24, fontSize: 'text-sm' },
    md: { height: 36, iconSize: 32, fontSize: 'text-lg' },
    lg: { height: 48, iconSize: 42, fontSize: 'text-2xl' },
    xl: { height: 64, iconSize: 56, fontSize: 'text-3xl' },
    splash: { height: 110, iconSize: 96, fontSize: 'text-4xl' },
  };

  const currentSize = sizeMap[size];

  // If using original raster image with tight framing (crops out 60% empty black padding):
  if (variant === 'original-cropped') {
    const cropHeights = {
      sm: 'h-8 w-24',
      md: 'h-10 w-32',
      lg: 'h-14 w-44',
      xl: 'h-20 w-60',
      splash: 'h-36 w-72',
    };

    return (
      <div className={`relative overflow-hidden flex items-center justify-center ${cropHeights[size]} ${className}`}>
        <img
          src="/assets/aistudio/file_000000007a38820eb3e55d584a0cb79f_f363a66d.png"
          alt="AutoCheck"
          className="absolute max-w-none w-[205%] h-[205%] object-center object-contain"
        />
      </div>
    );
  }

  // Vector SVG Emblem (Recreates the car silhouette + circle + orange checkmark)
  const Emblem = ({ width = currentSize.iconSize, height = currentSize.iconSize }: { width?: number; height?: number }) => (
    <svg
      width={width}
      height={height}
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0 drop-shadow-xs"
    >
      <defs>
        {/* Vibrant Orange Gradient for the Checkmark */}
        <linearGradient id="acCheckGrad" x1="50" y1="90" x2="140" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="50%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#c2410c" />
        </linearGradient>
        {/* Glow filter */}
        <filter id="acGlow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#ea580c" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Outer White / Slate Circular Arc (cuts off where checkmark enters) */}
      <path
        d="M 124 54 A 58 58 0 1 0 74 138 C 76 138 78 137.5 80 137 L 72 125 A 46 46 0 1 1 113 65 Z"
        fill={theme === 'dark' ? '#FFFFFF' : '#0f172a'}
      />

      {/* Car Silhouette (Frontal View inside the Circle) */}
      <g fill={theme === 'dark' ? '#FFFFFF' : '#0f172a'}>
        {/* Car Roof & Windshield Arch */}
        <path
          d="M 52 64 C 54 48, 62 43, 80 43 C 98 43, 106 48, 108 64 C 111 65, 114 67, 114 70 C 114 73, 110 74, 108 74 L 107 80 C 105 82, 98 83, 80 83 C 62 83, 55 82, 53 80 L 52 74 C 50 74, 46 73, 46 70 C 46 67, 49 65, 52 64 Z"
          fillRule="evenodd"
        />
        {/* Windshield cut-out */}
        <path
          d="M 58 63 C 60 52, 66 48, 80 48 C 94 48, 100 52, 102 63 C 96 64, 64 64, 58 63 Z"
          fill={theme === 'dark' ? '#090a0f' : '#f8fafc'}
        />
        {/* Left Headlight */}
        <path
          d="M 52 69 C 56 68, 63 69, 65 72 C 60 73, 53 72, 52 69 Z"
          fill={theme === 'dark' ? '#f8fafc' : '#ffffff'}
        />
        {/* Right Headlight */}
        <path
          d="M 108 69 C 104 68, 97 69, 95 72 C 100 73, 107 72, 108 69 Z"
          fill={theme === 'dark' ? '#f8fafc' : '#ffffff'}
        />
        {/* Grille accent */}
        <path
          d="M 68 76 C 73 78, 87 78, 92 76 C 90 79, 70 79, 68 76 Z"
          fill={theme === 'dark' ? '#090a0f' : '#f8fafc'}
        />
      </g>

      {/* Prominent Orange Checkmark / Stylized 'A' Accent */}
      <path
        d="M 62 98 L 81 117 C 82 118, 85 118, 87 116 L 132 55 C 134 53, 137 54, 137 57 L 137 114 C 137 117, 134 119, 131 119 L 123 119 C 120 119, 118 117, 118 114 L 118 78 L 84 125 C 82 128, 77 128, 75 125 L 54 104 C 52 102, 53 98, 56 96 L 60 96 C 61 96, 62 97, 62 98 Z"
        fill="url(#acCheckGrad)"
        filter="url(#acGlow)"
      />
    </svg>
  );

  // Typography Wordmark: "auto" + "check"
  const Wordmark = () => {
    const isDark = theme === 'dark';
    return (
      <div className="flex items-baseline tracking-tight font-extrabold select-none">
        <span className={`${isDark ? 'text-white' : 'text-slate-900'} ${currentSize.fontSize} font-black tracking-tighter`}>
          auto
        </span>
        <span className={`text-orange-500 ${currentSize.fontSize} font-black tracking-tighter ml-0.5`}>
          check
        </span>
      </div>
    );
  };

  // 1. Icon only
  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <Emblem width={currentSize.iconSize} height={currentSize.iconSize} />
      </div>
    );
  }

  // 2. Horizontal: Emblem + Wordmark side by side (Header / Topbar friendly)
  if (variant === 'horizontal') {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <Emblem width={currentSize.iconSize} height={currentSize.iconSize} />
        <div className="flex flex-col">
          <Wordmark />
          {showSubtitle && (
            <span className={`text-[9px] -mt-1 font-semibold tracking-wider uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              Controle Veicular
            </span>
          )}
        </div>
      </div>
    );
  }

  // 3. Vertical: Large Emblem on top, Wordmark below (Splash / Login / About)
  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      <div className="relative mb-2">
        <Emblem width={currentSize.iconSize * 1.5} height={currentSize.iconSize * 1.5} />
      </div>
      <Wordmark />
      {showSubtitle && (
        <span className={`text-xs mt-1 font-medium tracking-wide ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
          Controle Veicular Inteligente
        </span>
      )}
    </div>
  );
};
