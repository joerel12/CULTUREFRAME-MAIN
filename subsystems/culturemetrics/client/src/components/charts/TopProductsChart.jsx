import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ChartWrapper from './ChartWrapper';

export default function TopProductsChart({ data = [], loading, error, onRetry }) {
  const chartData = data.slice(0, 8).map((p) => ({
    name: p.productName?.length > 16 ? p.productName.slice(0, 16) + '…' : p.productName,
    revenue: parseFloat(p.revenue || '0'),
  }));

  return (
    <ChartWrapper
      title="Top Products by Revenue"
      loading={loading}
      error={error}
      empty={!chartData.length}
      onRetry={onRetry}
    >
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis type="number" tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
          <Tooltip formatter={(v) => [`₱${Number(v).toLocaleString()}`, 'Revenue']} />
          <Bar dataKey="revenue" fill="#2e7d32" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}
