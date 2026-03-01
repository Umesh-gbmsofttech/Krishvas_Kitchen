import { createContext, useContext, useMemo, useState } from 'react';

export type CartItem = {
  menuItemId?: number;
  itemName: string;
  quantity: number;
  unitPrice: number;
  category: string;
  imageUrl?: string;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (itemName: string) => void;
  updateQty: (itemName: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find((p) => p.itemName === item.itemName);
      if (existing) {
        return prev.map((p) =>
          p.itemName === item.itemName ? { ...p, quantity: p.quantity + item.quantity } : p
        );
      }
      return [...prev, item];
    });
  };

  const removeItem = (itemName: string) => setItems((prev) => prev.filter((p) => p.itemName !== itemName));

  const updateQty = (itemName: string, quantity: number) => {
    if (quantity <= 0) return removeItem(itemName);
    setItems((prev) => prev.map((p) => (p.itemName === itemName ? { ...p, quantity } : p)));
  };

  const clearCart = () => setItems([]);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [items]
  );

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clearCart, total }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
};
