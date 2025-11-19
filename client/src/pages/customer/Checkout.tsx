/**
 * Checkout Page - GroceryMart Style
 * Cart management with quantity controls and clean order summary
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerLayout from '../../components/layout/CustomerLayout';
import { useCartStore } from '../../stores/cartStore';
import authService from '../../services/auth.service';
import orderService from '../../services/order.service';
import discountService from '../../services/discount.service';
import geolocationService from '../../services/geolocation.service';
import { User } from '../../types/auth.types';
import { DiscountCode, LoyaltyTier } from '../../types/discount.types';
import UPIPaymentModal from '../../components/payment/UPIPaymentModal';
import { UPITransaction } from '../../services/payment.service';
import DiscountCodeInput from '../../components/checkout/DiscountCodeInput';
import LoyaltyTierBadge from '../../components/loyalty/LoyaltyTierBadge';
import { useGoogleMaps } from '../../hooks/useGoogleMaps';
import { calculateCartSubtotal, calculateFinalTotal, getProductDiscount } from '../../utils/discountUtils';
import toast from 'react-hot-toast';

interface DeliveryAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { items, getTotal, clearCart, updateQuantity, removeItem } = useCartStore();
  const { isLoaded: mapsLoaded } = useGoogleMaps();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(true);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [addressAutoFilled, setAddressAutoFilled] = useState(false);

  // Form state
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress>({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'India',
  });
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);

  // Discount state
  const [appliedDiscountCode, setAppliedDiscountCode] = useState<DiscountCode | null>(null);
  const [loyaltyTier, setLoyaltyTier] = useState<LoyaltyTier>(LoyaltyTier.BRONZE);
  const [completedOrders, setCompletedOrders] = useState<number>(0);

  // Load user data
  useEffect(() => {
    loadUserData();
  }, []);

  // Redirect if cart is empty
  useEffect(() => {
    if (!formLoading && items.length === 0) {
      toast.error('Your cart is empty');
      navigate('/customer/browse');
    }
  }, [items.length, formLoading, navigate]);

  // Retry loading address when Google Maps loads
  useEffect(() => {
    if (mapsLoaded && user && !deliveryAddress.street && !addressAutoFilled) {
      const userLocation = (user as any).profile?.location;
      if (userLocation && userLocation.coordinates && userLocation.coordinates.length === 2) {
        loadAddressFromCoordinates(userLocation.coordinates[1], userLocation.coordinates[0]);
      }
    }
  }, [mapsLoaded, user]);

  const loadUserData = async () => {
    try {
      setFormLoading(true);
      const response = await authService.getCurrentUser();
      if (response.success) {
        setUser(response.data.user);

        // Get loyalty tier and completed orders from user data
        const userData = response.data.user as any;
        const orderHistory = userData.orderHistory || [];
        setCompletedOrders(orderHistory.length);

        // Calculate loyalty tier
        const tierInfo = discountService.calculateLoyaltyTier(orderHistory.length);
        setLoyaltyTier(tierInfo.tier);

        // Auto-fill address from user's stored location coordinates
        const userLocation = userData.profile?.location;
        if (userLocation && userLocation.coordinates && userLocation.coordinates.length === 2) {
          // User has coordinates stored - use Google Maps to get full address
          loadAddressFromCoordinates(userLocation.coordinates[1], userLocation.coordinates[0]);
        }
      }
    } catch (error: any) {
      toast.error('Failed to load user data');
    } finally {
      setFormLoading(false);
    }
  };

  const loadAddressFromCoordinates = async (lat: number, lng: number) => {
    // Wait for Google Maps to load
    if (!mapsLoaded) {
      console.log('Google Maps not loaded yet, will retry when loaded');
      return;
    }

    // Don't auto-fill if already done
    if (addressAutoFilled) {
      return;
    }

    try {
      setLoadingAddress(true);
      const addressComponents = await geolocationService.reverseGeocodeToComponents(lat, lng);

      if (addressComponents) {
        setDeliveryAddress({
          street: addressComponents.street,
          city: addressComponents.city,
          state: addressComponents.state,
          zipCode: addressComponents.zipCode,
          country: addressComponents.country || 'India',
        });
        setAddressAutoFilled(true);
        toast.success('Address auto-filled from your saved location');
      }
    } catch (error) {
      console.error('Failed to load address from coordinates:', error);
      // Silently fail - user can still enter address manually
    } finally {
      setLoadingAddress(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setDeliveryAddress((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePaymentSuccess = async (transaction: UPITransaction) => {
    toast.success('Payment completed successfully!');
    clearCart();
    setShowPaymentModal(false);
    setPendingOrderId(null);
    navigate(`/customer/orders`);
  };

  const handlePaymentCancel = async () => {
    setShowPaymentModal(false);

    // Cancel the order that was created
    if (pendingOrderId) {
      try {
        await orderService.cancelOrder(pendingOrderId, 'Payment cancelled by user');
      } catch (error) {
        console.error('Failed to cancel order:', error);
      }
    }

    setPendingOrderId(null);
    toast('Payment cancelled. You can try again when ready.', {
      icon: 'ℹ️',
    });
  };

  const validateForm = (): boolean => {
    if (!deliveryAddress.street.trim()) {
      toast.error('Street address is required');
      return false;
    }
    if (!deliveryAddress.city.trim()) {
      toast.error('City is required');
      return false;
    }
    if (!deliveryAddress.state.trim()) {
      toast.error('State is required');
      return false;
    }
    if (!deliveryAddress.zipCode.trim()) {
      toast.error('ZIP code is required');
      return false;
    }
    if (!/^\d{6}$/.test(deliveryAddress.zipCode)) {
      toast.error('ZIP code must be 6 digits');
      return false;
    }
    return true;
  };

  const handlePlaceOrder = async () => {
    if (!validateForm()) return;

    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    // Convert cart items to order items format
    const orderItems = items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }));

    const orderData = {
      items: orderItems,
      deliveryAddress,
      paymentMethod,
      notes,
      discountCodeId: appliedDiscountCode?._id, // Pass discount code if applied
    };

    try {
      setLoading(true);
      const response = await orderService.createOrder(orderData);

      if (response.success) {
        const orderId = response.data.order._id;

        if (paymentMethod === 'UPI') {
          // For UPI: Show payment modal (order created with PENDING payment status)
          setPendingOrderId(orderId);
          setShowPaymentModal(true);
          toast('Please complete the payment', {
            icon: '💳',
          });
        } else {
          // For COD: Order is complete
          toast.success('Order placed successfully!');
          clearCart();
          navigate(`/customer/orders`);
        }
      }
    } catch (error: any) {
      console.error('Order creation error:', error);
      toast.error(error.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(productId);
      toast.success('Item removed from cart');
    } else {
      updateQuantity(productId, newQuantity);
    }
  };

  const handleRemoveItem = (productId: string) => {
    removeItem(productId);
    toast.success('Item removed from cart');
  };

  // Step 1: Calculate cart subtotals with product-level discounts applied
  const {
    subtotalBeforeDiscount,
    subtotalAfterProductDiscounts,
    totalProductDiscountSavings,
  } = calculateCartSubtotal(items);

  // Step 2: Calculate tier and code discounts (applied to already-discounted subtotal)
  const tierInfo = discountService.calculateLoyaltyTier(completedOrders);
  const tierDiscountPercentage = tierInfo.discountPercentage;
  const codeDiscountPercentage = appliedDiscountCode
    ? appliedDiscountCode.type === 'PERCENTAGE'
      ? appliedDiscountCode.value
      : 0
    : 0;

  // Step 3: Apply best of tier/code discount to already-discounted subtotal
  const {
    finalTotal: totalBeforeTax,
    tierDiscount,
    codeDiscount,
    appliedDiscountType,
    appliedDiscountPercentage,
  } = calculateFinalTotal(subtotalAfterProductDiscounts, tierDiscountPercentage, codeDiscountPercentage);

  const discountType = appliedDiscountType;
  const tierCodeDiscountAmount = appliedDiscountType === 'TIER' ? tierDiscount : appliedDiscountType === 'CODE' ? codeDiscount : 0;

  // Step 4: Calculate tax and final total
  const taxRate = 0.08;
  const tax = totalBeforeTax * taxRate;
  const deliveryFee = 0;
  const total = totalBeforeTax + tax + deliveryFee;

  // Total savings
  const totalSavings = totalProductDiscountSavings + tierCodeDiscountAmount;

  if (formLoading) {
    return (
      <CustomerLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">Loading cart...</p>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Shopping Cart</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {items.length} {items.length === 1 ? 'item' : 'items'} in your cart
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.length > 0 ? (
            <>
              {/* Cart Items List */}
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
                >
                  <div className="flex gap-6">
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      {item.product?.images?.[0] ? (
                        <img
                          src={item.product.images[0]}
                          alt={item.product.name}
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                          <svg
                            className="w-12 h-12 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        {item.product?.name || 'Unknown Product'}
                      </h3>

                      {(() => {
                        const discountInfo = getProductDiscount(item.product);
                        return discountInfo.hasDiscount ? (
                          <div className="mb-2">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                                ₹{discountInfo.discountedPrice.toFixed(2)}
                              </span>
                              <span className="text-xs text-gray-400 dark:text-gray-500 line-through">
                                ₹{discountInfo.originalPrice.toFixed(2)}
                              </span>
                              <span className="text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-0.5 rounded-full font-bold">
                                {discountInfo.discountPercentage}% OFF
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              per {item.product?.unit || 'unit'}
                              {discountInfo.reason && ` • ${discountInfo.reason}`}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            ₹{item.product?.basePrice?.toFixed(2) || '0.00'} per {item.product?.unit || 'unit'}
                          </p>
                        );
                      })()}

                      <div className="flex items-center justify-between">
                        {/* Quantity Controls */}
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                            className="w-8 h-8 rounded-lg border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:border-green-600 dark:hover:border-green-500 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                          </button>
                          <span className="text-lg font-semibold text-gray-900 dark:text-white w-8 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                            className="w-8 h-8 rounded-lg border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:border-green-600 dark:hover:border-green-500 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>

                        {/* Price and Remove */}
                        <div className="flex items-center space-x-4">
                          {(() => {
                            const discountInfo = getProductDiscount(item.product);
                            const itemTotal = discountInfo.discountedPrice * item.quantity;
                            const originalItemTotal = discountInfo.originalPrice * item.quantity;

                            return discountInfo.hasDiscount ? (
                              <div className="text-right">
                                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                                  ₹{itemTotal.toFixed(2)}
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 line-through">
                                  ₹{originalItemTotal.toFixed(2)}
                                </p>
                              </div>
                            ) : (
                              <p className="text-xl font-bold text-green-600 dark:text-green-400">
                                ₹{((item.product?.basePrice || 0) * item.quantity).toFixed(2)}
                              </p>
                            );
                          })()}
                          <button
                            onClick={() => handleRemoveItem(item.productId)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                            title="Remove item"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Delivery Address */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mt-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Delivery Address
                  {loadingAddress && (
                    <span className="ml-auto text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                      Auto-filling...
                    </span>
                  )}
                </h2>

                <div className="space-y-4">
                  <input
                    type="text"
                    name="street"
                    value={deliveryAddress.street}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Street Address *"
                    required
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      name="city"
                      value={deliveryAddress.city}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="City *"
                      required
                    />
                    <input
                      type="text"
                      name="state"
                      value={deliveryAddress.state}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="State *"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      name="zipCode"
                      value={deliveryAddress.zipCode}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="ZIP Code *"
                      maxLength={6}
                      required
                    />
                    <input
                      type="text"
                      name="country"
                      value={deliveryAddress.country}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-900 dark:text-gray-400"
                      disabled
                    />
                  </div>

                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    rows={2}
                    placeholder="Delivery notes (optional)"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Payment Method
                </h2>
                <div className="space-y-3">
                  <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    paymentMethod === 'COD' ? 'border-green-600 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-green-500'
                  }`}>
                    <input
                      type="radio"
                      name="payment"
                      value="COD"
                      checked={paymentMethod === 'COD'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="h-4 w-4 text-green-600"
                    />
                    <div className="ml-3 flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">Cash on Delivery</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Pay when you receive</div>
                    </div>
                  </label>
                  <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    paymentMethod === 'UPI' ? 'border-green-600 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-green-500'
                  }`}>
                    <input
                      type="radio"
                      name="payment"
                      value="UPI"
                      checked={paymentMethod === 'UPI'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="h-4 w-4 text-green-600"
                    />
                    <div className="ml-3 flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">UPI Payment</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">PhonePe, GooglePay, Paytm</div>
                    </div>
                  </label>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
              <svg className="w-24 h-24 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">Your cart is empty</p>
              <button
                onClick={() => navigate('/customer/browse')}
                className="bg-gray-900 dark:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-green-700 transition-colors"
              >
                Start Shopping
              </button>
            </div>
          )}
        </div>

        {/* Right Column - Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow sticky top-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Order Summary</h2>

            {/* Loyalty Tier Badge */}
            {tierInfo.discountPercentage > 0 && (
              <div className="mb-4">
                <LoyaltyTierBadge tier={loyaltyTier} completedOrders={completedOrders} showProgress={false} />
              </div>
            )}

            {/* Discount Code Input */}
            <div className="mb-6">
              <DiscountCodeInput
                cartTotal={subtotalAfterProductDiscounts}
                onCodeApplied={setAppliedDiscountCode}
                appliedCode={appliedDiscountCode}
              />
            </div>

            {/* Price Breakdown */}
            <div className="space-y-3 mb-6">
              {/* Original Subtotal (if product discounts exist) */}
              {totalProductDiscountSavings > 0 && (
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Subtotal ({items.length} {items.length === 1 ? 'item' : 'items'})</span>
                  <span className="font-medium text-gray-400 dark:text-gray-500 line-through">₹{subtotalBeforeDiscount.toFixed(2)}</span>
                </div>
              )}

              {/* Product-level discount savings */}
              {totalProductDiscountSavings > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-green-600 dark:text-green-400">Product Discounts</span>
                  </div>
                  <span className="text-green-600 dark:text-green-400 font-semibold">
                    -₹{totalProductDiscountSavings.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Subtotal after product discounts */}
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>{totalProductDiscountSavings > 0 ? 'Discounted Subtotal' : `Subtotal (${items.length} ${items.length === 1 ? 'item' : 'items'})`}</span>
                <span className="font-semibold text-gray-900 dark:text-white">₹{subtotalAfterProductDiscounts.toFixed(2)}</span>
              </div>

              {/* Loyalty Tier Discount */}
              {tierDiscountPercentage > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <span className={discountService.getTierDisplayInfo(loyaltyTier).color}>
                      {discountService.getTierDisplayInfo(loyaltyTier).icon}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {discountService.getTierDisplayInfo(loyaltyTier).label} Tier ({tierDiscountPercentage}%)
                    </span>
                    {discountType !== 'TIER' && (
                      <span className="text-xs text-gray-500">(not applied)</span>
                    )}
                  </div>
                  <span className={discountType === 'TIER' ? 'text-green-600 font-semibold' : 'text-gray-500 line-through'}>
                    -₹{tierDiscount.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Code Discount */}
              {appliedDiscountCode && codeDiscountPercentage > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span className="text-gray-600 dark:text-gray-400">
                      {appliedDiscountCode.code} ({codeDiscountPercentage}%)
                    </span>
                    {discountType !== 'CODE' && (
                      <span className="text-xs text-gray-500">(not applied)</span>
                    )}
                  </div>
                  <span className={discountType === 'CODE' ? 'text-green-600 font-semibold' : 'text-gray-500 line-through'}>
                    -₹{codeDiscount.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Best Discount Info */}
              {tierCodeDiscountAmount > 0 && discountType !== 'NONE' && (
                <div className="flex items-start gap-2 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-2 rounded">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    {discountType === 'TIER'
                      ? `Your ${discountService.getTierDisplayInfo(loyaltyTier).label} tier gives you a better discount!`
                      : `Code "${appliedDiscountCode?.code}" saves you more!`
                    }
                  </span>
                </div>
              )}

              {/* Total Additional Discount (tier/code) */}
              {tierCodeDiscountAmount > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400 font-semibold pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span>Additional Discount ({discountType})</span>
                  <span>-₹{tierCodeDiscountAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Tax (8%)</span>
                <span className="font-semibold text-gray-900 dark:text-white">₹{tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Delivery Fee</span>
                <span className="font-semibold text-green-600 dark:text-green-400">FREE</span>
              </div>
              <div className="pt-3 border-t-2 border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">Total</span>
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">₹{total.toFixed(2)}</span>
                </div>
              </div>

              {/* Savings Message */}
              {totalSavings > 0 && (
                <div className="text-center text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 py-2 rounded-lg">
                  🎉 You're saving ₹{totalSavings.toFixed(2)} on this order!
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handlePlaceOrder}
                disabled={loading || items.length === 0}
                className="w-full bg-gray-900 dark:bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Placing Order...
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Place Order
                  </>
                )}
              </button>

              <button
                onClick={() => navigate('/customer/browse')}
                className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white py-3 px-4 rounded-lg font-semibold border-2 border-gray-300 dark:border-gray-600 hover:border-green-600 dark:hover:border-green-500 transition-colors"
              >
                Continue Shopping
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
              By placing your order, you agree to our terms and conditions
            </p>
          </div>
        </div>
      </div>

      {/* UPI Payment Modal */}
      {showPaymentModal && pendingOrderId && (
        <UPIPaymentModal
          orderId={pendingOrderId}
          orderAmount={total}
          onSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
        />
      )}
    </CustomerLayout>
  );
};

export default Checkout;
