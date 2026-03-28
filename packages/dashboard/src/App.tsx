import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'
import { ThemeProvider } from '@/lib/theme'
import { I18nProvider } from '@/lib/i18n'
import { CampaignProvider } from '@/lib/campaign'
import { AppLayout } from '@/components/layout/AppLayout'
import { Login } from '@/features/auth/Login'
import { HomePage } from '@/pages/HomePage'
import { AnalisePage } from '@/pages/AnalisePage'
import { HistoryPage } from '@/pages/HistoryPage'
import { SetupPage } from '@/pages/SetupPage'
import { ConfiguracoesPage } from '@/pages/ConfiguracoesPage'
import { ContaPage } from '@/pages/ContaPage'

export function App() {
  const [authed, setAuthed] = useState(() => Boolean(localStorage.getItem('jwt')))

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            {!authed ? (
              <>
                <Route path="/login" element={<Login onLogin={() => setAuthed(true)} />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </>
            ) : (
              <Route element={
                <CampaignProvider>
                  <AppLayout onLogout={() => setAuthed(false)} />
                </CampaignProvider>
              }>
                <Route index element={<HomePage />} />
                <Route path="/analysis"  element={<AnalisePage />} />
                <Route path="/history"   element={<HistoryPage />} />
                <Route path="/setup"     element={<SetupPage />} />
                <Route path="/settings"  element={<ConfiguracoesPage />} />
                <Route path="/account"   element={<ContaPage />} />
                {/* Legacy redirects */}
                <Route path="/dashboard"     element={<Navigate to="/" replace />} />
                <Route path="/run"           element={<Navigate to="/" replace />} />
                <Route path="/analise"       element={<Navigate to="/analysis" replace />} />
                <Route path="/historico"     element={<Navigate to="/history" replace />} />
                <Route path="/configuracoes" element={<Navigate to="/settings" replace />} />
                <Route path="/conta"         element={<Navigate to="/account" replace />} />
                <Route path="/coleta"        element={<Navigate to="/setup" replace />} />
                <Route path="/campanhas"     element={<Navigate to="/setup" replace />} />
                <Route path="/sistema"       element={<Navigate to="/settings" replace />} />
                <Route path="*"           element={<Navigate to="/" replace />} />
              </Route>
            )}
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
      </I18nProvider>
    </QueryClientProvider>
  )
}
