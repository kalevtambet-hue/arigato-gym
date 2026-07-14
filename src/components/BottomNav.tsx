import { NavLink } from 'react-router-dom';

const items = [
  { to: '/treening', label: 'Treening' },
  { to: '/kavad', label: 'Kavad' },
  { to: '/ajalugu', label: 'Ajalugu' },
  { to: '/seaded', label: 'Seaded' },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Põhinavigatsioon">
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
