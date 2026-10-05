import React, { useId } from 'react';

interface AppLogoProps {
  className?: string;
  size?: number;
}

export const AppLogo: React.FC<AppLogoProps> = ({ className = 'w-10 h-10', size }) => {
  const gradientId = useId().replace(/:/g, '');
  const style = size ? { width: `${size}px`, height: `${size}px` } : undefined;

  return (
    <div className={`inline-flex items-center justify-center shrink-0 app-logo ${className}`} style={style}>
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md print:drop-shadow-none app-logo-svg"
        style={{
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      >
        <defs>
          <linearGradient id={`goldHexGradient-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D9A838" />
            <stop offset="50%" stopColor="#C59228" />
            <stop offset="100%" stopColor="#A4771C" />
          </linearGradient>
        </defs>

        {/* Flat-top Hexagon with smooth rounded corners */}
        <path
          d="M 66 22 
             L 134 22 
             Q 148 22 156 35 
             L 190 91 
             Q 196 100 190 109 
             L 156 165 
             Q 148 178 134 178 
             L 66 178 
             Q 52 178 44 165 
             L 10 109 
             Q 4 100 10 91 
             L 44 35 
             Q 52 22 66 22 Z"
          fill={`url(#goldHexGradient-${gradientId})`}
          className="logo-hex-bg"
          style={{
            fill: `url(#goldHexGradient-${gradientId})`,
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
          }}
        />

        {/* Stylized Double-Track "G" in crisp white */}
        {/* Outer Loop */}
        <path
          d="M 138 60 
             L 92 60 
             A 42 42 0 0 0 50 102 
             A 42 42 0 0 0 92 144 
             L 138 144 
             L 138 100 
             L 102 100"
          stroke="#FFFFFF"
          strokeWidth="13"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          className="logo-track"
          style={{
            stroke: '#FFFFFF',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
          }}
        />

        {/* Inner Loop */}
        <path
          d="M 138 80 
             L 94 80 
             A 22 22 0 0 0 72 102 
             A 22 22 0 0 0 94 124 
             L 124 124"
          stroke="#FFFFFF"
          strokeWidth="13"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          className="logo-track"
          style={{
            stroke: '#FFFFFF',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
          }}
        />
      </svg>
    </div>
  );
};

