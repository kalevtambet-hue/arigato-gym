import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';

export function Layout() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Offline-first PWA</p>
          <h1>Jousaali Logi</h1>
        </div>
      </header>
      <main className="page-shell">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
