import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ChartWrapper from './ChartWrapper';

export default function CategoryRevenueChart({ data = [], loading, error, onRetry }) {
  const chartData = data.map((c) => ({
    name: c.category?.length > 14 ? c.category.slice(0, 14) + '…' : c.category,
    revenue: parseFloat(c.revenue || c.totalRevenue || '0'),
  }));

  return (
    <ChartWrapper
      title="Revenue by Category"
      loading={loading}
      error={error}
      empty={!chartData.length}
      onRetry={onRetry}
    >
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
          <YAxis tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v) => [`₱${Number(v).toLocaleString()}`, 'Revenue']} />
          <Bar dataKey="revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}
