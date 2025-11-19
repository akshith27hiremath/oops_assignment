/**
 * Protected Route Component
 * Handles authentication and role-based access control
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import authService from '../services/auth.service';
import { UserType } from '../types/auth.types';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: UserType[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const isAuthenticated = authService.isAuthenticated();
  const user = authService.getStoredUser();

  // Check if user is authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has required role
  if (allowedRoles && !allowedRoles.includes(user.userType)) {
    // Redirect to their own dashboard
    const redirectPath = user.userType === UserType.CUSTOMER
      ? '/customer/dashboard'
      : user.userType === UserType.RETAILER
      ? '/retailer/dashboard'
      : '/wholesaler/dashboard';

    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

export default ProtectedRoute;
