import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

interface Branch { id: number; name: string; address: string; phone?: string; }

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    api.get('/public/branches').then(r => setBranches(r.data));
  }, []);

  return (
    <div className="page">
      <h1>Our Locations</h1>
      <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 2rem' }}>7 exclusive STEAKZ locations</p>
      <div className="card-grid">
        {branches.map(b => (
          <div className="card" key={b.id}>
            <h3>{b.name}</h3>
            <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0', fontSize: '0.9rem' }}>{b.address}</p>
            {b.phone && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{b.phone}</p>}
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
              <Link to="/menu" className="btn btn-outline btn-sm">View Menu</Link>
              <Link to="/book" className="btn btn-primary btn-sm">Book Table</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
