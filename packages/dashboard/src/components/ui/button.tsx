import { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none select-none whitespace-nowrap',
  {
    variants: {
      variant: {
        primary:     'bg-accent text-white font-medium hover:bg-accent-hover',
        secondary:   'glass text-primary hover:border-border',
        ghost:       'text-accent hover:bg-accent-light',
        destructive: 'bg-destructive text-white hover:bg-red-600',
        outline:     'border border-border bg-surface-raised text-primary hover:bg-surface',
      },
      size: {
        sm:   'h-7  px-3   text-[13px]',
        md:   'h-9  px-4   text-[15px]',
        lg:   'h-11 px-5   text-[17px]',
        icon: 'h-8  w-8',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
  },
);
Button.displayName = 'Button';

export { buttonVariants };
