'use strict';

const { Router } = require('express');
const { login, logout, me, changePassword } = require('../controllers/auth.controller');
const { authenticateAdmin } = require('../middleware/authenticateAdmin');
const { validateRequest } = require('../middleware/validateRequest');
const { authLimiter } = require('../middleware/rateLimiter');
const { loginSchema, changePasswordSchema } = require('../validators/auth.validators');

const router = Router();

router.post('/login', authLimiter, validateRequest({ body: loginSchema }), login);
router.post('/logout', authenticateAdmin, logout);
router.get('/me', authenticateAdmin, me);
router.post('/change-password', authenticateAdmin, validateRequest({ body: changePasswordSchema }), changePassword);

module.exports = router;
