'use strict';

const { Router } = require('express');
const ctrl = require('../controllers/integration.controller');
const { authenticateAdmin } = require('../middleware/authenticateAdmin');
const { syncLimiter } = require('../middleware/rateLimiter');

const router = Router();

router.use(authenticateAdmin);

router.get('/status', ctrl.getStatus);
router.post('/test-connection', ctrl.testConnection);
router.post('/sync', syncLimiter, ctrl.syncNow);
router.get('/sync-history', ctrl.getSyncHistory);
router.get('/configuration-status', ctrl.getConfigurationStatus);

module.exports = router;
