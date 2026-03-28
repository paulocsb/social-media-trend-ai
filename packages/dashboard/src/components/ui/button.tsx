import { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none select-none whitespace-nowrap',
  {
    variants: {
      variant: {
        primary:     'bg-accent text-white hover:bg-accent-hover active:scale-[0.98]',
        secondary:   'bg-[#E8E8ED] text-primary hover:bg-[#D8D8DE] active:scale-[0.98]',
        ghost:       'text-accent hover:bg-accent-light active:scale-[0.98]',
        destructive: 'bg-destructive text-white hover:bg-red-600 active:scale-[0.98]',
        outline:     'border border-border bg-surface text-primary hover:bg-background active:scale-[0.98]',
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
