import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
}

export function ResponsiveContainer({
  children,
  className,
}: ResponsiveContainerProps) {
  return (
    <div
      className={cn(
        'w-full h-full',
        'max-w-7xl mx-auto',
        'px-4 py-4 md:px-8 md:py-6',
        className
      )}
    >
      {children}
    </div>
  );
}

export default ResponsiveContainer;
