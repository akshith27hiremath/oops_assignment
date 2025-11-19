/**
 * Customer History Page
 * View customer purchase history and analytics
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import orderService from '../../services/order.service';
import toast from 'react-hot-toast';
import DarkModeToggle from '../../components/DarkModeToggle';

interface CustomerData {
  id: string;
  name: string;
  email: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
}

const CustomerHistory: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomerData();
  }, []);

  const loadCustomerData = async () => {
    try {
      setLoading(true);
      // Fetch all orders to aggregate customer data
      const response = await orderService.getRetailerOrders(1, 1000);

      if (response.success) {
        // Aggregate orders by customer
        const customerMap = new Map<string, CustomerData>();

        response.data.orders.forEach((order: any) => {
          const customer = order.customer || order.customerId;
          const customerId = customer?._id || 'unknown';
          const customerEmail = customer?.email || 'Unknown';
          const customerName = customer?.name || customer?.profile?.name || customerEmail;

          if (!customerMap.has(customerId)) {
            customerMap.set(customerId, {
              id: customerId,
              name: customerName,
              email: customerEmail,
              totalOrders: 0,
              totalSpent: 0,
              lastOrderDate: order.createdAt,
            });
          }

          const customerData = customerMap.get(customerId)!;
          customerData.totalOrders += 1;
          customerData.totalSpent += order.totalAmount;

          // Update last order date if this order is more recent
          if (new Date(order.createdAt) > new Date(customerData.lastOrderDate)) {
            customerData.lastOrderDate = order.createdAt;
          }
        });

        // Convert map to array and sort by total spent
        const customerArray = Array.from(customerMap.values())
          .sort((a, b) => b.totalSpent - a.totalSpent);

        setCustomers(customerArray);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load customer data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading customer data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customer History</h1>
            <div className="flex items-center gap-4">
              <DarkModeToggle />
              <Link to="/retailer/dashboard" className="px-4 py-2 bg-gray-200 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300">
              Back to Dashboard
            </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {customers.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Orders
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Spent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Order
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200">
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{customer.name}</div>
                      <div className="text-sm text-gray-500">{customer.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{customer.totalOrders}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-green-600">₹{customer.totalSpent.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {new Date(customer.lastOrderDate).toLocaleDateString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <svg
              className="mx-auto h-24 w-24 text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No customers yet</h3>
            <p className="text-gray-600 dark:text-gray-300">Customer analytics will appear here once you receive orders</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default CustomerHistory;
