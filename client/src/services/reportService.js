import api from './api';

const REPORT_ENDPOINTS = {
  sales: '/reports/sales.csv',
  products: '/reports/products.csv',
  orders: '/reports/orders.csv',
  events: '/reports/events.csv',
  destinations: '/reports/destinations.csv',
};

function getErrorMessage(error) {
  const body = error.response?.data;
  if (body instanceof Blob) {
    return body.text().then((text) => {
      try {
        return JSON.parse(text)?.error?.message || 'The report could not be generated.';
      } catch {
        return text || 'The report could not be generated.';
      }
    });
  }
  return Promise.resolve(body?.error?.message || error.message || 'The report could not be generated.');
}

export const reportService = {
  async download(reportName, filters = {}) {
    const endpoint = REPORT_ENDPOINTS[reportName];
    if (!endpoint) throw new Error('Unknown report type.');

    try {
      const response = await api.get(endpoint, {
        params: {
          ...(filters.startDate ? { startDate: filters.startDate } : {}),
          ...(filters.endDate ? { endDate: filters.endDate } : {}),
        },
        responseType: 'blob',
      });
      const objectUrl = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      const disposition = response.headers['content-disposition'] || '';
      const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] || `culturemetrics-${reportName}.csv`;
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      throw new Error(await getErrorMessage(error));
    }
  },
};
