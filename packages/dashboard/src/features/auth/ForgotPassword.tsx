import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { AuthLayout } from './AuthLayout';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  if (sent) {
    return (
      <AuthLayout title="Check your email" subtitle="Password reset">
        <div className="text-center space-y-3 py-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent/10 mx-auto">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M2.5 5.5A1.5 1.5 0 014 4h12a1.5 1.5 0 011.5 1.5v9A1.5 1.5 0 0116 16H4a1.5 1.5 0 01-1.5-1.5v-9z"
                stroke="#0071E3" strokeWidth="1.5"
              />
              <path d="M2.5 6l7.5 5 7.5-5" stroke="#0071E3" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-[14px] text-primary font-medium">Reset link sent</p>
          <p className="text-[13px] text-secondary">
            If <strong>{email}</strong> has an account, you'll receive a password reset link shortly.
          </p>
          <Link
            to="/login"
            className="block text-[13px] text-accent hover:underline mt-4"
          >
            Back to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Forgot password?" subtitle="We'll send you a reset link">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-primary">Email</label>
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {error && (
          <p className="text-[13px] text-destructive bg-destructive/5 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>

      <div className="mt-5 pt-5 border-t border-border-subtle text-center">
        <Link to="/login" className="text-[13px] text-accent hover:underline">
          Back to sign in
        </Link>
      </div>
    </AuthLayout>
  );
}
