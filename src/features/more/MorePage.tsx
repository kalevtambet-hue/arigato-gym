import { Link } from 'react-router-dom';

const destinations = [
  {
    to: '/seaded',
    title: 'Seaded',
    description: 'Halda varundust, välimust ja rakenduse abi.',
  },
];

export function MorePage() {
  return (
    <section className="page">
      <div className="section-header">
        <div>
          <p className="eyebrow">Lisavõimalused</p>
          <h2>Rohkem</h2>
        </div>
      </div>
      <div className="more-links">
        {destinations.map((destination) => (
          <Link key={destination.to} className="more-link-card" to={destination.to}>
            <strong>{destination.title}</strong>
            <span>{destination.description}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
