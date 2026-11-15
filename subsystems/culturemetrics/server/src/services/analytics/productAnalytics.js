'use strict';

const { fetchProducts, fetchOrders } = require('./dataProvider');
const { isQualifyingOrder } = require('./salesAnalytics');

async function getProductMetrics(params = {}) {
  const [productsResult, ordersResult] = await Promise.all([
    fetchProducts(params),
    fetchOrders(params),
  ]);

  const { products, _dataMode } = productsResult;
  const { orders } = ordersResult;

  // Build sales map from orders (source of truth for sales — not product catalog)
  const salesMap = {};
  for (const order of orders) {
    if (!isQualifyingOrder(order)) continue;
    for (const item of order.items || []) {
      const id = item.productId;
      if (!salesMap[id]) salesMap[id] = { unitsSold: 0, revenue: 0 };
      salesMap[id].unitsSold += item.quantity || 0;
      salesMap[id].revenue += parseFloat(item.unitPrice || '0') * (item.quantity || 0);
    }
  }

  // Category aggregation
  const categoryMap = {};
  for (const p of products) {
    const cat = p.category || 'Uncategorized';
    if (!categoryMap[cat]) categoryMap[cat] = { category: cat, productCount: 0, totalRevenue: 0, unitsSold: 0 };
    const sales = salesMap[p.id] || { unitsSold: 0, revenue: 0 };
    categoryMap[cat].productCount++;
    categoryMap[cat].totalRevenue += sales.revenue;
    categoryMap[cat].unitsSold += sales.unitsSold;
  }

  // Ranked product table
  const ranked = products
    .map((p, idx) => {
      const sales = salesMap[p.id] || { unitsSold: 0, revenue: 0 };
      return {
        rank: 0,
        productId: p.id,
        productName: p.name,
        category: p.category,
        currentPrice: p.price,
        currentStock: p.stockQuantity,
        unitsSold: sales.unitsSold,
        grossSales: sales.revenue.toFixed(2),
        isAvailable: p.isAvailable,
        hasRecordedSales: sales.unitsSold > 0,
      };
    })
    .sort((a, b) => parseFloat(b.grossSales) - parseFloat(a.grossSales))
    .map((p, idx) => ({ ...p, rank: idx + 1 }));

  const zeroSales = ranked.filter((p) => !p.hasRecordedSales);

  return {
    _dataMode,
    totalProducts: products.length,
    productsWithSales: ranked.filter((p) => p.hasRecordedSales).length,
    productsWithZeroSales: zeroSales.length,
    byCategory: Object.values(categoryMap)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .map((c) => ({ ...c, totalRevenue: c.totalRevenue.toFixed(2) })),
    rankedProducts: ranked,
  };
}

module.exports = { getProductMetrics };
