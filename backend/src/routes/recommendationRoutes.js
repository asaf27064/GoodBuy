// File: routes/recommendationRoutes.js

const express = require('express');
const router = express.Router();
const { getRecommendationsWithTimePatterns } = require('../service/recommendationLLM');
const auth = require('../middleware/auth');

/**
 * GET /api/recommendations/llm-timepatterns
 * Returns an array of up to 5 recommended item names,
 * based on the authenticated user’s purchase history + time patterns.
 */
router.get('/llm-timepatterns', auth, async (req, res) => {
  try {
    const userId = req.user._id; // from auth middleware
    const recommendations = await getRecommendationsWithTimePatterns(userId);
    return res.json({ recommendations });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
