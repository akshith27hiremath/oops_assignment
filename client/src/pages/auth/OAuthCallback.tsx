/**
 * OAuth Callback Page
 * Handles OAuth redirect, extracts tokens, and redirects to dashboard
 */

import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { User, UserType } from '../../types/auth.types';

const OAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleOAuthCallback = () => {
      try {
        // Extract parameters from URL
        const userParam = searchParams.get('user');
        const accessToken = searchParams.get('accessToken');
        const refreshToken = searchParams.get('refreshToken');
        const error = searchParams.get('error');

        // Handle error
        if (error) {
          toast.error('Authentication failed. Please try again.');
          navigate('/login');
          return;
        }

        // Validate required parameters
        if (!userParam || !accessToken || !refreshToken) {
          toast.error('Invalid authentication response');
          navigate('/login');
          return;
        }

        // Parse user object
        const user: User = JSON.parse(decodeURIComponent(userParam));

        // Save to localStorage
        localStorage.setItem('accessToken', decodeURIComponent(accessToken));
        localStorage.setItem('refreshToken', decodeURIComponent(refreshToken));
        localStorage.setItem('user', JSON.stringify(user));

        toast.success('Successfully authenticated!');

        // Redirect based on user type
        const redirectPath = user.userType === UserType.CUSTOMER
          ? '/customer/dashboard'
          : user.userType === UserType.RETAILER
          ? '/retailer/dashboard'
          : '/wholesaler/dashboard';

        navigate(redirectPath, { replace: true });
      } catch (error) {
        console.error('OAuth callback error:', error);
        toast.error('Authentication failed. Please try again.');
        navigate('/login');
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
};

export default OAuthCallback;
