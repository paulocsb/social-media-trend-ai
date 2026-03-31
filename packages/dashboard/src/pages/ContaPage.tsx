import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { cn } from '../lib/utils';
import type { User } from '@supabase/supabase-js';

function getInitials(email: string, fullName?: string): string {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  }
  return email[0].toUpperCase();
}

function memberSince(createdAt: string): string {
  const date = new Date(createdAt);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function InlineAlert({ message, variant }: { message: string; variant: 'success' | 'error' }) {
  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2.5 rounded-lg text-[12px]',
      variant === 'success'
        ? 'bg-success/10 border border-success/20 text-success'
        : 'bg-destructive/10 border border-destructive/20 text-destructive',
    )}>
      {variant === 'success'
        ? <CheckCircle className="w-3.5 h-3.5 shrink-0" />
        : <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      }
      {message}
    </div>
  );
}

export function ContaPage() {
  const [user, setUser] = useState<User | null>(null);

  const [email, setEmail]           = useState('');
  const [emailMsg, setEmailMsg]     = useState<{ text: string; variant: 'success' | 'error' } | null>(null);

  const [currentPw, setCurrentPw]   = useState('');
  const [newPw, setNewPw]           = useState('');
  const [pwMsg, setPwMsg]           = useState<{ text: string; variant: 'success' | 'error' } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUser(user);
    });
  }, []);

  const updateEmail = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
    },
    onSuccess: () => {
      setEmailMsg({ text: 'Confirmation email sent — check your inbox.', variant: 'success' });
      setEmail('');
    },
    onError: (e) => setEmailMsg({ text: (e as Error).message, variant: 'error' }),
  });

  const updatePassword = useMutation({
    mutationFn: async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u?.email) throw new Error('No email on account');
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: u.email, password: currentPw });
      if (signInErr) throw new Error('Current password is incorrect');
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
    },
    onSuccess: () => {
      setPwMsg({ text: 'Password updated successfully.', variant: 'success' });
      setCurrentPw('');
      setNewPw('');
    },
    onError: (e) => setPwMsg({ text: (e as Error).message, variant: 'error' }),
  });

  const fullName   = user?.user_metadata?.full_name as string | undefined;
  const initials   = user ? getInitials(user.email ?? '?', fullName) : '?';
  const displayEmail = user?.email ?? '—';
  const since      = user?.created_at ? memberSince(user.created_at) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-title-xl">Account</h1>

      {/* User card */}
      <Card className="p-5">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center shrink-0">
            <span className="text-[20px] font-bold text-accent">{initials}</span>
          </div>
          {/* Info */}
          <div className="min-w-0">
            {fullName && (
              <p className="text-[15px] font-semibold text-primary truncate">{fullName}</p>
            )}
            <p className={cn('text-[13px] truncate', fullName ? 'text-secondary' : 'text-primary font-medium')}>
              {displayEmail}
            </p>
            {since && (
              <p className="text-[11px] text-tertiary mt-0.5">Member since {since}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Edit cards — side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

        {/* Email */}
        <Card>
          <CardHeader><CardTitle>Email Address</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-tertiary uppercase tracking-wider">Current</label>
              <p className="text-[13px] text-secondary font-mono truncate">{displayEmail}</p>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-tertiary uppercase tracking-wider">New email</label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailMsg(null); }}
              />
            </div>
            {emailMsg && <InlineAlert message={emailMsg.text} variant={emailMsg.variant} />}
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => updateEmail.mutate()}
              disabled={!email.trim() || updateEmail.isPending}
            >
              {updateEmail.isPending ? 'Sending…' : 'Update Email'}
            </Button>
          </CardContent>
        </Card>

        {/* Password */}
        <Card>
          <CardHeader><CardTitle>Password</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-tertiary uppercase tracking-wider">Current password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={currentPw}
                onChange={(e) => { setCurrentPw(e.target.value); setPwMsg(null); }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-tertiary uppercase tracking-wider">New password</label>
              <Input
                type="password"
                placeholder="Min 6 characters"
                value={newPw}
                onChange={(e) => { setNewPw(e.target.value); setPwMsg(null); }}
              />
            </div>
            {pwMsg && <InlineAlert message={pwMsg.text} variant={pwMsg.variant} />}
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => updatePassword.mutate()}
              disabled={!currentPw || !newPw || newPw.length < 6 || updatePassword.isPending}
            >
              {updatePassword.isPending ? 'Updating…' : 'Update Password'}
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
