import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function AppLayout({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar onLogout={onLogout} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl space-y-6 p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
