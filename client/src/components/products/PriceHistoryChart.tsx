import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import apiClient from '../../services/api';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PriceHistoryChartProps {
  productId: string;
  days?: number;
}

interface PriceHistoryData {
  currentPrice: number;
  lowestPrice: number;
  highestPrice: number;
  averagePrice: number;
  history: Array<{
    price: number;
    discount?: number;
    timestamp: string;
    reason: string;
  }>;
}

const PriceHistoryChart: React.FC<PriceHistoryChartProps> = ({ productId, days = 30 }) => {
  const [history, setHistory] = useState<PriceHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, [productId, days]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get(`/wishlist/price-history/${productId}?days=${days}`);

      if (response.data.success) {
        setHistory(response.data.data.history);
      }
    } catch (err: any) {
      console.error('Failed to load price history:', err);
      setError(err.response?.data?.message || 'Failed to load price history');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !history) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            {error || 'No price history available yet'}
          </p>
        </div>
      </div>
    );
  }

  if (history.history.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Price History ({days} days)
        </h3>
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            No price history available yet. Check back soon!
          </p>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const chartData = {
    labels: history.history.map((entry) =>
      new Date(entry.timestamp).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric'
      })
    ),
    datasets: [
      {
        label: 'Price (₹)',
        data: history.history.map((entry) => entry.price),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const entry = history.history[context.dataIndex];
            const lines = [`Price: ₹${context.parsed.y.toFixed(2)}`];
            if (entry.discount) {
              lines.push(`Discount: ${entry.discount}%`);
            }
            return lines;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: (value: any) => `₹${value}`,
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  const priceChange = history.currentPrice - history.history[0]?.price;
  const priceChangePercent = history.history[0]?.price
    ? ((priceChange / history.history[0].price) * 100).toFixed(1)
    : '0';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Price History ({days} days)
        </h3>
        <div className="flex gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Lowest: </span>
            <span className="font-semibold text-green-600">₹{history.lowestPrice.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Highest: </span>
            <span className="font-semibold text-red-600">₹{history.highestPrice.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Average: </span>
            <span className="font-semibold text-gray-900 dark:text-white">
              ₹{history.averagePrice.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div className="h-64 mb-4">
        <Line data={chartData} options={options} />
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Current Price</p>
          <p className="text-2xl font-bold text-blue-600">₹{history.currentPrice.toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600 dark:text-gray-400">Price Change</p>
          <p className={`text-lg font-semibold ${
            priceChange < 0 ? 'text-green-600' : priceChange > 0 ? 'text-red-600' : 'text-gray-600'
          }`}>
            {priceChange < 0 ? '↓' : priceChange > 0 ? '↑' : ''}
            ₹{Math.abs(priceChange).toFixed(2)} ({priceChangePercent}%)
          </p>
        </div>
      </div>
    </div>
  );
};

export default PriceHistoryChart;
