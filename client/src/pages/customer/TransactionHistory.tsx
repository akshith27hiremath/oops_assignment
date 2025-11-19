/**
 * Transaction History Page - GroceryMart Style
 * View payment transaction history with export functionality
 */

import React, { useEffect, useState } from 'react';
import CustomerLayout from '../../components/layout/CustomerLayout';
import paymentService, { UPITransaction, TransactionStatus } from '../../services/payment.service';
import toast from 'react-hot-toast';

const TransactionHistory: React.FC = () => {
  const [transactions, setTransactions] = useState<UPITransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<TransactionStatus | ''>('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, [currentPage, filter]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const response = await paymentService.getMyTransactions({
        page: currentPage,
        limit: 10,
        status: filter || undefined,
      });

      if (response.success) {
        setTransactions(response.data.transactions);
        setTotalPages(response.data.pagination.pages);
      }
    } catch (error: any) {
      console.error('Error loading transactions:', error);
      // Don't show error for empty state or 404
      if (error.response?.status !== 404) {
        toast.error(error.response?.data?.message || 'Failed to load transactions');
      }
      // Set empty transactions on error
      setTransactions([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleExport = async () => {
    try {
      setExporting(true);

      // Create CSV content
      const headers = ['Date', 'Transaction ID', 'Amount', 'Status', 'Gateway', 'UPI ID', 'Order ID', 'Message'];
      const rows = transactions.map(t => {
        const order = typeof t.orderId === 'object' ? t.orderId : null;
        return [
          formatDate(t.createdAt),
          t.transactionId,
          paymentService.formatAmount(t.amount, t.currency),
          t.status,
          paymentService.getGatewayName(t.gateway),
          t.upiId || '-',
          order?.orderId || '-',
          t.responseMessage || '-'
        ];
      });

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Transactions exported successfully');
    } catch (error: any) {
      toast.error('Failed to export transactions');
    } finally {
      setExporting(false);
    }
  };

  const getStatusBadge = (status: TransactionStatus) => {
    const statusMap: Record<string, { bg: string; text: string }> = {
      SUCCESS: { bg: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400' },
      PENDING: { bg: 'bg-yellow-100 dark:bg-yellow-900/20', text: 'text-yellow-600 dark:text-yellow-400' },
      PROCESSING: { bg: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' },
      FAILED: { bg: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400' },
      REFUNDED: { bg: 'bg-purple-100 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400' },
    };
    const badge = statusMap[status] || statusMap.PENDING;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
        {status}
      </span>
    );
  };

  const calculateStats = () => {
    const successfulTransactions = transactions.filter(t => t.status === TransactionStatus.SUCCESS);
    const totalAmount = successfulTransactions.reduce((sum, t) => sum + t.amount, 0);
    return {
      total: transactions.length,
      successful: successfulTransactions.length,
      totalAmount
    };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <CustomerLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">Loading transactions...</p>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Payment History</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">View all your UPI payment transactions</p>
        </div>
        {transactions.length > 0 && (
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-green-600 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-green-700 transition font-medium disabled:opacity-50"
          >
            {exporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Exporting...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export CSV
              </>
            )}
          </button>
        )}
      </div>

      {/* Stats Cards */}
      {transactions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Transactions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Transactions</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{stats.total}</p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900/20 p-3 rounded-lg">
                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Successful Payments */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Successful</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{stats.successful}</p>
              </div>
              <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded-lg">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Amount */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Amount</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">${stats.totalAmount.toFixed(2)}</p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-900/20 p-3 rounded-lg">
                <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Filter by Status:</label>
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as TransactionStatus | '');
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Transactions</option>
            <option value={TransactionStatus.SUCCESS}>Success</option>
            <option value={TransactionStatus.PENDING}>Pending</option>
            <option value={TransactionStatus.FAILED}>Failed</option>
            <option value={TransactionStatus.PROCESSING}>Processing</option>
            <option value={TransactionStatus.REFUNDED}>Refunded</option>
          </select>
        </div>
      </div>

      {/* Transactions List */}
      {transactions.length > 0 ? (
        <>
          <div className="space-y-4 mb-8">
            {transactions.map((transaction) => {
              const order = typeof transaction.orderId === 'object' ? transaction.orderId : null;

              return (
                <div
                  key={transaction._id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {paymentService.formatAmount(transaction.amount, transaction.currency)}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 font-mono mt-1">
                        {transaction.transactionId}
                      </p>
                    </div>
                    {getStatusBadge(transaction.status)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Date</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(transaction.createdAt)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Gateway</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{paymentService.getGatewayName(transaction.gateway)}</p>
                      </div>
                    </div>

                    {transaction.upiId && (
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">UPI ID</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{transaction.upiId}</p>
                        </div>
                      </div>
                    )}

                    {order && (
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Order ID</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{order.orderId}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Response Message */}
                  {transaction.responseMessage && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg mb-3">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium">Note: </span>
                        {transaction.responseMessage}
                      </p>
                    </div>
                  )}

                  {/* Refund Info */}
                  {transaction.refund && (
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg mb-3">
                      <p className="text-sm font-medium text-purple-900 dark:text-purple-300 mb-2">Refund Details</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-purple-700 dark:text-purple-400">Amount:</span>
                          <span className="ml-2 font-medium text-purple-900 dark:text-purple-300">
                            {paymentService.formatAmount(transaction.refund.amount)}
                          </span>
                        </div>
                        <div>
                          <span className="text-purple-700 dark:text-purple-400">Status:</span>
                          <span className="ml-2 font-medium text-purple-900 dark:text-purple-300">
                            {transaction.refund.status}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-purple-700 dark:text-purple-400">Reason:</span>
                          <span className="ml-2 text-purple-900 dark:text-purple-300">{transaction.refund.reason}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {transaction.status === TransactionStatus.PENDING && (
                    <button
                      onClick={async () => {
                        try {
                          const response = await paymentService.verifyPayment(transaction.transactionId);
                          if (response.success) {
                            toast.success('Payment status updated');
                            loadTransactions();
                          }
                        } catch (error: any) {
                          toast.error('Failed to verify payment');
                        }
                      }}
                      className="w-full md:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                    >
                      Verify Payment
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:text-white"
              >
                Previous
              </button>
              <span className="text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:text-white"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <svg className="w-24 h-24 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Transactions Yet</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You haven't made any UPI payments. Start shopping now!
          </p>
        </div>
      )}
    </CustomerLayout>
  );
};

export default TransactionHistory;
