import { useEffect, useState, useCallback } from 'react';
import { getSocket } from '../api/socket';
import api from '../api/axios';
import Pagination from '../components/Pagination';

interface OrderItem { menuItem: { name: string }; quantity: number }
interface Order     { id: number; status: string; createdAt: string; items: OrderItem[]; _new?: boolean }
interface MenuItem  { id: number; name: string; category: string; price: number; imageUrl?: string }
interface Page<T>   { data: T[]; total: number; page: number; totalPages: number; }

export default function ChefDashboard() {
  const [page,   setPage]   = useState(1);
  const [orders, setOrders] = useState<Page<Order>>({ data: [], total: 0, page: 1, totalPages: 1 });
  const [menu,   setMenu]   = useState<MenuItem[]>([]);

  const loadOrders = useCallback((p: number) => {
    api.get(`/chef/orders?page=${p}&limit=10`).then(r => setOrders(r.data));
  }, []);

  useEffect(() => { loadOrders(page); }, [page, loadOrders]);
  useEffect(() => { api.get('/chef/menu').then(r => setMenu(r.data)); }, []);

  // Real-time: new orders appear instantly
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onCreated = (order: Order) => {
      setOrders(prev => ({
        ...prev,
        total: prev.total + 1,
        data:  [{ ...order, _new: true }, ...prev.data].slice(0, 10),
      }));
      setTimeout(() => {
        setOrders(prev => ({
          ...prev,
          data: prev.data.map(o => o.id === order.id ? { ...o, _new: false } : o),
        }));
      }, 3500);
    };

    const onUpdated = (order: Order) => {
      // Remove if it's moved to DONE/DELIVERED/CANCELLED (no longer in pending list)
      if (['DONE', 'DELIVERED', 'CANCELLED'].includes(order.status)) {
        setOrders(prev => ({ ...prev, data: prev.data.filter(o => o.id !== order.id), total: Math.max(0, prev.total - 1) }));
      }
    };

    socket.on('order:created', onCreated);
    socket.on('order:updated', onUpdated);
    return () => {
      socket.off('order:created', onCreated);
      socket.off('order:updated', onUpdated);
    };
  }, []);

  async function markDone(id: number) {
    await api.patch(`/chef/orders/${id}/done`);
    setOrders(prev => ({ ...prev, data: prev.data.filter(o => o.id !== id), total: Math.max(0, prev.total - 1) }));
  }

  async function deleteMenuItem(id: number) {
    if (!confirm('Delete this menu item?')) return;
    await api.delete(`/chef/menu/${id}`);
    setMenu(prev => prev.filter(m => m.id !== id));
  }

  return (
    <div className="page">
      <h1>Chef Dashboard</h1>
      <div className="stat-grid">
        <div className="stat-box">
          <div className="stat-value">{orders.total}</div>
          <div className="stat-label">Pending Orders</div>
        </div>
      </div>

      <h2 style={{ margin: '2rem 0 1rem' }}>Active Orders</h2>
      {orders.data.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No active orders.</p>
      ) : (
        <>
          <div className="card-grid">
            {orders.data.map(o => (
              <div className={`card ${o._new ? 'new-order' : ''}`} key={o.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <h3>Order #{o.id}</h3>
                  <span className={`badge badge-${o.status.toLowerCase()}`}>{o.status}</span>
                </div>
                <ul style={{ margin: '0.75rem 0', paddingLeft: '1rem', color: 'var(--text-secondary)' }}>
                  {o.items.map((item, i) => <li key={i}>{item.menuItem.name} × {item.quantity}</li>)}
                </ul>
                <button className="btn btn-primary btn-sm" onClick={() => markDone(o.id)}>✓ Mark Done</button>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={orders.totalPages} onPageChange={setPage} />
        </>
      )}

      <h2 style={{ margin: '2rem 0 1rem' }}>Branch Menu</h2>
      <table className="data-table">
        <thead><tr><th>Image</th><th>Name</th><th>Category</th><th>Price</th><th></th></tr></thead>
        <tbody>
          {menu.map(m => (
            <tr key={m.id}>
              <td>
                {m.imageUrl
                  ? <img src={m.imageUrl} alt={m.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4 }} />
                  : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                }
              </td>
              <td>{m.name}</td>
              <td>{m.category}</td>
              <td>${m.price.toFixed(2)}</td>
              <td><button className="btn btn-danger btn-sm" onClick={() => deleteMenuItem(m.id)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
