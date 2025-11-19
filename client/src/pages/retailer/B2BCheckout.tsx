/**
 * B2B Checkout Page
 * Review cart and complete bulk order placement
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import b2bOrderService from '../../services/b2bOrder.service';
import toast from 'react-hot-toast';
import DarkModeToggle from '../../components/DarkModeToggle';

interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  unit: string;
  wholesalerId: string;
  wholesalerName: string;
  image: string;
}

const B2BCheckout: React.FC = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Delivery address form
  const [deliveryAddress, setDeliveryAddress] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'India',
  });

  const [notes, setNotes] = useState('');

  useEffect(() => {
    // Load cart from sessionStorage
    const savedCart = sessionStorage.getItem('b2bCart');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        setCart(parsedCart);
      } catch (error) {
        toast.error('Failed to load cart');
        navigate('/retailer/b2b-marketplace');
      }
    } else {
      toast.error('Cart is empty');
      navigate('/retailer/b2b-marketplace');
    }

    // Try to load user's store address (if available)
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        if (user.store?.address) {
          setDeliveryAddress({
            street: user.store.address.street || '',
            city: user.store.address.city || '',
            state: user.store.address.state || '',
            zipCode: user.store.address.zipCode || '',
            country: user.store.address.country || 'India',
          });
        }
      } catch (error) {
        console.error('Failed to parse user data:', error);
      }
    }
  }, [navigate]);

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
  };

  const handlePlaceOrder = async () => {
    // Validate address
    if (!deliveryAddress.street || !deliveryAddress.city || !deliveryAddress.state || !deliveryAddress.zipCode) {
      toast.error('Please fill in all delivery address fields');
      return;
    }

    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setLoading(true);

    try {
      const orderData = {
        wholesalerId: cart[0].wholesalerId,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        deliveryAddress,
        notes: notes || undefined,
      };

      const response = await b2bOrderService.createOrder(orderData);

      if (response.success) {
        toast.success('Order placed successfully!');
        sessionStorage.removeItem('b2bCart');
        navigate(`/retailer/b2b-orders/${response.data.order._id}`);
      } else {
        toast.error(response.message || 'Failed to place order');
      }
    } catch (error: any) {
      console.error('Order placement error:', error);
      toast.error(error.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bulk Order Checkout</h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">Review your order and confirm delivery details</p>
            </div>
            <DarkModeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Delivery Address & Notes */}
          <div className="lg:col-span-2 space-y-6">
            {/* Supplier Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Supplier Information</h2>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-300">Ordering from</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{cart[0].wholesalerName}</p>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Delivery Address</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Street Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={deliveryAddress.street}
                    onChange={(e) => setDeliveryAddress({ ...deliveryAddress, street: e.target.value })}
                    placeholder="Enter street address"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={deliveryAddress.city}
                    onChange={(e) => setDeliveryAddress({ ...deliveryAddress, city: e.target.value })}
                    placeholder="Enter city"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={deliveryAddress.state}
                    onChange={(e) => setDeliveryAddress({ ...deliveryAddress, state: e.target.value })}
                    placeholder="Enter state"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    ZIP Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={deliveryAddress.zipCode}
                    onChange={(e) => setDeliveryAddress({ ...deliveryAddress, zipCode: e.target.value })}
                    placeholder="Enter ZIP code"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Country</label>
                  <input
                    type="text"
                    value={deliveryAddress.country}
                    onChange={(e) => setDeliveryAddress({ ...deliveryAddress, country: e.target.value })}
                    placeholder="Country"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Order Notes */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Order Notes (Optional)</h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any special instructions or notes for the supplier..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 sticky top-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Order Summary</h2>

              {/* Items List */}
              <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.productId} className="border-b pb-3">
                    <div className="flex gap-3">
                      <img
                        src={item.image || 'https://via.placeholder.com/60'}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{item.name}</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          {item.quantity} {item.unit} × ₹{item.unitPrice}
                        </p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">
                          ₹{(item.unitPrice * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="border-t pt-4 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600 dark:text-gray-300">Subtotal:</span>
                  <span className="font-semibold">₹{getCartTotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-green-600">₹{getCartTotal().toFixed(2)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  *Volume discounts may be applied by the wholesaler
                </p>
              </div>

              {/* Action Buttons */}
              <button
                onClick={handlePlaceOrder}
                disabled={loading}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Placing Order...' : 'Place Order'}
              </button>

              <button
                onClick={() => navigate('/retailer/b2b-marketplace')}
                className="w-full mt-3 px-4 py-2 bg-gray-200 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300"
              >
                Back to Marketplace
              </button>

              {/* Payment Info */}
              <div className="mt-6 bg-yellow-50 p-4 rounded-lg">
                <p className="text-xs text-gray-700 dark:text-gray-200">
                  <strong>Note:</strong> Payment will be processed after the wholesaler confirms your order.
                  You will receive a notification once the order is confirmed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default B2BCheckout;
