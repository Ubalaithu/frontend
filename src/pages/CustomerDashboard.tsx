import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../api/socket';
import api from '../api/axios';
import Pagination from '../components/Pagination';

interface Booking { id: number; date: string; status: string; guestCount: number; table: { tableNumber: number; branch: { name: string } } }
interface Order   { id: number; total: number; status: string; createdAt: string; branch: { name: string }; items: { menuItem: { name: string }; quantity: number }[] }
interface Page<T> { data: T[]; total: number; page: number; totalPages: number; }

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [bookingPage, setBookingPage] = useState(1);
  const [orderPage,   setOrderPage]   = useState(1);
  const [bookings,    setBookings]    = useState<Page<Booking>>({ data: [], total: 0, page: 1, totalPages: 1 });
  const [orders,      setOrders]      = useState<Page<Order>>({ data: [], total: 0, page: 1, totalPages: 1 });

  const loadBookings = useCallback((p: number) => {
    api.get(`/customer/bookings?page=${p}&limit=10`).then(r => setBookings(r.data));
  }, []);
  const loadOrders = useCallback((p: number) => {
    api.get(`/customer/orders?page=${p}&limit=10`).then(r => setOrders(r.data));
  }, []);

  useEffect(() => { loadBookings(bookingPage); }, [bookingPage, loadBookings]);
  useEffect(() => { loadOrders(orderPage);     }, [orderPage,   loadOrders]);

  // Real-time: update order status when chef/cashier changes it
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = (updated: Order) => {
      setOrders(prev => ({
        ...prev,
        data: prev.data.map(o => o.id === updated.id ? { ...o, status: updated.status } : o),
      }));
    };
    socket.on('order:updated', handler);
    return () => { socket.off('order:updated', handler); };
  }, []);

  async function cancelBooking(id: number) {
    await api.delete(`/customer/bookings/${id}`);
    setBookings(prev => ({
      ...prev,
      data: prev.data.map(b => b.id === id ? { ...b, status: 'CANCELLED' } : b),
    }));
  }

  return (
    <div className="page">
      <h1>My Dashboard</h1>
      <p style={{ color: 'var(--text-muted)' }}>Welcome, {user?.name}</p>

      <h2 style={{ margin: '2rem 0 1rem' }}>My Bookings</h2>
      {bookings.data.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No bookings yet.</p>
      ) : (
        <>
          <table className="data-table">
            <thead><tr><th>Branch</th><th>Table</th><th>Guests</th><th>Date</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {bookings.data.map(b => (
                <tr key={b.id}>
                  <td>{b.table.branch.name}</td>
                  <td>Table {b.table.tableNumber}</td>
                  <td>{b.guestCount}</td>
                  <td>{new Date(b.date).toLocaleString()}</td>
                  <td><span className={`badge badge-${b.status.toLowerCase()}`}>{b.status}</span></td>
                  <td>
                    {b.status === 'PENDING' && (
                      <button className="btn btn-danger btn-sm" onClick={() => cancelBooking(b.id)}>Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={bookingPage} totalPages={bookings.totalPages} onPageChange={setBookingPage} />
        </>
      )}

      <h2 style={{ margin: '2rem 0 1rem' }}>My Orders</h2>
      {orders.data.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No orders yet.</p>
      ) : (
        <>
          <div className="card-grid">
            {orders.data.map(o => (
              <div className="card" key={o.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>Order #{o.id}</h3>
                  <span className={`badge badge-${o.status.toLowerCase()}`}>{o.status}</span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.4rem 0' }}>
                  {o.branch.name} — {new Date(o.createdAt).toLocaleDateString()}
                </p>
                <ul style={{ margin: '0.5rem 0', paddingLeft: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {o.items.map((item, i) => <li key={i}>{item.menuItem.name} × {item.quantity}</li>)}
                </ul>
                <p style={{ color: 'var(--pink)', fontFamily: 'Orbitron', fontWeight: 700, marginTop: '0.5rem' }}>
                  ${o.total.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
          <Pagination page={orderPage} totalPages={orders.totalPages} onPageChange={setOrderPage} />
        </>
      )}
    </div>
  );
}
