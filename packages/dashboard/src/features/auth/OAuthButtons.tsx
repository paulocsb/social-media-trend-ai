import { useState } from 'react';
import type { Provider } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';

interface OAuthProvider {
  id: Provider;
  label: string;
  icon: React.ReactNode;
  bg: string;
  text: string;
  border: string;
}

const PROVIDERS: OAuthProvider[] = [
  {
    id: 'google',
    label: 'Google',
    bg: 'bg-white hover:bg-gray-50',
    text: 'text-[#1D1D1F]',
    border: 'border border-border',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
        <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
      </svg>
    ),
  },
  {
    id: 'github',
    label: 'GitHub',
    bg: 'bg-[#24292F] hover:bg-[#1c2128]',
    text: 'text-white',
    border: 'border border-[#24292F]',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
      </svg>
    ),
  },
  {
    id: 'apple',
    label: 'Apple',
    bg: 'bg-[#1D1D1F] hover:bg-black',
    text: 'text-white',
    border: 'border border-[#1D1D1F]',
    icon: (
      <svg width="16" height="18" viewBox="0 0 814 1000" fill="white">
        <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 376.8 0 248.3 0 122.5c0-74.3 29.7-143.5 80.2-191.7C111.4 100.6 137.5 88 137.5 79c0-.6-6.4-35.2-20.4-88C116.7 0 77.1 12.4 46 12.4 29.8 12.4 16 12.5 0 7.7L0 20.5c30.1 8.1 54.8 17.1 74.5 29.8C35.8 89.5 8.3 139.1 8.3 194.7c0 112.3 64.3 218.7 195.2 218.7 27.5 0 74.7-13.2 103.6-40.1 24-22.5 55.3-60.3 55.3-60.3 0 0 4.5 20 7.3 26.2 0 0-21.4 1.6-24.5 20.1-.5 3.3-1 6.6-1.4 9.9-3.2 26.2 11 75.4 24.2 106.6 9.5 22.7 33.8 64.2 72.3 88 28.2 17.4 59.9 29 94.5 29 44.6 0 77.6-22.1 105-42.7 22.2-16.5 44.8-26.2 67.5-26.2 23.9 0 46.2 9.5 65.4 22.5 30.1 20.3 64.2 49.2 64.2 49.2z" />
      </svg>
    ),
  },
];

interface OAuthButtonsProps {
  /** label shown above buttons, defaults to "Or continue with" */
  label?: string;
}

export function OAuthButtons({ label = 'Or continue with' }: OAuthButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null);
  const [error, setError] = useState('');

  async function handleOAuth(provider: Provider) {
    setError('');
    setLoadingProvider(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      setError(error.message);
      setLoadingProvider(null);
    }
    // On success, Supabase redirects the browser — no further action needed.
  }

  return (
    <div className="space-y-3">
      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border-subtle" />
        <span className="text-[12px] text-tertiary whitespace-nowrap">{label}</span>
        <div className="flex-1 h-px bg-border-subtle" />
      </div>

      {/* Provider buttons */}
      <div className="grid grid-cols-3 gap-2">
        {PROVIDERS.map((p) => {
          const isLoading = loadingProvider === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handleOAuth(p.id)}
              disabled={loadingProvider !== null}
              className={cn(
                'flex items-center justify-center gap-2 h-10 rounded-md text-[13px] font-medium',
                'transition-all duration-150 disabled:opacity-50',
                p.bg, p.text, p.border,
              )}
              aria-label={`Continue with ${p.label}`}
            >
              {isLoading ? (
                <div className={cn(
                  'w-4 h-4 rounded-full border-2 border-t-transparent animate-spin',
                  p.id === 'google' ? 'border-[#4285F4]' : 'border-current',
                )} />
              ) : (
                p.icon
              )}
            </button>
          );
        })}
      </div>

      {/* Provider labels */}
      <div className="grid grid-cols-3 gap-2">
        {PROVIDERS.map((p) => (
          <p key={p.id} className="text-[11px] text-center text-tertiary">{p.label}</p>
        ))}
      </div>

      {error && (
        <p className="text-[13px] text-destructive bg-destructive/5 rounded-md px-3 py-2 text-center">
          {error}
        </p>
      )}
    </div>
  );
}
