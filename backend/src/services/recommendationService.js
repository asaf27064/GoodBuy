// backend/src/services/recommendationService.js

/**
 * A simple hybrid recommender:
 *  1) Finds “co-occurrence” counts of items bought together in past baskets.
 *  2) Ranks candidates by co-occurrence * recency–frequency weight.
 *  3) Attaches last-purchased timestamp.
 */

const moment = require('moment'); // for human-friendly dates, optional

module.exports = {
  recommend: (userId, currentProducts, purchaseHistory, topN = 5) => {
    // 1) Build set of codes already in the list
    const currentCodes = new Set(currentProducts.map(p => p.product.itemCode));

    // 2) Compute recency-frequency score per itemCode
    const now = Date.now();
    const λ   = 0.000001; // decay rate (tune)
    const userScores = {}; // itemCode → weighted sum

    purchaseHistory.forEach(basket => {
      const age = now - new Date(basket.timeStamp).getTime();
      const decay = Math.exp(-λ * age);
      basket.products.forEach(({ product, numUnits }) => {
        const code = product.itemCode;
        userScores[code] = (userScores[code] || 0) + decay * numUnits;
      });
    });

    // 3) Compute co-occurrence counts
    const coCounts = {}; // itemCode → times seen in same basket with any current item
    purchaseHistory.forEach(basket => {
      const codes = basket.products.map(p => p.product.itemCode);
      const intersection = codes.filter(c => currentCodes.has(c));
      if (intersection.length === 0) return;
      codes.forEach(code => {
        if (!currentCodes.has(code)) {
          coCounts[code] = (coCounts[code] || 0) + 1;
        }
      });
    });

    // 4) Merge into a candidate list
    const candidates = Object.keys(coCounts).map(code => {
      const coScore = coCounts[code];
      const ufScore = userScores[code] || 0;
      // final score = co-occurrence * (1 + α * userFreq)
      const α = 0.5;
      const score = coScore * (1 + α * ufScore);
      return { itemCode: code, score };
    });

    // 5) Sort & take topN
    const top = candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, topN)
      .map(({ itemCode, score }) => {
        // find last purchased date
        const dates = purchaseHistory
          .filter(b => b.products.some(p => p.product.itemCode === itemCode))
          .map(b => new Date(b.timeStamp).getTime());
        const lastTs = dates.length ? Math.max(...dates) : null;
        return {
          itemCode,
          score,
          lastPurchased: lastTs,
        };
      });

    return top;
  }
};
