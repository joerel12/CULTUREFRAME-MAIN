import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import ChartWrapper from './ChartWrapper';

export default function CustomerTrendChart({ data = [], loading, error, onRetry }) {
  // Sample down to one point per week for readability if many points
  const chartData = data.length > 60
    ? data.filter((_, i) => i % 7 === 0)
    : data;

  return (
    <ChartWrapper
      title="Customer Registrations Over Time"
      loading={loading}
      error={error}
      empty={!chartData.length}
      onRetry={onRetry}
    >
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="custRegGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            tickFormatter={(d) => d?.slice(5) ?? d}
          />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip labelFormatter={(d) => `Date: ${d}`} />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#8b5cf6"
            strokeWidth={2}
            fill="url(#custRegGrad)"
            name="New Registrations"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}
