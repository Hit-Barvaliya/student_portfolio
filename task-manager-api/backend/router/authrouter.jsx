const express = require('express');
const { login, register, getMe } = require('../controllers/authController.jsx');
const { validateLogin, validateRegistration } = require('../middleware/validateRequest.jsx');
const authenticate = require('../middleware/authenticate.jsx');

const router = express.Router();

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

router.post('/auth/register', validateRegistration, asyncHandler(register));
router.post('/auth/login', validateLogin, asyncHandler(login));
router.get('/auth/me', authenticate, asyncHandler(getMe));
router.get('/me', authenticate, asyncHandler(getMe));

module.exports = router;
