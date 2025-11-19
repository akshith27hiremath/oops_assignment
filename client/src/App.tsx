/**
 * Main App Component
 * Handles routing and authentication
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute';
import { UserType } from './types/auth.types';
import { DarkModeProvider } from './contexts/DarkModeContext';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import OAuthCallback from './pages/auth/OAuthCallback';

// Customer Pages
import CustomerDashboard from './pages/customer/Dashboard';
import ProductBrowse from './pages/customer/ProductBrowse';
import Wishlist from './pages/customer/Wishlist';
import OrderHistory from './pages/customer/OrderHistory';
import NearbyStores from './pages/customer/NearbyStores';
import Checkout from './pages/customer/Checkout';
import MyReviews from './pages/customer/MyReviews';
import TransactionHistory from './pages/customer/TransactionHistory';
import CustomerAnalytics from './pages/customer/Analytics';
import CustomerProfile from './pages/customer/Profile';
import RecipeBrowse from './pages/customer/RecipeBrowse';
import RecipeDetail from './pages/customer/RecipeDetail';

// Retailer Pages
import RetailerDashboard from './pages/retailer/Dashboard';
import InventoryManagement from './pages/retailer/InventoryManagement';
import SalesAnalytics from './pages/retailer/SalesAnalytics';
import CustomerHistory from './pages/retailer/CustomerHistory';
import B2BMarketplace from './pages/retailer/B2BMarketplace';
import B2BCheckout from './pages/retailer/B2BCheckout';
import B2BOrderHistory from './pages/retailer/B2BOrderHistory';
import B2BOrderDetails from './pages/retailer/B2BOrderDetails';
import OrderManagement from './pages/retailer/OrderManagement';
import ProductReviews from './pages/retailer/ProductReviews';
import RetailerProfile from './pages/retailer/Profile';

// Wholesaler Pages
import WholesalerDashboard from './pages/wholesaler/Dashboard';
import RetailerNetwork from './pages/wholesaler/RetailerNetwork';
import BulkOrders from './pages/wholesaler/BulkOrders';
import WholesalerB2BOrderDetails from './pages/wholesaler/B2BOrderDetails';
import WholesalerAnalytics from './pages/wholesaler/Analytics';
import WholesalerInventoryManagement from './pages/wholesaler/InventoryManagement';
import WholesalerProfile from './pages/wholesaler/Profile';

function App() {
  return (
    <DarkModeProvider>
      <BrowserRouter>
        <Toaster position="top-right" />

        <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/callback" element={<OAuthCallback />} />

        {/* Customer Routes - Protected */}
        <Route
          path="/customer/dashboard"
          element={
            <ProtectedRoute allowedRoles={[UserType.CUSTOMER]}>
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/browse"
          element={
            <ProtectedRoute allowedRoles={[UserType.CUSTOMER]}>
              <ProductBrowse />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/wishlist"
          element={
            <ProtectedRoute allowedRoles={[UserType.CUSTOMER]}>
              <Wishlist />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/orders"
          element={
            <ProtectedRoute allowedRoles={[UserType.CUSTOMER]}>
              <OrderHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/nearby-stores"
          element={
            <ProtectedRoute allowedRoles={[UserType.CUSTOMER]}>
              <NearbyStores />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/checkout"
          element={
            <ProtectedRoute allowedRoles={[UserType.CUSTOMER]}>
              <Checkout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/my-reviews"
          element={
            <ProtectedRoute allowedRoles={[UserType.CUSTOMER]}>
              <MyReviews />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/transactions"
          element={
            <ProtectedRoute allowedRoles={[UserType.CUSTOMER]}>
              <TransactionHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/analytics"
          element={
            <ProtectedRoute allowedRoles={[UserType.CUSTOMER]}>
              <CustomerAnalytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/profile"
          element={
            <ProtectedRoute allowedRoles={[UserType.CUSTOMER]}>
              <CustomerProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/recipes"
          element={
            <ProtectedRoute allowedRoles={[UserType.CUSTOMER]}>
              <RecipeBrowse />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer/recipes/:recipeId"
          element={
            <ProtectedRoute allowedRoles={[UserType.CUSTOMER]}>
              <RecipeDetail />
            </ProtectedRoute>
          }
        />

        {/* Retailer Routes - Protected */}
        <Route
          path="/retailer/dashboard"
          element={
            <ProtectedRoute allowedRoles={[UserType.RETAILER]}>
              <RetailerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/retailer/inventory"
          element={
            <ProtectedRoute allowedRoles={[UserType.RETAILER]}>
              <InventoryManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/retailer/b2b-marketplace"
          element={
            <ProtectedRoute allowedRoles={[UserType.RETAILER]}>
              <B2BMarketplace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/retailer/b2b-checkout"
          element={
            <ProtectedRoute allowedRoles={[UserType.RETAILER]}>
              <B2BCheckout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/retailer/b2b-orders"
          element={
            <ProtectedRoute allowedRoles={[UserType.RETAILER]}>
              <B2BOrderHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/retailer/b2b-orders/:orderId"
          element={
            <ProtectedRoute allowedRoles={[UserType.RETAILER]}>
              <B2BOrderDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/retailer/analytics"
          element={
            <ProtectedRoute allowedRoles={[UserType.RETAILER]}>
              <SalesAnalytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/retailer/customers"
          element={
            <ProtectedRoute allowedRoles={[UserType.RETAILER]}>
              <CustomerHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/retailer/orders"
          element={
            <ProtectedRoute allowedRoles={[UserType.RETAILER]}>
              <OrderManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/retailer/reviews"
          element={
            <ProtectedRoute allowedRoles={[UserType.RETAILER]}>
              <ProductReviews />
            </ProtectedRoute>
          }
        />
        <Route
          path="/retailer/profile"
          element={
            <ProtectedRoute allowedRoles={[UserType.RETAILER]}>
              <RetailerProfile />
            </ProtectedRoute>
          }
        />

        {/* Wholesaler Routes - Protected */}
        <Route
          path="/wholesaler/dashboard"
          element={
            <ProtectedRoute allowedRoles={[UserType.WHOLESALER]}>
              <WholesalerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wholesaler/inventory"
          element={
            <ProtectedRoute allowedRoles={[UserType.WHOLESALER]}>
              <WholesalerInventoryManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wholesaler/retailers"
          element={
            <ProtectedRoute allowedRoles={[UserType.WHOLESALER]}>
              <RetailerNetwork />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wholesaler/bulk-orders"
          element={
            <ProtectedRoute allowedRoles={[UserType.WHOLESALER]}>
              <BulkOrders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wholesaler/b2b-orders/:orderId"
          element={
            <ProtectedRoute allowedRoles={[UserType.WHOLESALER]}>
              <WholesalerB2BOrderDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wholesaler/analytics"
          element={
            <ProtectedRoute allowedRoles={[UserType.WHOLESALER]}>
              <WholesalerAnalytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wholesaler/profile"
          element={
            <ProtectedRoute allowedRoles={[UserType.WHOLESALER]}>
              <WholesalerProfile />
            </ProtectedRoute>
          }
        />

        {/* Default Route */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </DarkModeProvider>
  );
}

export default App;
