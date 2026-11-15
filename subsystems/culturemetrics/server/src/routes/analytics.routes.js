'use strict';

const { Router } = require('express');
const ctrl = require('../controllers/analytics.controller');
const { authenticateAdmin } = require('../middleware/authenticateAdmin');
const { validateRequest } = require('../middleware/validateRequest');
const { dateRangeQuery, productIdParam } = require('../validators/analytics.validators');

const router = Router();

// All analytics routes require authentication
router.use(authenticateAdmin);

// Dashboard
router.get('/overview', ctrl.getOverview);
router.get('/trends', validateRequest({ query: dateRangeQuery }), ctrl.getTrends);

// Sales
router.get('/sales', validateRequest({ query: dateRangeQuery }), ctrl.getSales);
router.get('/sales/categories', validateRequest({ query: dateRangeQuery }), ctrl.getSalesCategories);
router.get('/sales/top-products', validateRequest({ query: dateRangeQuery }), ctrl.getSalesTopProducts);

// Products
router.get('/products', validateRequest({ query: dateRangeQuery }), ctrl.getProducts);
router.get('/products/:productId', validateRequest({ params: productIdParam }), ctrl.getProductById);

// Orders
router.get('/orders', validateRequest({ query: dateRangeQuery }), ctrl.getOrders);
router.get('/orders/statuses', validateRequest({ query: dateRangeQuery }), ctrl.getOrderStatuses);

// Customers
router.get('/customers', validateRequest({ query: dateRangeQuery }), ctrl.getCustomers);
router.get('/customers/trends', validateRequest({ query: dateRangeQuery }), ctrl.getCustomerTrends);

// Events
router.get('/events', validateRequest({ query: dateRangeQuery }), ctrl.getEvents);
router.get('/events/registrations', validateRequest({ query: dateRangeQuery }), ctrl.getEventRegistrations);

// Destinations
router.get('/destinations', validateRequest({ query: dateRangeQuery }), ctrl.getDestinations);
router.get('/destinations/heritage', validateRequest({ query: dateRangeQuery }), ctrl.getHeritage);
router.get('/destinations/scenic', validateRequest({ query: dateRangeQuery }), ctrl.getScenic);

module.exports = router;
