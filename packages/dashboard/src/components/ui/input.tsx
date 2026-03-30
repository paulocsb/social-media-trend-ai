import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-9 w-full rounded-md bg-white/5 px-3 text-[15px] text-primary placeholder:text-tertiary',
        'border border-border-subtle transition-all duration-150',
        'focus:outline-none focus:bg-white/8 focus:border-accent focus:ring-1 focus:ring-accent/30',
        'disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
