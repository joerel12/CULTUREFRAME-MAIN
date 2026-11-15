'use strict';

const { Router } = require('express');
const { salesCsv, productsCsv, ordersCsv, eventsCsv, destinationsCsv } = require('../controllers/reports.controller');
const { authenticateAdmin } = require('../middleware/authenticateAdmin');
const { validateRequest } = require('../middleware/validateRequest');
const { dateRangeQuery } = require('../validators/analytics.validators');

const router = Router();

router.use(authenticateAdmin);

router.get('/sales.csv', validateRequest({ query: dateRangeQuery }), salesCsv);
router.get('/products.csv', validateRequest({ query: dateRangeQuery }), productsCsv);
router.get('/orders.csv', validateRequest({ query: dateRangeQuery }), ordersCsv);
router.get('/events.csv', validateRequest({ query: dateRangeQuery }), eventsCsv);
router.get('/destinations.csv', validateRequest({ query: dateRangeQuery }), destinationsCsv);

module.exports = router;
