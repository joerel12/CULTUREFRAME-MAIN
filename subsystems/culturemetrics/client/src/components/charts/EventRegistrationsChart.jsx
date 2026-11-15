import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import ChartWrapper from './ChartWrapper';

export default function EventRegistrationsChart({ data = [], loading, error, onRetry }) {
  const chartData = data.slice(0, 8).map((e) => ({
    name: e.name?.length > 18 ? e.name.slice(0, 18) + '…' : e.name,
    registrations: e.totalRegistrations || 0,
    cancelled: e.cancelledRegistrations || 0,
  }));

  return (
    <ChartWrapper
      title="Event Registrations"
      loading={loading}
      error={error}
      empty={!chartData.length}
      onRetry={onRetry}
    >
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 50 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="registrations" fill="#3b82f6" name="Registrations" radius={[4, 4, 0, 0]} />
          <Bar dataKey="cancelled" fill="#ef4444" name="Cancelled" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}
