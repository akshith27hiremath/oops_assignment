/**
 * UPI Payment Modal Component
 * Razorpay-powered payment interface
 */

import React, { useEffect } from 'react';
import { UPITransaction } from '../../services/payment.service';
import { useRazorpay } from '../../hooks/useRazorpay';
import authService from '../../services/auth.service';
import paymentService from '../../services/payment.service';

interface UPIPaymentModalProps {
  orderId: string;
  orderAmount: number;
  onSuccess: (transaction: UPITransaction) => void;
  onCancel: () => void;
}

const UPIPaymentModal: React.FC<UPIPaymentModalProps> = ({
  orderId,
  orderAmount,
  onSuccess,
  onCancel,
}) => {
  const { initiatePayment, isProcessing } = useRazorpay({
    onSuccess: (data) => {
      onSuccess(data.transaction);
    },
    onFailure: (error) => {
      onCancel();
    },
  });

  // Auto-open Razorpay checkout when modal opens
  // Use ref to prevent double execution in React StrictMode
  const hasInitiated = React.useRef(false);

  useEffect(() => {
    if (!hasInitiated.current) {
      hasInitiated.current = true;
      handlePayment();
    }
  }, []);

  const handlePayment = async () => {
    try {
      // Get user details for prefill
      const userResponse = await authService.getCurrentUser();
      const user = userResponse.data.user;

      await initiatePayment({
        orderId,
        amount: orderAmount,
        customerEmail: user.email,
        customerContact: user.phone || '',
        name: 'LiveMART',
        description: `Order Payment`,
      });
    } catch (error) {
      console.error('Payment error:', error);
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-xl max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-6 rounded-t-xl">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">Processing Payment</h2>
              <p className="text-green-100">Please complete your payment</p>
            </div>
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition disabled:opacity-50"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Amount Display */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Order Amount</span>
              <span className="text-2xl font-bold text-gray-900">
                {paymentService.formatAmount(orderAmount)}
              </span>
            </div>
          </div>

          {/* Processing State */}
          <div className="space-y-4">
            {/* Loading Indicator */}
            <div className="flex flex-col items-center py-8">
              <svg className="animate-spin h-12 w-12 text-green-600 mb-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-lg font-semibold text-gray-900 mb-2">Opening Payment Gateway...</p>
              <p className="text-sm text-gray-600 text-center">
                Razorpay payment window will open shortly
              </p>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-900">Payment Instructions</p>
                  <ul className="text-xs text-blue-700 mt-2 space-y-1">
                    <li>1. Complete payment in the Razorpay window</li>
                    <li>2. You can pay via UPI, Card, Netbanking, or Wallet</li>
                    <li>3. Your order will be confirmed automatically</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Test Mode Notice */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start">
                <svg className="h-4 w-4 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-xs font-medium text-yellow-900">Test Mode</p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Use test UPI: <strong>success@razorpay</strong> or test card <strong>4111 1111 1111 1111</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Cancel Button */}
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="w-full px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel Payment
            </button>
          </div>

          {/* Security Note */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center text-xs text-gray-500">
              <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Secured by Razorpay with 256-bit encryption</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UPIPaymentModal;
