import { useState } from 'react';

const localDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const today = () => localDate(new Date());
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDate(d);
};

export function useDateFilter(defaultDays = 30) {
  const [startDate, setStartDate] = useState(daysAgo(defaultDays));
  const [endDate, setEndDate] = useState(today());

  const setPreset = (days) => {
    setStartDate(daysAgo(days));
    setEndDate(today());
  };

  return { startDate, endDate, setStartDate, setEndDate, setPreset };
}
