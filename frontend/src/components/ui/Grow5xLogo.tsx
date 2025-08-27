import React from 'react';

interface Grow5xLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'white' | 'gradient';
}

const Grow5xLogo: React.FC<Grow5xLogoProps> = ({ 
  className = '', 
  size = 'md',
  variant = 'default'
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-10 h-10'
  };

  const getStrokeColor = () => {
    switch (variant) {
      case 'white':
        return 'white';
      case 'gradient':
        return 'url(#logoGradient)';
      default:
        return 'currentColor';
    }
  };

  const getFillColor = () => {
    switch (variant) {
      case 'white':
        return 'white';
      case 'gradient':
        return 'url(#accentGradient)';
      default:
        return 'currentColor';
    }
  };

  return (
    <svg 
      className={`${sizeClasses[size]} ${className}`} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {variant === 'gradient' && (
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1E40AF" />
          </linearGradient>
          <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
      )}
      
      {/* Main growth arrow */}
      <path 
        d="M7 17L12 7L17 17" 
        stroke={getStrokeColor()} 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        fill="none"
      />
      
      {/* Technology nodes/circuits */}
      <circle cx="7" cy="17" r="2" fill={getFillColor()}/>
      <circle cx="12" cy="7" r="2" fill={getFillColor()}/>
      <circle cx="17" cy="17" r="2" fill={getFillColor()}/>
      
      {/* 5X multiplier indicator */}
      <path 
        d="M12 12L15 9M15 9L18 12M15 9V15" 
        stroke={getStrokeColor()} 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      
      {/* AI/Tech accent lines */}
      <path 
        d="M4 12H6M18 12H20M12 4V6M12 18V20" 
        stroke={getFillColor()} 
        strokeWidth="1" 
        strokeLinecap="round"
      />
      
      {/* Inner core */}
      <circle cx="12" cy="12" r="1" fill={getStrokeColor()}/>
    </svg>
  );
};

export default Grow5xLogo;