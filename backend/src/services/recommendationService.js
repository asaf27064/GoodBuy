// backend/src/services/recommendationService.js

const PurchaseModel = require('../models/purchaseModel')
const ProductModel  = require('../models/productModel')

/**
 * Weighted-blend recommender with catalog-validated novelty:
 * - Habit (weekly purchase patterns)
 * - Co-occurrence (items bought together)
 * - Personal recency-frequency
 * - Novelty (new items user hasn't tried)
 * - Global popularity boost applied pre-merge
 */
module.exports = {
  recommend: async (userId, currentProducts, purchaseHistory, topN = 5) => {
    const now = new Date()
    const todayWd = now.getDay()
    const currentCodes = new Set(currentProducts.map(p => p.product.itemCode))

    // 1) Recency-frequency scoring
    const λ = 0.000001
    const userScores = {}
    purchaseHistory.forEach(basket => {
      const age = now - new Date(basket.timeStamp).getTime()
      const decay = Math.exp(-λ * age)
      basket.products.forEach(({ product, numUnits }) => {
        const code = product.itemCode
        userScores[code] = (userScores[code] || 0) + decay * numUnits
      })
    })

    // 2) Habit candidates
    const minHabits = 4
    const weekdayCounts = {}
    purchaseHistory.forEach(basket => {
      const wd = new Date(basket.timeStamp).getDay()
      basket.products.forEach(({ product }) => {
        const code = product.itemCode
        weekdayCounts[code] = weekdayCounts[code] || {}
        weekdayCounts[code][wd] = (weekdayCounts[code][wd] || 0) + 1
      })
    })
    const habitCandidates = Object.entries(weekdayCounts)
      .filter(([code, counts]) => !currentCodes.has(code) && (counts[todayWd] || 0) >= minHabits)
      .map(([code, counts]) => ({ code, score: counts[todayWd] * 10 + (userScores[code] || 0) }))

    // 3) Co-occurrence candidates
    const coCounts = {}
    purchaseHistory.forEach(basket => {
      const codes = basket.products.map(p => p.product.itemCode)
      if (!codes.some(c => currentCodes.has(c))) return
      codes.forEach(c => {
        if (!currentCodes.has(c)) coCounts[c] = (coCounts[c] || 0) + 1
      })
    })
    const α = 0.5
    let coCandidates = Object.entries(coCounts)
      .filter(([code]) => !currentCodes.has(code))
      .map(([code, co]) => ({ code, score: co * (1 + α * (userScores[code] || 0)) }))

    // 4) Personal candidates
    let personalCandidates = Object.entries(userScores)
      .filter(([code]) => !currentCodes.has(code))
      .map(([code, uf]) => ({ code, score: uf }))

    // 5) Global popularity boost
    const globalAgg = await PurchaseModel.aggregate([
      { $unwind: '$products' },
      { $group: { _id: '$products.product.itemCode', count: { $sum: 1 } } }
    ])
    const maxCount = Math.max(...globalAgg.map(g => g.count), 1)
    const globalCounts = Object.fromEntries(globalAgg.map(g => [g._id, g.count]))
    const boostRatio = 0.05
    const boostList = list =>
      list.map(item => ({
        ...item,
        score: item.score + ((globalCounts[item.code] || 0) / maxCount) * boostRatio * item.score
      }))
    coCandidates = boostList(coCandidates)
    personalCandidates = boostList(personalCandidates)

    // 6) Catalog-validated novelty candidates
    const catalogDocs = await ProductModel.find({}, 'itemCode').lean()
    const catalogSet = new Set(catalogDocs.map(p => p.itemCode))
    const noveltyCandidates = Array.from(catalogSet)
      .filter(code => !userScores[code] && !currentCodes.has(code))
      .map(code => ({ code, score: (globalCounts[code] || 0) }))

    // 7) Weighted-blend merge
    const weights = { habit: 0.4, co: 0.3, personal: 0.2, novelty: 0.1 }
    const pools = {
      habit: habitCandidates.slice().sort((a,b) => b.score - a.score),
      co:    coCandidates.slice().sort((a,b) => b.score - a.score),
      personal: personalCandidates.slice().sort((a,b) => b.score - a.score),
      novelty: noveltyCandidates
    }

    function pickMethod() {
      const r = Math.random()
      let sum = 0
      for (const m of ['habit','co','personal','novelty']) {
        sum += weights[m]
        if (r <= sum) return m
      }
      return 'personal'
    }

    const result = []
    const used = new Set()
    while (result.length < topN) {
      const method = pickMethod()
      const pool = pools[method]
      let candidate = null
      if (method === 'novelty') {
        if (pool.length) {
          const idx = Math.floor(Math.random() * pool.length)
          candidate = pool.splice(idx,1)[0]
        }
      } else {
        while (pool.length) {
          const top = pool.shift()
          if (!used.has(top.code)) {
            candidate = top
            break
          }
        }
      }
      if (candidate) {
        used.add(candidate.code)
        result.push({ ...candidate, method })
      } else if (Object.values(pools).every(pl => pl.length === 0)) {
        break
      }
    }

    // 8) Format output
    return result.map(({ code, score, method }) => {
      const dates = purchaseHistory
        .filter(b => b.products.some(p => p.product.itemCode === code))
        .map(b => new Date(b.timeStamp).getTime())
      return {
        itemCode:      code,
        score,
        method,
        lastPurchased: dates.length ? Math.max(...dates) : null
      }
    })
  }
}