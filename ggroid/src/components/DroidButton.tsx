import React from 'react';
import { twMerge } from 'tailwind-merge';

interface DroidButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
  onClick?: () => void;
}

export const DroidButton: React.FC<DroidButtonProps> = ({
  children,
  variant = 'primary',
  className = '',
  onClick
}) => {
  const baseClasses = "px-6 py-3 font-medium rounded-lg transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800";
  
  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary: "bg-amber-500 text-gray-900 hover:bg-amber-600 focus:ring-amber-400",
    outline: "bg-transparent text-blue-400 border border-blue-400 hover:bg-blue-900/20 focus:ring-blue-500"
  };
  
  return (
    <button
      onClick={onClick}
      className={twMerge(baseClasses, variantClasses[variant], className)}
    >
      {children}
    </button>
  );
};

export default DroidButton;