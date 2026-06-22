import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface IconButtonProps {
  icon: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isActive?: boolean;
  label?: string;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-candy-pink text-white hover:bg-candy-pink/90',
  secondary: 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200',
  ghost: 'bg-transparent text-gray-600 hover:bg-gray-100',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'w-10 h-10',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
};

const iconSizes: Record<ButtonSize, string> = {
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export function IconButton({
  icon,
  variant = 'primary',
  size = 'md',
  isActive = false,
  label,
  className,
  disabled,
  onClick,
}: IconButtonProps) {
  return (
    <motion.button
      className={cn(
        'touch-target rounded-full',
        'flex items-center justify-center',
        'transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:ring-candy-purple focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantStyles[variant],
        sizeStyles[size],
        isActive && 'ring-2 ring-candy-purple',
        className
      )}
      disabled={disabled}
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.05 }}
      aria-label={label}
    >
      <span className={iconSizes[size]}>{icon}</span>
    </motion.button>
  );
}

export default IconButton;
