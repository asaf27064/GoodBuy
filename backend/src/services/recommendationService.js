const { GoogleGenAI } = require('@google/genai');
const PurchaseModel   = require('../models/purchaseModel');
const ProductModel    = require('../models/productModel');

const aiClient = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

function extractJsonArray(rawText) {
  const cleaned = rawText.replace(/```json|```/g, '').trim();
  const match   = cleaned.match(/\[([\s\S]*?)\]/m);
  if (!match) {
    throw new Error('No JSON array found in AI response');
  }
  return JSON.parse(match[0]);
}

module.exports = {
  recommend: async (userId, currentProducts, purchaseHistory, topN = 5) => {
    const now           = new Date();
    const todayWd       = now.getDay();
    const currentCodes  = new Set(currentProducts.map(p => p.product.itemCode));

    // Load product catalog once
    const allProds      = await ProductModel.find().lean();
    const nameToCode    = Object.fromEntries(
      allProds.map(p => [p.name.trim(), p._id.toString()])
    );
    const codeToName    = Object.fromEntries(
      allProds.map(p => [p._id.toString(), p.name.trim()])
    );
    const currentNames  = currentProducts.map(p => p.product.name.trim());

    // 1) Recency-frequency scores
    const λ           = 0.000001;
    const userScores  = {};
    purchaseHistory.forEach(b => {
      const age   = now - new Date(b.timeStamp).getTime();
      const decay = Math.exp(-λ * age);
      b.products.forEach(({ product, numUnits }) => {
        const code = product.itemCode;
        userScores[code] = (userScores[code] || 0) + decay * numUnits;
      });
    });

    // 2) Habit detection (weekly)
    const minHabits     = 4;
    const weekdayCounts = {};
    purchaseHistory.forEach(b => {
      const wd = new Date(b.timeStamp).getDay();
      b.products.forEach(({ product }) => {
        const code = product.itemCode;
        weekdayCounts[code] = weekdayCounts[code] || {};
        weekdayCounts[code][wd] = (weekdayCounts[code][wd] || 0) + 1;
      });
    });
    const habitCandidates = Object.entries(weekdayCounts)
      .filter(([code, counts]) =>
        !currentCodes.has(code) && (counts[todayWd] || 0) >= minHabits
      )
      .map(([code, counts]) => ({
        code,
        score: counts[todayWd],
        method: 'habit'
      }));

    // 3) Co-occurrence candidates
    const coCounts = {};
    purchaseHistory.forEach(b => {
      const codes = b.products.map(p => p.product.itemCode);
      if (!codes.some(c => currentCodes.has(c))) return;
      codes.forEach(c => {
        if (!currentCodes.has(c)) {
          coCounts[c] = (coCounts[c] || 0) + 1;
        }
      });
    });
    const α = 0.5;
    const coCandidates = Object.entries(coCounts)
      .filter(([code]) => !currentCodes.has(code))
      .map(([code, co]) => ({
        code,
        score: co * (1 + α * (userScores[code] || 0)),
        method: 'co-occurrence'
      }));

    // 4) Personal recency-frequency
    const personalCandidates = Object.entries(userScores)
      .filter(([code]) => !currentCodes.has(code))
      .map(([code, uf]) => ({
        code,
        score: uf,
        method: 'personal'
      }));

    // 5) Collaborative filtering (Jaccard similarity)
    const allPurchases = await PurchaseModel.find().lean();
    const userSet      = new Set(
      purchaseHistory.flatMap(b => b.products.map(p => p.product.itemCode))
    );
    const userMap      = {};
    allPurchases.forEach(b => {
      const uid = b.purchasedBy.toString();
      if (uid === userId.toString()) return;
      userMap[uid] = userMap[uid] || new Set();
      b.products.forEach(p => userMap[uid].add(p.product.itemCode));
    });
    const sims = Object.entries(userMap)
      .map(([uid, set]) => {
        const inter = [...set].filter(c => userSet.has(c)).length;
        const uni   = new Set([...set, ...userSet]).size;
        return { uid, sim: uni > 0 ? inter / uni : 0 };
      })
      .filter(x => x.sim > 0)
      .sort((a, b) => b.sim - a.sim)
      .slice(0, 5);
    const cfScores = {};
    sims.forEach(({ uid, sim }) => {
      userMap[uid].forEach(code => {
        if (!currentCodes.has(code)) {
          cfScores[code] = (cfScores[code] || 0) + sim;
        }
      });
    });
    const cfCandidates = Object.entries(cfScores)
      .map(([code, score]) => ({ code, score, method: 'cf' }));

    // 6) Global popularity boost
    const globalAgg    = await PurchaseModel.aggregate([
      { $unwind: '$products' },
      { $group: { _id: '$products.product.itemCode', count: { $sum: 1 } } }
    ]);
    const maxCount     = Math.max(...globalAgg.map(g => g.count), 1);
    const globalCounts = Object.fromEntries(
      globalAgg.map(g => [g._id, g.count])
    );
    const boostRatio   = 0.1;
    const boostList    = list =>
      list.map(item => ({
        ...item,
        score:
          item.score +
          ((globalCounts[item.code] || 0) / maxCount) *
            boostRatio *
            item.score
      }));
    const boostedCo       = boostList(coCandidates);
    const boostedPersonal = boostList(personalCandidates);

    // Assemble initial pools & weights
    const pools = {
      habit:    habitCandidates.sort((a, b) => b.score - a.score),
      co:       boostedCo.sort((a, b) => b.score - a.score),
      cf:       cfCandidates.sort((a, b) => b.score - a.score),
      personal: boostedPersonal.sort((a, b) => b.score - a.score)
    };
    const weights = {
      habit:    0.15,
      co:       0.30,
      cf:       0.25,
      personal: 0.30
    };

    // 7) AI-powered suggestions with history context
    try {
      // Build top-5 history summary
      const topHistory = Object.entries(userScores)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([code]) => codeToName[code])
        .filter(Boolean);

      const prompt = `
Here is your purchase history (your 5 most frequent items):
${topHistory.join(', ')}.

Here is your current shopping list:
${currentNames.join(', ')}.

Using both, suggest ${topN} additional grocery item NAMES in Hebrew only.
For each, include a brief reason in English why it fits your history and/or this list.
Format as a JSON array of objects, e.g.:
[
  { "name": "לחם מחמצת", "reason": "Because you buy soups often—this pairs well." },
  …
]
`;
      const aiResponse = await aiClient.models.generateContent({
        model:    'gemini-2.0-flash',
        contents: prompt
      });

      console.log('💡 Gemini raw response.text:', aiResponse.text);

      const aiObjs = extractJsonArray(aiResponse.text).slice(0, topN);
      const aiCandidates = aiObjs
        .map(({ name, reason }, i) => {
          const code = nameToCode[name.trim()];
          if (!code || currentCodes.has(code)) return null;
          return {
            code,
            score:            topN - i,
            method:           'ai',
            suggestionName:   name.trim(),
            suggestionReason: reason.trim()
          };
        })
        .filter(Boolean);

      if (aiCandidates.length) {
        pools.ai    = aiCandidates;
        weights.ai  = 0.40;
        const total = Object.values(weights).reduce((s, w) => s + w, 0);
        Object.keys(weights).forEach(k => (weights[k] /= total));
      }
    } catch (err) {
      console.warn('AI suggestion failed:', err.message);
    }

    // 8) Weighted sampling
    function pickMethod() {
      const r   = Math.random();
      let acc   = 0;
      for (const m of Object.keys(weights)) {
        acc += weights[m];
        if (r <= acc) return m;
      }
      return 'personal';
    }
    const final = [];
    const used  = new Set();
    while (final.length < topN) {
      const m    = pickMethod();
      const pool = pools[m] || [];
      let cand   = null;
      while (pool.length) {
        const it = pool.shift();
        if (!used.has(it.code)) {
          cand = it;
          break;
        }
      }
      if (cand) {
        used.add(cand.code);
        final.push(cand);
      } else {
        delete pools[m];
        delete weights[m];
        const sum = Object.values(weights).reduce((a, b) => a + b, 0);
        Object.keys(weights).forEach(k => (weights[k] /= sum));
        if (!Object.keys(weights).length) break;
      }
    }

    // 9) Format output
    return final.map(({ code, score, method, suggestionName, suggestionReason }) => {
      const dates = purchaseHistory
        .filter(b => b.products.some(p => p.product.itemCode === code))
        .map(b => new Date(b.timeStamp).getTime());
      return {
        itemCode:        code,
        score,
        method,
        lastPurchased:   dates.length ? Math.max(...dates) : null,
        suggestionName,
        suggestionReason
      };
    });
  }
};
