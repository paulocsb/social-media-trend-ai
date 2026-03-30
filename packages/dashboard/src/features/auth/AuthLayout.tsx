import type { ReactNode } from 'react';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[340px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent/10 mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#8B5CF6" />
            </svg>
          </div>
          <h1 className="text-title-lg text-primary">{title}</h1>
          {subtitle && <p className="text-caption mt-1">{subtitle}</p>}
        </div>

        {/* Card */}
        <div className="glass-raised rounded-2xl p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
