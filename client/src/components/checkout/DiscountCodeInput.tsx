/**
 * Discount Code Input Component
 * Allows users to enter and apply discount codes at checkout
 */

import React, { useState } from 'react';
import { DiscountCode } from '../../types/discount.types';
import discountService from '../../services/discount.service';
import toast from 'react-hot-toast';

interface DiscountCodeInputProps {
  cartTotal: number;
  onCodeApplied: (code: DiscountCode | null) => void;
  appliedCode: DiscountCode | null;
}

const DiscountCodeInput: React.FC<DiscountCodeInputProps> = ({
  cartTotal,
  onCodeApplied,
  appliedCode,
}) => {
  const [codeInput, setCodeInput] = useState('');
  const [validating, setValidating] = useState(false);
  const [availableCodes, setAvailableCodes] = useState<DiscountCode[]>([]);
  const [showAvailableCodes, setShowAvailableCodes] = useState(false);

  // Load available codes
  const loadAvailableCodes = async () => {
    try {
      const result = await discountService.getMyDiscountCodes(cartTotal);
      if (result.success) {
        setAvailableCodes(result.data.codes);
        setShowAvailableCodes(true);
      }
    } catch (error) {
      console.error('Failed to load discount codes:', error);
    }
  };

  const handleApplyCode = async () => {
    if (!codeInput.trim()) {
      toast.error('Please enter a discount code');
      return;
    }

    setValidating(true);

    try {
      const result = await discountService.validateDiscountCode(codeInput.trim(), cartTotal);

      if (result.success && result.data) {
        toast.success(`Code applied! You save ₹${result.data.discount.toFixed(2)}`);
        onCodeApplied(result.data.code);
        setCodeInput('');
      } else {
        toast.error(result.message || 'Invalid discount code');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to apply discount code');
    } finally {
      setValidating(false);
    }
  };

  const handleRemoveCode = () => {
    onCodeApplied(null);
    toast.success('Discount code removed');
  };

  const handleSelectCode = (code: DiscountCode) => {
    setCodeInput(code.code);
    setShowAvailableCodes(false);
  };

  return (
    <div className="space-y-3">
      {/* Applied Code Display */}
      {appliedCode && (
        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <div className="font-semibold text-green-700 dark:text-green-400">{appliedCode.code}</div>
              <div className="text-xs text-green-600 dark:text-green-500">{appliedCode.description}</div>
            </div>
          </div>
          <button
            onClick={handleRemoveCode}
            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
            title="Remove code"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Code Input */}
      {!appliedCode && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyCode()}
              placeholder="Enter discount code"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white uppercase"
              disabled={validating}
            />
            <button
              onClick={handleApplyCode}
              disabled={validating || !codeInput.trim()}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {validating ? 'Validating...' : 'Apply'}
            </button>
          </div>

          {/* Show Available Codes Button */}
          <button
            onClick={() => {
              if (showAvailableCodes) {
                setShowAvailableCodes(false);
              } else {
                loadAvailableCodes();
              }
            }}
            className="text-sm text-green-600 dark:text-green-400 hover:underline"
          >
            {showAvailableCodes ? 'Hide available codes' : 'View available discount codes'}
          </button>

          {/* Available Codes List */}
          {showAvailableCodes && (
            <div className="space-y-2 mt-3">
              {availableCodes.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  No discount codes available at this time
                </div>
              ) : (
                availableCodes.map((code) => {
                  const discount = discountService.calculateDiscountPreview(code, cartTotal);
                  const canUse = cartTotal >= code.minPurchaseAmount;

                  return (
                    <button
                      key={code._id}
                      onClick={() => canUse && handleSelectCode(code)}
                      disabled={!canUse}
                      className={`w-full text-left p-3 border rounded-lg transition-all ${
                        canUse
                          ? 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 cursor-pointer'
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-green-700 dark:text-green-400">{code.code}</span>
                            <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded-full">
                              {discountService.formatDiscountValue(code)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{code.description}</div>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-500">
                            <span>{discountService.formatExpiry(code.validUntil)}</span>
                            {code.minPurchaseAmount > 0 && (
                              <span>Min: ₹{code.minPurchaseAmount.toFixed(2)}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {canUse ? (
                            <div className="text-lg font-bold text-green-600 dark:text-green-400">
                              -₹{discount.toFixed(2)}
                            </div>
                          ) : (
                            <div className="text-xs text-red-600 dark:text-red-400">
                              Add ₹{(code.minPurchaseAmount - cartTotal).toFixed(2)} more
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DiscountCodeInput;
