/**
 * Register Page
 * User registration with role selection
 */

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { registerSchema, RegisterFormData } from '../../utils/validation';
import { UserType } from '../../types/auth.types';
import authService from '../../services/auth.service';
import geolocationService from '../../services/geolocation.service';
import AddressAutocomplete from '../../components/maps/AddressAutocomplete';
import OTPVerification from '../../components/auth/OTPVerification';
import DarkModeToggle from '../../components/DarkModeToggle';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [registrationData, setRegistrationData] = useState<RegisterFormData | null>(null);
  const [otpExpirySeconds, setOtpExpirySeconds] = useState(600);
  const [otpMethod, setOtpMethod] = useState<'sms' | 'email'>('sms');
  const [otpIdentifier, setOtpIdentifier] = useState<string>('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      userType: UserType.CUSTOMER,
    },
  });

  const selectedUserType = watch('userType');
  const isBusinessUser = selectedUserType === UserType.RETAILER || selectedUserType === UserType.WHOLESALER;
  const needsLocation = selectedUserType === UserType.CUSTOMER || selectedUserType === UserType.RETAILER;
  const currentLocation = watch('profile.location');

  // Auto-detect location on mount for users who need it
  useEffect(() => {
    if (needsLocation && !locationDetected) {
      detectLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsLocation]);

  const detectLocation = async () => {
    try {
      setIsDetectingLocation(true);
      const location = await geolocationService.getCurrentPosition();
      setValue('profile.location.latitude', location.latitude);
      setValue('profile.location.longitude', location.longitude);
      setLocationDetected(true);
      setSelectedAddress('Current GPS Location');
      toast.success('Location detected successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to detect location. Please search for your address.');
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleAddressSelect = (address: string, lat: number, lng: number) => {
    setValue('profile.location.latitude', lat);
    setValue('profile.location.longitude', lng);
    setSelectedAddress(address);
    setLocationDetected(true);
    toast.success('Address selected!');
  };

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setIsLoading(true);

      console.log('🔍 Registration data being sent:', data);
      console.log('🔍 Profile location:', data.profile.location);
      console.log('🔍 OTP Method selected:', otpMethod);

      // Add OTP method to registration data for customers
      const registrationData: any = selectedUserType === UserType.CUSTOMER
        ? { ...data, otpMethod: otpMethod }
        : { ...data };

      console.log('🔍 Full registration data with OTP method:', registrationData);
      console.log('🔍 otpMethod field value:', registrationData.otpMethod);

      const response = await authService.register(registrationData);

      if (response.success) {
        // Check if OTP is required (for customers)
        if (response.requiresOTP) {
          // Store registration data and determine identifier
          setRegistrationData(data);
          const identifier = otpMethod === 'sms' ? data.profile.phone : data.email;
          setOtpIdentifier(identifier);
          setShowOTPModal(true);
          toast.success(`OTP sent to your ${otpMethod === 'sms' ? 'phone' : 'email'}`);
        } else {
          // Direct registration success (for retailers/wholesalers)
          toast.success(response.message || 'Registration successful!');

          // Save tokens and redirect to dashboard
          if (response.data.tokens) {
            localStorage.setItem('accessToken', response.data.tokens.accessToken);
            localStorage.setItem('refreshToken', response.data.tokens.refreshToken);
            localStorage.setItem('user', JSON.stringify(response.data.user));

            // Redirect based on user type
            const redirectPath = response.data.user.userType === UserType.CUSTOMER
              ? '/customer/dashboard'
              : response.data.user.userType === UserType.RETAILER
              ? '/retailer/dashboard'
              : '/wholesaler/dashboard';

            navigate(redirectPath);
          }
        }
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPVerify = async (otpCode: string) => {
    if (!registrationData) return;

    try {
      const response = await authService.completeRegistration({
        ...registrationData,
        otpCode,
      });

      if (response.success) {
        toast.success('Phone verified! Registration complete');
        setShowOTPModal(false);

        // Redirect to dashboard
        navigate('/customer/dashboard');
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'OTP verification failed';
      toast.error(errorMessage);
      throw error; // Re-throw to let OTP component handle it
    }
  };

  const handleOTPResend = async () => {
    if (!otpIdentifier) return;

    try {
      const response = await authService.resendOTP(otpIdentifier, otpMethod);
      if (response.success && response.data?.expiresIn) {
        setOtpExpirySeconds(response.data.expiresIn);
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to resend OTP';
      toast.error(errorMessage);
      throw error;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      {/* Dark Mode Toggle */}
      <div className="absolute top-4 right-4">
        <DarkModeToggle />
      </div>

      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-300">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">
              Sign in
            </Link>
          </p>
        </div>

        {/* Registration Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {/* User Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              I am a
            </label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <input
                  type="radio"
                  id="customer"
                  value={UserType.CUSTOMER}
                  {...register('userType')}
                  className="sr-only peer"
                />
                <label
                  htmlFor="customer"
                  className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md cursor-pointer peer-checked:border-indigo-600 peer-checked:bg-indigo-50 hover:border-gray-400"
                >
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Customer</span>
                </label>
              </div>

              <div>
                <input
                  type="radio"
                  id="retailer"
                  value={UserType.RETAILER}
                  {...register('userType')}
                  className="sr-only peer"
                />
                <label
                  htmlFor="retailer"
                  className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md cursor-pointer peer-checked:border-indigo-600 peer-checked:bg-indigo-50 hover:border-gray-400"
                >
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Retailer</span>
                </label>
              </div>

              <div>
                <input
                  type="radio"
                  id="wholesaler"
                  value={UserType.WHOLESALER}
                  {...register('userType')}
                  className="sr-only peer"
                />
                <label
                  htmlFor="wholesaler"
                  className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md cursor-pointer peer-checked:border-indigo-600 peer-checked:bg-indigo-50 hover:border-gray-400"
                >
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Wholesaler</span>
                </label>
              </div>
            </div>
            {errors.userType && (
              <p className="mt-1 text-sm text-red-600">{errors.userType.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              {...register('profile.name')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            {errors.profile?.name && (
              <p className="mt-1 text-sm text-red-600">{errors.profile.name.message}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              {...register('profile.phone')}
              placeholder="10-digit phone number"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            {errors.profile?.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.profile.phone.message}</p>
            )}
          </div>

          {/* OTP Method Selection (for customers only) */}
          {selectedUserType === UserType.CUSTOMER && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-md">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
                Verification Method
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    type="radio"
                    id="otp-sms"
                    name="otpMethod"
                    value="sms"
                    checked={otpMethod === 'sms'}
                    onChange={() => setOtpMethod('sms')}
                    className="sr-only peer"
                  />
                  <label
                    htmlFor="otp-sms"
                    className="flex flex-col items-center justify-center px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer peer-checked:border-indigo-600 peer-checked:bg-white dark:peer-checked:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500 transition"
                  >
                    <svg className="w-6 h-6 mb-2 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">SMS</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">To your phone</span>
                  </label>
                </div>
                <div>
                  <input
                    type="radio"
                    id="otp-email"
                    name="otpMethod"
                    value="email"
                    checked={otpMethod === 'email'}
                    onChange={() => setOtpMethod('email')}
                    className="sr-only peer"
                  />
                  <label
                    htmlFor="otp-email"
                    className="flex flex-col items-center justify-center px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer peer-checked:border-indigo-600 peer-checked:bg-white dark:peer-checked:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500 transition"
                  >
                    <svg className="w-6 h-6 mb-2 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Email</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">To your inbox</span>
                  </label>
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                Choose how you'd like to receive your verification code
              </p>
            </div>
          )}

          {/* Business Fields (conditional) */}
          {isBusinessUser && (
            <>
              <div>
                <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Business Name
                </label>
                <input
                  id="businessName"
                  type="text"
                  {...register('businessName')}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
                {errors.businessName && (
                  <p className="mt-1 text-sm text-red-600">{errors.businessName.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="gstin" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  GSTIN
                </label>
                <input
                  id="gstin"
                  type="text"
                  {...register('gstin')}
                  placeholder="15-character GSTIN"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
                {errors.gstin && (
                  <p className="mt-1 text-sm text-red-600">{errors.gstin.message}</p>
                )}
              </div>
            </>
          )}

          {/* Location Fields (conditional - for customers and retailers) */}
          {needsLocation && (
            <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Your Location {locationDetected && <span className="text-green-600">✓ Set</span>}
                </label>
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={isDetectingLocation}
                  className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  {isDetectingLocation ? 'Detecting...' : 'Use GPS'}
                </button>
              </div>

              <p className="text-xs text-gray-600 dark:text-gray-300">
                We need your location to show you nearby {selectedUserType === UserType.CUSTOMER ? 'stores' : 'customers'}.
                Search for your address below or use GPS.
              </p>

              {/* Address Search */}
              <div>
                <label htmlFor="address-search" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Search Your Address
                </label>
                <AddressAutocomplete
                  onAddressSelect={handleAddressSelect}
                  placeholder="Start typing your address..."
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  defaultValue={selectedAddress}
                />
              </div>

              {/* Hidden inputs for form validation */}
              <input
                type="hidden"
                {...register('profile.location.latitude', { valueAsNumber: true })}
              />
              <input
                type="hidden"
                {...register('profile.location.longitude', { valueAsNumber: true })}
              />

              {/* Display selected location */}
              {selectedAddress && currentLocation?.latitude && currentLocation?.longitude && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                  <p className="text-sm font-medium text-green-800 dark:text-green-400 mb-1">📍 Location Selected:</p>
                  <p className="text-xs text-green-700">{selectedAddress}</p>
                  <p className="text-xs text-green-600 mt-1">
                    Coordinates: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
                  </p>
                </div>
              )}

              {errors.profile?.location && (
                <p className="mt-1 text-sm text-red-600">{errors.profile.location.message}</p>
              )}
            </div>
          )}

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register('password')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...register('confirmPassword')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating account...' : 'Create account'}
            </button>
          </div>
        </form>

        {/* Social Login */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 dark:bg-gray-900 text-gray-500">Or continue with</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <a
              href={`${process.env.REACT_APP_API_URL}/auth/google`}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 hover:bg-gray-50 dark:bg-gray-900"
            >
              <span>Google</span>
            </a>

            <a
              href={`${process.env.REACT_APP_API_URL}/auth/facebook`}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 hover:bg-gray-50 dark:bg-gray-900"
            >
              <span>Facebook</span>
            </a>
          </div>
        </div>
      </div>

      {/* OTP Verification Modal */}
      {showOTPModal && registrationData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 relative">
            <button
              onClick={() => {
                if (window.confirm('Are you sure? You will need to restart registration.')) {
                  setShowOTPModal(false);
                  setRegistrationData(null);
                }
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-gray-300 text-2xl leading-none z-10"
              aria-label="Close"
            >
              ×
            </button>
            <OTPVerification
              identifier={otpIdentifier}
              method={otpMethod}
              onVerify={handleOTPVerify}
              onResend={handleOTPResend}
              expirySeconds={otpExpirySeconds}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;
