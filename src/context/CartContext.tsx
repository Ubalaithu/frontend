import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface CartItem {
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
  branchId: number;
}

interface CartContextType {
  items: CartItem[];
  branchId: number | null;
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  removeFromCart: (menuItemId: number) => void;
  updateQuantity: (menuItemId: number, quantity: number) => void;
  clearCart: () => void;
  totalCount: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType>({} as CartContextType);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const stored = localStorage.getItem('steakz_cart');
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem('steakz_cart', JSON.stringify(items));
  }, [items]);

  const branchId = items.length > 0 ? items[0].branchId : null;

  function addToCart(item: Omit<CartItem, 'quantity'>) {
    setItems(prev => {
      // Check if adding from a different branch - clear cart first
      if (prev.length > 0 && prev[0].branchId !== item.branchId) {
        const confirmSwitch = window.confirm(
          'Your cart contains items from a different location. Clear cart and add this item?'
        );
        if (!confirmSwitch) return prev;
        return [{ ...item, quantity: 1 }];
      }

      const existing = prev.find(i => i.menuItemId === item.menuItemId);
      if (existing) {
        return prev.map(i =>
          i.menuItemId === item.menuItemId
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  }

  function removeFromCart(menuItemId: number) {
    setItems(prev => prev.filter(i => i.menuItemId !== menuItemId));
  }

  function updateQuantity(menuItemId: number, quantity: number) {
    if (quantity <= 0) {
      removeFromCart(menuItemId);
      return;
    }
    setItems(prev =>
      prev.map(i =>
        i.menuItemId === menuItemId ? { ...i, quantity } : i
      )
    );
  }

  function clearCart() {
    setItems([]);
  }

  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        branchId,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalCount,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}