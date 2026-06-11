import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useCart } from '../context/CartContext';

interface Branch   { id: number; name: string; address: string; }
interface MenuItem { id: number; name: string; description?: string; price: number; category: string; imageUrl?: string; branchId: number; }

export default function MenuPage() {
  const { addToCart } = useCart();
  const [branches,   setBranches]   = useState<Branch[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [menu,       setMenu]       = useState<MenuItem[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [search,     setSearch]     = useState('');
  const [addedItems, setAddedItems] = useState<Set<number>>(new Set());

  useEffect(() => {
    api.get('/public/branches').then(r => setBranches(r.data));
  }, []);

  async function loadMenu(branchId: number) {
    setSelectedId(branchId);
    setLoading(true);
    const r = await api.get(`/menu/${branchId}`);
    setMenu(r.data);
    setLoading(false);
  }

  const categories = [...new Set(menu.map(m => m.category))];
  const filteredMenu = menu.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.description?.toLowerCase().includes(search.toLowerCase())
  );
  
  // Sort categories with Specials first
  const sortedCategories = categories.sort((a, b) => {
    if (a.includes('SPECIALS')) return -1;
    if (b.includes('SPECIALS')) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="page" style={{ maxWidth: '1400px' }}>
      {/* Header Section */}
      <div style={{ textAlign: 'center', marginBottom: '3rem', paddingBottom: '2rem', borderBottom: '2px solid var(--pink)' }}>
        <h1 style={{ marginBottom: '0.5rem', fontSize: 'clamp(2rem, 5vw, 3rem)' }}>STEAKZ EPICUREAN MENU</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '0.5rem', fontStyle: 'italic' }}>
          A curated selection of premium cuts and culinary masterpieces
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Each dish crafted with precision, passion, and the finest ingredients
        </p>
      </div>

      {/* Location Selector */}
      <div style={{ 
        background: 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-card) 100%)',
        border: '2px solid var(--pink-dim)', 
        borderRadius: 'var(--radius)',
        padding: '2rem',
        marginBottom: '2.5rem'
      }}>
        <p style={{ 
          color: 'var(--pink-light)', 
          fontSize: '0.85rem', 
          marginBottom: '1.2rem', 
          textTransform: 'uppercase', 
          letterSpacing: '0.15em',
          fontWeight: 700
        }}>
          🏪 Select Your Location
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {branches.map(b => (
            <button
              key={b.id}
              className={`btn ${selectedId === b.id ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => loadMenu(b.id)}
              style={{ 
                transition: 'all 0.3s ease',
                fontWeight: 600,
                letterSpacing: '0.05em'
              }}
            >
              {b.name}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      {selectedId && menu.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <input
            type="text"
            placeholder="🔍 Search menu items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              maxWidth: '500px',
              padding: '0.9rem 1.2rem',
              background: 'var(--bg-elevated)',
              border: '2px solid var(--border)',
              borderRadius: 'var(--radius)',
              color: 'var(--text-primary)',
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: '0.95rem',
              transition: 'border-color 0.3s'
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--pink)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem 2rem', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '1.1rem' }}>✨ Loading menu...</p>
        </div>
      )}

      {!loading && selectedId && filteredMenu.length > 0 && (
        <>
          {sortedCategories.map(cat => {
            const catItems = filteredMenu.filter(m => m.category === cat);
            if (catItems.length === 0) return null;
            
            const isSpecials = cat.includes('SPECIALS');
            
            return (
              <div key={cat} style={{ marginBottom: '3.5rem' }}>
                {/* Category Header */}
                <div style={{
                  background: isSpecials ? 'linear-gradient(135deg, rgba(255,45,120,0.1) 0%, rgba(255,45,120,0.05) 100%)' : 'transparent',
                  border: isSpecials ? '2px solid var(--pink)' : 'none',
                  borderRadius: isSpecials ? 'var(--radius)' : '0',
                  padding: isSpecials ? '1.5rem' : '0',
                  marginBottom: '1.5rem'
                }}>
                  <h2 style={{ 
                    marginBottom: isSpecials ? '0.5rem' : '1rem',
                    color: isSpecials ? 'var(--pink)' : 'var(--text-primary)',
                    fontSize: isSpecials ? '1.5rem' : '1.3rem',
                    fontWeight: isSpecials ? 700 : 600,
                    letterSpacing: isSpecials ? '0.1em' : '0.05em',
                    textTransform: isSpecials ? 'uppercase' : 'capitalize'
                  }}>
                    {cat}
                  </h2>
                  {isSpecials && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                      Chef's Selection — Limited availability, subject to ingredient sourcing
                    </p>
                  )}
                </div>

                {/* Menu Items Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                  gap: '2rem',
                  marginTop: '1.5rem'
                }}>
                  {catItems.map(item => (
                    <div 
                      key={item.id} 
                      style={{
                        background: isSpecials ? 'var(--bg-elevated)' : 'var(--bg-card)',
                        border: isSpecials ? '2px solid var(--pink-dim)' : '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        overflow: 'hidden',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative'
                      }}
                      className="card"
                      onMouseEnter={(e) => {
                        const elem = e.currentTarget as HTMLElement;
                        elem.style.transform = 'translateY(-6px)';
                        elem.style.boxShadow = `0 12px 32px ${isSpecials ? 'var(--pink-glow)' : 'rgba(0,0,0,0.3)'}`;
                      }}
                      onMouseLeave={(e) => {
                        const elem = e.currentTarget as HTMLElement;
                        elem.style.transform = 'translateY(0)';
                        elem.style.boxShadow = 'none';
                      }}
                    >
                      {/* Special Badge */}
                      {isSpecials && (
                        <div style={{
                          position: 'absolute',
                          top: '1rem',
                          right: '1rem',
                          background: 'var(--pink)',
                          color: 'white',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '20px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          zIndex: 10,
                          boxShadow: '0 4px 12px var(--pink-glow)'
                        }}>
                          Chef's Pick
                        </div>
                      )}

                      {/* Image section */}
                      {item.imageUrl ? (
                        <div style={{
                          width: '100%',
                          height: '220px',
                          overflow: 'hidden',
                          background: 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-secondary) 100%)',
                          position: 'relative'
                        }}>
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block',
                              transition: 'transform 0.4s ease'
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.12)';
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)';
                            }}
                          />
                        </div>
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '220px',
                          background: isSpecials 
                            ? 'linear-gradient(135deg, var(--pink-dim) 0%, rgba(255,45,120,0.05) 100%)'
                            : 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-secondary) 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-muted)',
                          fontSize: isSpecials ? '3.5rem' : '3rem'
                        }}>
                          {isSpecials ? '👨‍🍳' : '🥩'}
                        </div>
                      )}

                      {/* Content section */}
                      <div style={{
                        padding: '1.5rem',
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column'
                      }}>
                        <h3 style={{
                          marginBottom: '0.5rem',
                          color: isSpecials ? 'var(--pink)' : 'var(--text-primary)',
                          fontSize: '1.15rem',
                          fontWeight: 700,
                          fontFamily: 'Orbitron, monospace',
                          letterSpacing: '0.05em'
                        }}>
                          {item.name}
                        </h3>

                        {item.description && (
                          <p style={{
                            color: 'var(--text-secondary)',
                            fontSize: '0.85rem',
                            marginBottom: '1rem',
                            flex: 1,
                            lineHeight: '1.6',
                            fontStyle: 'italic'
                          }}>
                            {item.description}
                          </p>
                        )}

                        {/* Price section */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingTop: '1rem',
                          borderTop: `1px solid ${isSpecials ? 'var(--pink-dim)' : 'var(--border)'}`
                        }}>
                          <div>
                            <span style={{
                              color: 'var(--pink)',
                              fontFamily: 'Orbitron',
                              fontWeight: 900,
                              fontSize: '1.4rem'
                            }}>
                              ${item.price.toFixed(2)}
                            </span>
                          </div>
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart({
                                menuItemId: item.id,
                                name: item.name,
                                price: item.price,
                                branchId: item.branchId
                              });
                              setAddedItems(prev => new Set([...prev, item.id]));
                              setTimeout(() => {
                                setAddedItems(prev => {
                                  const next = new Set(prev);
                                  next.delete(item.id);
                                  return next;
                                });
                              }, 1500);
                            }}
                            title="Add to cart"
                            style={{ 
                              fontWeight: 700,
                              background: addedItems.has(item.id) ? 'var(--success)' : undefined
                            }}
                          >
                            {addedItems.has(item.id) ? '✓ Added!' : '+ ORDER'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}

      {!loading && selectedId && filteredMenu.length === 0 && menu.length > 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          <p>No items match your search.</p>
        </div>
      )}

      {!loading && selectedId && menu.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          <p>No menu items available for this location yet.</p>
        </div>
      )}

      {!loading && !selectedId && (
        <div style={{ 
          textAlign: 'center', 
          padding: '4rem 2rem', 
          color: 'var(--text-muted)',
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius)',
          border: '2px dashed var(--border)'
        }}>
          <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>👆 Select a location above to discover our menu</p>
          <p style={{ fontSize: '0.9rem' }}>Each location offers the same premium selections</p>
        </div>
      )}
    </div>
  );
}
