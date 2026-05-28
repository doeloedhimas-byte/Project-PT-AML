import React from 'react';

interface SppbIconProps {
  className?: string;
}

export function SppbIcon({ className = 'w-5 h-5' }: SppbIconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Background document layout */}
      <path 
        d="M 20 8 L 41 8 L 49 16 L 49 46 C 49 47.5 48 48 46 48 L 20 48 C 18 48 17 47 17 46 L 17 10 C 17 9.5 17.5 8 20 8 Z" 
        fill="currentColor" 
        fillOpacity="0.15" 
      />
      {/* Document fold corner */}
      <path d="M 41 8 L 41 16 L 49 16" />
      
      {/* SPPB Text */}
      <text 
        x="19.5" 
        y="25" 
        fill="currentColor" 
        stroke="none" 
        fontSize="7.5" 
        fontWeight="900" 
        fontFamily="sans-serif"
        letterSpacing="-0.2"
      >
        SPPB
      </text>
      
      {/* Two horizontal lines */}
      <path d="M 20 29.5 L 43 29.5" strokeWidth="2.5" />
      <path d="M 20 34.5 L 37 34.5" strokeWidth="2.5" />
      
      {/* Barcode lines at bottom-left */}
      <path d="M 20 39 L 20 44" strokeWidth="2" />
      <path d="M 23 39 L 23 44" strokeWidth="1.2" />
      <path d="M 26 39 L 26 44" strokeWidth="2" />
      <path d="M 29 39 L 29 44" strokeWidth="1.2" />
      <path d="M 32 39 L 32 44" strokeWidth="2" />
      <path d="M 35 39 L 35 44" strokeWidth="1.2" />
      <path d="M 38 39 L 38 44" strokeWidth="2.2" />

      {/* Floating Check Circle badge overlay on the bottom-right */}
      <circle cx="47" cy="46" r="8.5" fill="currentColor" stroke="none" />
      {/* Inside checkmark */}
      <path 
        d="M 42.5 46.5 L 45.5 49.5 L 51.5 42.5" 
        stroke="var(--color-slate-900, #0f172a)" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
    </svg>
  );
}
