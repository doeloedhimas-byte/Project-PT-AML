import React from 'react';

interface NhiIconProps {
  className?: string;
}

export function NhiIcon({ className = 'w-5 h-5' }: NhiIconProps) {
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
        d="M 21 8 L 41 8 L 49 16 L 49 46 C 49 47.5 48 48 46 48 L 21 48 C 19.5 48 18.5 47 18.5 46 L 18.5 10 C 18.5 9.5 19 8 21 8 Z" 
        fill="currentColor" 
        fillOpacity="0.15" 
      />
      {/* Document fold corner */}
      <path d="M 41 8 L 41 16 L 49 16" />
      
      {/* NHI Text */}
      <text 
        x="23.5" 
        y="25" 
        fill="currentColor" 
        stroke="none" 
        fontSize="8" 
        fontWeight="900" 
        fontFamily="sans-serif"
        letterSpacing="-0.2"
      >
        NHI
      </text>
      
      {/* Horizontal thick black line */}
      <path d="M 22 30.5 L 45 30.5" strokeWidth="2.8" />
      <path d="M 22 35.5 L 45 35.5" strokeWidth="2.8" />

      {/* Overlapping Shield on the middle-left with Caduceus-like wing detail */}
      <path 
        d="M 12 36 C 12 36 12 47 21 51 C 30 47 30 36 30 36 L 21 33.5 Z" 
        fill="currentColor" 
        fillOpacity="0.2" 
        strokeWidth="2.4"
      />
      {/* Staff and wings inside shield */}
      <path d="M 21 36 L 21 48" strokeWidth="2" />
      <circle cx="21" cy="35" r="1.5" fill="currentColor" stroke="none" />
      <path d="M 16 39.5 C 18 37.5 24 37.5 26 39.5" strokeWidth="1.6" />
      <path d="M 15 41.5 C 17 39.5 25 39.5 27 41.5" strokeWidth="1.6" />

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
