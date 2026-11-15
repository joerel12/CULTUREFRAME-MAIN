'use strict';

const { fetchHeritage, fetchScenicDestinations } = require('./dataProvider');

async function getDestinationMetrics(params = {}) {
  const [heritageResult, scenicResult] = await Promise.all([
    fetchHeritage(params),
    fetchScenicDestinations(params),
  ]);

  const { heritage, _dataMode: hMode } = heritageResult;
  const { scenic, _dataMode: sMode } = scenicResult;

  const hasViewData = heritage.some((h) => h.viewCount !== null) || scenic.some((s) => s.viewCount !== null);

  const topHeritage = [...heritage]
    .filter((h) => h.viewCount !== null)
    .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));

  const topScenic = [...scenic]
    .filter((s) => s.viewCount !== null)
    .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));

  return {
    _dataMode: hMode || sMode,
    heritage: {
      total: heritage.length,
      published: heritage.filter((h) => h.isPublished).length,
      byCategory: groupByCategory(heritage),
      topByViews: topHeritage.slice(0, 10),
      viewTrackingAvailable: heritage.some((h) => h.viewCount !== null),
    },
    scenic: {
      total: scenic.length,
      published: scenic.filter((s) => s.isPublished).length,
      byCategory: groupByCategory(scenic),
      topByViews: topScenic.slice(0, 10),
      viewTrackingAvailable: scenic.some((s) => s.viewCount !== null),
      withCoordinates: scenic.filter((s) => s.latitude !== null && s.longitude !== null).length,
    },
    hasViewData,
    viewDataNote: hasViewData
      ? null
      : 'CultureFrame does not currently expose view-tracking data. Only content counts are displayed.',
    importantNote:
      'A destination appearing in this list does not mean a user physically visited it. View counts reflect page views if tracked.',
  };
}

function groupByCategory(items) {
  const map = {};
  for (const item of items) {
    const cat = item.category || 'Uncategorized';
    if (!map[cat]) map[cat] = { category: cat, count: 0, totalViews: 0 };
    map[cat].count++;
    map[cat].totalViews += item.viewCount || 0;
  }
  return Object.values(map).sort((a, b) => b.count - a.count);
}

module.exports = { getDestinationMetrics };
