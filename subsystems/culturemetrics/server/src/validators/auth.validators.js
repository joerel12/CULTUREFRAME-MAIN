'use strict';

const { z } = require('zod');

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required').max(64),
  password: z.string().min(1, 'Password is required').max(128),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(128)
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
});

module.exports = { loginSchema, changePasswordSchema };
