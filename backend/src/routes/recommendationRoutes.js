// File: routes/recommendationRoutes.js

const express = require('express');
const router = express.Router();
const { getRecommendationsWithTimePatterns } = require('../service/recommendationLLM');
const auth = require('../middleware/auth');

/**
 * GET /api/recommendations/llm-timepatterns
 * (מחייב אימות)
 */
router.get('/llm-timepatterns', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const recommendations = await getRecommendationsWithTimePatterns(userId);
    return res.json({ recommendations });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/recommendations/test-llm
 * (כבר יש, אך מחייב אימות)
 */
router.get('/test-llm', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const recommendedItems = await getRecommendationsWithTimePatterns(userId);
    return res.json({ recommendedItems });
  } catch (err) {
    console.error('Error in /test-llm:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/recommendations/test-llm-noauth
 * יחזיר את אותו פלט של LLM בלי אימות – לבדיקת תקינות ה־LLM בלבד.
 * هنا נניח userId סטטי (ה-id שלך) מיואזן מראש.
 */
router.get('/test-llm-noauth', async (req, res) => {
  try {
    // הכנס כאן ידנית את ה־userId שלך (ObjectId כמחרוזת)
    const userId = "683efa8b09008769df8b3213";
    const recommendedItems = await getRecommendationsWithTimePatterns(userId);
    return res.json({ recommendedItems });
  } catch (err) {
    console.error('Error in /test-llm-noauth:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
