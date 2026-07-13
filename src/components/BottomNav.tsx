import { NavLink } from 'react-router-dom';

const items = [
  { to: '/harjutused', label: 'Harjutused' },
  { to: '/treening', label: 'Tanane treening' },
  { to: '/ajalugu', label: 'Ajalugu' },
  { to: '/seaded', label: 'Seaded' },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Pohinavigatsioon">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
