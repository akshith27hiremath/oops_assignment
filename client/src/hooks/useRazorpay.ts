/**
 * useRazorpay Hook
 * React hook for Razorpay payment integration
 */

import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import paymentService from '../services/payment.service';

// Extend Window interface for Razorpay
declare global {
  interface Window {
    Razorpay: any;
  }
}

interface UseRazorpayOptions {
  onSuccess?: (paymentData: any) => void;
  onFailure?: (error: any) => void;
}

interface RazorpayOptions {
  orderId: string;
  amount: number;
  currency?: string;
  name?: string;
  description?: string;
  customerEmail?: string;
  customerContact?: string;
}

export const useRazorpay = (options?: UseRazorpayOptions) => {
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Initialize Razorpay payment
   */
  const initiatePayment = useCallback(
    async (paymentOptions: RazorpayOptions) => {
      try {
        setIsProcessing(true);

        // Step 1: Initiate payment on backend
        const initiateResponse = await paymentService.initiatePayment({
          orderId: paymentOptions.orderId,
          gateway: 'RAZORPAY', // Razorpay payment gateway
        });

        if (!initiateResponse.success) {
          throw new Error(initiateResponse.message || 'Failed to initiate payment');
        }

        const { razorpayOrderId, razorpayKeyId, amount, currency } = initiateResponse.data;
        const transactionId = initiateResponse.data.transaction.transactionId;

        // Step 2: Open Razorpay Checkout
        const rzpOptions: any = {
          key: razorpayKeyId || process.env.REACT_APP_RAZORPAY_KEY_ID,
          amount: amount * 100, // Convert to paise
          currency: 'INR',
          name: paymentOptions.name || 'LiveMART',
          description: paymentOptions.description || `Payment for Order #${paymentOptions.orderId}`,
          order_id: razorpayOrderId,
          prefill: {
            name: paymentOptions.name || 'Customer',
            email: paymentOptions.customerEmail || '',
            contact: paymentOptions.customerContact || '9999999999',
          },
          notes: {
            order_id: paymentOptions.orderId,
          },
          theme: {
            color: '#16a34a',
          },
          modal: {
            ondismiss: () => {
              setIsProcessing(false);
              toast.error('Payment cancelled');
            },
          },
          handler: async (response: any) => {
            try {
              // Step 3: Verify payment signature
              const verifyResponse = await paymentService.verifyRazorpayPayment({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                transactionId,
              });

              if (verifyResponse.success) {
                toast.success('Payment successful!');
                if (options?.onSuccess) {
                  options.onSuccess(verifyResponse.data);
                }
              } else {
                throw new Error('Payment verification failed');
              }
            } catch (error: any) {
              toast.error(error.message || 'Payment verification failed');
              if (options?.onFailure) {
                options.onFailure(error);
              }
            } finally {
              setIsProcessing(false);
            }
          },
        };

        // Create Razorpay instance and open
        const rzp = new window.Razorpay(rzpOptions);

        rzp.on('payment.failed', async (response: any) => {
          setIsProcessing(false);
          const errorMessage = response.error?.description || 'Payment failed';

          // Mark transaction as failed on backend
          try {
            await paymentService.markPaymentFailed({
              transactionId,
              errorCode: response.error?.code || 'PAYMENT_FAILED',
              errorDescription: errorMessage,
            });
          } catch (error) {
            console.error('Failed to mark payment as failed:', error);
          }

          toast.error(errorMessage);
          if (options?.onFailure) {
            options.onFailure(response.error);
          }
        });

        rzp.open();
      } catch (error: any) {
        setIsProcessing(false);
        toast.error(error.message || 'Failed to initiate payment');
        if (options?.onFailure) {
          options.onFailure(error);
        }
      }
    },
    [options]
  );

  return {
    initiatePayment,
    isProcessing,
  };
};

export default useRazorpay;
