import { useEffect, useState, useCallback } from 'react';
import { getSocket } from '../api/socket';
import api from '../api/axios';
import Pagination from '../components/Pagination';

interface MenuItem  { id: number; name: string; price: number; category: string }
interface OrderItem { menuItem: { name: string }; quantity: number; unitPrice: number }
interface Order     { id: number; total: number; status: string; createdAt: string; items: OrderItem[]; _new?: boolean }
interface Booking   { id: number; date: string; guestCount: number; status: string; table: { tableNumber: number; branch: { name: string } }; customer: { name: string; email: string }; totalSpent: number }
interface Page<T>   { data: T[]; total: number; page: number; totalPages: number; }

export default function CashierDashboard() {
  const [page,       setPage]       = useState(1);
  const [orders,     setOrders]     = useState<Page<Order>>({ data: [], total: 0, page: 1, totalPages: 1 });
  const [bookPage,   setBookPage]   = useState(1);
  const [bookings,   setBookings]   = useState<Page<Booking>>({ data: [], total: 0, page: 1, totalPages: 1 });
  const [menu,       setMenu]       = useState<MenuItem[]>([]);
  const [selected,   setSelected]   = useState<{ id: number; qty: number }[]>([]);
  const [error,      setError]      = useState('');
  const [activeTab,  setActiveTab]  = useState<'orders' | 'bookings'>('orders');

  const loadOrders = useCallback((p: number) => {
    api.get(`/cashier/orders?page=${p}&limit=10`).then(r => setOrders(r.data));
  }, []);

  const loadBookings = useCallback((p: number) => {
    api.get(`/cashier/bookings?page=${p}&limit=10`).then(r => setBookings(r.data));
  }, []);

  useEffect(() => { loadOrders(page); }, [page, loadOrders]);
  useEffect(() => { loadBookings(bookPage); }, [bookPage, loadBookings]);
  useEffect(() => { api.get('/chef/menu').then(r => setMenu(r.data)).catch(() => {}); }, []);

  // Real-time: when chef marks done, update status in the list
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onUpdated = (updated: Order) => {
      setOrders(prev => ({
        ...prev,
        data: prev.data.map(o => o.id === updated.id ? { ...o, status: updated.status } : o),
      }));
    };

    socket.on('order:updated', onUpdated);
    return () => { socket.off('order:updated', onUpdated); };
  }, []);

  function toggleItem(id: number) {
    setSelected(prev => {
      const exists = prev.find(s => s.id === id);
      return exists ? prev.filter(s => s.id !== id) : [...prev, { id, qty: 1 }];
    });
  }

  function setQty(id: number, qty: number) {
    setSelected(prev => prev.map(s => s.id === id ? { ...s, qty } : s));
  }

  async function submitOrder() {
    setError('');
    if (selected.length === 0) { setError('Add at least one item.'); return; }
    try {
      await api.post('/cashier/orders', {
        items: selected.map(s => ({ menuItemId: s.id, quantity: s.qty })),
      });
      loadOrders(1);
      setPage(1);
      setSelected([]);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to create order.');
    }
  }

  async function markDelivered(id: number) {
    await api.patch(`/cashier/orders/${id}/deliver`);
    setOrders(prev => ({
      ...prev,
      data: prev.data.map(o => o.id === id ? { ...o, status: 'DELIVERED' } : o),
    }));
  }

  return (
    <div className="page">
      <h1>Cashier Dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1.5rem' }}>
        <div className="card">
          <h2 style={{ marginBottom: '1rem' }}>New Order</h2>
          {error && <div className="alert alert-error">{error}</div>}
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {menu.map(m => {
              const sel = selected.find(s => s.id === m.id);
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <input type="checkbox" checked={!!sel} onChange={() => toggleItem(m.id)} />
                  <span style={{ flex: 1 }}>{m.name}</span>
                  <span style={{ color: 'var(--pink)', fontWeight: 700 }}>${m.price}</span>
                  {sel && (
                    <input
                      type="number" min="1" value={sel.qty}
                      onChange={e => setQty(m.id, parseInt(e.target.value))}
                      style={{ width: 60 }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <button className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }} onClick={submitOrder}>
            Place Order
          </button>
        </div>

        <div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button
              className={`btn btn-sm ${activeTab === 'orders' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('orders')}
            >
              Orders
            </button>
            <button
              className={`btn btn-sm ${activeTab === 'bookings' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('bookings')}
            >
              Bookings
            </button>
          </div>

          {activeTab === 'orders' && (
            <>
              <h2 style={{ marginBottom: '1rem' }}>Recent Orders</h2>
              {orders.data.map(o => (
                <div className="card" key={o.id} style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700 }}>Order #{o.id}</span>
                    <span className={`badge badge-${o.status.toLowerCase()}`}>{o.status}</span>
                  </div>
                  <p style={{ color: 'var(--pink)', fontFamily: 'Orbitron', marginTop: '0.3rem' }}>
                    ${o.total.toFixed(2)}
                  </p>
                  {o.status === 'DONE' && (
                    <button className="btn btn-outline btn-sm" style={{ marginTop: '0.5rem' }} onClick={() => markDelivered(o.id)}>
                      Mark Delivered
                    </button>
                  )}
                </div>
              ))}
              <Pagination page={page} totalPages={orders.totalPages} onPageChange={p => { setPage(p); loadOrders(p); }} />
            </>
          )}

          {activeTab === 'bookings' && (
            <>
              <h2 style={{ marginBottom: '1rem' }}>Table Bookings</h2>
              {bookings.data.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No bookings found.</p>
              ) : (
                bookings.data.map(b => (
                  <div className="card" key={b.id} style={{ marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700 }}>Booking #{b.id}</span>
                      <span className={`badge badge-${b.status.toLowerCase()}`}>{b.status}</span>
                    </div>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                      <p style={{ margin: '0.2rem 0' }}>
                        <strong>Table:</strong> {b.table.tableNumber} @ {b.table.branch.name}
                      </p>
                      <p style={{ margin: '0.2rem 0' }}>
                        <strong>Guest:</strong> {b.customer.name} ({b.customer.email})
                      </p>
                      <p style={{ margin: '0.2rem 0' }}>
                        <strong>Guests:</strong> {b.guestCount} | <strong>Date:</strong> {new Date(b.date).toLocaleString()}
                      </p>
                      <p style={{ color: 'var(--pink)', fontFamily: 'Orbitron', marginTop: '0.5rem', fontWeight: 700 }}>
                        Total Spent: ${b.totalSpent.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <Pagination page={bookPage} totalPages={bookings.totalPages} onPageChange={p => { setBookPage(p); loadBookings(p); }} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
