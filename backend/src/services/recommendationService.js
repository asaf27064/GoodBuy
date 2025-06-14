const { GoogleGenAI } = require('@google/genai');
const PurchaseModel = require('../models/purchaseModel');
const ProductModel = require('../models/productModel');

const aiClient = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

// Constants for better maintainability
const CONSTANTS = {
  DECAY_LAMBDA: 0.000001,
  MIN_HABITS: 4,
  CO_OCCURRENCE_ALPHA: 0.5,
  SIMILAR_USERS_LIMIT: 5,
  GLOBAL_BOOST_RATIO: 0.1,
  AI_TIMEOUT: 10000, // 10 seconds
  DEFAULT_WEIGHTS: {
    habit: 0.15,
    co: 0.30,
    cf: 0.25,
    personal: 0.30
  }
};

/**
 * Safely extracts JSON array from AI response text
 * @param {string} rawText - Raw response from AI
 * @returns {Array} Parsed JSON array
 */
function extractJsonArray(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Invalid AI response: empty or non-string response');
  }

  try {
    // Remove code blocks and extra whitespace
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    
    // Try to find JSON array pattern
    const match = cleaned.match(/\[([\s\S]*?)\]/m);
    if (!match) {
      throw new Error('No JSON array found in AI response');
    }

    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) {
      throw new Error('Parsed result is not an array');
    }

    return parsed;
  } catch (error) {
    console.error('JSON parsing error:', error.message);
    throw new Error(`Failed to parse AI response: ${error.message}`);
  }
}

/**
 * Validates input parameters
 * @param {string} userId - User ID
 * @param {Array} currentProducts - Current products in cart
 * @param {Array} purchaseHistory - User's purchase history
 * @param {number} topN - Number of recommendations to return
 */
function validateInputs(userId, currentProducts, purchaseHistory, topN) {
  if (!userId) {
    throw new Error('userId is required');
  }
  if (!Array.isArray(currentProducts)) {
    throw new Error('currentProducts must be an array');
  }
  if (!Array.isArray(purchaseHistory)) {
    throw new Error('purchaseHistory must be an array');
  }
  if (!Number.isInteger(topN) || topN < 1) {
    throw new Error('topN must be a positive integer');
  }
}

/**
 * Calculates recency-frequency scores for products
 * @param {Array} purchaseHistory - User's purchase history
 * @param {Date} now - Current date
 * @returns {Object} Product scores
 */
function calculateRecencyFrequencyScores(purchaseHistory, now) {
  const userScores = {};
  const { DECAY_LAMBDA } = CONSTANTS;

  purchaseHistory.forEach(purchase => {
    try {
      const purchaseDate = new Date(purchase.timeStamp);
      if (isNaN(purchaseDate.getTime())) {
        console.warn('Invalid purchase timestamp:', purchase.timeStamp);
        return;
      }

      const age = now.getTime() - purchaseDate.getTime();
      const decay = Math.exp(-DECAY_LAMBDA * age);

      purchase.products?.forEach(({ product, numUnits }) => {
        if (!product?.itemCode) return;
        
        const code = product.itemCode;
        const units = Math.max(1, Number(numUnits) || 1); // Ensure positive units
        userScores[code] = (userScores[code] || 0) + decay * units;
      });
    } catch (error) {
      console.warn('Error processing purchase:', error.message);
    }
  });

  return userScores;
}

/**
 * Detects user habits based on weekday patterns
 * @param {Array} purchaseHistory - User's purchase history
 * @param {number} todayWd - Today's weekday (0-6)
 * @param {Set} currentCodes - Current product codes in cart
 * @returns {Array} Habit candidates
 */
function detectHabits(purchaseHistory, todayWd, currentCodes) {
  const weekdayCounts = {};
  const { MIN_HABITS } = CONSTANTS;

  purchaseHistory.forEach(purchase => {
    try {
      const purchaseDate = new Date(purchase.timeStamp);
      if (isNaN(purchaseDate.getTime())) return;

      const wd = purchaseDate.getDay();
      purchase.products?.forEach(({ product }) => {
        if (!product?.itemCode) return;
        
        const code = product.itemCode;
        weekdayCounts[code] = weekdayCounts[code] || {};
        weekdayCounts[code][wd] = (weekdayCounts[code][wd] || 0) + 1;
      });
    } catch (error) {
      console.warn('Error processing habit detection:', error.message);
    }
  });

  return Object.entries(weekdayCounts)
    .filter(([code, counts]) =>
      !currentCodes.has(code) && (counts[todayWd] || 0) >= MIN_HABITS
    )
    .map(([code, counts]) => ({
      code,
      score: counts[todayWd],
      method: 'habit'
    }));
}

/**
 * Finds co-occurrence candidates
 * @param {Array} purchaseHistory - User's purchase history
 * @param {Set} currentCodes - Current product codes in cart
 * @param {Object} userScores - User's product scores
 * @returns {Array} Co-occurrence candidates
 */
function findCoOccurrenceCandidates(purchaseHistory, currentCodes, userScores) {
  const coCounts = {};
  const { CO_OCCURRENCE_ALPHA } = CONSTANTS;

  purchaseHistory.forEach(purchase => {
    try {
      const codes = purchase.products
        ?.map(p => p.product?.itemCode)
        .filter(Boolean) || [];
      
      if (!codes.some(c => currentCodes.has(c))) return;

      codes.forEach(c => {
        if (!currentCodes.has(c)) {
          coCounts[c] = (coCounts[c] || 0) + 1;
        }
      });
    } catch (error) {
      console.warn('Error processing co-occurrence:', error.message);
    }
  });

  return Object.entries(coCounts)
    .filter(([code]) => !currentCodes.has(code))
    .map(([code, co]) => ({
      code,
      score: co * (1 + CO_OCCURRENCE_ALPHA * (userScores[code] || 0)),
      method: 'co-occurrence'
    }));
}

/**
 * Calculates collaborative filtering recommendations
 * @param {Array} purchaseHistory - User's purchase history
 * @param {string} userId - Current user ID
 * @param {Set} currentCodes - Current product codes in cart
 * @returns {Array} Collaborative filtering candidates
 */
async function calculateCollaborativeFiltering(purchaseHistory, userId, currentCodes) {
  try {
    const userSet = new Set(
      purchaseHistory.flatMap(b => 
        b.products?.map(p => p.product?.itemCode).filter(Boolean) || []
      )
    );

    if (userSet.size === 0) return [];

    const allPurchases = await PurchaseModel.find({
      purchasedBy: { $ne: userId }
    }).lean();

    const userMap = {};
    allPurchases.forEach(purchase => {
      try {
        const uid = purchase.purchasedBy?.toString();
        if (!uid) return;

        userMap[uid] = userMap[uid] || new Set();
        purchase.products?.forEach(p => {
          if (p.product?.itemCode) {
            userMap[uid].add(p.product.itemCode);
          }
        });
      } catch (error) {
        console.warn('Error processing user purchase:', error.message);
      }
    });

    const sims = Object.entries(userMap)
      .map(([uid, set]) => {
        const intersection = [...set].filter(c => userSet.has(c)).length;
        const union = new Set([...set, ...userSet]).size;
        return { uid, sim: union > 0 ? intersection / union : 0 };
      })
      .filter(x => x.sim > 0)
      .sort((a, b) => b.sim - a.sim)
      .slice(0, CONSTANTS.SIMILAR_USERS_LIMIT);

    const cfScores = {};
    sims.forEach(({ uid, sim }) => {
      userMap[uid].forEach(code => {
        if (!currentCodes.has(code)) {
          cfScores[code] = (cfScores[code] || 0) + sim;
        }
      });
    });

    return Object.entries(cfScores)
      .map(([code, score]) => ({ code, score, method: 'cf' }));
  } catch (error) {
    console.error('Collaborative filtering error:', error.message);
    return [];
  }
}

/**
 * Gets global popularity scores for products
 * @returns {Object} Global popularity scores
 */
async function getGlobalPopularity() {
  try {
    const globalAgg = await PurchaseModel.aggregate([
      { $unwind: '$products' },
      { 
        $group: { 
          _id: '$products.product.itemCode', 
          count: { $sum: 1 } 
        } 
      }
    ]);

    const maxCount = Math.max(...globalAgg.map(g => g.count), 1);
    return {
      counts: Object.fromEntries(globalAgg.map(g => [g._id, g.count])),
      maxCount
    };
  } catch (error) {
    console.error('Global popularity calculation error:', error.message);
    return { counts: {}, maxCount: 1 };
  }
}

/**
 * Applies global popularity boost to candidates
 * @param {Array} candidates - Candidate items
 * @param {Object} globalCounts - Global popularity counts
 * @param {number} maxCount - Maximum count for normalization
 * @returns {Array} Boosted candidates
 */
function applyGlobalBoost(candidates, globalCounts, maxCount) {
  const { GLOBAL_BOOST_RATIO } = CONSTANTS;
  
  return candidates.map(item => ({
    ...item,
    score: item.score + 
      ((globalCounts[item.code] || 0) / maxCount) * 
      GLOBAL_BOOST_RATIO * 
      item.score
  }));
}

/**
 * Gets AI-powered suggestions with timeout
 * @param {Array} topHistory - Top historical items
 * @param {Array} currentNames - Current product names
 * @param {number} topN - Number of suggestions needed
 * @param {Object} nameToCode - Name to code mapping
 * @param {Set} currentCodes - Current product codes
 * @returns {Array} AI candidates
 */
async function getAISuggestions(topHistory, currentNames, topN, nameToCode, currentCodes) {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('Gemini API key not configured');
    return [];
  }

  try {
    const prompt = `
Here is your purchase history (your 5 most frequent items):
${topHistory.join(', ')}.

Here is your current shopping list:
${currentNames.join(', ')}.

Using both, suggest ${topN} additional grocery item NAMES in Hebrew only.
For each, include a brief reason in Hebrew why it fits your history and/or this list.
Format as a JSON array of objects, e.g.:
[
  { "name": "name", "reason": "reason" },
  …
]
`;

    const aiPromise = aiClient.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI request timeout')), CONSTANTS.AI_TIMEOUT)
    );

    const aiResponse = await Promise.race([aiPromise, timeoutPromise]);
    
    if (!aiResponse?.text) {
      throw new Error('Empty AI response');
    }

    console.log('💡 Gemini raw response.text:', aiResponse.text);

    const aiObjs = extractJsonArray(aiResponse.text).slice(0, topN);
    
    return aiObjs
      .map(({ name, reason }, i) => {
        if (!name || !reason) return null;
        
        const trimmedName = name.trim();
        const code = nameToCode[trimmedName];
        
        if (!code || currentCodes.has(code)) return null;
        
        return {
          code,
          score: topN - i,
          method: 'ai',
          suggestionName: trimmedName,
          suggestionReason: reason.trim()
        };
      })
      .filter(Boolean);
  } catch (error) {
    console.warn('AI suggestion failed:', error.message);
    return [];
  }
}

/**
 * Performs weighted sampling to select final recommendations
 * @param {Object} pools - Candidate pools by method
 * @param {Object} weights - Weights for each method
 * @param {number} topN - Number of recommendations needed
 * @returns {Array} Final recommendations
 */
function weightedSampling(pools, weights, topN) {
  function pickMethod() {
    const r = Math.random();
    let acc = 0;
    for (const method of Object.keys(weights)) {
      acc += weights[method];
      if (r <= acc) return method;
    }
    return Object.keys(weights)[0] || 'personal';
  }

  const final = [];
  const used = new Set();
  
  while (final.length < topN && Object.keys(weights).length > 0) {
    const method = pickMethod();
    const pool = pools[method] || [];
    let candidate = null;

    // Find unused candidate from pool
    while (pool.length > 0) {
      const item = pool.shift();
      if (!used.has(item.code)) {
        candidate = item;
        break;
      }
    }

    if (candidate) {
      used.add(candidate.code);
      final.push(candidate);
    } else {
      // Remove exhausted method and renormalize weights
      delete pools[method];
      delete weights[method];
      
      const sum = Object.values(weights).reduce((a, b) => a + b, 0);
      if (sum > 0) {
        Object.keys(weights).forEach(k => (weights[k] /= sum));
      }
    }
  }

  return final;
}

module.exports = {
  recommend: async (userId, currentProducts, purchaseHistory, topN = 5) => {
    try {
      // Validate inputs
      validateInputs(userId, currentProducts, purchaseHistory, topN);

      const now = new Date();
      const todayWd = now.getDay();
      const currentCodes = new Set(
        currentProducts
          .map(p => p.product?.itemCode)
          .filter(Boolean)
      );

      // Load product catalog with error handling
      let allProds, nameToCode, codeToName;
      try {
        allProds = await ProductModel.find().lean();
        nameToCode = Object.fromEntries(
          allProds.map(p => [p.name?.trim(), p._id?.toString()]).filter(([name, id]) => name && id)
        );
        codeToName = Object.fromEntries(
          allProds.map(p => [p._id?.toString(), p.name?.trim()]).filter(([id, name]) => id && name)
        );
      } catch (error) {
        console.error('Error loading product catalog:', error.message);
        return [];
      }

      const currentNames = currentProducts
        .map(p => p.product?.name?.trim())
        .filter(Boolean);

      // Calculate various recommendation methods
      const userScores = calculateRecencyFrequencyScores(purchaseHistory, now);
      const habitCandidates = detectHabits(purchaseHistory, todayWd, currentCodes);
      const coCandidates = findCoOccurrenceCandidates(purchaseHistory, currentCodes, userScores);
      const cfCandidates = await calculateCollaborativeFiltering(purchaseHistory, userId, currentCodes);
      
      // Personal recency-frequency candidates
      const personalCandidates = Object.entries(userScores)
        .filter(([code]) => !currentCodes.has(code))
        .map(([code, score]) => ({ code, score, method: 'personal' }));

      // Apply global popularity boost
      const { counts: globalCounts, maxCount } = await getGlobalPopularity();
      const boostedCo = applyGlobalBoost(coCandidates, globalCounts, maxCount);
      const boostedPersonal = applyGlobalBoost(personalCandidates, globalCounts, maxCount);

      // Prepare candidate pools
      const pools = {
        habit: habitCandidates.sort((a, b) => b.score - a.score),
        co: boostedCo.sort((a, b) => b.score - a.score),
        cf: cfCandidates.sort((a, b) => b.score - a.score),
        personal: boostedPersonal.sort((a, b) => b.score - a.score)
      };

      let weights = { ...CONSTANTS.DEFAULT_WEIGHTS };

      // Get AI suggestions
      const topHistory = Object.entries(userScores)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([code]) => codeToName[code])
        .filter(Boolean);

      if (topHistory.length > 0) {
        const aiCandidates = await getAISuggestions(
          topHistory, currentNames, topN, nameToCode, currentCodes
        );

        if (aiCandidates.length > 0) {
          pools.ai = aiCandidates;
          weights.ai = 0.40;
          
          // Renormalize weights
          const total = Object.values(weights).reduce((s, w) => s + w, 0);
          Object.keys(weights).forEach(k => (weights[k] /= total));
        }
      }

      // Perform weighted sampling
      const final = weightedSampling(pools, weights, topN);

      // Format output
      return final.map(({ code, score, method, suggestionName, suggestionReason }) => {
        const dates = purchaseHistory
          .filter(b => b.products?.some(p => p.product?.itemCode === code))
          .map(b => {
            const date = new Date(b.timeStamp);
            return isNaN(date.getTime()) ? null : date.getTime();
          })
          .filter(Boolean);

        return {
          itemCode: code,
          score: Math.round(score * 1000) / 1000, // Round to 3 decimal places
          method,
          lastPurchased: dates.length ? Math.max(...dates) : null,
          suggestionName,
          suggestionReason
        };
      });

    } catch (error) {
      console.error('Recommendation system error:', error.message);
      return [];
    }
  }
};