/**
 * OTP Verification Component
 * 6-digit OTP input with countdown timer and resend functionality
 */

import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

interface OTPVerificationProps {
  identifier: string; // phone or email
  method: 'sms' | 'email';
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  expirySeconds?: number;
}

const OTPVerification: React.FC<OTPVerificationProps> = ({
  identifier,
  method,
  onVerify,
  onResend,
  expirySeconds = 600, // 10 minutes default
}) => {
  const [otp, setOtp] = useState<string[]>(new Array(6).fill(''));
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(expirySeconds);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move to next input if value entered
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are entered
    if (value && index === 5 && newOtp.every((digit) => digit !== '')) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Move to previous input on backspace if current is empty
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);

    // Only allow digits
    if (!/^\d+$/.test(pastedData)) {
      toast.error('Please paste only numbers');
      return;
    }

    const newOtp = pastedData.split('').concat(new Array(6 - pastedData.length).fill(''));
    setOtp(newOtp);

    // Focus last filled input or first empty
    const focusIndex = Math.min(pastedData.length, 5);
    inputRefs.current[focusIndex]?.focus();

    // Auto-submit if 6 digits pasted
    if (pastedData.length === 6) {
      handleVerify(pastedData);
    }
  };

  const handleVerify = async (otpCode: string) => {
    setIsVerifying(true);
    try {
      await onVerify(otpCode);
    } catch (error) {
      // Error handling done by parent
      // Reset OTP on error
      setOtp(new Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendClick = async () => {
    if (!canResend || isResending) return;

    setIsResending(true);
    try {
      await onResend();
      // Reset timer
      setTimeLeft(expirySeconds);
      setCanResend(false);
      // Clear OTP
      setOtp(new Array(6).fill(''));
      inputRefs.current[0]?.focus();
      toast.success('OTP resent successfully');
    } catch (error) {
      // Error handling done by parent
    } finally {
      setIsResending(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const maskIdentifier = (identifier: string, method: 'sms' | 'email'): string => {
    if (method === 'email') {
      const [local, domain] = identifier.split('@');
      if (local.length <= 2) return identifier;
      return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
    } else {
      // Phone masking
      if (identifier.length < 4) return identifier;
      return identifier.slice(0, -4).replace(/\d/g, '*') + identifier.slice(-4);
    }
  };

  const getIcon = () => {
    if (method === 'email') {
      return (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      );
    }
    return (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    );
  };

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {getIcon()}
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Verify Your {method === 'email' ? 'Email' : 'Phone'}
        </h2>
        <p className="text-gray-600">
          We've sent a 6-digit code to <br />
          <span className="font-semibold text-gray-900">{maskIdentifier(identifier, method)}</span>
        </p>
      </div>

      {/* OTP Input */}
      <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            disabled={isVerifying}
            className={`w-12 h-12 text-center text-xl font-semibold border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
              digit
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 bg-white'
            } ${isVerifying ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
        ))}
      </div>

      {/* Timer and Resend */}
      <div className="text-center mb-6">
        {timeLeft > 0 ? (
          <p className="text-sm text-gray-600">
            Code expires in{' '}
            <span className="font-semibold text-blue-600">{formatTime(timeLeft)}</span>
          </p>
        ) : (
          <p className="text-sm text-red-600 font-semibold">Code expired</p>
        )}
      </div>

      {/* Resend Button */}
      <button
        onClick={handleResendClick}
        disabled={!canResend || isResending}
        className={`w-full py-2 px-4 rounded-lg font-medium transition ${
          canResend && !isResending
            ? 'bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
      >
        {isResending ? 'Resending...' : "Didn't receive code? Resend"}
      </button>

      {/* Verify Button (Manual) */}
      <button
        onClick={() => handleVerify(otp.join(''))}
        disabled={otp.some((digit) => digit === '') || isVerifying}
        className={`w-full mt-4 py-3 px-4 rounded-lg font-semibold transition ${
          otp.every((digit) => digit !== '') && !isVerifying
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        {isVerifying ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Verifying...
          </span>
        ) : (
          'Verify OTP'
        )}
      </button>

      {/* Help Text */}
      <p className="text-xs text-center text-gray-500 mt-4">
        Having trouble? Make sure you have a stable internet connection and try again.
      </p>
    </div>
  );
};

export default OTPVerification;
