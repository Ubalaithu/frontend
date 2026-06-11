import { useEffect, useState, useCallback } from 'react';
import { getSocket } from '../api/socket';
import api from '../api/axios';
import Pagination from '../components/Pagination';

interface BranchSales { branchId: number; branchName: string; totalSales: number; orderCount: number }
interface Staff        { id: number; name: string; role: string; salary?: number; branch?: { name: string } }
interface Order        { id: number; total: number; status: string; createdAt: string; branch: { name: string }; customer?: { name: string } }
interface Page<T>      { data: T[]; total: number; page: number; totalPages: number; }

export default function HQDashboard() {
  const [sales,      setSales]      = useState<BranchSales[]>([]);
  const [staff,      setStaff]      = useState<Staff[]>([]);
  const [page,       setPage]       = useState(1);
  const [orders,     setOrders]     = useState<Page<Order>>({ data: [], total: 0, page: 1, totalPages: 1 });
  const [liveCount,  setLiveCount]  = useState(0);

  const loadOrders = useCallback((p: number) => {
    api.get(`/hq/orders?page=${p}&limit=20`).then(r => setOrders(r.data));
  }, []);

  const loadSales = useCallback(() => {
    api.get('/hq/sales').then(r => setSales(r.data));
  }, []);

  useEffect(() => {
    loadSales();
    api.get('/hq/staff').then(r => setStaff(r.data));
    loadOrders(1);
  }, []);

  useEffect(() => { loadOrders(page); }, [page, loadOrders]);

  // Real-time: all branches feed into HQ
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onCreated = (order: Order) => {
      setLiveCount(n => n + 1);
      setOrders(prev => ({
        ...prev,
        total: prev.total + 1,
        data:  [order, ...prev.data].slice(0, 20),
      }));
    };

    const onUpdated = (order: Order) => {
      setOrders(prev => ({
        ...prev,
        data: prev.data.map(o => o.id === order.id ? { ...o, status: order.status } : o),
      }));
      if (['DONE', 'DELIVERED'].includes(order.status)) loadSales();
    };

    socket.on('order:created', onCreated);
    socket.on('order:updated', onUpdated);
    return () => {
      socket.off('order:created', onCreated);
      socket.off('order:updated', onUpdated);
    };
  }, [loadSales]);

  const totalRevenue = sales.reduce((s, b) => s + b.totalSales, 0);

  return (
    <div className="page">
      <h1>HQ Overview</h1>
      <p style={{ color: 'var(--text-muted)' }}>All branches — consolidated view</p>

      <div className="stat-grid">
        <div className="stat-box">
          <div className="stat-value">${totalRevenue.toFixed(0)}</div>
          <div className="stat-label">Total Revenue</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{sales.reduce((s, b) => s + b.orderCount, 0)}</div>
          <div className="stat-label">Total Orders</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{staff.length}</div>
          <div className="stat-label">Total Staff</div>
        </div>
        <div className="stat-box">
          <div className="stat-value" style={{ color: 'var(--success)' }}>{liveCount}</div>
          <div className="stat-label">Live Orders (session)</div>
        </div>
      </div>

      <h2 style={{ margin: '2rem 0 1rem' }}>Sales by Branch</h2>
      <table className="data-table">
        <thead><tr><th>Branch</th><th>Orders</th><th>Revenue</th></tr></thead>
        <tbody>
          {sales.map(b => (
            <tr key={b.branchId}>
              <td>{b.branchName}</td>
              <td>{b.orderCount}</td>
              <td>${b.totalSales.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ margin: '2rem 0 1rem' }}>Staff &amp; Salaries — All Branches</h2>
      <table className="data-table">
        <thead><tr><th>Name</th><th>Role</th><th>Branch</th><th>Salary</th></tr></thead>
        <tbody>
          {staff.map(s => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td>{s.role}</td>
              <td>{s.branch?.name ?? 'HQ'}</td>
              <td>{s.salary ? `$${s.salary}` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ margin: '2rem 0 1rem' }}>All Orders</h2>
      <table className="data-table">
        <thead><tr><th>ID</th><th>Branch</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>
          {orders.data.map(o => (
            <tr key={o.id}>
              <td>#{o.id}</td>
              <td>{o.branch.name}</td>
              <td>{o.customer?.name ?? 'Walk-in'}</td>
              <td>${o.total.toFixed(2)}</td>
              <td><span className={`badge badge-${o.status.toLowerCase()}`}>{o.status}</span></td>
              <td>{new Date(o.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination page={page} totalPages={orders.totalPages} onPageChange={setPage} />
    </div>
  );
}
