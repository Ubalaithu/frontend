import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import Pagination from '../components/Pagination';

interface User   { id: number; name: string; email: string; role: string; isActive: boolean; branchId?: number; salary?: number; branch?: { name: string } }
interface Branch { id: number; name: string; address: string; isActive: boolean }
interface Page<T>{ data: T[]; total: number; page: number; totalPages: number; }

const ROLES = ['ADMIN', 'HQ_MANAGER', 'BRANCH_MANAGER', 'CHEF', 'CASHIER', 'CUSTOMER'];
const BRANCH_REQUIRED_ROLES = ['BRANCH_MANAGER', 'CHEF', 'CASHIER'];

export default function AdminDashboard() {
  const [page,     setPage]     = useState(1);
  const [users,    setUsers]    = useState<Page<User>>({ data: [], total: 0, page: 1, totalPages: 1 });
  const [branches, setBranches] = useState<Branch[]>([]);

  const [uName,   setUName]   = useState('');
  const [uEmail,  setUEmail]  = useState('');
  const [uPass,   setUPass]   = useState('');
  const [uRole,   setURole]   = useState('CASHIER');
  const [uBranch, setUBranch] = useState('');
  const [uSalary, setUSalary] = useState('');
  const [uMsg,    setUMsg]    = useState('');

  const [bName,    setBName]    = useState('');
  const [bAddress, setBAddress] = useState('');
  const [bMsg,     setBMsg]     = useState('');

  const [pendingRole, setPendingRole] = useState<{ userId: number; role: string } | null>(null);
  const [pendingBranchId, setPendingBranchId] = useState('');

  const loadUsers = useCallback((p: number) => {
    api.get(`/admin/users?page=${p}&limit=15`).then(r => setUsers(r.data));
  }, []);

  const loadBranches = useCallback(() => {
    api.get('/admin/branches').then(r => setBranches(r.data));
  }, []);

  useEffect(() => { loadBranches(); }, [loadBranches]);
  useEffect(() => { loadUsers(page); }, [page, loadUsers]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setUMsg('');
    try {
      await api.post('/admin/users', {
        name:     uName,
        email:    uEmail,
        password: uPass,
        role:     uRole,
        branchId: uBranch ? parseInt(uBranch) : undefined,
        salary:   uSalary ? parseFloat(uSalary) : undefined,
      });
      setUMsg('User created successfully!');
      setUName(''); setUEmail(''); setUPass(''); setUBranch(''); setUSalary('');
      loadUsers(page);
    } catch (err: any) {
      setUMsg(err.response?.data?.error ?? 'Failed.');
    }
  }

  async function addBranch(e: React.FormEvent) {
    e.preventDefault();
    setBMsg('');
    try {
      await api.post('/admin/branches', { name: bName, address: bAddress });
      setBMsg('Branch added!');
      setBName(''); setBAddress('');
      loadBranches();
    } catch (err: any) {
      setBMsg(err.response?.data?.error ?? 'Failed.');
    }
  }

  async function changeRole(id: number, role: string) {
    if (BRANCH_REQUIRED_ROLES.includes(role)) {
      setPendingRole({ userId: id, role });
      setPendingBranchId(String(users.data.find(u => u.id === id)?.branchId ?? ''));
      return;
    }
    await api.patch(`/admin/users/${id}/role`, { role, branchId: null });
    loadUsers(page);
  }

  async function confirmRoleChange() {
    if (!pendingRole || !pendingBranchId) return;
    await api.patch(`/admin/users/${pendingRole.userId}/role`, {
      role: pendingRole.role,
      branchId: parseInt(pendingBranchId),
    });
    setPendingRole(null);
    setPendingBranchId('');
    loadUsers(page);
  }

  async function toggleUser(id: number, isActive: boolean) {
    if (isActive) await api.patch(`/admin/users/${id}/disable`);
    else          await api.patch(`/admin/users/${id}/enable`);
    loadUsers(page);
  }

  async function deleteUser(id: number) {
    if (!confirm('Delete this user permanently?')) return;
    await api.delete(`/admin/users/${id}`);
    loadUsers(page);
  }

  return (
    <div className="page">
      <h1>Admin Panel</h1>

      <div className="stat-grid">
        <div className="stat-box">
          <div className="stat-value">{users.total}</div>
          <div className="stat-label">Total Users</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{branches.length}</div>
          <div className="stat-label">Branches</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1.5rem' }}>
        {/* Create User */}
        <div className="card">
          <h2 style={{ marginBottom: '1rem' }}>Create User</h2>
          {uMsg && (
            <div className={`alert ${uMsg.includes('success') ? 'alert-success' : 'alert-error'}`}>{uMsg}</div>
          )}
          <form onSubmit={createUser}>
            <div className="form-group"><label>Name</label><input value={uName} onChange={e => setUName(e.target.value)} required /></div>
            <div className="form-group"><label>Email</label><input type="email" value={uEmail} onChange={e => setUEmail(e.target.value)} required /></div>
            <div className="form-group"><label>Password</label><input type="password" value={uPass} onChange={e => setUPass(e.target.value)} required /></div>
            <div className="form-group">
              <label>Role</label>
              <select value={uRole} onChange={e => setURole(e.target.value)}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Branch (staff only)</label>
              <select value={uBranch} onChange={e => setUBranch(e.target.value)}>
                <option value="">— None —</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Salary (optional)</label><input type="number" value={uSalary} onChange={e => setUSalary(e.target.value)} /></div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Create User</button>
          </form>
        </div>

        {/* Add Branch */}
        <div className="card">
          <h2 style={{ marginBottom: '1rem' }}>Add Branch</h2>
          {bMsg && (
            <div className={`alert ${bMsg.includes('added') ? 'alert-success' : 'alert-error'}`}>{bMsg}</div>
          )}
          <form onSubmit={addBranch}>
            <div className="form-group"><label>Branch Name</label><input value={bName} onChange={e => setBName(e.target.value)} required /></div>
            <div className="form-group"><label>Address</label><input value={bAddress} onChange={e => setBAddress(e.target.value)} required /></div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Add Branch</button>
          </form>

          <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem' }}>Existing Branches</h3>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {branches.map(b => (
              <div key={b.id} style={{ padding: '0.4rem 0', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {b.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      <h2 style={{ margin: '2rem 0 1rem' }}>
        All Users
        <span style={{ color: 'var(--text-muted)', fontSize: '1rem', fontFamily: 'Rajdhani', fontWeight: 400, marginLeft: '0.75rem' }}>
          ({users.total} total)
        </span>
      </h2>
      <table className="data-table">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Branch</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {users.data.map(u => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{u.email}</td>
              <td>
                <select
                  value={u.role}
                  onChange={e => changeRole(u.id, e.target.value)}
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '2px 6px', borderRadius: 4 }}
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </td>
              <td>{u.branch?.name ?? '—'}</td>
              <td><span className={`badge badge-${u.isActive ? 'confirmed' : 'cancelled'}`}>{u.isActive ? 'Active' : 'Disabled'}</span></td>
              <td style={{ display: 'flex', gap: '0.4rem' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => toggleUser(u.id, u.isActive)}>
                  {u.isActive ? 'Disable' : 'Enable'}
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => deleteUser(u.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination page={page} totalPages={users.totalPages} onPageChange={setPage} />

      {pendingRole && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: 360, padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Select Branch</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
              The <strong>{pendingRole.role}</strong> role requires a branch assignment.
            </p>
            <div className="form-group">
              <label>Branch</label>
              <select value={pendingBranchId} onChange={e => setPendingBranchId(e.target.value)}
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '6px 10px', borderRadius: 4, width: '100%' }}>
                <option value="">— Select a branch —</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button className="btn btn-primary" style={{ flex: 1 }} disabled={!pendingBranchId} onClick={confirmRoleChange}>Confirm</button>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setPendingRole(null); setPendingBranchId(''); loadUsers(page); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
