import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const ROLE_DASH: Record<string, string> = {
  ADMIN:          '/admin',
  HQ_MANAGER:     '/hq',
  BRANCH_MANAGER: '/branch-manager',
  CHEF:           '/chef',
  CASHIER:        '/cashier',
  CUSTOMER:       '/customer',
};

export default function NavBar() {
  const { user, logout } = useAuth();
  const { totalCount } = useCart();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">STEAKZ<span>.</span></Link>
        <div className="nav-links">
          <Link to="/menu">Menu</Link>
          <Link to="/branches">Branches</Link>
          <Link to="/checkout" className="cart-link" style={{ position: 'relative' }}>
            🛒 Cart
            {totalCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-8px',
                right: '-12px',
                background: 'var(--pink)',
                color: 'white',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                fontWeight: 700
              }}>
                {totalCount}
              </span>
            )}
          </Link>
        {user ? (
          <>
            <Link to={ROLE_DASH[user.role] ?? '/'}>Dashboard</Link>
            {user.role === 'CUSTOMER' && <Link to="/book">Book Table</Link>}
            <span className="nav-badge">{user.role.replace(/_/g, ' ')}</span>
            <button className="btn btn-outline btn-sm" onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
