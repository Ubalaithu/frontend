import { useEffect, useState, useRef, useCallback } from 'react';
import { getSocket } from '../api/socket';
import api from '../api/axios';
import Pagination from '../components/Pagination';

interface SalesData { totalSales: number; orderCount: number }
interface Staff     { id: number; name: string; role: string; salary?: number; isActive: boolean }
interface Order     { id: number; total: number; status: string; createdAt: string; customer?: { name: string } }
interface Page<T>   { data: T[]; total: number; page: number; totalPages: number; }

export default function BranchManagerDashboard() {
  const [sales,       setSales]       = useState<SalesData | null>(null);
  const [staff,       setStaff]       = useState<Staff[]>([]);
  const [page,        setPage]        = useState(1);
  const [orders,      setOrders]      = useState<Page<Order>>({ data: [], total: 0, page: 1, totalPages: 1 });
  const [menuName,    setMenuName]    = useState('');
  const [menuPrice,   setMenuPrice]   = useState('');
  const [menuCat,     setMenuCat]     = useState('');
  const [menuDesc,    setMenuDesc]    = useState('');
  const [menuImage,   setMenuImage]   = useState<File | null>(null);
  const [menuPreview, setMenuPreview] = useState('');
  const [menuMsg,     setMenuMsg]     = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const loadOrders = useCallback((p: number) => {
    api.get(`/branch-manager/orders?page=${p}&limit=15`).then(r => setOrders(r.data));
  }, []);

  useEffect(() => {
    api.get('/branch-manager/sales').then(r => setSales(r.data));
    api.get('/branch-manager/staff').then(r => setStaff(r.data));
    loadOrders(page);
  }, []);

  useEffect(() => { loadOrders(page); }, [page, loadOrders]);

  // Real-time: new orders & status changes
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onCreated = (order: Order) => {
      setOrders(prev => ({ ...prev, total: prev.total + 1, data: [order, ...prev.data].slice(0, 15) }));
    };
    const onUpdated = (order: Order) => {
      setOrders(prev => ({ ...prev, data: prev.data.map(o => o.id === order.id ? { ...o, status: order.status } : o) }));
      if (['DONE', 'DELIVERED'].includes(order.status)) {
        api.get('/branch-manager/sales').then(r => setSales(r.data));
      }
    };

    socket.on('order:created', onCreated);
    socket.on('order:updated', onUpdated);
    return () => {
      socket.off('order:created', onCreated);
      socket.off('order:updated', onUpdated);
    };
  }, []);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setMenuImage(file);
      setMenuPreview(URL.createObjectURL(file));
    }
  }

  async function createMenuItem(e: React.FormEvent) {
    e.preventDefault();
    setMenuMsg('');
    try {
      const fd = new FormData();
      fd.append('name',     menuName);
      fd.append('price',    menuPrice);
      fd.append('category', menuCat);
      if (menuDesc)  fd.append('description', menuDesc);
      if (menuImage) fd.append('image', menuImage);
      await api.post('/menu', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMenuMsg('Menu item created!');
      setMenuName(''); setMenuPrice(''); setMenuCat(''); setMenuDesc('');
      setMenuImage(null); setMenuPreview('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (err: any) {
      setMenuMsg(err.response?.data?.error ?? 'Failed.');
    }
  }

  return (
    <div className="page">
      <h1>Branch Manager</h1>
      <div className="stat-grid">
        <div className="stat-box">
          <div className="stat-value">${sales?.totalSales.toFixed(2) ?? '—'}</div>
          <div className="stat-label">Total Sales</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{sales?.orderCount ?? '—'}</div>
          <div className="stat-label">Orders Completed</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{staff.length}</div>
          <div className="stat-label">Staff Members</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem' }}>
        <div className="card">
          <h2 style={{ marginBottom: '1rem' }}>Add Menu Item</h2>
          {menuMsg && (
            <div className={`alert ${menuMsg.includes('created') ? 'alert-success' : 'alert-error'}`}>{menuMsg}</div>
          )}
          <form onSubmit={createMenuItem}>
            <div className="form-group"><label>Name</label><input value={menuName} onChange={e => setMenuName(e.target.value)} required /></div>
            <div className="form-group"><label>Price</label><input type="number" step="0.01" value={menuPrice} onChange={e => setMenuPrice(e.target.value)} required /></div>
            <div className="form-group"><label>Category</label><input value={menuCat} onChange={e => setMenuCat(e.target.value)} required /></div>
            <div className="form-group"><label>Description</label><input value={menuDesc} onChange={e => setMenuDesc(e.target.value)} /></div>
            <div className="form-group">
              <label>Image (optional)</label>
              <input type="file" accept="image/*" ref={fileRef} onChange={onFileChange} />
              {menuPreview && (
                <img src={menuPreview} alt="preview" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 6, marginTop: 6 }} />
              )}
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Add Item</button>
          </form>
        </div>

        <div className="card">
          <h2 style={{ marginBottom: '1rem' }}>Staff &amp; Salaries</h2>
          <table className="data-table">
            <thead><tr><th>Name</th><th>Role</th><th>Salary</th><th>Status</th></tr></thead>
            <tbody>
              {staff.map(s => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.role}</td>
                  <td>{s.salary ? `$${s.salary}` : '—'}</td>
                  <td><span className={`badge badge-${s.isActive ? 'confirmed' : 'cancelled'}`}>{s.isActive ? 'Active' : 'Inactive'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <h2 style={{ margin: '2rem 0 1rem' }}>All Branch Orders</h2>
      <table className="data-table">
        <thead><tr><th>ID</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>
          {orders.data.map(o => (
            <tr key={o.id}>
              <td>#{o.id}</td>
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
