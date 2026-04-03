import { type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-medium transition-colors',
  {
    variants: {
      variant: {
        default:     'bg-accent/10 text-accent',
        secondary:   'bg-surface-strong text-secondary',
        success:     'bg-success/10 text-success',
        warning:     'bg-warning/10 text-warning',
        destructive: 'bg-destructive/10 text-destructive',
        outline:     'border border-border text-secondary bg-transparent',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
