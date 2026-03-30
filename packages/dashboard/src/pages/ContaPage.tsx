import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';

export function ContaPage() {
  const [currentEmail, setCurrentEmail] = useState('');
  const [email, setEmail] = useState('');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setSuccess('');
    setError('');
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setCurrentEmail(user.email);
    });
  }, []);

  const updateEmail = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
    },
    onSuccess: () => { setSuccess('Confirmation email sent — check your inbox.'); setEmail(''); },
    onError: (e) => setError((e as Error).message),
  });

  const updatePassword = useMutation({
    mutationFn: async () => {
      // Re-authenticate then update
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('No email on account');
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPw });
      if (signInErr) throw new Error('Current password is incorrect');
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
    },
    onSuccess: () => { setSuccess('Password updated.'); setCurrentPw(''); setNewPw(''); },
    onError: (e) => setError((e as Error).message),
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-md">
      <h1 className="text-title-xl">Account</h1>

      {success && (
        <div className="px-4 py-3 rounded-lg bg-success/10 border border-success/20 text-success text-[13px]">{success}</div>
      )}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-destructive/5 text-destructive text-[13px]">{error}</div>
      )}

      {/* Email */}
      <Card>
        <CardHeader><CardTitle>Email Address</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {currentEmail && (
            <p className="text-[13px] text-secondary">
              Current: <span className="text-primary font-medium">{currentEmail}</span>
            </p>
          )}
          <Input
            type="email"
            placeholder="New email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button
            variant="secondary"
            onClick={() => { setError(''); setSuccess(''); updateEmail.mutate(); }}
            disabled={!email.trim() || updateEmail.isPending}
          >
            Update Email
          </Button>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader><CardTitle>Password</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="password"
            placeholder="Current password"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
          />
          <Input
            type="password"
            placeholder="New password (min 6 chars)"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
          />
          <Button
            variant="secondary"
            onClick={() => { setError(''); setSuccess(''); updatePassword.mutate(); }}
            disabled={!currentPw || !newPw || newPw.length < 6 || updatePassword.isPending}
          >
            Update Password
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
