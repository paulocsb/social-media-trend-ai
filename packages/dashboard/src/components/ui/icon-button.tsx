import { cn } from '../../lib/utils';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ElementType;
  variant?: 'default' | 'destructive';
}

export function IconButton({ icon: Icon, variant = 'default', className, ...props }: IconButtonProps) {
  return (
    <button
      className={cn(
        'p-2 rounded-full border transition-all duration-150',
        'disabled:opacity-40 disabled:pointer-events-none',
        variant === 'destructive'
          ? 'bg-white/[0.06] border-white/[0.1] text-secondary hover:bg-destructive/15 hover:border-destructive/25 hover:text-destructive active:scale-95'
          : 'bg-white/[0.06] border-white/[0.1] text-secondary hover:bg-white/[0.12] hover:border-white/[0.16] hover:text-primary active:scale-95',
        className,
      )}
      {...props}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}
