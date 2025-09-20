import React from 'react';

interface ProFitAgentLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'white' | 'gradient';
}

const ProFitAgentLogo: React.FC<ProFitAgentLogoProps> = ({ 
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
            <stop offset="50%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
          <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
      )}
      
      {/* Trading chart base */}
      <path 
        d="M3 18L7 14L11 16L17 10L21 6" 
        stroke={getStrokeColor()} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        fill="none"
      />
      
      {/* Profit arrow */}
      <path 
        d="M17 6L21 6L21 10" 
        stroke={getFillColor()} 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        fill="none"
      />
      
      {/* Agent nodes */}
      <circle cx="7" cy="14" r="1.5" fill={getFillColor()}/>
      <circle cx="11" cy="16" r="1.5" fill={getFillColor()}/>
      <circle cx="17" cy="10" r="1.5" fill={getFillColor()}/>
      
      {/* AI/Automation indicators */}
      <path 
        d="M5 8L7 6L9 8M7 6V10" 
        stroke={getStrokeColor()} 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      
      {/* Profit percentage indicator */}
      <path 
        d="M13 4L15 2L17 4M15 2V6" 
        stroke={getFillColor()} 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      
      {/* Tech accent lines */}
      <path 
        d="M2 12H4M20 12H22M12 2V4M12 20V22" 
        stroke={getFillColor()} 
        strokeWidth="1" 
        strokeLinecap="round"
        opacity="0.6"
      />
      
      {/* Central core (agent brain) */}
      <circle cx="12" cy="12" r="1.5" fill={getStrokeColor()}/>
      
      {/* Data flow lines */}
      <path 
        d="M9 9L12 12L15 9M9 15L12 12L15 15" 
        stroke={getFillColor()} 
        strokeWidth="1" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        opacity="0.4"
      />
    </svg>
  );
};

export default ProFitAgentLogo;