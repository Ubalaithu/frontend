import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

interface Branch { id: number; name: string; address: string; }
interface Table { id: number; tableNumber: number; capacity: number; isAvailable: boolean; }
interface Booking { id: number; table: { tableNumber: number }; date: string; guestCount: number; status: string; }

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, branchId, totalCount, totalPrice, removeFromCart, updateQuantity, clearCart } = useCart();
  
  const [branches, setBranches] = useState<Branch[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTableId, setSelectedTableId] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [useExistingBooking, setUseExistingBooking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch branches
  useEffect(() => {
    api.get('/public/branches').then(r => setBranches(r.data));
  }, []);

  // Fetch tables when branch changes
  useEffect(() => {
    if (branchId) {
      api.get(`/public/branches/${branchId}`).then(r => setTables(r.data.tables ?? []));
    } else {
      setTables([]);
    }
  }, [branchId]);

  // Fetch user's bookings if logged in and using existing booking
  useEffect(() => {
    if (user && useExistingBooking) {
      api.get('/customer/bookings?limit=50').then(r => {
        const confirmedBookings = r.data.data.filter((b: Booking) => b.status === 'CONFIRMED');
        setBookings(confirmedBookings);
      });
    }
  }, [user, useExistingBooking]);

  // Redirect if cart is empty
  if (items.length === 0) {
    return (
      <div className="page">
        <h1>Checkout</h1>
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Your cart is empty</p>
          <button className="btn btn-primary" onClick={() => navigate('/menu')}>
            Browse Menu
          </button>
        </div>
      </div>
    );
  }

  async function handleBookTable(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTableId || !user) return;

    setIsSubmitting(true);
    setError('');

    try {
      // First, create a booking
      const bookingRes = await api.post('/customer/bookings', {
        tableId: parseInt(selectedTableId),
        guestCount: 2,
        date: new Date().toISOString(),
      });

      const booking = bookingRes.data;

      // Then, create the order with the booking
      await createOrder(booking.id);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to book table and place order.');
      setIsSubmitting(false);
    }
  }

  async function handleUseExistingBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBookingId || !user) return;

    setIsSubmitting(true);
    setError('');

    try {
      await createOrder(parseInt(selectedBookingId));
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to place order.');
      setIsSubmitting(false);
    }
  }

  async function createOrder(bookingId: number) {
    try {
      const orderItems = items.map(item => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
      }));

      await api.post('/customer/orders', {
        bookingId,
        items: orderItems,
      });

      clearCart();
      setSuccess('Order placed successfully!');
      setIsSubmitting(false);
      
      setTimeout(() => {
        navigate('/customer');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to place order.');
      setIsSubmitting(false);
    }
  }

  const selectedBranch = branches.find(b => b.id === branchId);

  return (
    <div className="page">
      <h1>Checkout</h1>
      <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 2rem' }}>
        Review your order and complete your purchase
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', maxWidth: '1200px' }}>
        {/* Order Summary */}
        <div className="card" style={{ height: 'fit-content' }}>
          <h2 style={{ marginBottom: '1.5rem', color: 'var(--pink)' }}>Order Summary</h2>
          
          {items.map(item => (
            <div 
              key={item.menuItemId}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 0',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 0.25rem', color: 'var(--text-primary)' }}>{item.name}</h4>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  ${item.price.toFixed(2)} each
                </p>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                  style={{ padding: '0.25rem 0.5rem' }}
                >
                  -
                </button>
                <span style={{ 
                  minWidth: '2rem', 
                  textAlign: 'center', 
                  fontWeight: 600,
                  fontFamily: 'Orbitron'
                }}>
                  {item.quantity}
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                  style={{ padding: '0.25rem 0.5rem' }}
                >
                  +
                </button>
              </div>
              
              <div style={{ 
                minWidth: '80px', 
                textAlign: 'right',
                fontFamily: 'Orbitron',
                fontWeight: 700,
                color: 'var(--pink)'
              }}>
                ${(item.price * item.quantity).toFixed(2)}
              </div>
              
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => removeFromCart(item.menuItemId)}
                style={{ marginLeft: '0.5rem', color: 'var(--danger)', padding: '0.25rem' }}
                title="Remove item"
              >
                ✕
              </button>
            </div>
          ))}

          <div style={{ 
            marginTop: '1.5rem', 
            paddingTop: '1rem', 
            borderTop: '2px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>Total ({totalCount} items)</span>
            <span style={{ 
              fontSize: '1.5rem', 
              fontWeight: 900, 
              color: 'var(--pink)',
              fontFamily: 'Orbitron'
            }}>
              ${totalPrice.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Checkout Form */}
        <div>
          {user ? (
            <>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={useExistingBooking}
                    onChange={(e) => setUseExistingBooking(e.target.checked)}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span>Use an existing table booking</span>
                </label>
              </div>

              {useExistingBooking ? (
                <form onSubmit={handleUseExistingBooking} className="card">
                  <h3 style={{ marginBottom: '1rem', color: 'var(--pink)' }}>Select Your Booking</h3>
                  
                  {bookings.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <p>No confirmed bookings found.</p>
                      <button 
                        type="button" 
                        className="btn btn-outline" 
                        onClick={() => navigate('/book')}
                        style={{ marginTop: '1rem' }}
                      >
                        Book a Table First
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="form-group">
                        <label>Select Booking</label>
                        <select 
                          value={selectedBookingId} 
                          onChange={(e) => setSelectedBookingId(e.target.value)}
                          required
                        >
                          <option value="">Choose a booking</option>
                          {bookings.map(b => (
                            <option key={b.id} value={b.id}>
                              Table {b.table.tableNumber} — {new Date(b.date).toLocaleString()}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <button 
                        type="submit" 
                        className="btn btn-primary" 
                        style={{ width: '100%', marginTop: '1rem' }}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Placing Order...' : `Pay $${totalPrice.toFixed(2)}`}
                      </button>
                    </>
                  )}
                </form>
              ) : (
                <form onSubmit={handleBookTable} className="card">
                  <h3 style={{ marginBottom: '1rem', color: 'var(--pink)' }}>
                    {selectedBranch ? `Order at ${selectedBranch.name}` : 'Select a Location'}
                  </h3>
                  
                  {selectedBranch && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                      {selectedBranch.address}
                    </p>
                  )}

                  <div className="form-group">
                    <label>Select Table</label>
                    <select 
                      value={selectedTableId} 
                      onChange={(e) => setSelectedTableId(e.target.value)}
                      required
                    >
                      <option value="">Choose a table</option>
                      {tables.filter(t => t.isAvailable).map(t => (
                        <option key={t.id} value={t.id}>
                          Table {t.tableNumber} (seats {t.capacity})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ width: '100%', marginTop: '1rem' }}
                    disabled={isSubmitting || !selectedTableId}
                  >
                    {isSubmitting ? 'Placing Order...' : `Pay $${totalPrice.toFixed(2)}`}
                  </button>
                  
                  <p style={{ 
                    marginTop: '1rem', 
                    fontSize: '0.8rem', 
                    color: 'var(--text-muted)',
                    textAlign: 'center'
                  }}>
                    A table booking will be created for your order
                  </p>
                </form>
              )}
            </>
          ) : (
            <div className="card" style={{ textAlign: 'center' }}>
              <h3 style={{ marginBottom: '1rem', color: 'var(--pink)' }}>Login Required</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Please log in or create an account to complete your order.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button className="btn btn-outline" onClick={() => navigate('/login')}>
                  Login
                </button>
                <button className="btn btn-primary" onClick={() => navigate('/register')}>
                  Register
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}