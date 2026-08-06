import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';

export function Layout() {
  const location = useLocation();
  const showBrandHeader = location.pathname === '/treening';

  return (
    <div className="app-shell">
      {showBrandHeader ? (
        <header className="topbar">
          <div>
            <p className="eyebrow">Offline-first PWA</p>
            <h1>Treeninguabiline</h1>
          </div>
        </header>
      ) : null}
      <main className="page-shell">
        <div className="content-container">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
