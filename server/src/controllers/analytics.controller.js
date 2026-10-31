'use strict';

const { getSalesMetrics } = require('../services/analytics/salesAnalytics');
const { getProductMetrics } = require('../services/analytics/productAnalytics');
const { getOrderMetrics } = require('../services/analytics/orderAnalytics');
const { getCustomerMetrics } = require('../services/analytics/customerAnalytics');
const { getEventMetrics } = require('../services/analytics/eventAnalytics');
const { getDestinationMetrics } = require('../services/analytics/destinationAnalytics');
const { fetchOverview } = require('../services/analytics/dataProvider');
const { IntegrationSyncRun, isEphemeralStorageActive } = require('../models');
const { env } = require('../config/environment');

async function getOverview(req, res, next) {
  try {
    const { overview, _dataMode } = await fetchOverview();
    const lastSync = await IntegrationSyncRun.findOne({
      where: { status: 'completed', dataMode: env.DATA_MODE },
      order: [['startedAt', 'DESC']],
    });
    return res.json({
      success: true,
      data: {
        ...overview,
        _dataMode,
        lastSyncAt: lastSync?.startedAt || null,
        _storageMode: isEphemeralStorageActive() ? 'ephemeral' : 'postgres',
        _ephemeralStorage: isEphemeralStorageActive(),
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function getTrends(req, res, next) {
  try {
    const { startDate, endDate, granularity } = req.query;
    const data = await getSalesMetrics({ startDate, endDate, granularity });
    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

async function getSales(req, res, next) {
  try {
    const data = await getSalesMetrics(req.query);
    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

async function getSalesCategories(req, res, next) {
  try {
    const data = await getSalesMetrics(req.query);
    return res.json({ success: true, data: { byCategory: data.byCategory, _dataMode: data._dataMode } });
  } catch (err) {
    return next(err);
  }
}

async function getSalesTopProducts(req, res, next) {
  try {
    const data = await getSalesMetrics(req.query);
    return res.json({ success: true, data: { topProducts: data.topProducts, _dataMode: data._dataMode } });
  } catch (err) {
    return next(err);
  }
}

async function getProducts(req, res, next) {
  try {
    const data = await getProductMetrics(req.query);
    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

async function getProductById(req, res, next) {
  try {
    const data = await getProductMetrics(req.query);
    const product = data.rankedProducts.find((p) => p.productId === req.params.productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found.' },
      });
    }
    return res.json({ success: true, data: { product, _dataMode: data._dataMode } });
  } catch (err) {
    return next(err);
  }
}

async function getOrders(req, res, next) {
  try {
    const data = await getOrderMetrics(req.query);
    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

async function getOrderStatuses(req, res, next) {
  try {
    const data = await getOrderMetrics(req.query);
    return res.json({ success: true, data: { byStatus: data.byStatus, _dataMode: data._dataMode } });
  } catch (err) {
    return next(err);
  }
}

async function getCustomers(req, res, next) {
  try {
    const data = await getCustomerMetrics(req.query);
    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

async function getCustomerTrends(req, res, next) {
  try {
    const data = await getCustomerMetrics(req.query);
    return res.json({ success: true, data: { registrationTrend: data.registrationTrend, _dataMode: data._dataMode } });
  } catch (err) {
    return next(err);
  }
}

async function getEvents(req, res, next) {
  try {
    const data = await getEventMetrics(req.query);
    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

async function getEventRegistrations(req, res, next) {
  try {
    const data = await getEventMetrics(req.query);
    return res.json({ success: true, data: { byEvent: data.byEvent, _dataMode: data._dataMode } });
  } catch (err) {
    return next(err);
  }
}

async function getDestinations(req, res, next) {
  try {
    const data = await getDestinationMetrics(req.query);
    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

async function getHeritage(req, res, next) {
  try {
    const data = await getDestinationMetrics(req.query);
    return res.json({ success: true, data: { heritage: data.heritage, _dataMode: data._dataMode } });
  } catch (err) {
    return next(err);
  }
}

async function getScenic(req, res, next) {
  try {
    const data = await getDestinationMetrics(req.query);
    return res.json({ success: true, data: { scenic: data.scenic, _dataMode: data._dataMode } });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getOverview, getTrends,
  getSales, getSalesCategories, getSalesTopProducts,
  getProducts, getProductById,
  getOrders, getOrderStatuses,
  getCustomers, getCustomerTrends,
  getEvents, getEventRegistrations,
  getDestinations, getHeritage, getScenic,
};
