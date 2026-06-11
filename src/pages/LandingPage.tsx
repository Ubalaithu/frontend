import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="hero">
      <h1>STEAKZ</h1>
      <div className="glow-line" />
      <p>Premium steakhouse experience across 7 exclusive locations. Book your table, order your cut, track every bite.</p>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link to="/menu" className="btn btn-primary">View Menu</Link>
        <Link to="/register" className="btn btn-outline">Book a Table</Link>
      </div>
    </div>
  );
}
