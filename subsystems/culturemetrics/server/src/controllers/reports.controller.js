'use strict';

const {
  generateSalesCsv,
  generateProductsCsv,
  generateOrdersCsv,
  generateEventsCsv,
  generateDestinationsCsv,
} = require('../services/reporting/csvReporter');

function sendCsv(res, { csv, filename, dataMode }) {
  const modeHeader = dataMode === 'mock' ? 'DEMO DATA - NOT REAL' : 'LIVE DATA';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('X-Data-Mode', modeHeader);
  // Prevent caching of potentially sensitive reports
  res.setHeader('Cache-Control', 'no-store');
  return res.send(csv);
}

async function salesCsv(req, res, next) {
  try {
    const result = await generateSalesCsv(req.query);
    return sendCsv(res, result);
  } catch (err) {
    return next(err);
  }
}

async function productsCsv(req, res, next) {
  try {
    const result = await generateProductsCsv(req.query);
    return sendCsv(res, result);
  } catch (err) {
    return next(err);
  }
}

async function ordersCsv(req, res, next) {
  try {
    const result = await generateOrdersCsv(req.query);
    return sendCsv(res, result);
  } catch (err) {
    return next(err);
  }
}

async function eventsCsv(req, res, next) {
  try {
    const result = await generateEventsCsv(req.query);
    return sendCsv(res, result);
  } catch (err) {
    return next(err);
  }
}

async function destinationsCsv(req, res, next) {
  try {
    const result = await generateDestinationsCsv(req.query);
    return sendCsv(res, result);
  } catch (err) {
    return next(err);
  }
}

module.exports = { salesCsv, productsCsv, ordersCsv, eventsCsv, destinationsCsv };
