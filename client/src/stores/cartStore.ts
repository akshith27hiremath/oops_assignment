/**
 * Shopping Cart Store
 * Manages cart state with Zustand and localStorage persistence
 * Cart is user-specific based on logged-in user ID
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '../types/product.types';
import toast from 'react-hot-toast';

export interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
  addedAt: Date;
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;

  // Actions
  addItem: (productOrData: Product | { productId: string; quantity: number }) => Promise<void>;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;

  // Computed
  getItemCount: () => number;
  getTotal: () => number;
  getItem: (productId: string) => CartItem | undefined;
  hasItem: (productId: string) => boolean;
}

// Helper to get current user ID
const getCurrentUserId = (): string | null => {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user._id || user.userId || null;
    }
  } catch (error) {
    console.error('Error getting user ID:', error);
  }
  return null;
};

// Helper to get user-specific storage key
const getUserCartKey = (): string => {
  const userId = getCurrentUserId();
  return userId ? `cart-storage-${userId}` : 'cart-storage-guest';
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: async (productOrData: Product | { productId: string; quantity: number }) => {
        let product: Product;
        let quantity: number;

        // Check if it's a product object or data object
        if ('_id' in productOrData) {
          // It's a Product object
          product = productOrData;
          quantity = 1;
        } else {
          // It's { productId, quantity } - need to fetch the product
          const { productId, quantity: qty } = productOrData;
          quantity = qty;

          try {
            // Import productService dynamically to avoid circular dependency
            const productService = (await import('../services/product.service')).default;
            const response = await productService.getProductById(productId);
            product = response.data.product;
          } catch (error) {
            console.error('Failed to fetch product:', error);
            toast.error('Failed to add product to cart');
            return;
          }
        }

        const existingItem = get().getItem(product._id);

        if (existingItem) {
          // Update quantity if item already exists
          set((state) => ({
            items: state.items.map((item) =>
              item.productId === product._id
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
          }));
          toast.success(`Updated ${product.name} quantity in cart`);
        } else {
          // Add new item
          set((state) => ({
            items: [
              ...state.items,
              {
                productId: product._id,
                product,
                quantity,
                addedAt: new Date(),
              },
            ],
          }));
          toast.success(`Added ${product.name} to cart`);
        }

        // Open cart drawer after adding
        get().openCart();
      },

      removeItem: (productId: string) => {
        const item = get().getItem(productId);
        if (item) {
          set((state) => ({
            items: state.items.filter((item) => item.productId !== productId),
          }));
          toast.success(`Removed ${item.product.name} from cart`);
        }
      },

      updateQuantity: (productId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.productId === productId ? { ...item, quantity } : item
          ),
        }));
      },

      clearCart: () => {
        set({ items: [] });
        toast.success('Cart cleared');
      },

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      // Computed values
      getItemCount: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotal: () => {
        return get().items.reduce(
          (total, item) => total + item.product.basePrice * item.quantity,
          0
        );
      },

      getItem: (productId: string) => {
        return get().items.find((item) => item.productId === productId);
      },

      hasItem: (productId: string) => {
        return get().items.some((item) => item.productId === productId);
      },
    }),
    {
      name: getUserCartKey(), // User-specific localStorage key
      partialize: (state) => ({ items: state.items }), // Only persist items
    }
  )
);

// Helper function to clear cart when logging out
export const clearCartOnLogout = () => {
  const userId = getCurrentUserId();
  if (userId) {
    localStorage.removeItem(`cart-storage-${userId}`);
  }
  // Reset the store
  useCartStore.setState({ items: [], isOpen: false });
};
