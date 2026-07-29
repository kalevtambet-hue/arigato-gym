import { useLiveQuery } from 'dexie-react-hooks';
import { NavLink } from 'react-router-dom';
import { db } from '../db/appDb';

const items = [
  { to: '/treening', label: 'Treening' },
  { to: '/kavad', label: 'Kavad' },
  { to: '/ajalugu', label: 'Ajalugu' },
  { to: '/seaded', label: 'Seaded' },
];

export function BottomNav() {
  const activeSession = useLiveQuery(() => db.sessions.where('status').equals('active').first(), []);

  return (
    <nav className="bottom-nav" aria-label="Põhinavigatsioon">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
        >
          <span className="nav-link-label">{item.label}</span>
          {item.to === '/treening' && activeSession ? (
            <span className="nav-indicator" aria-label="Aktiivne treening" />
          ) : null}
        </NavLink>
      ))}
    </nav>
  );
}
