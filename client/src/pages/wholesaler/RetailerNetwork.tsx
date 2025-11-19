/**
 * Retailer Network Page
 * View and manage retailer relationships
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import b2bOrderService from '../../services/b2bOrder.service';
import toast from 'react-hot-toast';
import DarkModeToggle from '../../components/DarkModeToggle';

interface RetailerData {
  _id: string;
  businessName: string;
  email: string;
  profile: {
    phone: string;
    address?: {
      city?: string;
      state?: string;
    };
  };
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string;
  isActive: boolean;
}

const RetailerNetwork: React.FC = () => {
  const [retailers, setRetailers] = useState<RetailerData[]>([]);
  const [totalRetailers, setTotalRetailers] = useState(0);
  const [activeRetailers, setActiveRetailers] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRetailers();
  }, []);

  const loadRetailers = async () => {
    try {
      setLoading(true);
      const response = await b2bOrderService.getRetailerNetwork();

      if (response.success) {
        setRetailers(response.data.retailers);
        setTotalRetailers(response.data.totalRetailers);
        setActiveRetailers(response.data.activeRetailers);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load retailers');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Retailer Network</h1>
            <div className="flex items-center gap-4">
              <DarkModeToggle />
              <Link to="/wholesaler/dashboard" className="px-4 py-2 bg-gray-200 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300">
              Back to Dashboard
            </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Retailers</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{totalRetailers}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Retailers</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {activeRetailers}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</p>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
              ₹{retailers.reduce((sum, r) => sum + (r.totalSpent || 0), 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Retailers Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Retailer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total Spent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-gray-600 dark:text-gray-300">Loading retailers...</span>
                    </div>
                  </td>
                </tr>
              ) : retailers.length > 0 ? (
                retailers.map((retailer) => (
                  <tr key={retailer._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{retailer.businessName || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{retailer.email}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{retailer.profile?.phone || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {retailer.profile?.address?.city && retailer.profile?.address?.state
                          ? `${retailer.profile.address.city}, ${retailer.profile.address.state}`
                          : <span className="text-gray-500 dark:text-gray-400 italic">Location on file</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{retailer.totalOrders || 0}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-green-600 dark:text-green-400">₹{(retailer.totalSpent || 0).toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        retailer.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                      }`}>
                        {retailer.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        to={`/wholesaler/bulk-orders?retailerId=${retailer._id}`}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                      >
                        View Orders
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="text-gray-500 dark:text-gray-400">
                      <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <p className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No retailers in your network yet</p>
                      <p className="mt-2 text-sm">Retailers will appear here once they place orders with you</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default RetailerNetwork;
