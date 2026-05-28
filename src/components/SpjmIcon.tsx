import React from 'react';

interface SpjmIconProps {
  className?: string;
}

export function SpjmIcon({ className = 'w-5 h-5' }: SpjmIconProps) {
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
      {/* Officer / Customs Guard (Left Side) */}
      {/* Cap peak and crown */}
      <path d="M 6 19 C 11 21.2 21 21.2 26 19" />
      <path d="M 6 19 L 4 15 L 16 11 L 28 15 L 26 19 Z" fill="currentColor" fillOpacity="0.15" />
      {/* Shield/Badge on Cap */}
      <path d="M 15 13.5 L 17 13.5 L 16 16 Z" fill="currentColor" strokeWidth="1" />
      
      {/* Head and chin line */}
      <path d="M 9 21 C 9 29 23 29 23 21" />
      
      {/* Torso & Arm representation */}
      <path d="M 4 39 C 4 31 10 29 13 29" />
      <path d="M 23 29 C 25 29 28 31 28 35" strokeDasharray="1.5 1.5" strokeWidth="2" />
      
      {/* Clipboard */}
      <rect x="17" y="27" width="11" height="15" rx="1.5" fill="currentColor" fillOpacity="0.1" />
      <path d="M 21 27 L 21 25.5 C 21 25 24 25 24 27" strokeWidth="2.2" />
      {/* Hand holding pen & writing lines */}
      <path d="M 11 36 C 13 36 15 35 17 33.5" />
      <path d="M 14 34 L 18 31" strokeWidth="2.2" />

      {/* Document "SPJM" (Right Side) */}
      <path 
        d="M 33 8 L 49 8 L 57 16 L 57 32 C 57 33.5 55.5 34 54 34 L 33 34 C 31.5 34 31 33 31 32 L 31 10 C 31 9.5 31.5 8 33 8 Z" 
        fill="currentColor" 
        fillOpacity="0.15" 
      />
      {/* Corner document fold */}
      <path d="M 49 8 L 49 16 L 57 16" />
      
      {/* "SPJM" responsive typography */}
      <text 
        x="33.5" 
        y="24" 
        fill="currentColor" 
        stroke="none" 
        fontSize="7.5" 
        fontWeight="900" 
        fontFamily="JetBrains Mono, ui-monospace, SFMono-Regular, monospace"
        letterSpacing="-0.3"
      >
        SPJM
      </text>
      
      {/* Form horizontal content lines */}
      <path d="M 35 28 L 45 28" strokeWidth="2" />
      <path d="M 35 31 L 42 31" strokeWidth="2" />
      
      {/* Completed Checkmark on Document */}
      <path d="M 48 27 L 51 30 L 55 25" strokeWidth="2.5" />

      {/* Package Box (Bottom Right) */}
      <path 
        d="M 34 40 L 53 40 L 53 58 C 53 59 52.5 59.5 51.5 59.5 L 35.5 59.5 C 34.5 59.5 34 59 34 58 Z" 
        fill="currentColor" 
        fillOpacity="0.1" 
      />
      {/* Tape on Box */}
      <path d="M 41.5 40 L 41.5 44 C 41.5 44 45.5 44 45.5 40" strokeWidth="1.8" />

      {/* Magnifying Glass looking at the Box */}
      <circle cx="48" cy="51" r="5" fill="none" strokeWidth="2.8" />
      <path d="M 51.5 54.5 L 58 61" strokeWidth="4" />
    </svg>
  );
}
