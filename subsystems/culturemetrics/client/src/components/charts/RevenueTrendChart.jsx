import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import ChartWrapper from './ChartWrapper';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value);

export default function RevenueTrendChart({ data = [], loading, error, onRetry }) {
  return (
    <ChartWrapper
      title="Revenue Trend"
      loading={loading}
      error={error}
      empty={!data.length}
      onRetry={onRetry}
    >
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2e7d32" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#2e7d32" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="period" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(value) => [formatCurrency(value), 'Gross Sales']} />
          <Area
            type="monotone"
            dataKey="grossSales"
            stroke="#2e7d32"
            strokeWidth={2}
            fill="url(#revenueGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}
