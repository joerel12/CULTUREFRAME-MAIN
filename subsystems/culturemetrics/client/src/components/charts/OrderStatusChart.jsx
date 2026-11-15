import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ChartWrapper from './ChartWrapper';

const COLORS = {
  Completed: '#2e7d32',
  Pending: '#f59e0b',
  Processing: '#3b82f6',
  Cancelled: '#ef4444',
  Refunded: '#8b5cf6',
  Unknown: '#9ca3af',
};

export default function OrderStatusChart({ data = [], loading, error, onRetry }) {
  const colored = data.map((d) => ({ ...d, fill: COLORS[d.status] || '#9ca3af' }));

  return (
    <ChartWrapper
      title="Orders by Status"
      loading={loading}
      error={error}
      empty={!data.length}
      onRetry={onRetry}
    >
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={colored}
            dataKey="count"
            nameKey="status"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {colored.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}
