const express = require('express');
const { generateDescription } = require('../controllers/aiController.jsx');
const authenticate = require('../middleware/authenticate.jsx');

const router = express.Router();

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

// Support both endpoint paths:
// 1. /api/ai/generate-description (explicitly noted in PDF)
// 2. /tasks/ai/generate (convenient task extension)
router.post('/api/ai/generate-description', asyncHandler(generateDescription));
router.post('/tasks/ai/generate', authenticate, asyncHandler(generateDescription));

module.exports = router;
