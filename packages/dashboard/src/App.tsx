import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { CampaignProvider } from './lib/campaign';
import { ThemeProvider } from './lib/theme';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage }         from './features/auth/Login';
import { SignUpPage }        from './features/auth/SignUp';
import { ForgotPasswordPage } from './features/auth/ForgotPassword';
import { ResetPasswordPage } from './features/auth/ResetPassword';
import { HomePage }          from './pages/HomePage';
import { AnalisePage }       from './pages/AnalisePage';
import { HistoryPage }       from './pages/HistoryPage';
import { SetupPage }         from './pages/SetupPage';
import { ConfiguracoesPage } from './pages/ConfiguracoesPage';
import { ContaPage }         from './pages/ContaPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

export function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public auth routes — redirect to app if already signed in */}
          <Route path="/login"          element={session ? <Navigate to="/" replace /> : <LoginPage />} />
          <Route path="/signup"         element={session ? <Navigate to="/" replace /> : <SignUpPage />} />
          <Route path="/forgot-password" element={session ? <Navigate to="/" replace /> : <ForgotPasswordPage />} />

          {/* Reset password — always accessible (Supabase creates a recovery session) */}
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected app routes */}
          <Route
            element={
              session
                ? <CampaignProvider><AppLayout /></CampaignProvider>
                : <Navigate to="/login" replace />
            }
          >
            <Route index element={<HomePage />} />
            <Route path="/analysis" element={<AnalisePage />} />
            <Route path="/history"  element={<HistoryPage />} />
            <Route path="/setup"    element={<SetupPage />} />
            <Route path="/settings" element={<ConfiguracoesPage />} />
            <Route path="/account"  element={<ContaPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
    </ThemeProvider>
  );
}
